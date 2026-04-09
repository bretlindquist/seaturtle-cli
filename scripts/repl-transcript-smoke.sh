#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PATH="/Users/bretlindquist/.bun/bin:$PATH"

cd "$ROOT_DIR"

buildct -dev >/dev/null

OUTPUT_FILE="$(mktemp)"

cleanup() {
  rm -f "$OUTPUT_FILE"
}
trap cleanup EXIT

python3 - "$OUTPUT_FILE" <<'PY'
import os
import pty
import select
import signal
import subprocess
import sys
import time

output_path = sys.argv[1]
env = os.environ.copy()
env["PATH"] = f"/Users/bretlindquist/.bun/bin:{env.get('PATH', '')}"
env["TERM"] = env.get("TERM", "xterm-256color")

master_fd, slave_fd = pty.openpty()
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

transcript_marker = b"Showing detailed transcript"
error_markers = (
    b"ReferenceError",
    b"Cannot access",
    b"is not defined",
    b"Error:",
)

chunks: list[bytes] = []

def read_until(predicate, timeout):
    deadline = time.time() + timeout
    while time.time() < deadline:
        ready, _, _ = select.select([master_fd], [], [], 0.2)
        if master_fd not in ready:
            continue
        chunk = os.read(master_fd, 65536)
        if not chunk:
            break
        chunks.append(chunk)
        data = b"".join(chunks)
        if any(marker in data for marker in error_markers):
            return data
        if predicate(data):
            return data
    return b"".join(chunks)

try:
    read_until(lambda d: b"\xe2\x9d\xaf" in d, 20)

    os.write(master_fd, b"/status\r")
    data = read_until(lambda d: b"Status" in d and b"Main model runtime:" in d, 10)
    if b"Status" not in data:
        raise SystemExit(2)

    os.write(master_fd, b"\x0f")
    data = read_until(lambda d: transcript_marker in d, 10)
    if transcript_marker not in data:
        raise SystemExit(3)

    os.write(master_fd, b"q")
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

output = b"".join(chunks).decode("utf-8", "ignore")
with open(output_path, "w", encoding="utf-8") as fh:
    fh.write(output)
PY

if grep -Eq 'ReferenceError|Cannot access|is not defined|Error:' "$OUTPUT_FILE"; then
  cat "$OUTPUT_FILE"
  echo "REPL transcript smoke failed" >&2
  exit 1
fi

if ! grep -Fq 'Showing detailed transcript' "$OUTPUT_FILE"; then
  cat "$OUTPUT_FILE"
  echo "REPL transcript smoke did not enter transcript mode" >&2
  exit 1
fi

echo "REPL transcript smoke passed"
