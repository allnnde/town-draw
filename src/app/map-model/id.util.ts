export function createId(prefix: string): string {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  return `${prefix}-${randomPart}`;
}
