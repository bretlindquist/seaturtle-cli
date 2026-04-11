#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PATH="/Users/bretlindquist/.bun/bin:$PATH"
export CLAUDE_CODE_USE_OPENAI_CODEX=1

cd "$ROOT_DIR"

OUTPUT_FILE="$(mktemp)"
INTERNAL_DEBUG_LOG_FILE=0
if [[ -z "${DEBUG_LOG_FILE:-}" ]]; then
  DEBUG_LOG_FILE="$(mktemp)"
  INTERNAL_DEBUG_LOG_FILE=1
fi
export DEBUG_LOG_FILE
SESSION_ID="$(python3 - <<'PY'
import uuid
print(uuid.uuid4())
PY
)"
export SESSION_ID

cleanup() {
  rm -f "$OUTPUT_FILE"
  if [[ "$INTERNAL_DEBUG_LOG_FILE" == "1" ]]; then
    rm -f "$DEBUG_LOG_FILE"
  fi
}
trap cleanup EXIT

run_seed_turn() {
  local output_file
  output_file="$(mktemp)"
  if ! node dist/cli.js "$@" >"$output_file" 2>&1; then
    cat "$output_file"
    rm -f "$output_file"
    return 1
  fi
  rm -f "$output_file"
}

run_seed_turn \
  --session-id "$SESSION_ID" \
  -p "Reply with exactly ok and nothing else. transcript-search-smoke-needle-1"

for index in 2 3; do
  run_seed_turn \
    --resume "$SESSION_ID" \
    -p "Reply with exactly ok and nothing else. transcript-search-smoke-needle-$index"
done

if ! python3 - "$OUTPUT_FILE" <<'PY'
import fcntl
import os
import pty
import re
import select
import signal
import struct
import subprocess
import sys
import termios
import time

output_path = sys.argv[1]
env = os.environ.copy()
env["PATH"] = f"/Users/bretlindquist/.bun/bin:{env.get('PATH', '')}"
env["TERM"] = env.get("TERM", "xterm-256color")
env["CLAUDE_CODE_USE_OPENAI_CODEX"] = "1"
env["DEBUG"] = "true"
env["CLAUDE_CODE_DEBUG_LOGS_DIR"] = os.environ["DEBUG_LOG_FILE"]

needle = "transcript-search-smoke-needle"
session_id = os.environ["SESSION_ID"]
debug_log_path = os.environ["DEBUG_LOG_FILE"]

master_fd, slave_fd = pty.openpty()
fcntl.ioctl(slave_fd, termios.TIOCSWINSZ, struct.pack("HHHH", 42, 140, 0, 0))
proc = subprocess.Popen(
    ["node", "dist/cli.js", "--resume", session_id, "--bare"],
    cwd=os.getcwd(),
    env=env,
    stdin=slave_fd,
    stdout=slave_fd,
    stderr=slave_fd,
    start_new_session=True,
)
os.close(slave_fd)

prompt_marker = b"\xe2\x9d\xaf"
transcript_marker = b"Showing detailed transcript"
error_markers = (
    b"ReferenceError",
    b"Cannot access",
    b"is not defined",
    b"API Error:",
    b"400 Bad Request",
    b"No tool call found for function call output",
    b"Error:",
    b"OpenAI/Codex usage limit reached",
)

chunks: list[bytes] = []
ansi_re = re.compile(r"\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")

def joined() -> bytes:
    return b"".join(chunks)

def prompt_count() -> int:
    return joined().count(prompt_marker)

def wait_for_prompt_settle(timeout: float, quiet_period: float = 0.75) -> bytes:
    deadline = time.time() + timeout
    last_size = len(joined())
    stable_since = None
    while time.time() < deadline:
        ready, _, _ = select.select([master_fd], [], [], 0.2)
        if master_fd in ready:
            chunk = os.read(master_fd, 65536)
            if not chunk:
                break
            chunks.append(chunk)
            data = joined()
            if any(marker in data for marker in error_markers):
                return data
            if prompt_marker in data:
                if len(data) != last_size:
                    stable_since = time.time()
                    last_size = len(data)
            continue
        data = joined()
        if prompt_marker in data:
            if stable_since is None:
                stable_since = time.time()
            elif time.time() - stable_since >= quiet_period:
                return data
    return joined()

