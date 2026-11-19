/**
 * HANASO — Booklet parser (owner-pass 2026-11-19, mission phase 4).
 *
 * Parses the owner's N5 booklet markdown (the uploaded
 * HANASO-OWNER-EDUCATIONAL-NOTES-COMPLETE.fa.md — an OCR-converted
 * "Online Japanese N5 Course" textbook) into structured BOOKLET DRAFT JSON.
 *
 * ANTI-INVENTION CONTRACT: the parser only extracts what the booklet actually
 * says, tagging every item with its booklet page (〔ص N〕 markers) and lesson
 * section (Ⅰ goals / Ⅱ kaiwa / Ⅲ goi / Ⅳ hyoogen / Ⅴ bumpoo). Persian meanings
 * are NOT in the booklet (it is JP+romaji+EN) — meaningFa stays null and gets
 * `needs_review`; the agent/owner fills them later. Nothing is paraphrased.
 *
 * Usage: npx tsx scripts/lesson-engine/parse-booklet.ts <booklet.md> <out.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';

export interface BookletLine {
  speaker: string;
  ja: string;
  romaji?: string;
  page: number;
  indexInLesson: number;
}
export interface BookletVocabItem {
  no: number;
  ja: string;
  romaji: string;
  meaningEn: string;
  meaningFa: null;
  page: number;
  flags: string[];
}
export interface BookletExpression {
  no: number;
  ja: string;
  en: string;
  page: number;
}
export interface BookletGrammarPattern {
  no: number;
  patternJa: string;
  examplesJa: string[];
  page: number;
}
export interface BookletGoal {
  no: number;
  ja: string;
  en: string;
}
export interface BookletLesson {
  no: number;
  titleJa: string;
  sourceFile: string;
  goals: BookletGoal[];
  conversation: BookletLine[];
  vocabulary: BookletVocabItem[];
  expressions: BookletExpression[];
  grammar: BookletGrammarPattern[];
  pages: number[];
}
export interface BookletDraft {
  artifact: string;
  parsedAt: string;
  lessons: BookletLesson[];
  globalLists: { grammar: number; vocabulary: number; expressions: number };
}

const JP = /[\u3040-\u30ff\u4e00-\u9faf]/;
const ROMAJI = /^[A-Za-z][A-Za-z'\- ]*$/;

function pageOf(line: string, current: number): number {
  const m = line.match(/〔ص\s*(\d+)〕/);
  return m ? Number(m[1]) : current;
}

/** Extract the Japanese content of a numbered item line (ocr layout tolerant). */
function splitNumberedItem(rest: string): { ja: string; romaji: string; en: string } {
  const tokens = rest.replace(/\s+/g, ' ').split(' ');
  const jaTokens: string[] = [];
  const romajiTokens: string[] = [];
  const enTokens: string[] = [];
  let bucket: 'ja' | 'romaji' | 'en' = 'ja';
  for (const t of tokens) {
    if (/^[NVＮＶ]\d+$/.test(t)) {
      bucket = 'ja'; // grammar metavariable (N1 は N2 です) — part of the pattern
      jaTokens.push(t);
    } else if (JP.test(t)) {
      bucket = 'ja';
      jaTokens.push(t);
    } else if (ROMAJI.test(t) && bucket === 'ja') {
      bucket = 'romaji';
      romajiTokens.push(t);
    } else {
      bucket = 'en';
      enTokens.push(t);
    }
  }
  return {
    ja: jaTokens.join(' ').trim(),
    romaji: romajiTokens.join('').trim(),
    en: enTokens.join(' ').replace(/[()]/g, '').trim(),
  };
}

