import * as React from 'react';
import { AutoRunIssueNotification, getAutoRunIssueReasonText, type AutoRunIssueReason } from '../../utils/autoRunIssue.js';
import { FeedbackSurvey } from '../../components/FeedbackSurvey/FeedbackSurvey.js';
import { IssueFlagBanner } from '../../components/PromptInput/IssueFlagBanner.js';

type FeedbackSurveyLike = {
  state: string
  lastResponse: string | null
  handleSelect: (selection: string) => void
  handleTranscriptSelect?: () => void
}

type FrustrationSurveyLike = {
  state: string
  handleTranscriptSelect: () => void
}

type ReplPromptChromeProps = {
  isVisible: boolean
  autoRunIssueReason: AutoRunIssueReason | null
  onRunAutoIssue: () => void
  onCancelAutoIssue: () => void
  postCompactSurvey: FeedbackSurveyLike
  memorySurvey: FeedbackSurveyLike
  feedbackSurvey: FeedbackSurveyLike
  frustrationDetection: FrustrationSurveyLike
  inputValue: string
  setInputValue: (value: string) => void
  onRequestFeedback: () => void
  didAutoRunIssue: boolean
  showIssueFlagBanner: boolean
  promptInput: React.ReactNode
  sessionBackgroundHint: React.ReactNode
}

export function ReplPromptChrome({
  isVisible,
  autoRunIssueReason,
  onRunAutoIssue,
  onCancelAutoIssue,
  postCompactSurvey,
  memorySurvey,
  feedbackSurvey,
  frustrationDetection,
  inputValue,
  setInputValue,
  onRequestFeedback,
  didAutoRunIssue,
  showIssueFlagBanner,
  promptInput,
  sessionBackgroundHint,
}: ReplPromptChromeProps) {
  if (!isVisible) {
    return null;
  }

  return <>
      {autoRunIssueReason && <AutoRunIssueNotification onRun={onRunAutoIssue} onCancel={onCancelAutoIssue} reason={getAutoRunIssueReasonText(autoRunIssueReason)} />}
      {postCompactSurvey.state !== 'closed' ? <FeedbackSurvey state={postCompactSurvey.state} lastResponse={postCompactSurvey.lastResponse} handleSelect={postCompactSurvey.handleSelect} inputValue={inputValue} setInputValue={setInputValue} onRequestFeedback={onRequestFeedback} /> : memorySurvey.state !== 'closed' ? <FeedbackSurvey state={memorySurvey.state} lastResponse={memorySurvey.lastResponse} handleSelect={memorySurvey.handleSelect} handleTranscriptSelect={memorySurvey.handleTranscriptSelect} inputValue={inputValue} setInputValue={setInputValue} onRequestFeedback={onRequestFeedback} message="How well did CT use its memory? (optional)" /> : <FeedbackSurvey state={feedbackSurvey.state} lastResponse={feedbackSurvey.lastResponse} handleSelect={feedbackSurvey.handleSelect} handleTranscriptSelect={feedbackSurvey.handleTranscriptSelect} inputValue={inputValue} setInputValue={setInputValue} onRequestFeedback={didAutoRunIssue ? undefined : onRequestFeedback} />}
      {frustrationDetection.state !== 'closed' && <FeedbackSurvey state={frustrationDetection.state} lastResponse={null} handleSelect={() => {}} handleTranscriptSelect={frustrationDetection.handleTranscriptSelect} inputValue={inputValue} setInputValue={setInputValue} />}
      {showIssueFlagBanner && <IssueFlagBanner />}
      {promptInput}
      {sessionBackgroundHint}
    </>;
}