def enter_transcript_mode(timeout: float) -> bytes:
    attempts = (b"\x0f", b"\x1b[111;5u")
    for index, sequence in enumerate(attempts):
        os.write(master_fd, sequence)
        data = read_until(
            lambda d: transcript_marker in d,
            timeout if index == len(attempts) - 1 else 2,
        )
        if transcript_marker in data:
            return data
    return joined()

def read_until(predicate, timeout: float) -> bytes:
    deadline = time.time() + timeout
    while time.time() < deadline:
        ready, _, _ = select.select([master_fd], [], [], 0.2)
        if master_fd not in ready:
            continue
        chunk = os.read(master_fd, 65536)
        if not chunk:
            break
        chunks.append(chunk)
        data = joined()
        if any(marker in data for marker in error_markers):
            return data
        if predicate(data):
            return data
    return joined()

def pump_output(timeout: float = 0.1) -> None:
    ready, _, _ = select.select([master_fd], [], [], timeout)
    if master_fd not in ready:
        return
    chunk = os.read(master_fd, 65536)
    if chunk:
        chunks.append(chunk)

def type_bytes(data: bytes, delay: float = 0.02) -> None:
    for byte in data:
        os.write(master_fd, bytes([byte]))
        if delay > 0:
            time.sleep(delay)

def wait_for_new_fragment(fragment: bytes, timeout: float) -> bytes:
    starting_size = len(joined())
    return read_until(lambda data: fragment in data[starting_size:], timeout)

def visible_text(data: bytes) -> str:
    return ansi_re.sub("", data.decode("utf-8", "ignore"))

def find_last_footer_count_marker(data: bytes) -> str | None:
    text = visible_text(data)
    footer_matches = re.findall(r"Transcript · ctrl\+o · n/N · ([1-9]\d*/[1-9]\d*)", text)
    if footer_matches:
        return footer_matches[-1]
    matches = re.findall(r"\b([1-9]\d*/[1-9]\d*)\b", text)
    if not matches:
        return None
    return matches[-1]

def wait_for_plain_fragment(fragment: str, timeout: float) -> bytes:
    starting_size = len(joined())
    return read_until(lambda data: fragment in visible_text(data[starting_size:]), timeout)

def wait_for_visible_fragment(fragment: str, timeout: float) -> bytes:
    return read_until(lambda data: fragment in visible_text(data), timeout)

def find_last_footer_badge(data: bytes) -> str | None:
    text = visible_text(data)
    matches = re.findall(r"Transcript · ctrl\+o · n/N · ([1-9]\d*/[1-9]\d*)", text)
    if not matches:
        return None
    return matches[-1]

def wait_for_footer_badge(previous: str | None, timeout: float) -> str | None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        pump_output(0.1)
        badge = find_last_footer_badge(joined())
        if badge is not None and badge != previous:
            return badge
        time.sleep(0.1)
    return find_last_footer_badge(joined())

def read_debug_log() -> str:
    try:
        with open(debug_log_path, encoding="utf-8") as fh:
            return fh.read()
    except FileNotFoundError:
        return ""

def find_last_debug_badge(log_text: str) -> str | None:
    matches = re.findall(
        r"(?:badge=|transcriptSearchBadge:\s*)([1-9]\d*/[1-9]\d*)",
        log_text,
    )
    if not matches:
        return None
    return matches[-1]

def wait_for_debug_badge(previous: str | None, timeout: float) -> str | None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        badge = find_last_debug_badge(read_debug_log())
        if badge is not None and badge != previous:
            return badge
        time.sleep(0.1)
    return find_last_debug_badge(read_debug_log())

def wait_for_specific_debug_badge(expected: str, timeout: float) -> str | None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        badge = find_last_debug_badge(read_debug_log())
        if badge == expected:
            return badge
        time.sleep(0.1)
    return find_last_debug_badge(read_debug_log())

