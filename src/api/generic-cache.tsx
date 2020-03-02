export class GenericCache<TValue = any> {
  private valuesByCacheKey = new Map<string, TValue>()

  has(key: string): boolean {
    return this.valuesByCacheKey.has(key)
  }

  get(key: string): TValue | null {
    return this.valuesByCacheKey.get(key) || null
  }

  set(key: string, value: TValue): void {
    this.valuesByCacheKey.set(key, value)
  }

  del(key: string): void {
    this.valuesByCacheKey.delete(key)
  }
}

export function doSomeStuff(): number {
  return 5 + 3 + 1
}
