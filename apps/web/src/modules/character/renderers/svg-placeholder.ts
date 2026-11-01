/**
 * // PLACEHOLDER — قابل‌جایگزینی با دارایی نهایی (ADR-018 §۲-۴)
 *
 * SvgPlaceholderRenderer — minimal abstract face (DD-068: single-weight line, no detailed
 * features) that really animates: blink (one-shot, controller-driven), gaze shifts,
 * mouth flap while speaking, expression swaps (brows/mouth paths).
 *
 * Production code NEVER imports this directly — it is injected as the CharacterRenderer
 * implementation behind the ADR-018 contract. Swapping in the final art (Rive/Spine/Lottie)
 * means registering a different renderer module; the dialogue engine stays untouched.
 *
 * Client-side only (DOM). Blinking is driven by the AnimationController's random 2–6s
 * scheduler via the optional `blink()` capability; mouth flapping is pure CSS (~120ms
 * open/close ≈ 8Hz soft, no phoneme lip-sync by scope decision).
 */
import type { CharacterAssetManifest, CharacterRenderer, CharacterStateChange, ExpressionTag } from '../contracts';

/** Expression → abstract face geometry (brow paths + closed-mouth path). */
interface FaceGeometry {
  browL: string;
  browR: string;
  mouth: string;
  eyeRy: number;
}

const EXPRESSIONS: Record<ExpressionTag, FaceGeometry> = {
  neutral: {
    browL: 'M 38 46 Q 46 43 53 46',
    browR: 'M 67 46 Q 74 43 82 46',
    mouth: 'M 53 78 Q 60 81 67 78',
    eyeRy: 5.2,
  },
  happy: { browL: 'M 38 44 Q 46 40 53 44', browR: 'M 67 44 Q 74 40 82 44', mouth: 'M 51 77 Q 60 86 69 77', eyeRy: 3.2 },
  surprised: {
    browL: 'M 38 41 Q 46 38 53 41',
    browR: 'M 67 41 Q 74 38 82 41',
    mouth: 'M 56 79 Q 60 84 64 79',
    eyeRy: 6.4,
  },
  apologetic: {
    browL: 'M 38 48 Q 46 43 53 45',
    browR: 'M 67 45 Q 74 43 82 48',
    mouth: 'M 53 80 Q 57 77 60 80 Q 63 83 67 80',
    eyeRy: 4.2,
  },
  thinking: { browL: 'M 38 44 Q 46 42 53 45', browR: 'M 67 46 Q 74 42 82 44', mouth: 'M 54 79 L 64 77', eyeRy: 4.6 },
  sad: { browL: 'M 38 47 Q 46 44 53 47', browR: 'M 67 47 Q 74 44 82 47', mouth: 'M 53 81 Q 60 76 67 81', eyeRy: 4.4 },
  confident: { browL: 'M 38 45 L 53 44', browR: 'M 67 44 L 82 45', mouth: 'M 53 78 L 67 78', eyeRy: 5.0 },
};

const STYLE_ID = 'hnsp-face-styles';
const STYLE_CSS = `
.hnsp-face { display: block; width: 100%; height: auto; }
.hnsp-face .hnsp-head {
  fill: color-mix(in srgb, var(--hnsp-color) 9%, var(--color-paper, #f7f3e9));
  stroke: var(--hnsp-color); stroke-width: 2.5;
}
.hnsp-face .hnsp-brow { fill: none; stroke: var(--hnsp-color); stroke-width: 2.5; stroke-linecap: round; transition: d 250ms var(--ease-soft, ease); }
.hnsp-face .hnsp-pupil { fill: var(--hnsp-color); }
.hnsp-face .hnsp-eye { transition: transform 60ms ease; transform-box: fill-box; transform-origin: center; }
.hnsp-face.hnsp-blinking .hnsp-eye { transform: scaleY(0.08); }
.hnsp-face .hnsp-eyes { transition: transform 300ms var(--ease-soft, ease); }
.hnsp-face.hnsp-gaze--left .hnsp-eyes { transform: translateX(-5px); }
.hnsp-face.hnsp-gaze--right .hnsp-eyes { transform: translateX(5px); }
.hnsp-face .hnsp-mouth-closed { fill: none; stroke: var(--hnsp-color); stroke-width: 2.5; stroke-linecap: round; transition: d 250ms var(--ease-soft, ease); }
.hnsp-face .hnsp-mouth-open { fill: var(--hnsp-color); opacity: 0; transform-origin: 60px 79px; }
.hnsp-face.hnsp-state--speaking .hnsp-mouth-open { animation: hnsp-flap 120ms infinite alternate ease-in-out; }
.hnsp-face.hnsp-state--speaking .hnsp-mouth-closed { opacity: 0.25; }
@keyframes hnsp-flap { from { opacity: 0.15; transform: scaleY(0.35); } to { opacity: 1; transform: scaleY(1); } }
@media (prefers-reduced-motion: reduce) {
  .hnsp-face.hnsp-state--speaking .hnsp-mouth-open { animation: none; opacity: 0.8; }
  .hnsp-face .hnsp-eyes, .hnsp-face .hnsp-eye { transition: none; }
}
`;

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE_CSS;
  document.head.appendChild(style);
}

