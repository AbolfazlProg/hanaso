/**
 * HANASO — EQA report rendering (TASK-LEARNING-04) — PURE module.
 *
 * Renders the runner result as (a) console lines for CI logs and (b) a markdown
 * audit document. Errors are actionable in Persian (lesson/field/reason + KB rule
 * reference) — never a bare "EQA-02 FAILED".
 */
import { EQA_GATE_REGISTRY, findingKey } from './policy';
import type { EqaRunResult } from './run';

const SEVERITY_FA: Record<string, string> = {
  error: 'خطا',
  warning: 'هشدار (نیازمند بازبینی انسانی EQA-9)',
  info: 'اطلاع (با دادهٔ فعلی قابل بررسی نیست)',
};

export function renderConsole(result: EqaRunResult): string {
  const lines: string[] = [];
  lines.push('════════════════════════════════════════════════════════════════');
  lines.push(' HANASO — گیت‌های کیفیت آموزشی EQA-1..EQA-7 (TASK-LEARNING-04)');
  lines.push(' قواعد: HANASO_INSTRUCTIONAL_DESIGN_CONTRACT §۵ · Issue #97');
  lines.push('════════════════════════════════════════════════════════════════');

  let errorCount = 0;
  let warnCount = 0;
  let waivedCount = 0;

  for (const spec of EQA_GATE_REGISTRY) {
    lines.push('');
    lines.push(`── ${spec.id} — ${spec.ruleFa}`);
    lines.push(`   منبع: ${spec.source}`);
  }

  for (const ch of result.chapters) {
    lines.push('');
    lines.push(`▌فصل: ${ch.chapter.slug} (${ch.chapter.titleFa})`);
    for (const { finding, waiver } of ch.waived) {
      waivedCount += 1;
      lines.push(`  [${finding.gate}] معاف‌شده (waived) — #${waiver.issue} · رفع در ${waiver.resolvedBy}`);
      lines.push(`    ${finding.messageFa}`);
    }
    for (const finding of ch.unwaivedErrors) {
      errorCount += 1;
      lines.push(`  [${finding.gate}] خطا — ${finding.subject} (${finding.rule})`);
      lines.push(`    ${finding.messageFa}`);
      lines.push(`    ارجاع قانون: ${finding.ruleRef}`);
    }
    for (const finding of ch.review) {
      warnCount += 1;
      lines.push(`  [${finding.gate}] ${SEVERITY_FA[finding.severity]} — ${finding.subject}`);
      lines.push(`    ${finding.messageFa}`);
    }
  }

  if (result.levelFindings.length > 0) {
    lines.push('');
    lines.push('▌سیاست سطوح (LEVEL_POLICIES)');
    for (const f of result.levelFindings) {
      if (f.severity === 'error') errorCount += 1;
      else warnCount += 1;
      lines.push(`  [${f.gate}] ${SEVERITY_FA[f.severity]} — ${f.subject}: ${f.messageFa}`);
    }
  }

  for (const w of result.staleWaivers) {
    errorCount += 1;
    lines.push('');
    lines.push(
      `  [WAIVER] خطا — معافیت بی‌مصرف: «${w.key}» دیگر هیچ یافته‌ای ندارد؛ اگر محتوا رفع شده، معافیت را هم حذف کن (#${w.issue}).`,
    );
  }
  for (const w of result.duplicateWaivers) {
    errorCount += 1;
    lines.push(`  [WAIVER] خطا — کلید معافیت تکراری: «${w.key}».`);
  }

  lines.push('');
  lines.push('──────────────────────────────────────────────────────────────');
  lines.push(
    ` نتیجه: ${result.pass ? 'PASS ✅' : 'FAIL ❌'} — خطای فعال: ${errorCount} · معاف‌شده: ${waivedCount} · نیازمند بازبینی: ${warnCount}`,
  );
  if (!result.pass) {
    lines.push(' خطاهای بدون معافیت باید یا اصلاح شوند یا با Issue ثبت‌شده معاف شوند — CI نمی‌تواند سبز شود.');
  }
  lines.push('──────────────────────────────────────────────────────────────');
  return lines.join('\n');
}

export function renderMarkdown(result: EqaRunResult, meta: { commit: string; date: string }): string {
  const md: string[] = [];
  md.push('# EQA_RUN_REPORT — گزارش اجرای گیت‌های کیفیت آموزشی');
  md.push('');
  md.push(
    `> تاریخ: ${meta.date} · کامیت: \`${meta.commit}\` · ابزار: \`pnpm --filter web test:eqa\` (EQA-1..7 · TASK-LEARNING-04 / #97)`,
  );
  md.push(`> نتیجهٔ این اجرا: **${result.pass ? 'PASS' : 'FAIL'}** — خطای بدون معافیت = شکست CI.`);
  md.push('');
  md.push('## وضعیت کلی');
  md.push('');
  md.push('| فصل | خطای فعال | معاف‌شده (waived) | بازبینی انسانی (EQA-9) |');
  md.push('| --- | --- | --- | --- |');
  for (const ch of result.chapters) {
    md.push(`| ${ch.chapter.slug} | ${ch.unwaivedErrors.length} | ${ch.waived.length} | ${ch.review.length} |`);
  }
  md.push('');

  for (const ch of result.chapters) {
    md.push(`## فصل ${ch.chapter.slug} — ${ch.chapter.titleFa}`);
    md.push('');
    if (ch.waived.length > 0) {
      md.push('### نقض‌های ثبت‌شده (معاف با Issue — رفع در مأموریت محتوایی)');
      md.push('');
      md.push('| کلید | گیت | Issue | دلیل | رفع در |');
      md.push('| --- | --- | --- | --- | --- |');
      for (const { finding, waiver } of ch.waived) {
        md.push(
          `| \`${findingKey(finding)}\` | ${finding.gate} | #${waiver.issue} | ${waiver.reason} | ${waiver.resolvedBy} |`,
        );
      }
      md.push('');
    }
    if (ch.unwaivedErrors.length > 0) {
      md.push('### ❌ خطاهای فعال (CI نمی‌گذرد)');
      md.push('');
      for (const f of ch.unwaivedErrors) {
        md.push(`- **[${f.gate}] ${f.subject}** (${f.ruleRef}): ${f.messageFa}`);
      }
      md.push('');
    }
    if (ch.review.length > 0) {
      md.push('### ⚠️ نیازمند بازبینی انسانی (EQA-9)');
      md.push('');
      for (const f of ch.review) {
        md.push(`- **[${f.gate}] ${f.subject}**: ${f.messageFa}`);
      }
      md.push('');
    }
    if (ch.waived.length + ch.unwaivedErrors.length + ch.review.length === 0) {
      md.push('هیچ یافته‌ای — همهٔ گیت‌ها سبز. ✅');
      md.push('');
    }
  }

  if (result.levelFindings.length > 0) {
    md.push('## سیاست سطوح (LEVEL_POLICIES)');
    md.push('');
    for (const f of result.levelFindings) {
      md.push(`- **[${f.gate}] ${f.subject}**: ${f.messageFa}`);
    }
    md.push('');
  }
  if (result.staleWaivers.length > 0 || result.duplicateWaivers.length > 0) {
    md.push('## مشکل در معافیت‌ها');
    md.push('');
    for (const w of result.staleWaivers) md.push(`- معافیت بی‌مصرف: \`${w.key}\` (#${w.issue})`);
    for (const w of result.duplicateWaivers) md.push(`- کلید تکراری: \`${w.key}\` (#${w.issue})`);
    md.push('');
  }
  return md.join('\n');
}
