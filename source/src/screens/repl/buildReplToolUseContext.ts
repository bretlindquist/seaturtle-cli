import { feature } from 'bun:bundle';
import { mergeClients } from '../../hooks/useMergedClients.js';
import { mergeAndFilterTools } from '../../utils/toolPool.js';
import { assembleToolPool } from '../../tools.js';
import { resolveAgentTools } from '../../tools/AgentTool/agentToolUtils.js';
import { sendNotification } from '../../services/notifier.js';
import type { AttributionState } from '../../utils/commitAttribution.js';
import type { FileHistoryState } from '../../utils/fileHistory.js';

export function buildReplToolUseContext({
  store,
  combinedInitialTools,
  mainThreadAgentDefinition,
  commands,
  debug,
  initialMcpClients,
  ideInstallationStatus,
  dynamicMcpConfig,
  theme,
  allowedAgentTypes,
  thinkingConfig,
  setAppState,
  setMessages,
  disabled,
  setIsMessageSelectorVisible,
  reverify,
  readFileStateCurrent,
  setToolJSX,
  addNotification,
  terminal,
  onChangeDynamicMcpConfig,
  setIDEToInstallExtension,
  loadedNestedMemoryPathsCurrent,
  discoveredSkillNamesCurrent,
  setResponseLength,
  isReplAntBuild,
  responseLengthRef,
  apiMetricsRef,
  setStreamMode,
  setSpinnerColor,
  setSpinnerShimmerColor,
  setSpinnerMessage,
  setInProgressToolUseIDs,
  hasInterruptibleToolInProgressRef,
  resume,
  setConversationId,
  requestPrompt,
  customSystemPrompt,
  appendSystemPrompt,
  contentReplacementStateCurrent,
}: {
  store: any;
  combinedInitialTools: any[];
  mainThreadAgentDefinition: any;
  commands: any[];
  debug: boolean;
  initialMcpClients: any[];
  ideInstallationStatus: any;
  dynamicMcpConfig: any;
  theme: any;
  allowedAgentTypes: any;
  thinkingConfig: any;
  setAppState: (updater: any) => void;
  setMessages: (updater: any) => void;
  disabled: boolean;
  setIsMessageSelectorVisible: (value: boolean) => void;
  reverify: () => void;
  readFileStateCurrent: any;
  setToolJSX: (value: any) => void;
  addNotification: (value: any) => void;
  terminal: any;
  onChangeDynamicMcpConfig: (...args: any[]) => void;
  setIDEToInstallExtension: (value: any) => void;
  loadedNestedMemoryPathsCurrent: Set<string>;
  discoveredSkillNamesCurrent: Set<string>;
  setResponseLength: (updater: any) => void;
  isReplAntBuild: boolean;
  responseLengthRef: { current: number };
  apiMetricsRef: { current: any[] };
  setStreamMode: (value: any) => void;
  setSpinnerColor: (value: any) => void;
  setSpinnerShimmerColor: (value: any) => void;
  setSpinnerMessage: (value: any) => void;
  setInProgressToolUseIDs: (value: any) => void;
  hasInterruptibleToolInProgressRef: { current: boolean };
  resume: (...args: any[]) => any;
  setConversationId: (value: any) => void;
  requestPrompt: any;
  customSystemPrompt: any;
  appendSystemPrompt: any;
  contentReplacementStateCurrent: any;
}) {
  return (messagesArg: any[], _newMessages: any[], abortController: AbortController, mainLoopModel: string) => {
    const s = store.getState();

    const computeTools = () => {
      const state = store.getState();
      const assembled = assembleToolPool(state.toolPermissionContext, state.mcp.tools);
      const merged = mergeAndFilterTools(combinedInitialTools, assembled, state.toolPermissionContext.mode);
      if (!mainThreadAgentDefinition) return merged;
      return resolveAgentTools(mainThreadAgentDefinition, merged, false, true).resolvedTools;
    };

    return {
      abortController,
      options: {
        commands,
        tools: computeTools(),
        debug,
        verbose: s.verbose,
        mainLoopModel,
        thinkingConfig: s.thinkingEnabled !== false ? thinkingConfig : { type: 'disabled' },
        mcpClients: mergeClients(initialMcpClients, s.mcp.clients),
        mcpResources: s.mcp.resources,
        ideInstallationStatus,
        isNonInteractiveSession: false,
        dynamicMcpConfig,
        theme,
        agentDefinitions: allowedAgentTypes ? {
          ...s.agentDefinitions,
          allowedAgentTypes,
        } : s.agentDefinitions,
        customSystemPrompt,
        appendSystemPrompt,
        refreshTools: computeTools,
      },
      getAppState: () => store.getState(),
      setAppState,
      messages: messagesArg,
      setMessages,
      updateFileHistoryState(updater: (prev: FileHistoryState) => FileHistoryState) {
        setAppState((prev: any) => {
          const updated = updater(prev.fileHistory);
          if (updated === prev.fileHistory) return prev;
          return {
            ...prev,
            fileHistory: updated,
          };
        });
      },
      updateAttributionState(updater: (prev: AttributionState) => AttributionState) {
        setAppState((prev: any) => {
          const updated = updater(prev.attribution);
          if (updated === prev.attribution) return prev;
          return {
            ...prev,
            attribution: updated,
          };
        });
      },
      openMessageSelector: () => {
        if (!disabled) {
          setIsMessageSelectorVisible(true);
        }
      },
      onChangeAPIKey: reverify,
      readFileState: readFileStateCurrent,
      setToolJSX,
      addNotification,
      appendSystemMessage: (msg: any) => setMessages((prev: any[]) => [...prev, msg]),
      sendOSNotification: (opts: any) => {
        void sendNotification(opts, terminal);
      },
      onChangeDynamicMcpConfig,
      onInstallIDEExtension: setIDEToInstallExtension,
      nestedMemoryAttachmentTriggers: new Set<string>(),
      loadedNestedMemoryPaths: loadedNestedMemoryPathsCurrent,
      dynamicSkillDirTriggers: new Set<string>(),
      discoveredSkillNames: discoveredSkillNamesCurrent,
      setResponseLength,
      pushApiMetricsEntry: isReplAntBuild ? (ttftMs: number) => {
        const now = Date.now();
        const baseline = responseLengthRef.current;
        apiMetricsRef.current.push({
          ttftMs,
          firstTokenTime: now,
          lastTokenTime: now,
          responseLengthBaseline: baseline,
          endResponseLength: baseline,
        });
      } : undefined,
      setStreamMode,
      onCompactProgress: (event: any) => {
        switch (event.type) {
          case 'hooks_start':
            setSpinnerColor('claudeBlue_FOR_SYSTEM_SPINNER');
            setSpinnerShimmerColor('claudeBlueShimmer_FOR_SYSTEM_SPINNER');
            setSpinnerMessage(
              event.hookType === 'pre_compact'
                ? 'Running PreCompact hooks…'
                : event.hookType === 'post_compact'
                  ? 'Running PostCompact hooks…'
                  : 'Running SessionStart hooks…',
            );
            break;
          case 'compact_start':
            setSpinnerMessage('Compacting conversation');
            break;
          case 'compact_end':
            setSpinnerMessage(null);
            setSpinnerColor(null);
            setSpinnerShimmerColor(null);
            break;
        }
      },
      setInProgressToolUseIDs,
      setHasInterruptibleToolInProgress: (value: boolean) => {
        hasInterruptibleToolInProgressRef.current = value;
      },
      resume,
      setConversationId,
      requestPrompt: feature('HOOK_PROMPTS') ? requestPrompt : undefined,
      contentReplacementState: contentReplacementStateCurrent,
    };
  };
}
