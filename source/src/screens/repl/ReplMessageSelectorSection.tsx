import * as React from 'react';
import { MessageSelector } from '../../components/MessageSelector.js';

type ReplMessageSelectorSectionProps = {
  isVisible: boolean
  messageSelectorProps: React.ComponentProps<typeof MessageSelector>
}

export function ReplMessageSelectorSection({
  isVisible,
  messageSelectorProps,
}: ReplMessageSelectorSectionProps) {
  if (!isVisible) {
    return null;
  }

  return <MessageSelector {...messageSelectorProps} />;
}
