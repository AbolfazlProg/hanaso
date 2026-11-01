/**
 * /poc/ui — نمونهٔ رندر دوزبانهٔ مرجع (TASK-M0-09 · AC-2).
 * این صفحه برگهٔ آزمون بصری پایدار است: پاراگراف ترکیبی فارسی+ژاپنی+روبی،
 * کارت جمله، دکمهٔ صوت و زیرمجموعهٔ کامپوننت‌های رابط در RTL.
 * محتوای ژاپنی این صفحه «دادهٔ آزمایشی مهندسی» است نه محتوای آموزشی.
 * اصلاح بازبینی r1-F6/r2-F1: متن فارسی بیرون جزیره‌های ژاپنی (spike §۶-۱:
 * هر قطعهٔ ژاپنی = یک island؛ مرزهای پاراگراف فارسی = همان مرز توکن‌ها).
 */
'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { AudioSentenceButton } from '@/components/patterns/audio-button';
import { FuriganaText, parseFuriganaDsl } from '@/components/patterns/furigana-text';
import { JapaneseSentence } from '@/components/patterns/japanese-sentence';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { fa } from '@/messages/fa';

/* جزیره‌ها: فقط متن ژاپنی — فارسی هرگز داخل island نمی‌رود (spike §۶-۳-۲) */
const greetingTokens = parseFuriganaDsl('おはよう[おはよう]ございます');
const weatherTokens = parseFuriganaDsl('今日[きょう]も 天気[てんき]が いい ですね');
const studyTokens = parseFuriganaDsl('日本語[にほんご]を 勉強[べんきょう]しています。');
const towerTokens = parseFuriganaDsl('東京[とうきょう]タワーは 高[たか]い です。');
const sentenceTokens = parseFuriganaDsl('コーヒーを お願い[おねがい]します。');

export default function UiSamplePage() {
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing'>('idle');
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-h1 font-semibold text-ink">{fa.uiKit.title}</h1>
      <p className="mt-2 text-small text-ink-soft">{fa.uiKit.subtitle}</p>

      {/* ۱ — پاراگراف ترکیبی: فارسی + دو جزیرهٔ ژاپنی روبی‌دار در یک سطر */}
      <section className="mt-10">
        <h2 className="text-h3 font-semibold text-ink">{fa.uiKit.mixedSection}</h2>
        <p className="fg-block mt-4 text-body text-ink">
          {fa.uiKit.mixedIntro} <FuriganaText tokens={greetingTokens} /> {fa.uiKit.mixedMeans}{' '}
          <FuriganaText tokens={weatherTokens} /> {fa.uiKit.mixedAfter}
        </p>
      </section>

      {/* ۲ — روبی خالص و variant سرِیف */}
      <section className="mt-10">
        <h2 className="text-h3 font-semibold text-ink">{fa.uiKit.rubySection}</h2>
        <p className="fg-block mt-4">
          <FuriganaText tokens={studyTokens} />
        </p>
        <p className="fg-block mt-4">
          {fa.uiKit.serifNote} <FuriganaText variant="serif" tokens={towerTokens} />
        </p>
      </section>

      {/* ۳ — کارت جمله + دکمهٔ صوت */}
      <section className="mt-10">
        <h2 className="text-h3 font-semibold text-ink">{fa.uiKit.cardSection}</h2>
        <div className="mt-4">
          <JapaneseSentence
            tokens={sentenceTokens}
            translation={fa.uiKit.translation}
            revealLabel={fa.sentence.revealTranslation}
            action={
              <AudioSentenceButton
                aria-label={fa.audio.playSentence}
                state={audioState}
                onClick={() => setAudioState((s) => (s === 'idle' ? 'playing' : s === 'playing' ? 'loading' : 'idle'))}
              />
            }
          />
        </div>
      </section>

      {/* ۴ — کامپوننت‌های رابط در RTL */}
      <section className="mt-10">
        <h2 className="text-h3 font-semibold text-ink">{fa.uiKit.componentsSection}</h2>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button>{fa.uiKit.primaryBtn}</Button>
          <Button variant="secondary">{fa.uiKit.secondaryBtn}</Button>
          <Button variant="ghost">{fa.uiKit.ghostBtn}</Button>
          <Button loading>{fa.uiKit.loadingBtn}</Button>
          <Button disabled>{fa.uiKit.disabledBtn}</Button>
          <Button variant="primary" size="main">
            {fa.uiKit.mainActionBtn}
          </Button>
        </div>

        <TooltipProvider>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">{fa.uiKit.hoverMe}</Button>
              </TooltipTrigger>
              <TooltipContent>{fa.uiKit.tooltipDemo}</TooltipContent>
            </Tooltip>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">{fa.uiKit.modalBtn}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{fa.uiKit.modalTitle}</DialogTitle>
                  <DialogDescription>{fa.uiKit.modalBody}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button>{fa.common.confirm}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary">{fa.uiKit.sheetBtn}</Button>
              </SheetTrigger>
              <SheetContent side="start">
                <SheetHeader>
                  <SheetTitle>{fa.uiKit.sheetTitle}</SheetTitle>
                  <SheetDescription>{fa.uiKit.sheetBody}</SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">{fa.uiKit.menuBtn}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>{fa.uiKit.menuLabel}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>{fa.uiKit.menuItemReview}</DropdownMenuItem>
                <DropdownMenuItem disabled>{fa.uiKit.menuItemDisabled}</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>{fa.uiKit.menuSub}</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>{fa.uiKit.menuSubItem}</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipProvider>

        <Tabs defaultValue="a" className="mt-4">
          <TabsList>
            <TabsTrigger value="a">{fa.uiKit.tabA}</TabsTrigger>
            <TabsTrigger value="b">{fa.uiKit.tabB}</TabsTrigger>
          </TabsList>
          <TabsContent value="a">
            <p className="text-body text-ink">{fa.uiKit.tabAContent}</p>
          </TabsContent>
          <TabsContent value="b">
            <p className="text-body text-ink">{fa.uiKit.tabBContent}</p>
          </TabsContent>
        </Tabs>

        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="q1">
            <AccordionTrigger>{fa.uiKit.accordionQ}</AccordionTrigger>
            <AccordionContent>{fa.uiKit.accordionA}</AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-4 rounded-md border border-ink-faint/55">
          <Command>
            <CommandInput placeholder={fa.uiKit.commandPlaceholder} />
            <CommandList>
              <CommandEmpty>{fa.uiKit.commandEmpty}</CommandEmpty>
              <CommandGroup heading={fa.uiKit.commandGroup}>
                <CommandItem>{fa.uiKit.commandItem1}</CommandItem>
                <CommandItem>{fa.uiKit.commandItem2}</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>

        <p className="mt-4 flex items-center gap-1 text-small text-ink-soft">
          <ChevronDown aria-hidden className="size-4" />
          {fa.uiKit.footer}
        </p>
      </section>
    </main>
  );
}
