// Small in-memory search engine (the catalogue is a few hundred items at most).
// Accent/case-insensitive, prefix matching, typo tolerance, relevance ranking.

export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokenize(q: string) {
  return normalize(q).split(" ").filter(Boolean).slice(0, 8);
}

// Levenshtein distance with an early exit above `max`.
function distance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

export type SearchField = { text: string; weight: number; exact?: boolean };

// Score of one query token against one word: exact > prefix > typo.
function tokenScore(token: string, word: string) {
  if (word === token) return 1;
  if (word.startsWith(token)) return token.length >= 2 ? 0.8 : 0.4;
  if (token.length >= 4) {
    const max = token.length >= 7 ? 2 : 1;
    const d = distance(token, word.slice(0, token.length + max), max);
    if (d <= max) return 0.55 - d * 0.1;
  }
  if (token.length >= 3 && word.includes(token)) return 0.35;
  return 0;
}

// Returns 0 when a token matches nothing (all tokens must match: "AND" search),
// unless `any` is true (fallback "OR" search for approximate results).
export function scoreFields(tokens: string[], fields: SearchField[], any = false) {
  if (!tokens.length) return 1;
  const prepared = fields.map((f) => ({ ...f, words: normalize(f.text).split(" ").filter(Boolean), full: normalize(f.text) }));
  let total = 0;
  let matched = 0;
  for (const t of tokens) {
    let best = 0;
    for (const f of prepared) {
      if (f.exact && f.full === t) best = Math.max(best, 2 * f.weight);
      for (const w of f.words) best = Math.max(best, tokenScore(t, w) * f.weight);
    }
    if (best > 0) matched++;
    else if (!any) return 0;
    total += best;
  }
  return any ? (matched ? total * (matched / tokens.length) : 0) : total;
}

// Splits `text` into parts, flagging the ones matching a query token (for <mark>).
export function highlight(text: string, tokens: string[]): { text: string; hit: boolean }[] {
  if (!tokens.length) return [{ text, hit: false }];
  const parts: { text: string; hit: boolean }[] = [];
  const re = /[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu;
  for (const m of text.match(re) ?? []) {
    const n = normalize(m);
    const hit = n !== "" && tokens.some((t) => n.startsWith(t) || (t.length >= 4 && tokenScore(t, n) > 0.3));
    const last = parts[parts.length - 1];
    if (last && last.hit === hit) last.text += m;
    else parts.push({ text: m, hit });
  }
  return parts;
}
