/**
 * HANASO — auth form primitives (M2 · AUTH-PASSWORD).
 *
 * The professional input set for the identity surface — consistent with the
 * Aizen system: 2px ink-line borders on paper, the vermilion focus ring
 * (shu ghost offset — --shadow-focus-input), LTR inputs for latin content
 * (usernames/emails/passwords are typed left-to-right even in an RTL UI),
 * honest micro-copy under every field.
 *
 * `PasswordField` adds the show/hide toggle and (for NEW passwords) the
 * four-segment strength meter + character-class chips, driven by the SAME
 * pure policy module the server enforces (password-policy.ts — zero drift).
 */
'use client';

import { useId, useState, type ComponentPropsWithoutRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { fa } from '@/messages/fa';
import { passwordClasses, scorePassword } from '@/modules/auth/password-policy';

const INPUT_BASE =
  [
    'w-full rounded-md border-2 border-ink/25 bg-paper px-3 py-2.5 text-body text-ink',
    'placeholder:text-ink-faint',
    'transition-[border-color,box-shadow] duration-150',
    'focus:border-shu focus:shadow-focus-input focus:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' ') + ' ';

export interface AuthFieldProps extends ComponentPropsWithoutRef<'input'> {
  label: string;
  hint?: string;
  /** Latin content (username/email/password) → dir="ltr" + left text. */
  latin?: boolean;
}

/** A labelled single-line field (the base of every auth form input). */
export function AuthField({ label, hint, latin = false, className, ...rest }: AuthFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-bold text-ink">
        {label}
      </label>
      <input
        id={id}
        dir={latin ? 'ltr' : undefined}
        className={INPUT_BASE + (latin ? 'text-left ' : '') + (className ?? '')}
        aria-describedby={hintId}
        {...rest}
      />
      {hint ? (
        <p id={hintId} className="text-caption leading-relaxed text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface PasswordFieldProps extends Omit<AuthFieldProps, 'type' | 'autoComplete'> {
  /** NEW passwords show the strength meter + class chips. */
  meter?: boolean;
  autoComplete?: string;
}

/** A password field with the show/hide toggle and the optional strength meter. */
export function PasswordField({ label, hint, meter = false, autoComplete, ...rest }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [internal, setInternal] = useState('');
  const id = useId();
  const meterId = `${id}-meter`;

  // controlled when the parent passes `value` (confirm-match checks need it);
  // otherwise self-contained — the meter works in both modes.
  const controlled = typeof rest.value !== 'undefined';
  const value = controlled ? String(rest.value ?? '') : internal;

  const strength = meter && value.length > 0 ? scorePassword(value) : null;
  const classes = meter && value.length > 0 ? passwordClasses(value) : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-small font-bold text-ink">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-1 text-caption font-bold text-ai hover:text-ai-deep"
          aria-pressed={visible}
        >
          {visible ? <EyeOff aria-hidden className="size-3.5" /> : <Eye aria-hidden className="size-3.5" />}
          {visible ? fa.auth.hidePassword : fa.auth.showPassword}
        </button>
      </div>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        dir="ltr"
        autoComplete={autoComplete}
        className={INPUT_BASE + 'text-left'}
        aria-describedby={meter ? meterId : undefined}
        {...rest}
        value={value}
        onChange={(e) => {
          if (!controlled) setInternal(e.target.value);
          rest.onChange?.(e);
        }}
      />

      {strength ? (
        <div id={meterId} className="mt-0.5 flex flex-col gap-1.5" aria-live="polite">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1" aria-hidden>
              {[1, 2, 3, 4].map((seg) => (
                <span
                  key={seg}
                  className={[
                    'h-1.5 flex-1 rounded-full transition-colors duration-200',
                    seg <= strength.score
                      ? strength.score <= 1
                        ? 'bg-error'
                        : strength.score === 2
                          ? 'bg-warning'
                          : strength.score === 3
                            ? 'bg-success/80'
                            : 'bg-success'
                      : 'bg-ink-faint/30',
                  ].join(' ')}
                />
              ))}
            </div>
            <span className="text-caption font-bold text-ink-soft">
              {fa.auth.strengthLabel}: {fa.auth.strengthScore(strength.score)}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5" aria-hidden>
            {classes ? (
              <>
                <ClassChip ok={classes.lower}>{fa.auth.classLower}</ClassChip>
                <ClassChip ok={classes.upper}>{fa.auth.classUpper}</ClassChip>
                <ClassChip ok={classes.digit}>{fa.auth.classDigit}</ClassChip>
                <ClassChip ok={classes.symbol}>{fa.auth.classSymbol}</ClassChip>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {hint ? <p className="text-caption leading-relaxed text-ink-soft">{hint}</p> : null}
    </div>
  );
}

function ClassChip({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 text-caption font-bold transition-colors',
        ok ? 'text-success' : 'text-ink-faint',
      ].join(' ')}
    >
      <span aria-hidden className={`inline-block size-1.5 rounded-full ${ok ? 'bg-success' : 'bg-ink-faint/50'}`} />
      {children}
    </span>
  );
}

/** The «یا» divider between the password form and the google button. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="hairline-soft h-px flex-1 border-0 bg-ink-faint/40" />
      <span className="text-caption font-bold text-ink-faint">{fa.auth.loginGoogleDivider}</span>
      <span className="hairline-soft h-px flex-1 border-0 bg-ink-faint/40" />
    </div>
  );
}

/** The Google one-click button (the official G mark, framed on card). */
export function GoogleButton({ href, label, hint }: { href: string; label: string; hint?: string }) {
  return (
    <a
      href={href}
      className="group flex min-h-12 items-center justify-center gap-3 rounded-md border-2 border-ink/25 bg-card px-4 text-body font-bold text-ink transition-[border-color,background-color] duration-150 hover:border-ink hover:bg-surface-warm focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-shu"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0">
        <path
          fill="#4285F4"
          d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.72-4.96H1.29v3.1A12 12 0 0 0 12 24Z"
        />
        <path fill="#FBBC05" d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l3.99-3.1Z" />
        <path
          fill="#EA4335"
          d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.99 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
        />
      </svg>
      <span className="flex flex-col items-start leading-tight">
        <span>{label}</span>
        {hint ? <span className="text-caption font-normal text-ink-soft">{hint}</span> : null}
      </span>
    </a>
  );
}

/** The inline banner (error / notice / success) — consistent across auth forms. */
export function AuthBanner({
  tone,
  children,
  role = 'alert',
}: {
  tone: 'error' | 'notice' | 'success';
  children: React.ReactNode;
  role?: 'alert' | 'status' | 'none';
}) {
  return (
    <p
      role={role === 'none' ? undefined : role}
      className={[
        'rounded-md border-2 px-3 py-2.5 text-small font-bold leading-relaxed',
        tone === 'error'
          ? 'border-error/50 bg-error/5 text-error'
          : tone === 'success'
            ? 'border-success/50 bg-success/5 text-success'
            : 'border-indigo/30 bg-indigo-wash text-indigo',
      ].join(' ')}
    >
      {children}
    </p>
  );
}
