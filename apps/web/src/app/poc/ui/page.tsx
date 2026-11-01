/**
 * /poc/ui — نمونهٔ رندر دوزبانهٔ مرجع (TASK-M0-09 · AC-2).
 * این صفحه برگهٔ آزمون بصری پایدار است: پاراگراف ترکیبی فارسی+ژاپنی+روبی،
 * کارت جمله، دکمهٔ صوت و زیرمجموعهٔ کامپوننت‌های رابط در RTL.
 * محتوای ژاپنی این صفحه «دادهٔ آزمایشی مهندسی» است نه محتوای آموزشی.
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

const mixedParagraphTokens = parseFuriganaDsl(
  '「おはよう」 یعنی «صبح بخیر» — 今日[きょう]も 天気[てんき]が いい ですね。',
);

const sentenceTokens = parseFuriganaDsl('コーヒーを お願い[おねがい]します。');

export default function UiSamplePage() {
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing'>('idle');
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-h1 font-semibold text-ink">{fa.uiKit.title}</h1>
      <p className="mt-2 text-small text-ink-soft">{fa.uiKit.subtitle}</p>

      {/* ۱ — پاراگراف ترکیبی: فارسی + جزیره‌های ژاپنی روبی‌دار در یک سطر */}
      <section className="mt-10">
        <h2 className="text-h3 font-semibold text-ink">{fa.uiKit.mixedSection}</h2>
        <p className="fg-block mt-4 text-body text-ink">
          مقدمهٔ فارسی: <FuriganaText tokens={mixedParagraphTokens} /> و ادامهٔ فارسی پس از جزیره — ترتیب قطعه‌ها باید
          حفظ شود.
        </p>
      </section>

      {/* ۲ — روبی خالص و variant سرِیف */}
      <section className="mt-10">
        <h2 className="text-h3 font-semibold text-ink">{fa.uiKit.rubySection}</h2>
        <p className="fg-block mt-4">
          <FuriganaText>日本語[にほんご]を 勉強[べんきょう]しています。</FuriganaText>
        </p>
        <p className="fg-block mt-4">
          <FuriganaText variant="serif">東京[とうきょう]タワーは 高[たか]い です。</FuriganaText>
        </p>
      </section>

      {/* ۳ — کارت جمله + دکمهٔ صوت */}
      <section className="mt-10">
        <h2 className="text-h3 font-semibold text-ink">{fa.uiKit.cardSection}</h2>
        <div className="mt-4">
          <JapaneseSentence
            tokens={sentenceTokens}
            translation="یک قهوه لطفاً."
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
          <Button>دکمهٔ اصلی</Button>
          <Button variant="secondary">ثانویه</Button>
          <Button variant="ghost">شفاف</Button>
          <Button loading>در حال انجام</Button>
          <Button disabled>غیرفعال</Button>
          <Button variant="primary" size="main">
            اکشن اصلی لمسی
          </Button>
        </div>

        <TooltipProvider>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">هاور کن</Button>
              </TooltipTrigger>
              <TooltipContent>تولتیپ فارسی با عرض محدود</TooltipContent>
            </Tooltip>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">مودال</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>عنوان مودال</DialogTitle>
                  <DialogDescription>توضیح فارسی مودال — پس‌زمینه با توکن scrim و لایهٔ z-modal.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button>{fa.common.confirm}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary">پنل کشویی</Button>
              </SheetTrigger>
              <SheetContent side="start">
                <SheetHeader>
                  <SheetTitle>پنل «در مکالمه ببین»</SheetTitle>
                  <SheetDescription>side=start در RTL از لبهٔ چپ باز می‌شود.</SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">منو</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>گزینه‌ها</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>شروع مرور</DropdownMenuItem>
                <DropdownMenuItem disabled>غیرفعال</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>زیرمنو</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>عمق ۲</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipProvider>

        <Tabs defaultValue="a" className="mt-4">
          <TabsList>
            <TabsTrigger value="a">الف</TabsTrigger>
            <TabsTrigger value="b">ب</TabsTrigger>
          </TabsList>
          <TabsContent value="a">
            <p className="text-body text-ink">محتوای زبانهٔ اول.</p>
          </TabsContent>
          <TabsContent value="b">
            <p className="text-body text-ink">محتوای زبانهٔ دوم.</p>
          </TabsContent>
        </Tabs>

        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="q1">
            <AccordionTrigger>چرا جزیرهٔ LTR لازم است؟</AccordionTrigger>
            <AccordionContent>
              بدون isolate، ترتیب قطعه‌های ژاپنی در پاراگراف فارسی وارونه می‌شود (spike M0-08).
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-4 rounded-md border border-ink-faint/55">
          <Command>
            <CommandInput placeholder="جست‌وجو…" />
            <CommandList>
              <CommandEmpty>نتیجه‌ای نبود.</CommandEmpty>
              <CommandGroup heading="واژه‌ها">
                <CommandItem>コーヒー — قهوه</CommandItem>
                <CommandItem>お願いします — لطفاً</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>

        <p className="mt-4 flex items-center gap-1 text-small text-ink-soft">
          <ChevronDown aria-hidden className="size-4" />
          انتهای برگهٔ مرجع رندر.
        </p>
      </section>
    </main>
  );
}
