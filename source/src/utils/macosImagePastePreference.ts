export function shouldPreferClipboardImageForMacPaste(options: {
  isMacOS: boolean
  hasImagePasteHandler: boolean
  isBracketedPaste: boolean
  pastedText: string
  imagePathCount: number
}): boolean {
  return (
    options.isMacOS &&
    options.hasImagePasteHandler &&
    options.isBracketedPaste &&
    options.pastedText.length > 0 &&
    options.imagePathCount === 0
  )
}
