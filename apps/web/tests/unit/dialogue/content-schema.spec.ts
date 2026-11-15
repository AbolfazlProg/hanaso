/**
 * TASK-DLG-POC-01 — content validation:
 * - the cafe dialogue YAML parses and satisfies the multi-speaker contract
 * - every speaker is a registered character (ADR-018 registry) with a configured voice
 * - voice F0s differ per spec (T2 pitch axis) and every co-present pair passes ≥2 axes
 *   of the distinctness matrix (CONTENT-084, PoC level)
 * - the audio manifest hashes match the generator's hash function (content↔asset identity)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { listCharacters, resolveSpeaker } from '@/modules/character';
import { loadVoices } from '@/modules/audio/server';
import { hashAudioLine, lineSchema, lineText, loadDialogue, parseDialogueDocument } from '@/modules/dialogue/server';
import { hashLine } from '../../../scripts/generate-placeholder-audio.mjs';

const dialogue = loadDialogue('cafe-morning-01');

describe('dialogue content — cafe-morning-01 (KB dialogue-content-schema §۴)', () => {
  it('parses and satisfies the multi-speaker contract (≥8 lines, 3 speakers)', () => {
    expect(dialogue.id).toBe('dlg-cafe-morning-01');
    expect(dialogue.lines.length).toBeGreaterThanOrEqual(8);
    expect(dialogue.lines.length).toBe(10);
    expect(dialogue.turnGapDefaultMs).toBe(550);
    const speakers = new Set(dialogue.lines.map((l) => l.speaker));
    expect(speakers).toEqual(new Set(['chr-miki', 'chr-yamada', 'chr-sora']));
    expect(dialogue.characterIds).toEqual(['chr-miki', 'chr-yamada', 'chr-sora']);
  });

  it('every speaker is a registered character with a configured voice (ADR-018 §۲-۳)', () => {
    const registered = new Set(listCharacters().map((c) => c.id));
    const voices = loadVoices();
    for (const line of dialogue.lines) {
      expect(registered.has(line.speaker)).toBe(true);
      const { voiceId } = resolveSpeaker(line.speaker);
      expect(voices.has(voiceId)).toBe(true);
    }
    // exactly 3 characters, one central (DD-082 v1 scope)
    // TASK-LEARNING-06: chr-kim joined the cast (Ch02 unit 02-2 — Kim's entrance).
    expect(listCharacters()).toHaveLength(4);
    expect(listCharacters().filter((c) => c.role === 'central')).toHaveLength(1);
  });

  it('gaps are sane (0–5000ms) and every line has tokens + Persian translation', () => {
    for (const line of dialogue.lines) {
      expect(line.tokens.length).toBeGreaterThan(0);
      expect(line.fa.length).toBeGreaterThan(0);
      expect(line.gapAfterMs ?? dialogue.turnGapDefaultMs).toBeGreaterThanOrEqual(0);
      expect(line.gapAfterMs ?? dialogue.turnGapDefaultMs).toBeLessThanOrEqual(5000);
    }
  });

  it('voice F0s match the spec pitch axis: miki 210 / yamada 110 / sora 160 Hz', () => {
    const voices = loadVoices();
    expect(voices.get('vv-female-01-normal')!.f0Hz).toBe(210);
    expect(voices.get('vv-male-02-normal')!.f0Hz).toBe(110);
    expect(voices.get('vv-neutral-03-normal')!.f0Hz).toBe(160);
  });

  it('every co-present voice pair passes ≥2 of 3 distinctness axes (CONTENT-084)', () => {
    const matrix = readDistinctnessMatrix();
    const coPresent = [...loadVoices().keys()]; // all three appear in this dialogue
    for (let i = 0; i < coPresent.length; i++) {
      for (let j = i + 1; j < coPresent.length; j++) {
        const a = coPresent[i]!;
        const b = coPresent[j]!;
        const entry = matrix.find((e) => (e.pair[0] === a && e.pair[1] === b) || (e.pair[0] === b && e.pair[1] === a));
        expect(entry, `distinctness matrix entry for ${a}+${b}`).toBeDefined();
        expect(entry!.axes_passed.length).toBeGreaterThanOrEqual(2);
        expect(entry!.delta_semitones).toBeGreaterThanOrEqual(3); // pitch axis: ≥3 semitones
      }
    }
  });

  it('content→asset hash equals the placeholder generator hash (ADR-009 identity)', () => {
    for (const line of dialogue.lines) {
      const voiceId = resolveSpeaker(line.speaker).voiceId;
      const text = lineText(line);
      expect(hashAudioLine(text, voiceId)).toBe(hashLine(text, voiceId));
    }
  });

  it('rejects invalid documents: unregistered speaker, duplicate ids, single-speaker', () => {
    const base = {
      meta: {
        id: 'dlg-x',
        format: 2,
        stage: 2,
        jlpt: 'Pre-N5',
        review: true,
        generated: { tool: 't', at: '2026-11-01' },
      },
      dialogue_ref: 'dlg-x',
      scene: 's',
      characters: ['chr-miki', 'chr-yamada'],
      turn_gap_default_ms: 300,
    };
    const line = (id: string, speaker: string) => ({
      id,
      speaker,
      tokens: [{ surface: 'あ', reading: 'あ' }],
      fa: '…',
    });

    expect(() => parseDialogueDocument('x', { ...base, lines: [line('s-x-l1', 'chr-ghost')] })).toThrowError(
      /speaker chr-ghost not in characters/,
    );

    expect(() =>
      parseDialogueDocument('x', {
        ...base,
        lines: [line('s-x-l1', 'chr-miki'), line('s-x-l1', 'chr-yamada')],
      }),
    ).toThrowError(/duplicate line id/);

    expect(() => parseDialogueDocument('x', { ...base, lines: [line('s-x-l1', 'chr-miki')] })).toThrowError(
      /at least 2 distinct speakers/,
    );

    expect(lineSchema.safeParse({ ...line('s-x-l1', 'chr-miki'), tokens: [] }).success).toBe(false);
  });
});

/** Read the distinctness_matrix straight from voices.yaml (source of truth). */
function readDistinctnessMatrix() {
  const rel = path.join('src', 'modules', 'audio', 'content', 'voices.yaml');
  const candidates = [path.join(process.cwd(), rel), path.join(process.cwd(), 'apps', 'web', rel)];
  const file = candidates.find((c) => {
    try {
      readFileSync(c);
      return true;
    } catch {
      return false;
    }
  });
  if (!file) throw new Error('voices.yaml not found');
  const doc = parseYaml(readFileSync(file, 'utf8')) as {
    distinctness_matrix: { pair: [string, string]; delta_semitones: number; axes_passed: string[] }[];
  };
  return doc.distinctness_matrix;
}
