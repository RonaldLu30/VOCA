export function normalizeAnswer(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\s\u3000]+/g, " ")
    .replace(/[.,!?;:，。！？；：]+$/g, "");
}

export function matchesAnswer(answer: string, acceptedAnswers: string[]) {
  const normalized = normalizeAnswer(answer);
  return normalized.length > 0 && acceptedAnswers.some((candidate) => normalizeAnswer(candidate) === normalized);
}
