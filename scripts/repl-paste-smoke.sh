#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOG_FILE="$(mktemp -t repl-paste-smoke.XXXXXX.log)"

set +e
python3 <<'PY' >"$LOG_FILE"
import os
import pty
import re
import select
import signal
import subprocess
import sys
import time

PASTED_TEXT = "paste smoke"
PASTE_SEQUENCE = "\x1b[200~" + PASTED_TEXT + "\x1b[201~"
ERROR_MARKERS = (
    "ERROR  ",
    "ReferenceError:",
    "TypeError:",
    "SyntaxError:",
)


def strip_ansi(text: str) -> str:
    text = re.sub(r"\x1b\][^\x07]*(?:\x07|\x1b\\)", "", text)
    text = re.sub(r"\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])", "", text)
    return text.replace("\r", "")


def compact(text: str) -> str:
    return re.sub(r"\s+", "", text)


master_fd, slave_fd = pty.openpty()
env = os.environ.copy()
env.setdefault("TERM", "xterm-256color")
env.setdefault("COLORTERM", "truecolor")

proc = subprocess.Popen(
    ["node", "dist/cli.js"],
    stdin=slave_fd,
    stdout=slave_fd,
    stderr=slave_fd,
    cwd=os.getcwd(),
    env=env,
    close_fds=True,
    start_new_session=True,
)
os.close(slave_fd)

deadline = time.time() + 45
buffer = ""
prompt_seen = False
paste_seen = False
error_seen = False

try:
    while time.time() < deadline:
        ready, _, _ = select.select([master_fd], [], [], 0.1)
        if master_fd in ready:
            chunk = os.read(master_fd, 65536)
            if not chunk:
                break
            buffer += chunk.decode("utf-8", errors="ignore")

        plain = strip_ansi(buffer)
        compact_plain = compact(plain)
        if any(marker in plain for marker in ERROR_MARKERS):
            error_seen = True
            break
        if (
            not prompt_seen
            and compact_plain.count("❯") >= 2
            and "Freshsessionbydefault." in compact_plain
            and "Lane:general" in compact_plain
        ):
            os.write(master_fd, PASTE_SEQUENCE.encode())
            prompt_seen = True
            continue
        if prompt_seen and compact(PASTED_TEXT) in compact_plain:
            paste_seen = True
            break
        if proc.poll() is not None:
            break
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

plain = strip_ansi(buffer)
sys.stdout.write(plain)

if error_seen:
    sys.exit(2)
if not prompt_seen:
    sys.exit(3)
if not paste_seen:
    sys.exit(4)
PY
status=$?
set -e

if [[ $status -eq 2 ]]; then
  echo "repl-paste-smoke failed: REPL threw a runtime error during paste handling" >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

if [[ $status -eq 3 ]]; then
  echo "repl-paste-smoke failed: REPL did not reach an interactive prompt" >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

if [[ $status -eq 4 ]]; then
  echo "repl-paste-smoke failed: bracketed paste did not appear in the prompt" >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

echo "repl-paste-smoke passed"
