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
DEFAULT_SELF_TEST_TIMEOUT_S = 2
DEFAULT_HARNESS_TIMEOUT_S = 240

SKIP_REASON_PATTERNS: list[tuple[str, str]] = [
    ("usage_limit_reached", "OpenAI/Codex usage limit reached"),
    ("usage limit reached", "OpenAI/Codex usage limit reached"),
    ("429 Too Many Requests", "OpenAI/Codex rate limit reached"),
    ("rate_limit_exceeded", "OpenAI/Codex rate limit reached"),
    ("insufficient_quota", "OpenAI/Codex quota unavailable"),
]

AUTH_FAILURE_PATTERNS: list[str] = [
    "Not logged in",
    "Run /login",
    "not authenticated",
    "authentication error",
    "oauth",
    "expired",
    "invalid_grant",
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


@dataclass(frozen=True)
class Classification:
    kind: str
    reason: str


def normalize_output(stdout: str | None, stderr: str | None) -> str:
    return f"{stdout or ''}\n{stderr or ''}"


def classify_skip(output: str) -> str | None:
    lowered = output.lower()
    for needle, reason in SKIP_REASON_PATTERNS:
        if needle.lower() in lowered:
            return reason
    return None


def classify_failure(output: str) -> Classification:
    lowered = output.lower()
    for needle in AUTH_FAILURE_PATTERNS:
        if needle.lower() in lowered:
            return Classification("auth", "authentication/setup failure")
    return Classification("runtime", "command exited non-zero")


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
        classified = classify_failure(combined_output)
        fail_with_diagnostics(
            step=step,
            message=classified.reason,
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


def run_self_tests() -> int:
    env = os.environ.copy()
    env["CLAUDE_CODE_USE_OPENAI_CODEX"] = "1"

    def assert_contains(expected: str) -> Callable[[str, str], None]:
        def inner(stdout: str, _stderr: str) -> None:
            if expected not in stdout:
                raise StepFailed(f"expected output to contain {expected!r}")

        return inner

    ok_step = Step(
        name="selftest_pass",
        command=[
            "python3",
            "-c",
            "print('ok-pass')",
        ],
        timeout_s=DEFAULT_SELF_TEST_TIMEOUT_S,
        assertion=assert_contains("ok-pass"),
    )
    run_step(ok_step, env)

    skip_step = Step(
        name="selftest_skip",
        command=[
            "python3",
            "-c",
            "import sys; print('usage_limit_reached', file=sys.stderr); raise SystemExit(1)",
        ],
        timeout_s=DEFAULT_SELF_TEST_TIMEOUT_S,
        assertion=assert_not_empty,
    )
    try:
        run_step(skip_step, env)
    except StepSkipped:
        pass
    else:
        print("FAIL selftest_skip")
        print("  reason: skip classification did not trigger")
        return 1

    timeout_step = Step(
        name="selftest_timeout",
        command=[
            "python3",
            "-c",
            "import time; time.sleep(5)",
        ],
        timeout_s=1,
        assertion=assert_not_empty,
    )
    try:
        run_step(timeout_step, env)
    except SystemExit as exc:
        if exc.code != 1:
            raise
    else:
        print("FAIL selftest_timeout")
        print("  reason: timeout classification did not trigger")
        return 1

    auth_step = Step(
        name="selftest_auth",
        command=[
            "python3",
            "-c",
            "import sys; print('Not logged in · Run /login', file=sys.stderr); raise SystemExit(1)",
        ],
        timeout_s=DEFAULT_SELF_TEST_TIMEOUT_S,
        assertion=assert_not_empty,
    )
    try:
        run_step(auth_step, env)
    except SystemExit as exc:
        if exc.code != 1:
            raise
    else:
        print("FAIL selftest_auth")
        print("  reason: auth classification did not trigger")
        return 1

    print("openai-codex-regression self-test passed")
    return 0


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
            name="interactive_status",
            command=["bash", "scripts/repl-status-smoke.sh"],
            timeout_s=70,
            assertion=assert_not_empty,
        ),
        Step(
            name="interactive_btw",
            command=["bash", "scripts/repl-btw-smoke.sh"],
            timeout_s=90,
            assertion=assert_not_empty,
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


def resolve_harness_timeout_s() -> int:
    raw = os.environ.get("OPENAI_CODEX_CHECK_TIMEOUT_S", "").strip()
    if not raw:
        return DEFAULT_HARNESS_TIMEOUT_S
    try:
        value = int(raw)
    except ValueError:
        return DEFAULT_HARNESS_TIMEOUT_S
    return value if value > 0 else DEFAULT_HARNESS_TIMEOUT_S


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "--self-test":
        return run_self_tests()

    env = os.environ.copy()
    env["CLAUDE_CODE_USE_OPENAI_CODEX"] = "1"

    started = time.time()
    harness_timeout_s = resolve_harness_timeout_s()
    steps = build_steps()
    passed_steps = 0
    try:
        for step in steps:
            elapsed = time.time() - started
            if elapsed >= harness_timeout_s:
                print("TIMEOUT harness")
                print(f"  reason: overall regression deadline exceeded {harness_timeout_s}s before {step.name}")
                print(f"  summary: passed={passed_steps} remaining={len(steps) - passed_steps}")
                return 1
            run_step(step, env)
            passed_steps += 1
    except StepSkipped as exc:
        duration_s = time.time() - started
        print(
            f"openai-codex-regression skipped: {exc.reason} ({duration_s:.1f}s) "
            f"[passed={passed_steps} skipped=1 failed=0]",
            file=sys.stderr,
        )
        return 0

    duration_s = time.time() - started
    print(
        f"openai-codex-regression passed ({duration_s:.1f}s) "
        f"[passed={passed_steps} skipped=0 failed=0 timeout={harness_timeout_s}s]"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
