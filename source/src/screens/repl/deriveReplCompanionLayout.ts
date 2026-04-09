type DeriveReplCompanionLayoutArgs = {
  transcriptCols: number;
  minColsForFullSprite: number;
  isPromptHidden: boolean;
  hasFocusedInputDialog: boolean;
  showBashesDialog: boolean;
};

type ReplCompanionLayout = {
  companionNarrow: boolean;
  companionVisible: boolean;
};

export function deriveReplCompanionLayout({
  transcriptCols,
  minColsForFullSprite,
  isPromptHidden,
  hasFocusedInputDialog,
  showBashesDialog,
}: DeriveReplCompanionLayoutArgs): ReplCompanionLayout {
  return {
    companionNarrow: transcriptCols < minColsForFullSprite,
    companionVisible:
      !isPromptHidden && !hasFocusedInputDialog && !showBashesDialog,
  };
}