def wait_for_debug_fragment(fragment: str, timeout: float) -> str:
    deadline = time.time() + timeout
    while time.time() < deadline:
        log_text = read_debug_log()
        if fragment in log_text:
            return log_text
        time.sleep(0.1)
    return read_debug_log()

def wait_for_debug_query(query: str, timeout: float) -> str:
    return wait_for_debug_fragment(f"setSearchQuery('{query}')", timeout)

def collect_debug_badges() -> list[str]:
    return re.findall(
        r"(?:highlight\(.*?badge=|transcriptSearchBadge:\s*)([1-9]\d*/[1-9]\d*)",
        read_debug_log(),
    )

def condensed_badges() -> list[str]:
    condensed: list[str] = []
    for badge in collect_debug_badges():
        if not condensed or condensed[-1] != badge:
            condensed.append(badge)
    return condensed

def wait_for_badge_quiescence(timeout: float, quiet_period: float = 1.0) -> list[str]:
    deadline = time.time() + timeout
    last = condensed_badges()
    stable_since = time.time()
    while time.time() < deadline:
        pump_output(0.1)
        current = condensed_badges()
        if current != last:
            last = current
            stable_since = time.time()
        elif time.time() - stable_since >= quiet_period:
            return current
        time.sleep(0.1)
    return condensed_badges()

def assert_stable_badge(expected: str, timeout: float, label: str) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        pump_output(0.1)
        footer_badge = find_last_footer_badge(joined())
        debug_badge = find_last_debug_badge(read_debug_log())
        if footer_badge not in (None, expected):
            raise RuntimeError(
                f"{label} drifted footer badge away from {expected!r}: got {footer_badge!r}"
            )
        if debug_badge not in (None, expected):
            raise RuntimeError(
                f"{label} drifted debug badge away from {expected!r}: got {debug_badge!r}"
            )
        time.sleep(0.1)

exit_code = 0

