export class GenericCache<TValue = any> {
  private valuesByCacheKey = new Map<string, TValue>()

  has(key: string): boolean {
    return this.valuesByCacheKey.has(key)
  }

  get(key: string): TValue | undefined {
    return this.valuesByCacheKey.get(key) || undefined
  }

  set(key: string, value: TValue): void {
    this.valuesByCacheKey.set(key, value)
  }

  del(key: string): void {
    this.valuesByCacheKey.delete(key)
  }
}
