import { strict as assert } from 'assert'
import { shouldPreferClipboardImageForMacPaste } from '../source/src/utils/macosImagePastePreference.js'

assert.equal(
  shouldPreferClipboardImageForMacPaste({
    isMacOS: true,
    hasImagePasteHandler: true,
    isBracketedPaste: true,
    pastedText:
      '15 년간 관찰을 한 것인데요 하루 8시간 이상 자는 사람은 사망 위험이 27% 높았고',
    imagePathCount: 0,
  }),
  true,
  'expected macOS OCR/plaintext fallback from an image paste to prefer the clipboard image path',
)

assert.equal(
  shouldPreferClipboardImageForMacPaste({
    isMacOS: true,
    hasImagePasteHandler: true,
    isBracketedPaste: false,
    pastedText: 'ordinary typed text',
    imagePathCount: 0,
  }),
  false,
  'expected non-bracketed text input to stay on the normal text path',
)

assert.equal(
  shouldPreferClipboardImageForMacPaste({
    isMacOS: true,
    hasImagePasteHandler: true,
    isBracketedPaste: true,
    pastedText: '/Users/bret/Pictures/screenshot.png',
    imagePathCount: 1,
  }),
  false,
  'expected dragged image file paths to keep using the existing file-path image flow',
)

assert.equal(
  shouldPreferClipboardImageForMacPaste({
    isMacOS: false,
    hasImagePasteHandler: true,
    isBracketedPaste: true,
    pastedText: 'image OCR text',
    imagePathCount: 0,
  }),
  false,
  'expected the clipboard-image preference to remain macOS-only',
)

console.log('macos_image_paste_preference_selftest: ok')
