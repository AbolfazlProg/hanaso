# TASK-HANASO-23 · Round C3 · Subagent C — VERIFICATION/REDO (C1-C + C2-C)

Auditor: Subagent C (redo — previous C3-C sandbox died mid-run; this file is
written INCREMENTALLY, verdicts filled per work block). Mandate: fresh-eyes
verification of C1-C-01..12 and C2-C-01..13 via source spot-checks + browser
reproductions on the local standalone build + one generator census.
Verdicts: VERIFIED-SOURCE (re-read cited lines myself), VERIFIED-BROWSER
(reproduced in browser), REFUTED, UNVERIFIED.

## §1 Verdict table

| ID | Title (short) | Verdict | Evidence this round |
| --- | --- | --- | --- |
| C1-C-01 | Ch2 distractorRationaleFa mis-keyed (21→23) | VERIFIED-SOURCE | script re-derivation: 23 items have rationale keyed on correctOptionId (C2 list exact: 21 C1 items + p2-c2-cloze-1 + or2-mp-1); o3 :19-34 + grading.ts:96-97 re-read; v1-p3-match-1 opts a=かんこくじん/b=ちゅうごくじん/c=イランじん✓ |
| C1-C-02 | Stale «۱۴ نوبتی»/«خط/نوبت» off-by-one | VERIFIED-SOURCE | index.ts:20 «۱۴ نوبتی», :71 «۹–۱۴», stations.ts:31/:522; yaml 13 lines l1..l13 (T12=Kim intro); dialogue-scene.tsx:489 `خط ${activeIndex+1} از ${n}` live; «خط ۱۳» for L(12) at ex:853/1069/1082/1378 |
| C1-C-03 | Internal jargon in objectiveFa (4 stations) | VERIFIED-SOURCE | stations.ts:2381-2382 («…انت» truncated), :3742 (CONTENT-107), :4110 (spec §3), :4152 (FEAT-158); section-journey.tsx:375 renders objectiveFa |
| C1-C-04 | Recall f1 doubled tail (92) + cryptic f2 | VERIFIED-SOURCE | rg doubled tail = 92 = kana-recall count 92; f1/f2 verbatim at :160-161 |
| C1-C-05 | «سرنخ» hint button no-op + stray label | VERIFIED-SOURCE | exercise-session.tsx:947-956 button inside feedback panel; :1009 hint <p> gated !feedback; retry() :553-567 clears feedback, never resets hintRevealed; fa.ts:374 «سرنخ» |
| C1-C-06 | False FSRS claims in 4 wrap-ups | VERIFIED-SOURCE | script over KANA_STATIONS: 4 claim-FSRS stations with fsrsItems:[] = h0/k13/opt-r-h9/opt-drill exactly; 21 with cards; route.ts:501 if(fsrsItems.length>0) |
| C1-C-07 | Wrap-up word-count ledger inconsistent | VERIFIED-SOURCE | ledger re-read :190-3829: h3 46+38≠163 (+79), h12 538+51≠606 (+17), h14→k2 606+3≠638 (+29); k5→k6 650+11=661 ✓ |
| C1-C-08 | gate-m5-1 unanswerable by sound (ン/ん) | VERIFIED-SOURCE | ex-kana-gate-m5-1 :9685-9707: options ン/ん(correct)/あ, sound→glyph; rationale a «کانای دیگری با همین ردیف.» — ン=/n/ too |
| C1-C-09 | 7 factual feedback errors | VERIFIED-SOURCE | all 7 re-read verbatim: :515 «دو مورا: せ+んせ+い», kana:10725 «بوو-لو-پِ-ن», :471+:1083 «はじめまて», :74 «ちゅうごک», :221 «یک چیپ اضافه داری», :147 f1 «درست! نوبت ۸…», :1231-1243 がくせい…がくせい chips |
| C1-C-10 | Listening rationale explains shapes (173) | VERIFIED-SOURCE | 173 kana-listening items; shape-rationales at :5867/:5890/:5913 on sound→glyph; 172× f3 «این صدا مال کانای نشان‌داده‌شده…» |
| C1-C-11 | Terminology drift + mixed-script glitches | VERIFIED-SOURCE | codepoints: h12 :1807/:1814 「びよういن」 ends U+0646 Persian ن not ン; :3033 «ジャパン (پْا)», :3178 «ئه‌کون», :4027 «کُنیچیوا», kana:9746 garbled f2; terminology counts گلیف×4+fa.ts vs نویسه×4 |
| C1-C-12 | Minor promise/tone items (4) | VERIFIED-SOURCE | levels.ts:18 «روان می‌خواند»; h0 :17-18 objectiveFa==titleFa; kana:4988 «اشتباه گرفتی»; «(؟)» labels :509/:531 |
| C2-C-01 | Practice two-correct items (census) | VERIFIED-SOURCE | OWN CENSUS (esbuild bundle of the real generator, full taught scope): MIXED 2000 items → 33 defective incl. verbatim k3-hira-ra [う|ら|ラ], k1 same-sound sa=サ/さ, k2 dup-label «وا | wa»×2; FOCUSED k1..k13×10seeds 1540 → 24 (1.56%). Reproduced, stronger than C2-C 14/2000 |
| C2-C-02 | Gate-pass «کارت‌های مرور فردا» vs «به‌زودی» | VERIFIED-SOURCE | fa.ts:475 «کارت‌های مرور فردا منتظرند» vs fa.ts:89 «به‌زودی فعال می‌شود»; home/server.ts:94 fsrsActive=false (integration.ts:82-84 not-integrated) |
| C2-C-03 | «حداکثر سه حلقه» safeguard unimplemented | VERIFIED-SOURCE | fa.ts:477 «حداکثر سه حلقه در هر جلسه»; progress-machine.ts:111-118 sets terminal remediate@maxLoops — ZERO consumers block attempts; remediationCount chapter-lifetime persisted, not per-session |
| C2-C-04 | Writing practice unreachable but advertised | VERIFIED-SOURCE | practice-hub.tsx:61-63 generate payload omits includeWriting; route.ts:45 default false; fa.ts:65 writingNote rendered hub:543; fa.ts:66 includeWriting string dead |
| C2-C-05 | 19 writing instructions quote absent UI labels | VERIFIED-SOURCE | 19× «نمایش ترتیب» in stations instructionsFa; current fa.ts buttons = «نمایش دوباره»/«راهنما»/«یک بار دیگر بنویس» — «نمایش ترتیب»/«روی الگو» absent; rendered station-runner.tsx:1369-1371 |
| C2-C-06 | pairHintFa wrong stroke counts (5) | VERIFIED-SOURCE | writing-data/index.json: へ=1 (hint :136 «دو ضربه» ✗), ケ=3 (:758/:773 «یک‌ضربه» ✗), ナ=2 (:869/:939 «فقط یک خطِ مورب»/«سقف ندارد» ✗); へ own :421 «یک ضربه» internal contradiction |
| C2-C-07 | う mnemonic teaches the warned-against error | VERIFIED-SOURCE | kana-teaching.ts:56-68: note «لب‌ها را گرد نکن» vs storyFa «دهان از تعجب گرد شده: «اوو»!» same card |
| C2-C-08 | K4 autoplay defeats task; K5 ー omitted; romaji | VERIFIED-SOURCE | generator.ts:67-79 romajiOf maps ー to hyphen and っ to t-; K4 :189-204 promptAudio=word audio while prompt says «این واژه را بخوان»; hub :270-281 autoplays promptAudio every item; K5 reveal :234 lacks ー rule |
| C2-C-09 | gateLead «ده پرسش» vs 13/12 real | VERIFIED-SOURCE | fa.ts:470 «ده پرسش» vs script: ch1 mastery items=13, ch2=12 |
| C2-C-10 | Developer-speak on learner paths (4) | VERIFIED-SOURCE | fa.ts:423 «مهر ایچن», :252 kanaCardMissing «در رجیستری…ناقص است»; dialogue-scene.tsx:389 hardcoded aria «صحنهٔ مکالمهٔ کافه» (ch1 h0 welcome ≠ cafe); :392-396 raw dev note + «مسیر خطا قابل آزمایش است» |
| C2-C-11 | Corrupted mixed-script «تipe‌شناختی» | VERIFIED-SOURCE | stations.ts:255 codepoints 62a 69 70 65 = Persian «ت» + Latin «ipe» + ZWNJ — corruption confirmed |
| C2-C-12 | fa.ts copy cluster (گلیف/گذشتی/hardcoded) | VERIFIED-SOURCE | fa.ts:39 «گلیف‌ها», :384 «گذشتی»; hub hardcoded Persian :117/:490/:584; weakSelectionShare only defined in policy.ts, never consumed |
| C2-C-13 | No volume/mute for learning audio | VERIFIED-SOURCE | fa.audio={playSentence,replay,stop} only; only seal SFX mute exists (station-runner.tsx:268); exListenAutoNote not rendered in /practice |

