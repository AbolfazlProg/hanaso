/**
 * HANASO — uuidv5 unit tests (TASK-M0-10 DB-layer).
 *
 * The RFC 4122 §A.4 test vector pins correctness (SHA-1 + version/variant bits);
 * stability pins the seed contract (same name → same row id, forever).
 */
import { describe, expect, it } from 'vitest';
import {
  HANASO_CONTENT_NAMESPACE,
  uuidV5,
  characterContentId,
  dialogueContentId,
  dialogueLineContentId,
  lessonContentId,
  unitContentId,
} from '@/db/ids';

describe('uuidV5 (RFC 4122)', () => {
  it('matches the canonical DNS-namespace test vector', () => {
    // v5(DNS ns, 'python.org') — the widely used cross-implementation vector
    expect(uuidV5('python.org', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe('886313e1-3b8a-5372-9b90-0c9aee199e5d');
  });

  it('sets version 5 and RFC variant bits', () => {
    const id = uuidV5('anything');
    expect(id[14]).toBe('5');
    expect(['8', '9', 'a', 'b']).toContain(id[19]);
  });

  it('is deterministic and collision-free across namespaced helpers', () => {
    expect(uuidV5('cafe-morning-01')).toBe(uuidV5('cafe-morning-01'));
    const ids = [
      characterContentId('chr-miki'),
      dialogueContentId('cafe-morning-01'),
      dialogueLineContentId('s-cafe-morning-01-l1'),
      lessonContentId('cafe-morning-01'),
      unitContentId('cafe-morning-01'),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('namespaces content ids apart from the bare slug', () => {
    expect(dialogueContentId('cafe-morning-01')).not.toBe(uuidV5('cafe-morning-01'));
    expect(characterContentId('chr-sora')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('keeps the namespace constant (a change would fork every seeded row)', () => {
    expect(HANASO_CONTENT_NAMESPACE).toBe('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
  });
});