try:
    data = wait_for_prompt_settle(20)
    if prompt_marker not in data:
        exit_code = 1
        raise RuntimeError("prompt never settled before transcript search probe")

    data = enter_transcript_mode(15)
    if transcript_marker not in data:
        exit_code = 2
        raise RuntimeError("did not enter transcript mode")

    os.write(master_fd, b"/")
    data = wait_for_plain_fragment("indexing", 15)
    if "indexing" not in visible_text(data):
        exit_code = 3
        raise RuntimeError("transcript search bar did not open")

    os.write(master_fd, needle.encode())
    data = wait_for_plain_fragment(needle, 15)
    if needle not in visible_text(data):
        exit_code = 4
        raise RuntimeError("transcript search bar did not receive the query text")

    os.write(master_fd, b"\r")
    data = wait_for_plain_fragment("Transcript · ctrl+o · n/N ·", 20)
    current_marker = find_last_footer_count_marker(data)
    if current_marker is None:
        exit_code = 5
        raise RuntimeError("transcript search did not close into footer navigation state")
    if current_marker != "1/3":
        exit_code = 6
        raise RuntimeError(
            f"transcript search should begin at the first of three seeded matches, got {current_marker}"
        )

    baseline_badges = wait_for_badge_quiescence(12)
    if not baseline_badges:
        exit_code = 7
        raise RuntimeError("transcript search never resolved an active badge after close")
    if baseline_badges[-1] != "1/3":
        exit_code = 8
        raise RuntimeError(
            f"debug badge should agree with the initial footer badge, got {baseline_badges[-1]!r}"
        )

    observed: list[str] = []
    last_badge = baseline_badges[-1]
    for expected in ("2/3", "3/3", "1/3"):
        os.write(master_fd, b"n")
        next_badge = wait_for_debug_badge(last_badge, 12)
        if next_badge is None or next_badge == last_badge:
            exit_code = 9
            raise RuntimeError(
                f"transcript search did not advance after n: baseline={baseline_badges!r} observed={observed!r}"
            )
        observed.append(next_badge)
        if next_badge != expected:
            exit_code = 11
            raise RuntimeError(
                f"transcript search advanced to an impossible badge state after n: expected={expected!r} debug={next_badge!r}"
            )
        last_badge = next_badge
        wait_for_badge_quiescence(8)

    if observed != ["2/3", "3/3", "1/3"]:
        exit_code = 12
        raise RuntimeError(
            f"transcript search n-cycle drifted: debug={observed!r}"
        )

    reverse_debug: list[str] = []
    for expected in ("3/3", "2/3"):
        os.write(master_fd, b"N")
        next_badge = wait_for_debug_badge(last_badge, 12)
        if next_badge != expected:
            exit_code = 13
            raise RuntimeError(
                f"transcript search reverse navigation drifted after N: expected={expected!r} debug={next_badge!r}"
            )
        reverse_debug.append(next_badge)
        last_badge = next_badge
        wait_for_badge_quiescence(8)

    if reverse_debug != ["3/3", "2/3"]:
        exit_code = 14
        raise RuntimeError(
            f"transcript search N-cycle drifted: debug={reverse_debug!r}"
        )

    os.write(master_fd, b"/")
    data = wait_for_plain_fragment("indexing", 15)
    if "indexing" not in visible_text(data):
        exit_code = 15
        raise RuntimeError("transcript search bar did not reopen for the single-match probe")
    wait_for_badge_quiescence(4, quiet_period=0.5)
    time.sleep(0.2)
    data = wait_for_visible_fragment(needle, 8)
    if needle not in visible_text(data):
        exit_code = 16
        raise RuntimeError("reopened transcript search did not surface the preserved query")

    unique_needle = "transcript-search-smoke-needle-2"
    type_bytes(b"-2")
    log_text = wait_for_debug_query(unique_needle, 8)
    if f"setSearchQuery('{unique_needle}')" not in log_text:
        exit_code = 17
        raise RuntimeError("reopened transcript search did not accept the single-match query text")
    single_live_badge = wait_for_specific_debug_badge("1/1", 12)
    if single_live_badge != "1/1":
        exit_code = 18
        raise RuntimeError(
            f"single-match transcript search should resolve to 1/1 before close, got {single_live_badge!r}"
        )

    os.write(master_fd, b"\r")
    single_badge = wait_for_specific_debug_badge("1/1", 12)
    if single_badge != "1/1":
        exit_code = 19
        raise RuntimeError(
            f"single-match transcript search should report 1/1, got {single_badge!r}"
        )

    last_badge = single_badge
    single_badges = wait_for_badge_quiescence(12)
    if not single_badges or single_badges[-1] != "1/1":
        exit_code = 20
        raise RuntimeError(
            f"single-match debug badge should settle at 1/1, got {single_badges!r}"
        )

    os.write(master_fd, b"n")
    assert_stable_badge("1/1", 3, "single-match forward navigation")

    os.write(master_fd, b"N")
    assert_stable_badge("1/1", 3, "single-match reverse navigation")
except RuntimeError as error:
    print(str(error), file=sys.stderr)
finally:
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        proc.wait(timeout=5)
    os.close(master_fd)

output = joined().decode("utf-8", "ignore")
with open(output_path, "w", encoding="utf-8") as fh:
    fh.write(output)
sys.exit(exit_code)
PY
then
  cat "$OUTPUT_FILE"
  echo "repl-transcript-search-smoke failed: transcript search probe did not complete" >&2
  exit 1
fi

if grep -Eq 'ReferenceError|Cannot access|is not defined|API Error:|400 Bad Request|No tool call found for function call output|Error:' "$OUTPUT_FILE"; then
  cat "$OUTPUT_FILE"
  echo "repl-transcript-search-smoke failed: transcript mode threw a runtime or provider error" >&2
  exit 1
fi

if grep -Fq 'OpenAI/Codex usage limit reached' "$OUTPUT_FILE"; then
  cat "$OUTPUT_FILE"
  echo "repl-transcript-search-smoke skipped: OpenAI/Codex usage limit reached" >&2
  exit 1
fi

echo "repl-transcript-search-smoke passed"
