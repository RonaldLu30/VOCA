export function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s\u3000\-\u2010-\u2015_']/g, "")
    .replace(/[.,!?;:，。！？；：]+$/g, "");
}

export function matchesAnswer(answer: string, acceptedAnswers: string[]) {
  const normalized = normalizeAnswer(answer);
  return normalized.length > 0 && acceptedAnswers.some((candidate) => normalizeAnswer(candidate) === normalized);
}
