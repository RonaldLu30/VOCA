import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ term: string }> }) {
  const { term } = await context.params;
  const word = decodeURIComponent(term).trim();
  if (!word) return NextResponse.json({ error: "缺少词汇" }, { status: 400 });
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { next: { revalidate: 86400 } });
    if (!response.ok) return NextResponse.json({ word, meanings: [], source: "dictionaryapi.dev" }, { status: 404 });
    const data = await response.json() as Array<{ word: string; phonetic?: string; phonetics?: { text?: string; audio?: string }[]; meanings?: { partOfSpeech?: string; definitions?: { definition?: string; synonyms?: string[] }[] }[] }>;
    const first = data[0];
    return NextResponse.json({ word: first.word, phonetic: first.phonetic ?? first.phonetics?.find((item) => item.text)?.text, audioUrl: first.phonetics?.find((item) => item.audio)?.audio, meanings: (first.meanings ?? []).map((meaning) => ({ partOfSpeech: meaning.partOfSpeech, definitions: (meaning.definitions ?? []).map((item) => item.definition ?? "").filter(Boolean), synonyms: [...new Set((meaning.definitions ?? []).flatMap((item) => item.synonyms ?? []))] })) });
  } catch {
    return NextResponse.json({ word, meanings: [], error: "词典服务暂时不可用" }, { status: 502 });
  }
}
