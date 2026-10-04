import fs from 'node:fs/promises';
import path from 'node:path';
export const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.csv', '.json', '.log', '.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.xml', '.yaml', '.yml', '.sql', '.java', '.c', '.cpp', '.h', '.sh']);
export function documentKind(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  return ext === '.pdf' ? 'pdf' : ext === '.docx' ? 'docx' : TEXT_EXTENSIONS.has(ext) ? 'text' : null;
}
export function isImageUpload(file) {
  return /^image\//.test(file.mimetype || '') && /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.originalname || '');
}
export async function extractDocument(file) {
  const kind = documentKind(file);
  if (!kind) throw new Error(`Unsupported file: ${file.originalname}. Use PDF, DOCX, or a text/code file. Convert old .doc files to .docx first.`);
  const buffer = await fs.readFile(file.path);
  let text;
  if (kind === 'pdf') {
    const {
      PDFParse
    } = await import('pdf-parse');
    const parser = new PDFParse({
      data: buffer
    });
    try {
      const result = await parser.getText();
      text = result.pages?.map(p => p.text).join('\n\n') ?? result.text;
    } finally {
      await parser.destroy();
    }
  } else if (kind === 'docx') {
    const mammoth = await import('mammoth');
    text = (await mammoth.extractRawText({
      buffer
    })).value;
  } else {
    text = buffer.toString('utf8');
    if (text.includes('\0') || (text.match(/\uFFFD/g) || []).length > 10) {
      throw new Error(`${file.originalname} is not a supported UTF-8 text file.`);
    }
  }
  text = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!text) throw new Error(`No readable text in ${file.originalname}. Scanned PDFs and image-only documents need OCR; upload the page as an image instead. Password-protected PDFs must be unlocked first.`);
  if (text.length > 500000) throw new Error(`${file.originalname} contains too much text. Split it into smaller documents (under 500,000 characters).`);
  return {
    name: file.originalname,
    text
  };
}
// Keep document excerpts small enough for the model context.
export function selectDocumentContext(documents, question, budget = 4000) {
  const terms = [...new Set(question.toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) || [])];
  const perFile = Math.floor(budget / documents.length);
  return documents.map(doc => {
    if (doc.text.length <= perFile) return {
      ...doc,
      partial: false
    };
    const size = Math.min(900, Math.floor(perFile / 3));
    const chunks = [];
    for (let start = 0; start < doc.text.length; start += size) {
      const text = doc.text.slice(start, start + size);
      const lower = text.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0);
      chunks.push({
        start,
        text,
        score
      });
    }
    const ranked = [...chunks].sort((a, b) => b.score - a.score || a.start - b.start);
    const chosen = ranked[0].score > 0 ? ranked.slice(0, 3) : [chunks[0], chunks[Math.floor(chunks.length / 2)], chunks.at(-1)];
    return {
      name: doc.name,
      partial: true,
      text: [...new Set(chosen)].sort((a, b) => a.start - b.start).map(c => `[Excerpt at character ${c.start + 1}]\n${c.text}`).join('\n\n').slice(0, perFile)
    };
  });
}
