#!/usr/bin/env zsh
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

if [[ "${LC_ALL:-}" == "C.UTF-8" ]]; then
  unset LC_ALL
fi

export CLAUDE_CODE_USE_OPENAI_CODEX=1

readonly OPENAI_CODEX_SKIP_SENTINEL="__OPENAI_CODEX_CHECK_SKIPPED__"

run_openai_cli() {
  local output
  if ! output="$("$@" 2>&1)"; then
    if [[ "$output" == *'"usage_limit_reached"'* ]] || [[ "$output" == *'429 Too Many Requests'* ]]; then
      print -r -- "${OPENAI_CODEX_SKIP_SENTINEL}:OpenAI/Codex usage limit reached"
      return 0
    fi
    echo "$output" >&2
    exit 1
  fi
  print -r -- "$output"
}

exit_if_skipped() {
  local output="$1"
  if [[ "$output" == "${OPENAI_CODEX_SKIP_SENTINEL}:"* ]]; then
    echo "openai-codex-regression skipped: ${output#${OPENAI_CODEX_SKIP_SENTINEL}:}" >&2
    exit 0
  fi
}

plain_text_output="$(run_openai_cli node dist/cli.js -p "say hello in five words")"
exit_if_skipped "$plain_text_output"
if [[ -z "$plain_text_output" ]]; then
  echo "error: plain-text OpenAI/Codex run returned empty output" >&2
  exit 1
fi

stream_output="$(
  run_openai_cli node dist/cli.js \
    -p "say hello in five words" \
    --output-format stream-json \
    --verbose \
    --include-partial-messages
)"
exit_if_skipped "$stream_output"
if ! print -r -- "$stream_output" | rg -q '"type":"stream_event".*"type":"message_start"'; then
  echo "error: streamed OpenAI/Codex run did not emit message_start" >&2
  exit 1
fi
if ! print -r -- "$stream_output" | rg -q '"type":"stream_event".*"type":"content_block_delta".*"type":"text_delta"'; then
  echo "error: streamed OpenAI/Codex run did not emit text deltas" >&2
  exit 1
fi
if ! print -r -- "$stream_output" | rg -q '"type":"assistant"'; then
  echo "error: streamed OpenAI/Codex run did not emit an assistant message" >&2
  exit 1
fi
if ! print -r -- "$stream_output" | rg -q '"type":"result".*"subtype":"success"'; then
  echo "error: streamed OpenAI/Codex run did not finish successfully" >&2
  exit 1
fi

tool_output="$(run_openai_cli node dist/cli.js -p "Use the Bash tool to run 'pwd' and reply with only the resulting path.")"
exit_if_skipped "$tool_output"
expected_path="$repo_root"
if [[ "$tool_output" != "$expected_path" ]]; then
  echo "error: OpenAI/Codex tool turn returned unexpected path" >&2
  echo "expected: $expected_path" >&2
  echo "actual:   $tool_output" >&2
  exit 1
fi

stream_tool_output="$(
  run_openai_cli node dist/cli.js \
    -p "Use the Bash tool to run 'pwd' and reply with only the resulting path." \
    --output-format stream-json \
    --verbose \
    --include-partial-messages
)"
exit_if_skipped "$stream_tool_output"
if ! print -r -- "$stream_tool_output" | rg -q '"type":"stream_event".*"content_block_start".*"type":"tool_use"'; then
  echo "error: streamed OpenAI/Codex tool turn did not emit tool_use start" >&2
  exit 1
fi
if ! print -r -- "$stream_tool_output" | rg -q '"type":"stream_event".*"type":"input_json_delta"'; then
  echo "error: streamed OpenAI/Codex tool turn did not emit input_json_delta" >&2
  exit 1
fi
if ! print -r -- "$stream_tool_output" | rg -q "\"type\":\"result\".*\"result\":\"$expected_path\""; then
  echo "error: streamed OpenAI/Codex tool turn returned unexpected final path" >&2
  exit 1
fi

session_id="$(uuidgen)"
first_turn_output="$(run_openai_cli node dist/cli.js --session-id "$session_id" -p "Use the Bash tool to run 'pwd' and reply with only the resulting path.")"
exit_if_skipped "$first_turn_output"
if [[ "$first_turn_output" != "$expected_path" ]]; then
  echo "error: OpenAI/Codex first session turn returned unexpected path" >&2
  echo "expected: $expected_path" >&2
  echo "actual:   $first_turn_output" >&2
  exit 1
fi

replay_output="$(run_openai_cli node dist/cli.js --resume "$session_id" -p "What path did the Bash tool return last turn? Reply with only the path.")"
exit_if_skipped "$replay_output"
if [[ "$replay_output" != "$expected_path" ]]; then
  echo "error: OpenAI/Codex replay turn returned unexpected path" >&2
  echo "expected: $expected_path" >&2
  echo "actual:   $replay_output" >&2
  exit 1
fi

strict_session_id="$(uuidgen)"
strict_todo_output="$(
  run_openai_cli node dist/cli.js \
    --session-id "$strict_session_id" \
    -p "Use only the TodoWrite tool to create a single todo named strict-proof and reply with only the word done."
)"
exit_if_skipped "$strict_todo_output"
if [[ "$strict_todo_output" != "done" ]]; then
  echo "error: OpenAI/Codex strict TodoWrite turn returned unexpected result" >&2
  echo "expected: done" >&2
  echo "actual:   $strict_todo_output" >&2
  exit 1
fi

strict_stream_output="$(
  run_openai_cli node dist/cli.js \
    -p "Use only the TodoWrite tool to create a single todo named strict-proof and reply with only the word done." \
    --output-format stream-json \
    --verbose \
    --include-partial-messages
)"
exit_if_skipped "$strict_stream_output"
if ! print -r -- "$strict_stream_output" | rg -q '"type":"stream_event".*"content_block_start".*"name":"TodoWrite"'; then
  echo "error: strict TodoWrite stream did not emit a TodoWrite tool_use start" >&2
  exit 1
fi
if ! print -r -- "$strict_stream_output" | rg -q '"type":"stream_event".*"type":"input_json_delta"'; then
  echo "error: strict TodoWrite stream did not emit input_json_delta" >&2
  exit 1
fi
if ! print -r -- "$strict_stream_output" | rg -q '"type":"result".*"result":"done"'; then
  echo "error: strict TodoWrite stream did not finish with done" >&2
  exit 1
fi

strict_replay_output="$(
  run_openai_cli node dist/cli.js \
    --resume "$strict_session_id" \
    -p "What todo did you add last turn? Reply with only the todo content."
)"
exit_if_skipped "$strict_replay_output"
if [[ "$strict_replay_output" != "strict-proof" ]]; then
  echo "error: strict TodoWrite replay returned unexpected result" >&2
  echo "expected: strict-proof" >&2
  echo "actual:   $strict_replay_output" >&2
  exit 1
fi

echo "openai-codex-regression passed"
