export function shouldProbeClipboardImageForMacPaste(options: {
  isMacOS: boolean
  hasImagePasteHandler: boolean
  isBracketedPaste: boolean
  imagePathCount: number
}): boolean {
  return (
    options.isMacOS &&
    options.hasImagePasteHandler &&
    options.isBracketedPaste &&
    options.imagePathCount === 0
  )
}
