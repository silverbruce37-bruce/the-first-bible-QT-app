import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import iconv from 'iconv-lite';

const bookMap: Record<string, number> = {
  'gen': 1, '창세기': 1, 'exo': 2, '출애굽기': 2, 'lev': 3, '레위기': 3, 'num': 4, '민수기': 4, 'deu': 5, '신명기': 5,
  'jos': 6, '여호수아': 6, 'jdg': 7, '사사기': 7, 'rut': 8, '룻기': 8, 'sa1': 9, '사무엘상': 9, 'sa2': 10, '사무엘하': 10,
  'ki1': 11, '열왕기상': 11, 'ki2': 12, '열왕기하': 12, 'ch1': 13, '역대상': 13, 'ch2': 14, '역대하': 14, 'ezr': 15, '에스라': 15,
  'neh': 16, '느헤미야': 16, 'est': 17, '에스더': 17, 'job': 18, '욥기': 18, 'psa': 19, '시편': 19, 'pro': 20, '잠언': 20,
  'ecc': 21, '전도서': 21, 'sol': 22, '아가': 22, 'isa': 23, '이사야': 23, 'jer': 24, '예레미야': 24, 'lam': 25, '예레미야애가': 25,
  'eze': 26, '에스겔': 26, 'dan': 27, '다니엘': 27, 'hos': 28, '호세아': 28, 'joe': 29, '요엘': 29, 'amo': 30, '아모스': 30,
  'oba': 31, '오바댜': 31, 'jon': 32, '요나': 32, 'mic': 33, '미가': 33, 'nah': 34, '나훔': 34, 'hab': 35, '하박국': 35,
  'zep': 36, '스바냐': 36, 'hag': 37, '학개': 37, 'zec': 38, '스가랴': 38, 'mal': 39, '말라기': 39,
  'mat': 40, '마태복음': 40, 'mar': 41, '마가복음': 41, 'luk': 42, '누가복음': 42, 'joh': 43, '요한복음': 43, 'act': 44, '사도행전': 44,
  'rom': 45, '로마서': 45, 'co1': 46, '고린도전서': 46, 'co2': 47, '고린도후서': 47, 'gal': 48, '갈라디아서': 48, 'eph': 49, '에베소서': 49,
  'phi': 50, '빌립보서': 50, 'col': 51, '골로새서': 51, 'th1': 52, '데살로니가전서': 52, 'th2': 53, '데살로니가후서': 53,
  'ti1': 54, '디모데전서': 54, 'ti2': 55, '디모데후서': 55, 'tit': 56, '디도서': 56, 'phm': 57, '빌레몬서': 57, 'heb': 58, '히브리서': 58,
  'jam': 59, '야고보서': 59, 'pe1': 60, '베드로전서': 60, 'pe2': 61, '베드로후서': 61, 'jo1': 62, '요한1서': 62, 'jo2': 63, '요한2서': 63,
  'jo3': 64, '요한3서': 64, 'jud': 65, '유다서': 65, 'rev': 66, '요한계시록': 66
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { book, chapter } = req.query;
  if (!book || !chapter || Array.isArray(book) || Array.isArray(chapter)) {
    return res.status(400).json({ error: 'Missing or invalid book or chapter' });
  }

  const bookIndex = bookMap[book.toLowerCase()];
  if (!bookIndex) {
    return res.status(400).json({ error: 'Invalid book code' });
  }

  try {
    // HolyBible URL handles multiple verses better with no CV
    const targetUrl = `http://holybible.or.kr/B_GAE/cgi/bibleftxt.php?VR=GAE&VL=${bookIndex}&CN=${chapter}`;
    
    const response = await fetch(targetUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const html = iconv.decode(buffer, 'euc-kr');

    // Robust parsing: extract all occurrences of "N:M" or "N. " followed by text
    const verses = [];
    const combinedRegex = /(\d+)[:.]\s*<\/b>\s*<\/font>\s*([^<]+)/gi;
    let m;
    while ((m = combinedRegex.exec(html)) !== null) {
        verses.push({
            verse: parseInt(m[1]),
            text: m[2].trim().replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
        });
    }

    if (verses.length === 0) {
        // Absolute fallback: search for anything like "<b>N:M</b>"
        const fallbackRegex = /<b>\s*(\d+)[:.]\s*(\d+)?\s*<\/b>\s*([^<]+)/gi;
        while ((m = fallbackRegex.exec(html)) !== null) {
            verses.push({
                verse: parseInt(m[2] || m[1]),
                text: m[3].trim().replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
            });
        }
    }

    if (verses.length === 0) {
      return res.status(404).json({ error: 'Failed to parse any verses', html_sample: html.substring(0, 1000) });
    }

    return res.status(200).json({ book, chapter: parseInt(chapter), verses });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
