import { NextResponse } from "next/server";
import WordExtractor from "word-extractor";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "请选择 Word 文件" }, { status: 400 });
  if (!/\.(docx|doc)$/i.test(file.name)) return NextResponse.json({ error: "仅支持 .docx 和 .doc 文件" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "文件不能超过 10 MB" }, { status: 400 });

  try {
    const document = await new WordExtractor().extract(Buffer.from(await file.arrayBuffer()));
    const text = document.getBody();
    if (!text.trim()) return NextResponse.json({ error: "Word 文件中没有可读取的文字" }, { status: 422 });
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "Word 文件解析失败，请检查文件内容" }, { status: 422 });
  }
}
