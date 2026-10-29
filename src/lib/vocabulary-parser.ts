export type VocabularyEntry = {
  id: string;
  term: string;
  meaning: string;
};

const separators = /\s*(?:\t+|\s+-\s+|\s*,\s*|\s{2,})\s*/;

function normalizeMeaning(value: string) {
  return value.replace(/[，、;；]+/g, "、").replace(/\s+/g, " ").trim();
}

function createId(term: string, meaning: string) {
  return `${term.toLocaleLowerCase()}::${meaning.toLocaleLowerCase()}`;
}

export function parseVocabularyText(input: string): VocabularyEntry[] {
  const entries: VocabularyEntry[] = [];
  const seen = new Set<string>();

  input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("//"))
    .forEach((line) => {
      const match = line.match(separators) ?? line.match(/\s+(?=[\u3400-\u9fff])/);
      if (!match || match.index === undefined) return;

      const term = line.slice(0, match.index).trim();
      const meaning = normalizeMeaning(line.slice(match.index + match[0].length));
      if (!term || !meaning) return;

      const id = createId(term, meaning);
      if (seen.has(id)) return;
      seen.add(id);
      entries.push({ id, term, meaning });
    });

  return entries;
}

export function parseVocabularyCsv(input: string) {
  return parseVocabularyText(
    input
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*["']?([^,"']+)["']?\s*,\s*["']?(.+?)["']?\s*$/, "$1\t$2"))
      .join("\n"),
  );
}
