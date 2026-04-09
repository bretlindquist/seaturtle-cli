#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import shlex
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


REPO_ROOT = Path(__file__).resolve().parent.parent
EXPECTED_PATH = str(REPO_ROOT)

SKIP_REASON_PATTERNS: list[tuple[str, str]] = [
    ("usage_limit_reached", "OpenAI/Codex usage limit reached"),
    ("429 Too Many Requests", "OpenAI/Codex rate limit reached"),
    ("rate_limit_exceeded", "OpenAI/Codex rate limit reached"),
    ("insufficient_quota", "OpenAI/Codex quota unavailable"),
]


class StepSkipped(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class StepFailed(Exception):
    pass


@dataclass(frozen=True)
class Step:
    name: str
    command: list[str]
    timeout_s: int
    assertion: Callable[[str, str], None]


def normalize_output(stdout: str | None, stderr: str | None) -> str:
    return f"{stdout or ''}\n{stderr or ''}"


def classify_skip(output: str) -> str | None:
    for needle, reason in SKIP_REASON_PATTERNS:
        if needle in output:
            return reason
    return None


def truncate(text: str, limit: int = 4000) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "\n...[truncated]"


def fail_with_diagnostics(
    *,
    step: Step,
    message: str,
    stdout: str = "",
    stderr: str = "",
    exit_code: int | None = None,
    timeout: bool = False,
) -> None:
    prefix = "TIMEOUT" if timeout else "FAIL"
    print(f"{prefix} {step.name}")
    print(f"  command: {shlex.join(step.command)}")
    if exit_code is not None:
      print(f"  exit_code: {exit_code}")
    print(f"  reason: {message}")
    if stdout:
        print("  stdout:")
        print(truncate(stdout))
    if stderr:
        print("  stderr:")
        print(truncate(stderr))
    raise SystemExit(1)


def assert_not_empty(stdout: str, _stderr: str) -> None:
    if not stdout.strip():
        raise StepFailed("plain-text run returned empty output")


def assert_stream_text(stdout: str, _stderr: str) -> None:
    required_patterns = [
        (r'"type":"stream_event".*"type":"message_start"', "stream did not emit message_start"),
        (r'"type":"stream_event".*"type":"content_block_delta".*"type":"text_delta"', "stream did not emit text deltas"),
        (r'"type":"assistant"', "stream did not emit an assistant message"),
        (r'"type":"result".*"subtype":"success"', "stream did not finish successfully"),
    ]
    for pattern, message in required_patterns:
        if not re.search(pattern, stdout):
            raise StepFailed(message)


def assert_equals(expected: str, label: str) -> Callable[[str, str], None]:
    def inner(stdout: str, _stderr: str) -> None:
        actual = stdout.strip()
        if actual != expected:
            raise StepFailed(f"{label} returned unexpected result\nexpected: {expected}\nactual:   {actual}")

    return inner


def assert_stream_tool_path(stdout: str, _stderr: str) -> None:
    required_patterns = [
        (r'"type":"stream_event".*"content_block_start".*"type":"tool_use"', "streamed tool turn did not emit tool_use start"),
        (r'"type":"stream_event".*"type":"input_json_delta"', "streamed tool turn did not emit input_json_delta"),
        (rf'"type":"result".*"result":"{re.escape(EXPECTED_PATH)}"', "streamed tool turn returned unexpected final path"),
    ]
    for pattern, message in required_patterns:
        if not re.search(pattern, stdout):
            raise StepFailed(message)


def assert_stream_todowrite(stdout: str, _stderr: str) -> None:
    required_patterns = [
        (r'"type":"stream_event".*"content_block_start".*"name":"TodoWrite"', "strict TodoWrite stream did not emit a TodoWrite tool_use start"),
        (r'"type":"stream_event".*"type":"input_json_delta"', "strict TodoWrite stream did not emit input_json_delta"),
        (r'"type":"result".*"result":"done"', "strict TodoWrite stream did not finish with done"),
    ]
    for pattern, message in required_patterns:
        if not re.search(pattern, stdout):
            raise StepFailed(message)


def run_step(step: Step, env: dict[str, str]) -> None:
    print(f"START {step.name}")
    started = time.time()
    try:
        completed = subprocess.run(
            step.command,
            cwd=REPO_ROOT,
            env=env,
            capture_output=True,
            text=True,
            timeout=step.timeout_s,
        )
    except subprocess.TimeoutExpired as exc:
        fail_with_diagnostics(
            step=step,
            message=f"step exceeded {step.timeout_s}s",
            stdout=exc.stdout or "",
            stderr=exc.stderr or "",
            timeout=True,
        )

    stdout = completed.stdout or ""
    stderr = completed.stderr or ""
    combined_output = normalize_output(stdout, stderr)

    if completed.returncode != 0:
        skip_reason = classify_skip(combined_output)
        if skip_reason:
            print(f"SKIP {step.name}: {skip_reason}")
            raise StepSkipped(skip_reason)
        fail_with_diagnostics(
            step=step,
            message="command exited non-zero",
            stdout=stdout,
            stderr=stderr,
            exit_code=completed.returncode,
        )

    skip_reason = classify_skip(combined_output)
    if skip_reason:
        print(f"SKIP {step.name}: {skip_reason}")
        raise StepSkipped(skip_reason)

    try:
        step.assertion(stdout, stderr)
    except StepFailed as exc:
        fail_with_diagnostics(
            step=step,
            message=str(exc),
            stdout=stdout,
            stderr=stderr,
            exit_code=completed.returncode,
        )

    duration_s = time.time() - started
    print(f"PASS {step.name} ({duration_s:.1f}s)")


def build_steps() -> list[Step]:
    session_id = str(uuid.uuid4())
    strict_session_id = str(uuid.uuid4())
    return [
        Step(
            name="plain_text",
            command=["node", "dist/cli.js", "-p", "say hello in five words"],
            timeout_s=20,
            assertion=assert_not_empty,
        ),
        Step(
            name="stream_text",
            command=[
                "node",
                "dist/cli.js",
                "-p",
                "say hello in five words",
                "--output-format",
                "stream-json",
                "--verbose",
                "--include-partial-messages",
            ],
            timeout_s=30,
            assertion=assert_stream_text,
        ),
        Step(
            name="tool_plain",
            command=[
                "node",
                "dist/cli.js",
                "-p",
                "Use the Bash tool to run 'pwd' and reply with only the resulting path.",
            ],
            timeout_s=30,
            assertion=assert_equals(EXPECTED_PATH, "OpenAI/Codex tool turn"),
        ),
        Step(
            name="tool_stream",
            command=[
                "node",
                "dist/cli.js",
                "-p",
                "Use the Bash tool to run 'pwd' and reply with only the resulting path.",
                "--output-format",
                "stream-json",
                "--verbose",
                "--include-partial-messages",
            ],
            timeout_s=40,
            assertion=assert_stream_tool_path,
        ),
        Step(
            name="session_first_turn",
            command=[
                "node",
                "dist/cli.js",
                "--session-id",
                session_id,
                "-p",
                "Use the Bash tool to run 'pwd' and reply with only the resulting path.",
            ],
            timeout_s=35,
            assertion=assert_equals(EXPECTED_PATH, "OpenAI/Codex first session turn"),
        ),
        Step(
            name="session_replay",
            command=[
                "node",
                "dist/cli.js",
                "--resume",
                session_id,
                "-p",
                "What path did the Bash tool return last turn? Reply with only the path.",
            ],
            timeout_s=25,
            assertion=assert_equals(EXPECTED_PATH, "OpenAI/Codex replay turn"),
        ),
        Step(
            name="strict_todowrite_plain",
            command=[
                "node",
                "dist/cli.js",
                "--session-id",
                strict_session_id,
                "-p",
                "Use only the TodoWrite tool to create a single todo named strict-proof and reply with only the word done.",
            ],
            timeout_s=30,
            assertion=assert_equals("done", "OpenAI/Codex strict TodoWrite turn"),
        ),
        Step(
            name="strict_todowrite_stream",
            command=[
                "node",
                "dist/cli.js",
                "-p",
                "Use only the TodoWrite tool to create a single todo named strict-proof and reply with only the word done.",
                "--output-format",
                "stream-json",
                "--verbose",
                "--include-partial-messages",
            ],
            timeout_s=40,
            assertion=assert_stream_todowrite,
        ),
        Step(
            name="strict_todowrite_replay",
            command=[
                "node",
                "dist/cli.js",
                "--resume",
                strict_session_id,
                "-p",
                "What todo did you add last turn? Reply with only the todo content.",
            ],
            timeout_s=25,
            assertion=assert_equals("strict-proof", "OpenAI/Codex strict TodoWrite replay"),
        ),
    ]


def main() -> int:
    env = os.environ.copy()
    env["CLAUDE_CODE_USE_OPENAI_CODEX"] = "1"

    started = time.time()
    steps = build_steps()
    try:
        for step in steps:
            run_step(step, env)
    except StepSkipped as exc:
        duration_s = time.time() - started
        print(f"openai-codex-regression skipped: {exc.reason} ({duration_s:.1f}s)", file=sys.stderr)
        return 0

    duration_s = time.time() - started
    print(f"openai-codex-regression passed ({duration_s:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
