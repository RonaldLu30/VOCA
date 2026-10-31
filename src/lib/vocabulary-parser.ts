export type VocabularyEntry = {
  id: string;
  term: string;
  meaning: string;
  synonyms: string[];
  phonetic?: string;
};

type TableColumns = { term: number; meaning: number; synonyms: number; phonetic: number };

const separators = /\s*(?:\t+|\s+[-—–:]\s+|\s*,\s*|\s{2,}|\s+(?=[\u3400-\u9fff]))\s*/;
const chinese = /[\u3400-\u9fff]/;
const synonymLabel = /(?:^|[\s；;、，,])(?:同义词|近义词|synonyms?)\s*(?:[:：]|\s+)\s*/i;

function normalizeMeaning(value: string) {
  return value.replace(/^(?:中文(?:释义|翻译)?|释义|翻译|意思)\s*[:：]\s*/, "")
    .replace(/[，、;；]+/g, "、").replace(/\s+/g, " ").trim();
}

function normalizeTerm(value: string) {
  return value.replace(/^\s*\d+[.)、]\s*/, "").trim();
}

export function isVocabularyTerm(value: string) {
  return /^[A-Za-z]/.test(value) && !chinese.test(value) && !/[\t<>]/.test(value) && value.length <= 100
    && !/^(?:day|unit|chapter|part|section|lesson|module|level)\s*(?:\d+|[IVX]+)$/i.test(value)
    && !/^(?:n|v|adj|adv|prep|pron|conj|phr|verb|noun|adjective|adverb)\.?$/i.test(value);
}

function parseSynonyms(value: string) {
  return [...new Set(value.replace(/^(?:同义词|近义词|synonyms?)\s*[:：]\s*/i, "")
    .split(/[,，、;；/]/)
    .map((item) => item.trim())
    .filter(isVocabularyTerm))];
}

function extractPhonetic(value: string) {
  const match = value.match(/(?:^|\s)(\/[^/\n]{2,80}\/|\[[^\]\n]{2,80}\])(?=\s|$)/);
  return match ? { phonetic: match[1], rest: value.replace(match[0], " ").trim() } : { phonetic: "", rest: value };
}

function headerKind(value: string) {
  const header = value.toLowerCase().replace(/[\s:：()（）\[\]【】/\\_-]/g, "");
  if (/^(?:目录|章节|分类|单元|序号|编号|页码|category|section|chapter|unit|number|no)$/.test(header)) return null;
  if (/音标|读音|发音/.test(header) || /^(?:phonetic|pronunciation|ipa|transcription)$/.test(header)) return "phonetic";
  if (/同义|近义|替换/.test(header) || /^(?:synonyms?|similarwords?|equivalentexpressions?)$/.test(header)) return "synonyms";
  if (/中文|汉语|释义|翻译|词义|意思|含义|解释/.test(header) || /^(?:meanings?|translations?|definitions?|chinese(?:meanings?|translations?)?)$/.test(header)) return "meaning";
  if (/英文|英语|单词|词条|词汇|词组|短语/.test(header) || /^(?:english(?:words?|phrases?|expressions?|wordphrase)?|words?|wordphrase|vocabulary|vocab|terms?|phrases?|expressions?)$/.test(header)) return "term";
  return null;
}

function readHeaders(cells: string[]): TableColumns | null {
  const headers = cells.map(headerKind);
  const term = headers.indexOf("term");
  const meaning = headers.indexOf("meaning");
  if (term < 0 || meaning < 0) return null;
  return { term, meaning, synonyms: headers.indexOf("synonyms"), phonetic: headers.indexOf("phonetic") };
}

