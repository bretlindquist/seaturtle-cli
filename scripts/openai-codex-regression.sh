#!/usr/bin/env zsh
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

if [[ "${LC_ALL:-}" == "C.UTF-8" ]]; then
  unset LC_ALL
fi

export CLAUDE_CODE_USE_OPENAI_CODEX=1

plain_text_output="$(node dist/cli.js -p "say hello in five words")"
if [[ -z "$plain_text_output" ]]; then
  echo "error: plain-text OpenAI/Codex run returned empty output" >&2
  exit 1
fi

stream_output="$(
  node dist/cli.js \
    -p "say hello in five words" \
    --output-format stream-json \
    --verbose \
    --include-partial-messages
)"
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

tool_output="$(node dist/cli.js -p "Use the Bash tool to run 'pwd' and reply with only the resulting path.")"
expected_path="$repo_root"
if [[ "$tool_output" != "$expected_path" ]]; then
  echo "error: OpenAI/Codex tool turn returned unexpected path" >&2
  echo "expected: $expected_path" >&2
  echo "actual:   $tool_output" >&2
  exit 1
fi

stream_tool_output="$(
  node dist/cli.js \
    -p "Use the Bash tool to run 'pwd' and reply with only the resulting path." \
    --output-format stream-json \
    --verbose \
    --include-partial-messages
)"
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
first_turn_output="$(node dist/cli.js --session-id "$session_id" -p "Use the Bash tool to run 'pwd' and reply with only the resulting path.")"
if [[ "$first_turn_output" != "$expected_path" ]]; then
  echo "error: OpenAI/Codex first session turn returned unexpected path" >&2
  echo "expected: $expected_path" >&2
  echo "actual:   $first_turn_output" >&2
  exit 1
fi

replay_output="$(node dist/cli.js --resume "$session_id" -p "What path did the Bash tool return last turn? Reply with only the path.")"
if [[ "$replay_output" != "$expected_path" ]]; then
  echo "error: OpenAI/Codex replay turn returned unexpected path" >&2
  echo "expected: $expected_path" >&2
  echo "actual:   $replay_output" >&2
  exit 1
fi

echo "openai-codex-regression passed"
