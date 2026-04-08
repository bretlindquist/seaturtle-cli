import * as React from 'react';
import PromptInput from '../../components/PromptInput/PromptInput.js';
import { SessionBackgroundHint } from '../../components/SessionBackgroundHint.js';
import { ReplPromptChrome } from './ReplPromptChrome.js';

type ReplPromptSectionProps = Omit<
  React.ComponentProps<typeof ReplPromptChrome>,
  'promptInput' | 'sessionBackgroundHint'
> & {
  promptInputProps: React.ComponentProps<typeof PromptInput>
  sessionBackgroundHintProps: React.ComponentProps<typeof SessionBackgroundHint>
}

export function ReplPromptSection({
  promptInputProps,
  sessionBackgroundHintProps,
  ...chromeProps
}: ReplPromptSectionProps) {
  return (
    <ReplPromptChrome
      {...chromeProps}
      promptInput={<PromptInput {...promptInputProps} />}
      sessionBackgroundHint={<SessionBackgroundHint {...sessionBackgroundHintProps} />}
    />
  );
}
