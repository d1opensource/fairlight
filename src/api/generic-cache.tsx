interface CacheEntry<TValue> {
  value: TValue
  timestamp: number
}

export class GenericCache<TValue = any> {
  private valuesByCacheKey = new Map<string, CacheEntry<TValue>>()

  has(key: string): boolean {
    return this.valuesByCacheKey.has(key)
  }

  get(key: string, maxAge?: number): TValue | null {
    const entry = this.valuesByCacheKey.get(key)
    if (!entry) return null
    if (maxAge !== undefined && Date.now() - entry.timestamp > maxAge) {
      this.valuesByCacheKey.delete(key)
      return null
    }
    return entry.value
  }

  set(key: string, value: TValue): void {
    this.valuesByCacheKey.set(key, {value, timestamp: Date.now()})
  }

  del(key: string): void {
    this.valuesByCacheKey.delete(key)
  }
}
