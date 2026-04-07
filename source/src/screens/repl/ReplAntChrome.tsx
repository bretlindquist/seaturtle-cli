import type { SetAppState } from '../../utils/messageQueueManager.js';
import { SkillImprovementSurvey } from '../../components/SkillImprovementSurvey.js';
import { DevBar } from '../../components/DevBar.js';

/* eslint-disable custom-rules/no-process-env-top-level, @typescript-eslint/no-require-imports */
const AntModelSwitchCallout = "external" === 'ant' ? require('../../components/AntModelSwitchCallout.js').AntModelSwitchCallout : null;
const UndercoverAutoCallout = "external" === 'ant' ? require('../../components/UndercoverAutoCallout.js').UndercoverAutoCallout : null;
/* eslint-enable custom-rules/no-process-env-top-level, @typescript-eslint/no-require-imports */

type SkillImprovementSurveyShape = {
  isOpen: boolean
  suggestion: {
    skillName: string
    updates: string[]
  } | null
  handleSelect: (selection: string) => void
}

type ReplAntChromeProps = {
  focusedInputDialog: string | null
  setAppState: SetAppState
  setShowModelSwitchCallout: (visible: boolean) => void
  setShowUndercoverCallout: (visible: boolean) => void
  skillImprovementSurvey: SkillImprovementSurveyShape
  inputValue: string
  setInputValue: (value: string) => void
}

export function ReplAntChrome({
  focusedInputDialog,
  setAppState,
  setShowModelSwitchCallout,
  setShowUndercoverCallout,
  skillImprovementSurvey,
  inputValue,
  setInputValue,
}: ReplAntChromeProps) {
  return <>
      {"external" === 'ant' && focusedInputDialog === 'model-switch' && AntModelSwitchCallout && <AntModelSwitchCallout onDone={(selection: string, modelAlias?: string) => {
      setShowModelSwitchCallout(false);
      if (selection === 'switch' && modelAlias) {
        setAppState(prev => ({
          ...prev,
          mainLoopModel: modelAlias,
          mainLoopModelForSession: null
        }));
      }
    }} />}
      {"external" === 'ant' && focusedInputDialog === 'undercover-callout' && UndercoverAutoCallout && <UndercoverAutoCallout onDone={() => setShowUndercoverCallout(false)} />}
      {"external" === 'ant' && skillImprovementSurvey.suggestion && <SkillImprovementSurvey isOpen={skillImprovementSurvey.isOpen} skillName={skillImprovementSurvey.suggestion.skillName} updates={skillImprovementSurvey.suggestion.updates} handleSelect={skillImprovementSurvey.handleSelect} inputValue={inputValue} setInputValue={setInputValue} />}
      {"external" === 'ant' && <DevBar />}
    </>;
}
