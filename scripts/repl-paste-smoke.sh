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


def run_case(name: str, payload: str, expect_placeholder: bool) -> None:
    paste_sequence = "\x1b[200~" + payload + "\x1b[201~"
    master_fd, slave_fd = pty.openpty()
    env = os.environ.copy()
    env.setdefault("TERM", "xterm-256color")
    env.setdefault("COLORTERM", "truecolor")
    env["NO_LAUNCH_SCREEN"] = "1"

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
                os.write(master_fd, paste_sequence.encode())
                prompt_seen = True
                continue
            if prompt_seen:
                if expect_placeholder and re.search(r"\[Pastedtext#\d+\+\d+lines\]", compact_plain):
                    paste_seen = True
                    break
                if not expect_placeholder and compact(payload) in compact_plain:
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
    sys.stdout.write(f"=== {name} ===\n")
    sys.stdout.write(plain)

    if error_seen:
        raise SystemExit(2)
    if not prompt_seen:
        raise SystemExit(3)
    if not paste_seen:
        raise SystemExit(4)


run_case("small", "paste smoke", expect_placeholder=False)
run_case(
    "large",
    "\n".join(f"line {i} paste smoke payload" for i in range(1, 69)),
    expect_placeholder=True,
)
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
