import * as React from 'react';
import { ReplBottomPane } from './ReplBottomPane.js';
import { ReplMainBottomRow } from './ReplMainBottomRow.js';
import { ReplMainScreen } from './ReplMainScreen.js';
import { ReplMainScrollableContent } from './ReplMainScrollableContent.js';

export type ReplMainModeProps = {
  mainScreenProps: Omit<React.ComponentProps<typeof ReplMainScreen>, 'scrollableNode' | 'bottomNode'>
  scrollableContentProps: React.ComponentProps<typeof ReplMainScrollableContent>
  mainBottomRowProps: Omit<React.ComponentProps<typeof ReplMainBottomRow>, 'bottomPane'>
  bottomPaneProps: React.ComponentProps<typeof ReplBottomPane>
}

export function ReplMainMode({
  mainScreenProps,
  scrollableContentProps,
  mainBottomRowProps,
  bottomPaneProps,
}: ReplMainModeProps) {
  return (
    <ReplMainScreen
      {...mainScreenProps}
      scrollableNode={<ReplMainScrollableContent {...scrollableContentProps} />}
      bottomNode={
        <ReplMainBottomRow
          {...mainBottomRowProps}
          bottomPane={<ReplBottomPane {...bottomPaneProps} />}
        />
      }
    />
  );
}
