/**
 * Animated ANSI launch screen for SeaTurtle CLI.
 * Pure terminal escape sequences, intentionally short and terminal-native.
 */

const ESC = '\x1b['
const HIDE_CURSOR = `${ESC}?25l`
const SHOW_CURSOR = `${ESC}?25h`
const CLEAR = `${ESC}2J${ESC}H`
const RESET = `${ESC}0m`
const BOLD = `${ESC}1m`
const DIM = `${ESC}2m`

function rgb(r: number, g: number, b: number): string {
  return `${ESC}38;2;${r};${g};${b}m`
}

function moveTo(row: number, col: number): string {
  return `${ESC}${row};${col}H`
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

type Color = readonly [number, number, number]

function lerpColor(c1: Color, c2: Color, t: number): [number, number, number] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const DEEP_WATER: Color = [7, 24, 40]
const KELP: Color = [14, 84, 94]
const TIDE: Color = [24, 138, 148]
const FOAM: Color = [194, 255, 246]
const SUNLIT_SURF: Color = [120, 228, 255]
const SHELL: Color = [137, 245, 206]
const VERSION_MIST: Color = [98, 140, 151]

const SEA_TURTLE_MARK = [
  '         ▄███▄',
  '        ███████',
  '        ▀█████▀',
  '  ▄██████████████████▄',
  '     ▄████████████▄',
  '     ▀████████████▀',
  '      ▀██████████',
  '      ▄██████████▄',
  '     ▀▀▀        ▀▀▀',
] as const

const WIDE_WORDMARK = [
  '  █████████                     ███████████                       █████    ████',
  ' ███▒▒▒▒▒███                   ▒█▒▒▒███▒▒▒█                      ▒▒███    ▒▒███',
  '▒███    ▒▒▒   ██████   ██████  ▒   ▒███  ▒  █████ ████ ████████  ███████   ▒███   ██████',
  '▒▒█████████  ███▒▒███ ▒▒▒▒▒███     ▒███    ▒▒███ ▒███ ▒▒███▒▒███▒▒▒███▒    ▒███  ███▒▒███',
  ' ▒▒▒▒▒▒▒▒███▒███████   ███████     ▒███     ▒███ ▒███  ▒███ ▒▒▒   ▒███     ▒███ ▒███████',
  ' ███    ▒███▒███▒▒▒   ███▒▒███     ▒███     ▒███ ▒███  ▒███       ▒███ ███ ▒███ ▒███▒▒▒',
  '▒▒█████████ ▒▒██████ ▒▒████████    █████    ▒▒████████ █████      ▒▒█████  █████▒▒██████',
  ' ▒▒▒▒▒▒▒▒▒   ▒▒▒▒▒▒   ▒▒▒▒▒▒▒▒    ▒▒▒▒▒      ▒▒▒▒▒▒▒▒ ▒▒▒▒▒        ▒▒▒▒▒  ▒▒▒▒▒  ▒▒▒▒▒▒',
] as const

const NARROW_WORDMARK = ['SeaTurtle'] as const
const SUBTITLE = 'CT CLI · local-first terminal agent'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  char: string
}

const BUBBLE_CHARS = ['·', '°', 'o', 'O', '•'] as const

function createParticle(cx: number, cy: number): Particle {
  const angle = Math.random() * Math.PI * 2
  const speed = 0.35 + Math.random() * 1.1
  return {
    x: cx,
    y: cy,
    vx: Math.cos(angle) * speed * 1.8,
    vy: Math.sin(angle) * speed * 0.9,
    life: 0,
    maxLife: 10 + Math.floor(Math.random() * 14),
    char: BUBBLE_CHARS[Math.floor(Math.random() * BUBBLE_CHARS.length)]!,
  }
}

function updateParticles(particles: Particle[], cols: number, rows: number): void {
  for (let p = particles.length - 1; p >= 0; p--) {
    const particle = particles[p]!
    particle.x += particle.vx
    particle.y += particle.vy
    particle.vy -= 0.015
    particle.life++
    if (
      particle.life >= particle.maxLife ||
      particle.x < 1 ||
      particle.x >= cols ||
      particle.y < 1 ||
      particle.y >= rows
    ) {
      particles.splice(p, 1)
    }
  }
}

function renderParticles(particles: Particle[], globalFade: number): string {
  let buf = ''
  for (const p of particles) {
    const lifeT = p.life / p.maxLife
    const fadeT =
      (lifeT < 0.35 ? lifeT / 0.35 : 1 - (lifeT - 0.35) / 0.65) * globalFade
    const color = lerpColor(FOAM, SUNLIT_SURF, lifeT)
    buf +=
      moveTo(Math.round(p.y), Math.round(p.x)) +
      rgb(
        Math.round(color[0] * fadeT),
        Math.round(color[1] * fadeT),
        Math.round(color[2] * fadeT),
      ) +
      p.char +
      RESET
  }
  return buf
}