export function parseBooklet(md: string, artifactId: string): BookletDraft {
  const lessons: BookletLesson[] = [];
  let globalLists = { grammar: 0, vocabulary: 0, expressions: 0 };

  // split lessons on the Persian heading, keep the tail (global lists)
  const lessonSplit = md.split(/^## درس\s+(\S+)\s*—\s*(.+)$/gm);
  // lessonSplit: [pre, num1, title1, body1, num2, title2, body2, ..., tail]
  for (let i = 1; i < lessonSplit.length; i += 3) {
    const no = Number(String(lessonSplit[i]).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).trim());
    const titleJa = (lessonSplit[i + 1] ?? '').trim();
    const body = lessonSplit[i + 2] ?? '';
    const lesson: BookletLesson = {
      no,
      titleJa,
      sourceFile: body.match(/منبع:\s*`([^`]+\.pdf)`/)?.[1] ?? `N5-${String(no).padStart(2, '0')}.pdf`,
      goals: [],
      conversation: [],
      vocabulary: [],
      expressions: [],
      grammar: [],
      pages: [],
    };

    let page = 1;
    let section: 'goals' | 'kaiwa' | 'goi' | 'hyoogen' | 'bumpoo' | 'other' = 'other';
    let conversationIndex = 0;
    let currentItemNo = 0;
    let lastSpeaker = '';
    let grammarPattern: BookletGrammarPattern | null = null;
    let lastBumpooNo = 0;

    for (const raw of body.split('\n')) {
      page = pageOf(raw, page);
      if (!lesson.pages.includes(page) && page > 0) lesson.pages.push(page);
      const line = raw.replace(/〔ص\s*\d+〕/g, '').trim();
      if (!line || line.startsWith('>')) continue;

      // section switches (roman numeral headers — OCR variants tolerated)
      if (/(もくひょう|mokuhyoo)/.test(line) && /Ⅰ|レッスン/.test(line)) { section = 'goals'; currentItemNo = 0; continue; }
      if (/かいわ|kaiwa/.test(line) && /Ⅱ/.test(line)) { section = 'kaiwa'; conversationIndex = 0; continue; }
      if (/(ごい|goi)/.test(line) && /Ⅲ/.test(line)) { section = 'goi'; currentItemNo = 0; continue; }
      if (/(ひょうげん|hyoogen)/.test(line) && /Ⅳ/.test(line)) { section = 'hyoogen'; currentItemNo = 0; continue; }
      if (/(ぶんぽう|bumpoo)/.test(line) && /Ⅴ/.test(line)) { section = 'bumpoo'; currentItemNo = 0; continue; }
      if (/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]/.test(line) && section !== 'other') { section = 'other'; continue; }
      if (/^---$/.test(line)) continue;

      if (section === 'goals') {
        const m = line.match(/^(\d+)[.．]\s*(.*)$/);
        if (m) {
          currentItemNo = Number(m[1]);
          const { ja, en } = splitNumberedItem(m[2]);
          if (ja) lesson.goals.push({ no: currentItemNo, ja, en });
        } else if (lesson.goals.length > 0 && JP.test(line)) {
          // continuation line of the current goal (ocr splits) — append ja
          const last = lesson.goals[lesson.goals.length - 1];
          if (last) last.ja = `${last.ja} ${line}`.trim();
        }
        continue;
      }

      if (section === 'kaiwa') {
        const speakerLine = line.match(/^([^\s：:]{1,20})\s*[：:]\s*(.*)$/);
        if (speakerLine && JP.test(speakerLine[2] ?? '')) {
          // JP turn line: speaker + japanese text
          lastSpeaker = speakerLine[1];
          lesson.conversation.push({
            speaker: lastSpeaker,
            ja: (speakerLine[2] ?? '').trim(),
            page,
            indexInLesson: conversationIndex++,
          });
        } else if (speakerLine && ROMAJI.test((speakerLine[2] ?? '').trim())) {
          // romaji echo line — attach to the previous JP turn of the same speaker
          const prev = lesson.conversation[lesson.conversation.length - 1];
          if (prev && !prev.romaji) prev.romaji = (speakerLine[2] ?? '').trim();
        }
        continue;
      }

      if (section === 'goi' || section === 'hyoogen' || section === 'bumpoo') {
        const m = line.match(/^(\d+)[.．]\s*(.*)$/);
        if (m) {
          currentItemNo = Number(m[1]);
          // bumpoo: a numbered line is a PATTERN when it carries a metavariable
          // (N1/V1/…) — everything else numbered is an EXAMPLE of the current
          // pattern (numbering restarts under each pattern — content rule beats
          // number heuristics; anti-invention: keep grouping).
          if (section === 'bumpoo') {
            const { ja } = splitNumberedItem(m[2]);
            const isPattern = /^[NVＮＶ]\d|[～〜]|〔/.test(ja);
            if (!isPattern && grammarPattern) {
              if (ja && JP.test(ja) && ja.length > 3) grammarPattern.examplesJa.push(ja);
              continue;
            }
          }
          if (section === 'goi') {
            const { ja, romaji, en } = splitNumberedItem(m[2]);
            if (ja) {
              lesson.vocabulary.push({
                no: currentItemNo,
                ja,
                romaji,
                meaningEn: en,
                meaningFa: null,
                page,
                flags: en ? ['needs_review'] : ['needs_review', 'missing_source'],
              });
            }
          } else if (section === 'hyoogen') {
            const { ja, en } = splitNumberedItem(m[2]);
            if (ja) lesson.expressions.push({ no: currentItemNo, ja, en, page });
          } else {
            const { ja } = splitNumberedItem(m[2]);
            if (ja) {
              grammarPattern = { no: currentItemNo, patternJa: ja, examplesJa: [], page };
              lesson.grammar.push(grammarPattern);
            }
          }
        } else if (section === 'bumpoo' && grammarPattern && JP.test(line) && !/^\d/.test(line) && !ROMAJI.test(line.split(' ')[0] ?? '')) {
          // example sentence of the current grammar pattern
          const cleaned = line.replace(/[A-Za-z].*$/, '').trim();
          if (JP.test(cleaned) && cleaned.length > 3) grammarPattern.examplesJa.push(cleaned);
        }
        continue;
      }
    }
    lessons.push(lesson);
  }

  // global N5 lists (tail of the file)
  const tail = lessonSplit[lessonSplit.length - 1] ?? '';
  globalLists = {
    grammar: (tail.match(/^## فهرست کل گرامر/) ? tail.split(/^## فهرست کل گرامر/)[1]?.split(/^## /)[0]?.split('\n').filter((l) => l.trim() && !l.startsWith('#')).length : 0) ?? 0,
    vocabulary: 0,
    expressions: 0,
  };
  const vocMatch = tail.split(/## فهرست کل واژگان/)[1]?.split(/## /)[0];
  if (vocMatch) globalLists.vocabulary = vocMatch.split('\n').filter((l) => l.trim()).length;
  const expMatch = tail.split(/## فهرست کل عبارت‌های کاربردی/)[1]?.split(/## /)[0];
  if (expMatch) globalLists.expressions = expMatch.split('\n').filter((l) => l.trim()).length;

  return { artifact: artifactId, parsedAt: new Date().toISOString(), lessons, globalLists };
}

/* ------------------------------------------------------------------ CLI */
if (process.argv[1] && process.argv[1].endsWith('parse-booklet.ts')) {
  const [, , input, output] = process.argv;
  if (!input || !output) {
    console.error('usage: tsx parse-booklet.ts <booklet.md> <out.json>');
    process.exit(2);
  }
  const md = readFileSync(input, 'utf8');
  const draft = parseBooklet(md, 'n5-booklet');
  writeFileSync(output, JSON.stringify(draft, null, 2));
  console.log(
    `parsed ${draft.lessons.length} lessons; lesson-1: conv=${draft.lessons[0]?.conversation.length} vocab=${draft.lessons[0]?.vocabulary.length} expr=${draft.lessons[0]?.expressions.length} grammar=${draft.lessons[0]?.grammar.length}; global lists: ${JSON.stringify(draft.globalLists)}`,
  );
}
