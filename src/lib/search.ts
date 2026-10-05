// Small in-memory search engine (the shop catalogue holds a few thousand items).
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

// Fields normalized once: the shop catalogue keeps them with each product
// instead of normalizing thousands of descriptions on every keystroke.
export type PreparedField = { weight: number; exact?: boolean; full: string; words: string[] };

export function prepareFields(fields: SearchField[]): PreparedField[] {
  return fields.map((f) => {
    const full = normalize(f.text);
    return { weight: f.weight, exact: f.exact, full, words: [...new Set(full.split(" ").filter(Boolean))] };
  });
}

// Scores items for one query. Token × word scores are remembered: a catalogue
// has a few thousand distinct words, against hundreds of thousands of occurrences.
// The function returns 0 when a token matches nothing (all tokens must match:
// "AND" search), unless `any` is true (fallback "OR" search for approximate results).
export function createScorer(tokens: string[]) {
  const memo = tokens.map(() => new Map<string, number>());
  return (fields: PreparedField[], any = false) => {
    if (!tokens.length) return 1;
    let total = 0;
    let matched = 0;
    for (let i = 0; i < tokens.length; i++) {
      let best = 0;
      for (const f of fields) {
        if (f.exact && f.full === tokens[i]) best = Math.max(best, 2 * f.weight);
        for (const w of f.words) {
          let s = memo[i].get(w);
          if (s === undefined) memo[i].set(w, (s = tokenScore(tokens[i], w)));
          best = Math.max(best, s * f.weight);
        }
      }
      if (best > 0) matched++;
      else if (!any) return 0;
      total += best;
    }
    return any ? (matched ? total * (matched / tokens.length) : 0) : total;
  };
}

export function scoreFields(tokens: string[], fields: SearchField[], any = false) {
  return createScorer(tokens)(prepareFields(fields), any);
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
