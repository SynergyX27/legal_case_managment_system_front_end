// Stable decorative colors: presentation only, independent of record status.
export function visualTone(id: string) {
  return [...id].reduce((n, c) => (n + c.charCodeAt(0)) % 4, 0);
}
