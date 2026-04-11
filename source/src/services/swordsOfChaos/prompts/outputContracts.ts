export function getSwordsOfChaosDmOutputContract(): string {
  return [
    'Return a bounded JSON object with:',
    '- subtitle',
    '- sceneText',
    '- options (3 to 4 stance choices)',
    '- optional hintText',
    'Do not mutate state directly.',
    'Do not invent rewards, titles, or rarity changes.',
  ].join('\n')
}