## §2 Browser reproductions (screenshots) — COMPLETE

- c3c-01 (mis-keyed rationale: picked option gets no rationale / mismatched) — subagent C
- c3c-02a (live player counter «خط N از ۱۳») — subagent C
- c3c-03a/03b (hint no-op; stray «سرنخ…» label after retry) — subagent C
- c3c-05a/05b (gate-pass «کارت‌های مرور فردا» vs home «به‌زودی») — subagent C
- c3c-06a (spoiler fix: wrong listening answer does NOT play the correct audio) — subagent C
- c3c-06b (attempt-2 elimination: one wrong option disappears) — subagent C
- c3c-07 (gateLead) — subagent C
- c3c-06c (achievements: max-3 chips on the m1 completion panel) — LEAD (the
  subagent died in the infra failure before this shot; the lead reproduced it
  during the m1 UI walk, same technique family)

Provenance: subagent C filled §1 + produced the PNGs above, then died in the
subagent-infrastructure failure; the lead added only c3c-06c. No verdicts
were inherited — every row in §1 was re-derived by subagent C itself.

## §3 Engine positives re-validated in browser — DONE

- Spoiler fix end-to-end in the listening flow (c3c-06a) — answer wrong →
  no correct-audio playback.
- Retry/elimination ladder at attempt 2 (c3c-06b).
- Achievements cap (max 3 chips, honest labels only) (c3c-06c).

## §4 New findings (C3-C-nn)

- none beyond §1 (the census upgrade to C2-C-01 — 33/2000 mixed, 24/1540
  focused — is recorded inside the §1 row as the verification evidence).

## §5 Coverage & notes — DONE

- All 25 assigned ids: VERIFIED-SOURCE (see §1 evidence column).
- Generator census: own esbuild-bundled census over the REAL generator —
  mixed 2000 items (33 defective), focused k1..k13×10 seeds 1540 (24).
- Browser: 8 reproductions listed in §2 (7 subagent + 1 lead).
