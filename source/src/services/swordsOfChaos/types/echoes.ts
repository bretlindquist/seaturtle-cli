export type SwordsOfChaosHostEcho =
  | {
      kind: 'title'
      value: string
    }
  | {
      kind: 'relic'
      value: string
    }
  | {
      kind: 'oath'
      value: string
    }
  | {
      kind: 'truth'
      value: string
    }
  | {
      kind: 'legend'
      value: string
    }

export type SwordsOfChaosHostEchoResult = {
  applied: number
}
