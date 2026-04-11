type SendTyping = (chatId: string) => Promise<void>

type TimerHandle = ReturnType<typeof setInterval>

export type TelegramTypingLifecycle = {
  start(chatId: string): void
  stop(chatId: string): void
  stopAll(): void
}

export function createTelegramTypingLifecycle(
  sendTyping: SendTyping,
  refreshMs: number = 4000,
): TelegramTypingLifecycle {
  const active = new Map<string, TimerHandle>()

  return {
    start(chatId: string) {
      if (active.has(chatId)) {
        return
      }

      void sendTyping(chatId)
      const timer = setInterval(() => {
        void sendTyping(chatId)
      }, refreshMs)
      active.set(chatId, timer)
    },

    stop(chatId: string) {
      const timer = active.get(chatId)
      if (!timer) {
        return
      }
      clearInterval(timer)
      active.delete(chatId)
    },

    stopAll() {
      for (const timer of active.values()) {
        clearInterval(timer)
      }
      active.clear()
    },
  }
}
