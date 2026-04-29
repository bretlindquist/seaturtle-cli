#!/usr/bin/env zsh
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

# macOS bash warns on LC_ALL=C.UTF-8 because that locale usually does not
# exist there. Keep the repo check quiet and local instead of changing the
# user's global shell locale.
if [[ "${LC_ALL:-}" == "C.UTF-8" ]]; then
  unset LC_ALL
fi

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is required" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "error: npm is required" >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "error: bun is required" >&2
  echo "install it with: curl -fsSL https://bun.sh/install | bash" >&2
  exit 1
fi

echo "Node: $(node --version)"
echo "npm:  $(npm --version)"
echo "Bun:  $(bun --version)"

build_cmd=(node scripts/build-cli.mjs --no-minify)

echo
echo "[1/2] Building"
if ! "${build_cmd[@]}"; then
  echo
  echo "Initial build failed. Resetting generated overlay install state and retrying once."
  rm -rf .cache/workspace/node_modules
  rm -f .cache/workspace/.overlay-install.json
  "${build_cmd[@]}"
fi

echo
echo "[2/3] Smoke check"
node dist/cli.js --help >/dev/null
node dist/cli.js auth status --json >/dev/null
python3 scripts/openai_codex_regression.py --self-test >/dev/null
bun scripts/side_question_context_selftest.ts >/dev/null
bun scripts/project_todo_selftest.ts >/dev/null
bun scripts/project_feedback_selftest.ts >/dev/null
bun scripts/workflow_state_selftest.ts >/dev/null
bun scripts/workflow_runtime_selftest.ts >/dev/null
bun scripts/session_memory_workflow_selftest.ts >/dev/null
bun scripts/workflow_compaction_projection_selftest.ts >/dev/null
bun scripts/autowork_runtime_window_selftest.ts >/dev/null
bun scripts/feedback_command_local_sink_selftest.ts >/dev/null
bun scripts/ct_tip_selftest.ts >/dev/null
bun scripts/help_docs_surface_selftest.ts >/dev/null
bun scripts/config_help_selftest.ts >/dev/null
bun scripts/status_help_selftest.ts >/dev/null
bun scripts/config_home_resolution_selftest.ts >/dev/null
bun scripts/local_installer_path_selftest.ts >/dev/null
bun scripts/branding_command_surface_selftest.ts >/dev/null
bun scripts/completion_cache_paths_selftest.ts >/dev/null
bun scripts/plugin_directory_display_selftest.ts >/dev/null
bun scripts/footer_control_model_selftest.ts >/dev/null
bun scripts/startup_update_surface_selftest.ts >/dev/null
bun scripts/startup_sigint_selftest.ts >/dev/null
bun scripts/remindme_reply_notice_selftest.ts >/dev/null
bun scripts/source_wrapper_update_surface_selftest.ts >/dev/null
bun scripts/source_wrapper_update_command_selftest.ts >/dev/null
bun scripts/github_release_install_selftest.ts >/dev/null
bun scripts/release_artifact_workflow_selftest.ts >/dev/null
bun scripts/macos_image_paste_preference_selftest.ts >/dev/null
bun scripts/startup_welcome_copy_selftest.ts >/dev/null
bun scripts/ct_identity_bootstrap_prompt_selftest.ts >/dev/null
bun scripts/ct_greeting_selftest.ts >/dev/null
bun scripts/attachment_input_prompt_selftest.ts >/dev/null
bun scripts/openai_runtime_prompt_selftest.ts >/dev/null
bun scripts/interrupt_draft_priority_selftest.ts >/dev/null
bun scripts/queued_prompt_edit_selftest.ts >/dev/null
bun scripts/queued_pasted_text_expansion_selftest.ts >/dev/null
bun scripts/command_menu_surface_selftest.ts >/dev/null
bun scripts/onboarding_flow_selftest.ts >/dev/null
bun scripts/voice_identity_selftest.ts >/dev/null
bun scripts/session_resume_copy_selftest.ts >/dev/null
bun scripts/session_entry_policy_selftest.ts >/dev/null
bun scripts/openai_codex_auth_selftest.ts >/dev/null
bun scripts/openai_agent_capability_selftest.ts >/dev/null
bun scripts/provider_agent_team_runtime_selftest.ts >/dev/null
bun scripts/runtime_vendor_exec_selftest.ts >/dev/null
bun scripts/ssh_remote_provider_selftest.ts >/dev/null
bun scripts/openai_model_capability_truth_selftest.ts >/dev/null
bun scripts/openai_oauth_model_picker_selftest.ts >/dev/null
bun scripts/provider_model_discovery_selftest.ts >/dev/null
bun scripts/openai_model_discovery_audit_selftest.ts >/dev/null
bun scripts/openai_web_search_routing_selftest.ts >/dev/null
bun scripts/openai_helper_transport_selftest.ts >/dev/null
bun scripts/bypass_permissions_single_source_selftest.ts >/dev/null
node scripts/queue_api_error_halt_selftest.cjs >/dev/null
bun scripts/openai_builtin_input_shape_selftest.ts >/dev/null
bun scripts/openai_code_interpreter_routing_selftest.ts >/dev/null
bun scripts/user_image_render_selftest.ts >/dev/null
bun scripts/dev_runtime_overrides_selftest.ts >/dev/null
bun scripts/gemini_strict_mode_selftest.ts >/dev/null
bun scripts/gemini_turn_boundary_meta_selftest.ts >/dev/null
bun scripts/gemini_fresh_turn_boundary_selftest.ts >/dev/null
bun scripts/gemini_replay_sanitizer_selftest.ts >/dev/null
bun scripts/gemini_conversation_recovery_selftest.ts >/dev/null
bun scripts/gemini_interrupted_turn_resume_selftest.ts >/dev/null
bun scripts/gemini_empty_response_selftest.ts >/dev/null
bun scripts/gemini_strict_shell_policy_selftest.ts >/dev/null
bun scripts/gemini_strict_review_context_selftest.ts >/dev/null
bun scripts/gemini_strict_review_barrier_selftest.ts >/dev/null
bun scripts/gemini_strict_review_repair_selftest.ts >/dev/null
bun scripts/worktree_parallel_spawn_selftest.ts >/dev/null
bun scripts/file_edit_stale_drift_selftest.ts >/dev/null
bun scripts/agent_worktree_result_notice_selftest.ts >/dev/null
bun scripts/task_output_retention_selftest.ts >/dev/null
bun scripts/autowork_plan_resolution_selftest.ts >/dev/null
bun scripts/autowork_workflow_phase_selftest.ts >/dev/null
bun scripts/autowork_workflow_plan_parser_selftest.ts >/dev/null
bun scripts/autowork_lifecycle_run_selftest.ts >/dev/null
bun scripts/autowork_workflow_bootstrap_selftest.ts >/dev/null
bun scripts/workflow_state_tool_selftest.ts >/dev/null
bun scripts/autowork_backend_policy_selftest.ts >/dev/null
bun scripts/autowork_cloud_offload_capability_selftest.ts >/dev/null
bun scripts/gemini_agent_team_runtime_selftest.ts >/dev/null
bun scripts/teammate_mode_snapshot_selftest.ts >/dev/null
bun scripts/transcript_search_close_refresh_selftest.ts >/dev/null
bun scripts/openai_web_fetch_error_selftest.ts >/dev/null
bun scripts/openai_file_search_capability_selftest.ts >/dev/null
bun scripts/openai_file_search_routing_selftest.ts >/dev/null
bun scripts/openai_image_generation_routing_selftest.ts >/dev/null
bun scripts/generated_image_save_selftest.ts >/dev/null
bun scripts/openai_hosted_shell_routing_selftest.ts >/dev/null
bun scripts/openai_computer_use_routing_selftest.ts >/dev/null
bun scripts/openai_remote_mcp_capability_selftest.ts >/dev/null
bun scripts/openai_remote_mcp_config_selftest.ts >/dev/null
bun scripts/openai_multimodal_input_selftest.ts >/dev/null
bun scripts/send_message_tool_selftest.ts >/dev/null
bun scripts/session_environment_permission_selftest.ts >/dev/null
bun scripts/cli_highlight_selftest.ts >/dev/null
bun scripts/swords_scene_reveal_selftest.ts >/dev/null
bun scripts/swords_ledger_selftest.ts >/dev/null
bun scripts/swords_dm_quality_gate_selftest.ts >/dev/null
bun scripts/steer_checkpoint_selftest.ts >/dev/null
bun scripts/transcript_search_engine_selftest.ts >/dev/null
bun scripts/transcript_search_style_selftest.ts >/dev/null
bun scripts/telegram_typing_lifecycle_selftest.ts >/dev/null
bun scripts/telegram_runtime_contract_selftest.ts >/dev/null
bun scripts/telegram_env_alias_selftest.ts >/dev/null
bash scripts/repl-paste-smoke.sh >/dev/null
bash scripts/local_wrapper_version_notice_selftest.sh >/dev/null
bash scripts/release-installer-smoke.sh >/dev/null

echo
echo "[3/3] Lint"
npm run lint:openai-codex >/dev/null

echo
echo "dev-check passed"