/** Scene order (set by the host page via data-hnsp-scene-order) → gaze direction. */
function gazeClass(selfId: string, targetId: string | null | undefined): string {
  if (!targetId || targetId === selfId) return 'hnsp-gaze--center';
  const host = document.querySelector('[data-hnsp-scene-order]');
  if (!host) return 'hnsp-gaze--center';
  const order = (host.getAttribute('data-hnsp-scene-order') ?? '').split(',').map((s) => s.trim());
  const a = order.indexOf(selfId);
  const b = order.indexOf(targetId);
  if (a < 0 || b < 0) return 'hnsp-gaze--center';
  return b < a ? 'hnsp-gaze--left' : 'hnsp-gaze--right';
}

export class SvgPlaceholderRenderer implements CharacterRenderer {
  private el: HTMLElement | null = null;
  private svg: SVGSVGElement | null = null;
  private manifest: CharacterAssetManifest | null = null;
  private blinkTimer: ReturnType<typeof setTimeout> | null = null;
  private expression: ExpressionTag = 'neutral';

  async mount(el: HTMLElement, manifest: CharacterAssetManifest): Promise<void> {
    // PLACEHOLDER — قابل‌جایگزینی با دارایی نهایی (ADR-018)
    this.el = el;
    this.manifest = manifest;
    ensureStyles();

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('class', 'hnsp-face hnsp-state--idle hnsp-gaze--center');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${manifest.nameFa} (${manifest.nameJa}) — placeholder`);
    svg.style.setProperty('--hnsp-color', `var(--color-${manifest.colorToken}, currentColor)`);

    const mk = (tag: string, cls: string, attrs: Record<string, string> = {}) => {
      const node = document.createElementNS(NS, tag);
      node.setAttribute('class', cls);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      return node;
    };

    const head = mk('circle', 'hnsp-head', { cx: '60', cy: '62', r: '44' });
    const eyes = mk('g', 'hnsp-eyes');
    const eyeL = mk('g', 'hnsp-eye');
    const eyeR = mk('g', 'hnsp-eye');
    const pupilL = mk('ellipse', 'hnsp-pupil', { cx: '46', cy: '56', rx: '3.4', ry: '5.2' });
    const pupilR = mk('ellipse', 'hnsp-pupil', { cx: '74', cy: '56', rx: '3.4', ry: '5.2' });
    eyeL.appendChild(pupilL);
    eyeR.appendChild(pupilR);
    eyes.append(eyeL, eyeR);
    const browL = mk('path', 'hnsp-brow hnsp-brow--l');
    const browR = mk('path', 'hnsp-brow hnsp-brow--r');
    const mouthClosed = mk('path', 'hnsp-mouth-closed');
    const mouthOpen = mk('ellipse', 'hnsp-mouth-open', { cx: '60', cy: '79', rx: '5', ry: '3.6' });
    const mouth = mk('g', 'hnsp-mouth');
    mouth.append(mouthClosed, mouthOpen);

    svg.append(head, eyes, browL, browR, mouth);
    el.appendChild(svg);
    this.svg = svg;

    this.applyExpression('neutral');
    // soft entrance (≤400ms motion budget, DD-070)
    svg.animate?.(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: 250,
        easing: 'ease-out',
      },
    );
  }

  setState(s: CharacterStateChange): void {
    if (!this.svg || !this.manifest) return;
    const stateClasses = ['hnsp-state--idle', 'hnsp-state--listening', 'hnsp-state--speaking'];
    this.svg.classList.remove(...stateClasses);
    this.svg.classList.add(`hnsp-state--${s.state}`);
    const gazeClasses = ['hnsp-gaze--center', 'hnsp-gaze--left', 'hnsp-gaze--right'];
    this.svg.classList.remove(...gazeClasses);
    this.svg.classList.add(gazeClass(this.manifest.id, s.gazeTargetId));
  }

  setExpression(tag: ExpressionTag): void {
    this.applyExpression(tag);
  }

  /** One-shot blink (AnimationController's 2–6s random schedule calls this). */
  blink(): void {
    if (!this.svg || this.blinkTimer !== null) return;
    this.svg.classList.add('hnsp-blinking');
    this.blinkTimer = setTimeout(() => {
      this.svg?.classList.remove('hnsp-blinking');
      this.blinkTimer = null;
    }, 140);
  }

  private applyExpression(tag: ExpressionTag): void {
    if (!this.svg) return;
    this.expression = tag;
    const geo = EXPRESSIONS[tag];
    const browL = this.svg.querySelector<SVGPathElement>('.hnsp-brow--l');
    const browR = this.svg.querySelector<SVGPathElement>('.hnsp-brow--r');
    const mouth = this.svg.querySelector<SVGPathElement>('.hnsp-mouth-closed');
    const pupils = this.svg.querySelectorAll<SVGEllipseElement>('.hnsp-pupil');
    browL?.setAttribute('d', geo.browL);
    browR?.setAttribute('d', geo.browR);
    mouth?.setAttribute('d', geo.mouth);
    pupils.forEach((p) => p.setAttribute('ry', String(geo.eyeRy)));
  }

  get currentExpression(): ExpressionTag {
    return this.expression;
  }

  destroy(): void {
    if (this.blinkTimer !== null) {
      clearTimeout(this.blinkTimer);
      this.blinkTimer = null;
    }
    this.svg?.remove();
    this.svg = null;
    this.el = null;
    this.manifest = null;
  }
}
