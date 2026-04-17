export function logError(tag: string, ...args: unknown[]): void {
  console.error(`[${tag}]`, ...args)
}

export function logWarn(tag: string, ...args: unknown[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[${tag}]`, ...args)
  }
}