function getWordmarkLines(cols: number): readonly string[] {
  return cols >= 112 ? WIDE_WORDMARK : NARROW_WORDMARK
}

function getLineColor(
  i: number,
  lineLength: number,
  frame: number,
  from: Color,
  to: Color,
  shimmerStrength = 0.15,
): string {
  const gradient = lineLength <= 1 ? 0 : i / (lineLength - 1)
  const baseColor = lerpColor(from, to, gradient)
  const shimmer = Math.sin(frame * 0.4 + i * 0.16) * shimmerStrength
  return rgb(
    Math.max(0, Math.min(255, Math.round(baseColor[0] * (1 + shimmer)))),
    Math.max(0, Math.min(255, Math.round(baseColor[1] * (1 + shimmer)))),
    Math.max(0, Math.min(255, Math.round(baseColor[2] * (1 + shimmer)))),
  )
}

export async function playLaunchScreen(): Promise<void> {
  if (!process.stdout.isTTY) return
  if (process.env.NO_LAUNCH_SCREEN) return

  const cols = process.stdout.columns || 80
  const rows = process.stdout.rows || 24
  if (cols < 72 || rows < 18) return

  const wordmark = getWordmarkLines(cols)
  const logoWidth = Math.max(...SEA_TURTLE_MARK.map(line => line.length))
  const titleWidth = Math.max(...wordmark.map(line => line.length))
  const totalHeight =
    SEA_TURTLE_MARK.length + 1 + wordmark.length + 1 + 1 + 1
  const logoLeft = Math.floor((cols - logoWidth) / 2)
  const logoTop = Math.max(1, Math.floor((rows - totalHeight) / 2))
  const titleLeft = Math.floor((cols - titleWidth) / 2)
  const titleTop = logoTop + SEA_TURTLE_MARK.length + 1
  const subtitleLeft = Math.floor((cols - SUBTITLE.length) / 2)
  const version = `v${MACRO.VERSION}`
  const versionLeft = Math.floor((cols - version.length) / 2)

  const out = process.stdout
  const write = (s: string) => out.write(s)
  const particles: Particle[] = []

  try {
    write(HIDE_CURSOR + CLEAR)

    for (let frame = 0; frame < 18; frame++) {
      let buf = CLEAR
      const t = frame / 17

      for (let row = 0; row < SEA_TURTLE_MARK.length; row++) {
        const line = SEA_TURTLE_MARK[row]!
        const rowDelay = row / Math.max(1, SEA_TURTLE_MARK.length - 1)
        const rowT = Math.max(0, Math.min(1, (t - rowDelay * 0.28) / 0.64))
        if (rowT <= 0) continue

        buf += moveTo(logoTop + row, logoLeft)
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]!
          if (ch === ' ') {
            buf += ' '
            continue
          }
          const colDelay = Math.abs(i - line.length / 2) / (line.length / 2)
          const charT = Math.max(0, Math.min(1, (rowT - colDelay * 0.34) / 0.58))
          if (charT <= 0) {
            buf += ' '
            continue
          }
          const birthFlash = charT < 0.34 ? (0.34 - charT) / 0.34 : 0
          const baseColor = lerpColor(SHELL, TIDE, Math.min(1, colDelay * 0.85))
          const color = lerpColor(baseColor, FOAM, birthFlash)
          buf += rgb(color[0], color[1], color[2]) + ch
        }
        buf += RESET
      }

      if (frame > 4 && frame % 2 === 0) {
        for (let i = 0; i < 3; i++) {
          particles.push(
            createParticle(
              logoLeft + logoWidth / 2 + (Math.random() - 0.5) * logoWidth * 0.7,
              logoTop + SEA_TURTLE_MARK.length / 2 + (Math.random() - 0.5) * 3,
            ),
          )
        }
      }

      updateParticles(particles, cols, rows)
      buf += renderParticles(particles, 1)
      write(buf)
      await sleep(45)
    }

    for (let frame = 0; frame < 22; frame++) {
      let buf = CLEAR
      const t = frame / 21

      for (let row = 0; row < SEA_TURTLE_MARK.length; row++) {
        const line = SEA_TURTLE_MARK[row]!
        buf += moveTo(logoTop + row, logoLeft)
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]!
          if (ch === ' ') {
            buf += ' '
            continue
          }
          buf += getLineColor(i, line.length, frame, TIDE, FOAM, 0.18) + ch
        }
        buf += RESET
      }

      const eased = 1 - Math.pow(1 - t, 3)
      for (let row = 0; row < wordmark.length; row++) {
        const line = wordmark[row]!
        const sweep = Math.floor(line.length * eased)
        if (sweep <= 0) continue

        buf += moveTo(titleTop + row, titleLeft)
        for (let i = 0; i < sweep; i++) {
          const ch = line[i]!
          if (ch === ' ') {
            buf += ' '
            continue
          }
          const edgeDist = (sweep - 1 - i) / Math.max(1, sweep)
          if (edgeDist < 0.05) {
            buf += BOLD + rgb(255, 255, 255) + ch + RESET
          } else {
            buf += getLineColor(i, line.length, frame, SHELL, SUNLIT_SURF, 0.2) + ch
          }
        }
        buf += RESET
      }

      if (frame === 14) {
        for (let i = 0; i < 18; i++) {
          particles.push(
            createParticle(
              titleLeft + titleWidth / 2 + (Math.random() - 0.5) * titleWidth * 0.35,
              titleTop + wordmark.length / 2,
            ),
          )
        }
      }

      updateParticles(particles, cols, rows)
      buf += renderParticles(particles, 1)
      write(buf)
      await sleep(45)
    }

    for (let frame = 0; frame < 14; frame++) {
      let buf = CLEAR
      const t = frame / 13

      for (let row = 0; row < SEA_TURTLE_MARK.length; row++) {
        const line = SEA_TURTLE_MARK[row]!
        buf += moveTo(logoTop + row, logoLeft)
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]!
          if (ch === ' ') {
            buf += ' '
            continue
          }
          buf += getLineColor(i, line.length, frame, TIDE, FOAM, 0.12) + ch
        }
        buf += RESET
      }

      for (let row = 0; row < wordmark.length; row++) {
        const line = wordmark[row]!
        buf += moveTo(titleTop + row, titleLeft)
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]!
          if (ch === ' ') {
            buf += ' '
            continue
          }
          buf += getLineColor(i, line.length, frame, SHELL, SUNLIT_SURF, 0.1) + ch
        }
        buf += RESET
      }

      const subtitleT = Math.min(1, t * 1.25)
      const subtitleColor = lerpColor(DEEP_WATER, FOAM, subtitleT)
      buf += moveTo(titleTop + wordmark.length + 1, subtitleLeft)
      buf +=
        rgb(subtitleColor[0], subtitleColor[1], subtitleColor[2]) +
        SUBTITLE +
        RESET

      const versionColor = lerpColor(DEEP_WATER, VERSION_MIST, Math.min(1, t * 1.4))
      buf += moveTo(titleTop + wordmark.length + 2, versionLeft)
      buf +=
        DIM +
        rgb(versionColor[0], versionColor[1], versionColor[2]) +
        version +
        RESET

      updateParticles(particles, cols, rows)
      buf += renderParticles(particles, 1)
      write(buf)
      await sleep(40)
    }

    for (let frame = 0; frame < 10; frame++) {
      let buf = CLEAR
      const fade = 1 - frame / 9

      for (let row = 0; row < SEA_TURTLE_MARK.length; row++) {
        const line = SEA_TURTLE_MARK[row]!
        buf += moveTo(logoTop + row, logoLeft)
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]!
          if (ch === ' ') {
            buf += ' '
            continue
          }
          const base = lerpColor(TIDE, FOAM, i / Math.max(1, line.length - 1))
          const color = lerpColor(DEEP_WATER, base, fade)
          buf += rgb(color[0], color[1], color[2]) + ch
        }
        buf += RESET
      }

      for (let row = 0; row < wordmark.length; row++) {
        const line = wordmark[row]!
        buf += moveTo(titleTop + row, titleLeft)
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]!
          if (ch === ' ') {
            buf += ' '
            continue
          }
          const base = lerpColor(SHELL, SUNLIT_SURF, i / Math.max(1, line.length - 1))
          const color = lerpColor(DEEP_WATER, base, fade)
          buf += rgb(color[0], color[1], color[2]) + ch
        }
        buf += RESET
      }

      const subtitleColor = lerpColor(DEEP_WATER, FOAM, fade)
      buf += moveTo(titleTop + wordmark.length + 1, subtitleLeft)
      buf +=
        rgb(subtitleColor[0], subtitleColor[1], subtitleColor[2]) +
        SUBTITLE +
        RESET

      const versionColor = lerpColor(DEEP_WATER, VERSION_MIST, fade)
      buf += moveTo(titleTop + wordmark.length + 2, versionLeft)
      buf +=
        DIM +
        rgb(versionColor[0], versionColor[1], versionColor[2]) +
        version +
        RESET

      updateParticles(particles, cols, rows)
      buf += renderParticles(particles, fade)
      write(buf)
      await sleep(34)
    }

    await sleep(60)
  } finally {
    write(CLEAR + SHOW_CURSOR + RESET)
  }
}

declare const MACRO: { VERSION: string }
