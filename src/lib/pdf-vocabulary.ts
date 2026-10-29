export async function extractPdfText(file: File) {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const loadingTask = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await loadingTask.promise;
  const lines: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items
        .flatMap((item) => "str" in item && item.str.trim()
          ? [{ text: item.str, x: item.transform[4] as number, y: item.transform[5] as number, width: item.width }]
          : []);
      items.sort((left, right) => right.y - left.y || left.x - right.x);

      let row: typeof items = [];
      for (const item of items) {
        if (row.length && Math.abs(row[0].y - item.y) > 3) {
          lines.push(joinRow(row));
          row = [];
        }
        row.push(item);
      }
      if (row.length) lines.push(joinRow(row));
    }
  } finally {
    await loadingTask.destroy();
  }

  if (!lines.length) throw new Error("PDF 中没有可提取的文字；扫描版 PDF 暂不支持。");
  return lines.join("\n");
}

function joinRow(items: { text: string; x: number; width: number }[]) {
  return items.reduce((line, item, index) => {
    if (!index) return item.text;
    const previous = items[index - 1];
    const gap = item.x - previous.x - previous.width;
    return line + (gap > 8 ? "\t" : gap > 2 ? " " : "") + item.text;
  }, "").trim();
}