export function parseVocabularyText(input: string): VocabularyEntry[] {
  const entries: VocabularyEntry[] = [];
  const seen = new Map<string, VocabularyEntry>();
  let tableColumns: TableColumns | null = null;
  const lines = input.replace(/\r\n?/g, "\n").split("\n")
    .map((line) => line.replace(/^ +| +$/g, ""));

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || line.startsWith("#") || line.startsWith("//") || /[.·…]{2,}\s*\d+\s*$/.test(line)) continue;
    const cells = line.split("\t").map((cell) => cell.trim());
    const headers = readHeaders(cells);
    if (headers) { tableColumns = headers; continue; }
    if (/^(?:目\s*录|contents|table of contents)$/i.test(line)) continue;

    const standaloneSynonyms = line.match(/^(?:同义词|近义词|synonyms?)\s*(?:[:：]|\t+)\s*(.+)$/i);
    if (standaloneSynonyms && entries.length) {
      const last = entries[entries.length - 1];
      last.synonyms = [...new Set([...last.synonyms, ...parseSynonyms(standaloneSynonyms[1])])];
      continue;
    }

    let term = "";
    let meaning = "";
    let synonymText = "";
    let phonetic = "";
    if (cells.length > 1 && tableColumns && cells.length > Math.max(tableColumns.term, tableColumns.meaning)) {
      term = cells[tableColumns.term];
      meaning = cells[tableColumns.meaning];
      if (tableColumns.synonyms >= 0) synonymText = cells[tableColumns.synonyms] ?? "";
      if (tableColumns.phonetic >= 0) phonetic = cells[tableColumns.phonetic] ?? "";
    } else if (cells.length > 1) {
      for (let position = cells.length - 1; position >= 0; position -= 1) {
        if (!isVocabularyTerm(normalizeTerm(cells[position]))) continue;
        const meaningIndex = cells.findIndex((cell, cellIndex) => cellIndex > position && chinese.test(cell));
        if (meaningIndex >= 0) {
          term = cells[position];
          meaning = cells[meaningIndex];
          synonymText = cells.slice(meaningIndex + 1).join(";");
          const phoneticCell = cells.find((cell) => extractPhonetic(cell).phonetic);
          phonetic = phoneticCell ? extractPhonetic(phoneticCell).phonetic : "";
          break;
        }
      }
    } else {
      const match = line.match(separators);
      if (match?.index !== undefined) {
        term = line.slice(0, match.index);
        meaning = line.slice(match.index + match[0].length);
      } else if (isVocabularyTerm(normalizeTerm(line)) && chinese.test(lines[index + 1] ?? "")) {
        term = line;
        meaning = lines[++index];
      }
    }

    const termPhonetic = extractPhonetic(term);
    term = normalizeTerm(termPhonetic.rest);
    phonetic ||= termPhonetic.phonetic;
    const meaningPhonetic = extractPhonetic(meaning);
    meaning = meaningPhonetic.rest;
    phonetic ||= meaningPhonetic.phonetic;
    const synonymMatch = meaning.match(synonymLabel);
    if (synonymMatch?.index !== undefined) {
      synonymText += `;${meaning.slice(synonymMatch.index + synonymMatch[0].length)}`;
      meaning = meaning.slice(0, synonymMatch.index);
    }
    meaning = normalizeMeaning(meaning);
    if (!isVocabularyTerm(term) || !chinese.test(meaning)) continue;
    if (/^(?:contents|table of contents|index)$/i.test(term) && /^目录/.test(meaning)) continue;

    const id = `${term.toLocaleLowerCase()}::${meaning.toLocaleLowerCase()}`;
    const synonyms = parseSynonyms(synonymText);
    const existing = seen.get(id);
    if (existing) {
      existing.synonyms = [...new Set([...existing.synonyms, ...synonyms])];
      existing.phonetic ||= phonetic || undefined;
      continue;
    }
    const entry = { id, term, meaning, synonyms, phonetic: phonetic || undefined };
    seen.set(id, entry);
    entries.push(entry);
  }

  return entries;
}

export function parseVocabularyCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (character === "\r" && input[index + 1] === "\n") index += 1;
    } else field += character === "\n" || character === "\r" ? " " : character;
  }
  row.push(field);
  rows.push(row);
  return parseVocabularyText(rows.map((cells) => cells.join("\t")).join("\n"));
}
