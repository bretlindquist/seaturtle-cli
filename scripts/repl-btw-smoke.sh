#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PATH="/Users/bretlindquist/.bun/bin:$PATH"
export CLAUDE_CODE_USE_OPENAI_CODEX=1

cd "$ROOT_DIR"

OUTPUT_FILE="$(mktemp)"

cleanup() {
  rm -f "$OUTPUT_FILE"
}
trap cleanup EXIT

python3 - "$OUTPUT_FILE" <<'PY'
import fcntl
import os
import pty
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

master_fd, slave_fd = pty.openpty()
fcntl.ioctl(slave_fd, termios.TIOCSWINSZ, struct.pack("HHHH", 42, 140, 0, 0))
proc = subprocess.Popen(
    ["node", "dist/cli.js", "--bare"],
    cwd=os.getcwd(),
    env=env,
    stdin=slave_fd,
    stdout=slave_fd,
    stderr=slave_fd,
    start_new_session=True,
)
os.close(slave_fd)

prompt_marker = b"\xe2\x9d\xaf"
expected_path = os.getcwd().encode("utf-8")
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

def joined() -> bytes:
    return b"".join(chunks)

def prompt_count() -> int:
    return joined().count(prompt_marker)

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

try:
    read_until(lambda d: prompt_marker in d, 20)

    starting_prompts = prompt_count()
    os.write(
        master_fd,
        b"Use the Bash tool to run 'pwd' and reply with only the resulting path.\r",
    )
    data = read_until(
        lambda d: expected_path in d and prompt_count() >= starting_prompts + 1,
        50,
    )
    if expected_path not in data:
        raise SystemExit(2)

    prompts_after_tool_turn = prompt_count()
    os.write(master_fd, b"/btw Reply with exactly side-ok and nothing else.\r")
    data = read_until(
        lambda d: b"side-ok" in d.lower() and prompt_count() >= prompts_after_tool_turn,
        35,
    )
    if b"side-ok" not in data.lower():
        raise SystemExit(3)

    os.write(master_fd, b"\x1b")
    data = read_until(lambda d: prompt_count() >= prompts_after_tool_turn + 1, 10)
    if prompt_count() < prompts_after_tool_turn + 1:
        raise SystemExit(4)
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
PY

if grep -Eq 'ReferenceError|Cannot access|is not defined|API Error:|400 Bad Request|No tool call found for function call output|Error:' "$OUTPUT_FILE"; then
  cat "$OUTPUT_FILE"
  echo "repl-btw-smoke failed: /btw triggered a runtime or provider error" >&2
  exit 1
fi

if grep -Fq 'OpenAI/Codex usage limit reached' "$OUTPUT_FILE"; then
  cat "$OUTPUT_FILE"
  echo "repl-btw-smoke skipped: OpenAI/Codex usage limit reached" >&2
  exit 1
fi

if ! grep -Fqi 'side-ok' "$OUTPUT_FILE"; then
  cat "$OUTPUT_FILE"
  echo "repl-btw-smoke failed: /btw did not return the expected side answer" >&2
  exit 1
fi

echo "repl-btw-smoke passed"
