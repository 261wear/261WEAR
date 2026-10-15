// `count` items picked at random, in random order (partial Fisher-Yates):
// the input is left untouched.
export function sample<T>(items: readonly T[], count: number): T[] {
  const a = items.slice();
  const n = Math.min(count, a.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
