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
import os
import pty
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
    os.write(master_fd, b"Reply with exactly ok and nothing else.\r")
    data = read_until(
        lambda d: b"ok" in d.lower() and prompt_count() >= starting_prompts + 1,
        45,
    )
    if b"ok" not in data.lower():
        raise SystemExit(2)

    os.write(master_fd, b"/status\r")
    data = read_until(
        lambda d: b"5h limit:" in d and b"Collaboration mode:" in d,
        20,
    )
    if b"5h limit:" not in data or b"Collaboration mode:" not in data:
        raise SystemExit(3)
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

if grep -Eq 'ReferenceError|Cannot access|is not defined|Error:' "$OUTPUT_FILE"; then
  cat "$OUTPUT_FILE"
  echo "repl-status-smoke failed: REPL threw a runtime error" >&2
  exit 1
fi

if grep -Fq 'OpenAI/Codex usage limit reached' "$OUTPUT_FILE"; then
  cat "$OUTPUT_FILE"
  echo "repl-status-smoke skipped: OpenAI/Codex usage limit reached" >&2
  exit 1
fi

if ! grep -Fq '5h limit:' "$OUTPUT_FILE" || ! grep -Fq 'Collaboration mode:' "$OUTPUT_FILE"; then
  cat "$OUTPUT_FILE"
  echo "repl-status-smoke failed: /status did not render Codex telemetry" >&2
  exit 1
fi

AUTH_STATUS_JSON="$(node dist/cli.js auth status --json)"

python3 - "$AUTH_STATUS_JSON" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
usage = payload.get("openAiCodexUsageTelemetry")

if not isinstance(usage, dict):
    raise SystemExit("missing openAiCodexUsageTelemetry in auth status JSON")

if not isinstance(usage.get("updatedAt"), int):
    raise SystemExit("missing updatedAt in persisted OpenAI/Codex usage telemetry")

five_hour = usage.get("fiveHour")
weekly = usage.get("weekly")
if not isinstance(five_hour, dict) or not isinstance(weekly, dict):
    raise SystemExit("missing fiveHour/weekly usage windows in auth status JSON")

collaboration_mode = payload.get("openAiCodexCollaborationMode")
if collaboration_mode not in {"Default", "Background"}:
    raise SystemExit("missing OpenAI/Codex collaboration mode in auth status JSON")
PY

echo "repl-status-smoke passed"
