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

if ! python3 - "$OUTPUT_FILE" <<'PY'
import os
import pty
import re
import select
import signal
import subprocess
import sys
import time
import fcntl
import struct
import termios

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
error_markers = (
    b"ReferenceError",
    b"Cannot access",
    b"is not defined",
    b"Error:",
)

ansi_re = re.compile(r"\x1b\[[0-9;?]*[ -/]*[@-~]")
chunks: list[bytes] = []

def joined() -> bytes:
    return b"".join(chunks)

def cleaned_text() -> str:
    return ansi_re.sub("", joined().decode("utf-8", "ignore"))

def parse_footer_state(text: str) -> tuple[str | None, str | None]:
    compact = re.sub(r"\s+", " ", text)
    execution_matches = re.findall(
        r"Execution:\s*([A-Za-z ]+?)(?=Permissions:|·|\(|shift\+|$)",
        compact,
    )
    permission_matches = re.findall(
        r"Permissions:\s*([A-Za-z ]+?)(?=·|\(|shift\+|$)",
        compact,
    )
    execution = (
        execution_matches[-1].replace(" ", "").strip().lower()
        if execution_matches
        else None
    )
    permission = (
        permission_matches[-1].replace(" ", "").strip().lower()
        if permission_matches
        else None
    )
    return execution, permission

def read_until(predicate, timeout: float) -> str:
    deadline = time.time() + timeout
    while time.time() < deadline:
      ready, _, _ = select.select([master_fd], [], [], 0.2)
      if master_fd not in ready:
        continue
      chunk = os.read(master_fd, 65536)
      if not chunk:
        break
      chunks.append(chunk)
      text = cleaned_text()
      if any(marker.decode("utf-8", "ignore") in text for marker in error_markers):
        return text
      if predicate(text):
        return text
    return cleaned_text()

initial_execution = None
initial_permission = None
final_execution = None
final_permission = None

try:
    text = read_until(
        lambda t: prompt_marker.decode("utf-8", "ignore") in t and "Execution:" in t and "Permissions:" in t,
        20,
    )
    initial_execution, initial_permission = parse_footer_state(text)
    if initial_execution is None or initial_permission is None:
        raise SystemExit(2)

    os.write(master_fd, b"\x1b[Z")
    previous = text
    text = read_until(
        lambda t: t != previous and "shift+↑↓ to change" in t,
        5,
    )

    os.write(master_fd, b"\x1b[1;2A")
    text = read_until(lambda t: parse_footer_state(t)[0] not in (None, initial_execution), 5)
    updated_execution, current_permission = parse_footer_state(text)
    if updated_execution in (None, initial_execution):
        raise SystemExit(3)

    final_execution, final_permission = parse_footer_state(text)
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

with open(output_path, "w", encoding="utf-8") as fh:
    fh.write(cleaned_text())
    fh.write(
        f"\nINITIAL_EXECUTION={initial_execution}\n"
        f"INITIAL_PERMISSION={initial_permission}\n"
        f"FINAL_EXECUTION={final_execution}\n"
        f"FINAL_PERMISSION={final_permission}\n"
    )
PY
then
  cat "$OUTPUT_FILE"
  echo "repl-footer-controls-smoke failed: PTY interaction did not reach the expected footer state" >&2
  exit 1
fi

if grep -Eq 'ReferenceError|Cannot access|is not defined|Error:' "$OUTPUT_FILE"; then
  cat "$OUTPUT_FILE"
  echo "repl-footer-controls-smoke failed: REPL threw a runtime error" >&2
  exit 1
fi

if ! grep -Fq 'FINAL_EXECUTION=' "$OUTPUT_FILE" || ! grep -Fq 'FINAL_PERMISSION=' "$OUTPUT_FILE"; then
  cat "$OUTPUT_FILE"
  echo "repl-footer-controls-smoke failed: footer controls did not produce a measurable state change" >&2
  exit 1
fi

echo "repl-footer-controls-smoke passed"
