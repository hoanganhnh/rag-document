import fs from 'fs';
import pdf from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { parse } from 'csv-parse/sync';

export async function extractText(
  filePath: string,
  mimetype: string,
): Promise<string> {
  const buffer = fs.readFileSync(filePath);

  if (mimetype === 'application/pdf') {
    const pdfParser = pdf as (buffer: Buffer) => Promise<{ text: string }>;
    const data = await pdfParser(buffer);
    return data.text;
  }

  if (mimetype === 'text/plain') {
    return buffer.toString('utf8');
  }

  if (mimetype === 'text/csv') {
    const records = parse(buffer, { columns: true });
    return JSON.stringify(records, null, 2);
  }

  if (mimetype.startsWith('image/')) {
    const result = await Tesseract.recognize(buffer, 'eng');
    return result.data.text;
  }

  return 'Unsupported file';
}
