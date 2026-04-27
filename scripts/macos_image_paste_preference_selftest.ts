import { strict as assert } from 'assert'
import { shouldProbeClipboardImageForMacPaste } from '../source/src/utils/macosImagePastePreference.js'

assert.equal(
  shouldProbeClipboardImageForMacPaste({
    isMacOS: true,
    hasImagePasteHandler: true,
    isBracketedPaste: true,
    imagePathCount: 0,
  }),
  true,
  'expected macOS bracketed paste to probe the clipboard image path before trusting pasted text',
)

assert.equal(
  shouldProbeClipboardImageForMacPaste({
    isMacOS: true,
    hasImagePasteHandler: true,
    isBracketedPaste: false,
    imagePathCount: 0,
  }),
  false,
  'expected non-bracketed text input to stay on the normal text path',
)

assert.equal(
  shouldProbeClipboardImageForMacPaste({
    isMacOS: true,
    hasImagePasteHandler: true,
    isBracketedPaste: true,
    imagePathCount: 1,
  }),
  false,
  'expected dragged image file paths to keep using the existing file-path image flow',
)

assert.equal(
  shouldProbeClipboardImageForMacPaste({
    isMacOS: false,
    hasImagePasteHandler: true,
    isBracketedPaste: true,
    imagePathCount: 0,
  }),
  false,
  'expected the clipboard-image preference to remain macOS-only',
)

assert.equal(
  shouldProbeClipboardImageForMacPaste({
    isMacOS: true,
    hasImagePasteHandler: true,
    isBracketedPaste: true,
    imagePathCount: 0,
  }),
  true,
  'expected empty bracketed pastes to share the same clipboard-first macOS image probe',
)

console.log('macos_image_paste_preference_selftest: ok')
