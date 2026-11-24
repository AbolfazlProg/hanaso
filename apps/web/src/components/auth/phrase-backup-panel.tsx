/**
 * HANASO — the shared phrase BACKUP panel (owner revision 2026-11-25).
 *
 * ONE component renders the recovery phrase everywhere it appears — the
 * signup wizard's phrase step AND the security-settings enroll wizard. The
 * owner's ask: the phrase must reach the user as TEXT (copy to clipboard),
 * a downloadable TXT, and a downloadable PDF — from signup AND from the
 * settings («فقط بخش لاگین قابل قبول نیست»). Same words grid, same action
 * grammar (utility = ghost/sm + size-4 icon), same honest warning line.
 */
'use client';

import { useState } from 'react';
import { Check, Copy, FileDown, FileText, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fa } from '@/messages/fa';
import { downloadPhrasePdf, downloadPhraseTxt } from '@/modules/auth/phrase-backup';

const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

export interface PhraseBackupPanelProps {
  /** The 12 words, in order — shown once, never logged. */
  words: string[];
  /** The account handle for the file header (when known). */
  username?: string | null;
  /** «نمایش دوباره» — refetch inside the open wizard window (optional). */
  onRefetch?: () => void;
  refetchBusy?: boolean;
}

export function PhraseBackupPanel({ words, username, onRefetch, refetchBusy = false }: PhraseBackupPanelProps) {
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard?.writeText(words.join(' '));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard denied — the TXT download is the fallback right beside it */
    }
  }

  async function pdf() {
    setPdfBusy(true);
    setPdfError(false);
    try {
      await downloadPhrasePdf(words, { username });
    } catch {
      setPdfError(true);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-small leading-relaxed text-ink-soft">{fa.auth.phraseBackupHint}</p>

      {/* the words — 2 cols mobile, 3 from sm up, numbered, LTR mono words */}
      <div className="grid grid-cols-2 gap-2 rounded-md border-2 border-indigo/40 bg-paper p-3 sm:grid-cols-3">
        {words.map((word, i) => (
          <div
            key={`${word}-${i}`}
            className="flex items-baseline gap-2 rounded-sm border border-indigo/20 bg-card px-2 py-1.5"
          >
            <span className="text-micro font-black text-indigo/70">{faNum(i + 1)}</span>
            <span dir="ltr" className="font-mono text-small font-bold text-ink">
              {word}
            </span>
          </div>
        ))}
      </div>

      {/* the action row — ONE grammar: utility actions are ghost/sm */}
      <div className="flex flex-wrap items-center gap-2">
        {onRefetch ? (
          <Button variant="ghost" size="sm" onClick={onRefetch} loading={refetchBusy}>
            <RotateCcw aria-hidden className="size-4" />
            {fa.auth.signupShowPhraseAgain}
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => void copy()} aria-live={copied ? 'polite' : undefined}>
          {copied ? <Check aria-hidden className="size-4 text-success" /> : <Copy aria-hidden className="size-4" />}
          {copied ? fa.auth.phraseCopiedOk : fa.auth.phraseCopyCta}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => downloadPhraseTxt(words, { username })}>
          <FileText aria-hidden className="size-4" />
          {fa.auth.phraseDownloadTxt}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void pdf()} loading={pdfBusy}>
          <FileDown aria-hidden className="size-4" />
          {fa.auth.phraseDownloadPdf}
        </Button>
      </div>
      {pdfError ? <p className="text-caption font-bold text-error">{fa.auth.genericError}</p> : null}
    </div>
  );
}
