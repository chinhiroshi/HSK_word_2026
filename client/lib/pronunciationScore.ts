export type PronunciationScore = {
  charMatch: number;
  orderMatch: number;
  lengthMatch: number;
  total: number;
};

const PUNCT_REGEX = /[\s\u3000.,!?;:'"`~@#$%^&*()_+\-=\[\]{}|\\/<>。、！？；：「」『』【】（）《》〈〉〜・…—–\u200b]/g;

function normalize(input: string): string {
  if (!input) return "";
  let s = input.normalize("NFKC");
  s = s.toLowerCase();
  s = s.replace(PUNCT_REGEX, "");
  return s;
}

function toChars(s: string): string[] {
  return Array.from(s);
}

export function levenshtein(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function computeScore(reference: string, hypothesis: string): PronunciationScore {
  const ref = toChars(normalize(reference));
  const hyp = toChars(normalize(hypothesis));

  if (ref.length === 0) {
    return { charMatch: 0, orderMatch: 0, lengthMatch: 0, total: 0 };
  }

  if (hyp.length === 0) {
    return { charMatch: 0, orderMatch: 0, lengthMatch: 0, total: 0 };
  }

  // Char match: how many ref chars are present in hyp (multiset intersection / ref length)
  const hypCount = new Map<string, number>();
  for (const c of hyp) {
    hypCount.set(c, (hypCount.get(c) ?? 0) + 1);
  }
  let matched = 0;
  for (const c of ref) {
    const cnt = hypCount.get(c) ?? 0;
    if (cnt > 0) {
      matched += 1;
      hypCount.set(c, cnt - 1);
    }
  }
  const charMatch = Math.round((matched / ref.length) * 100);

  // Order match: 1 - normalized edit distance
  const dist = levenshtein(ref, hyp);
  const maxLen = Math.max(ref.length, hyp.length);
  const orderRatio = maxLen === 0 ? 0 : 1 - dist / maxLen;
  const orderMatch = Math.max(0, Math.round(orderRatio * 100));

  // Length match: how close the hypothesis length is to the reference length
  const lengthRatio = maxLen === 0 ? 0 : 1 - Math.abs(ref.length - hyp.length) / maxLen;
  const lengthMatch = Math.max(0, Math.round(lengthRatio * 100));

  const total = Math.round(
    charMatch * 0.65 + lengthMatch * 0.25 + orderMatch * 0.1,
  );

  return { charMatch, orderMatch, lengthMatch, total };
}

export type FeedbackLevel = "good" | "mid" | "poor";

export function feedbackLevelFromScore(score: number): FeedbackLevel {
  if (score >= 80) return "good";
  if (score >= 60) return "mid";
  return "poor";
}
