/**
 * HANASO — DB schema migration test — TASK-SLICE-01 / Issue #40 (no live DB needed).
 *
 * Parses the generated drizzle migration SQL and asserts that every table/column the
 * slice promised (KB dialogue-content-schema §۲-۳ + DD-081 audio_assets + app §۳) is
 * present. This keeps the delivered migration honest without requiring DATABASE_URL:
 * the app itself still runs on the in-memory DEV-ONLY repositories.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDir = path.resolve(import.meta.dirname, '..', 'migrations');

function migrationSql(): string {
  expect(existsSync(migrationsDir), 'db/migrations must exist (run drizzle-kit generate)').toBe(true);
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  expect(files.length, 'at least one .sql migration').toBeGreaterThan(0);
  return files.map((f) => readFileSync(path.join(migrationsDir, f), 'utf8')).join('\n');
}

function tableBody(sql: string, schema: string, table: string): string {
  const re = new RegExp(`CREATE TABLE "${schema}"."${table}" \\(([\\s\\S]*?)\\n\\);`);
  const match = sql.match(re);
  expect(match, `table ${schema}.${table} must be created`).toBeTruthy();
  return match![1] as string;
}

function expectColumns(body: string, columns: string[]): void {
  for (const col of columns) {
    expect(body, `column ${col} missing`).toMatch(new RegExp(`"${col}" `));
  }
}

const sql = migrationSql();

describe('migration: two schemas (KB database-architecture §۱)', () => {
  it('creates both `content` (pipeline-owned) and `app` (user data) schemas', () => {
    expect(sql).toContain('CREATE SCHEMA "content"');
    expect(sql).toContain('CREATE SCHEMA "app"');
  });

  it('uses uuidv7() PKs and timestamptz (KB common contract)', () => {
    expect(sql).toMatch(/"id" uuid PRIMARY KEY DEFAULT uuidv7\(\) NOT NULL/);
    expect(sql).toContain('timestamp with time zone');
  });
});

describe('migration: content tables (dialogue-content-schema §۲ + database-architecture §۳)', () => {
  it('creates all 12 slice tables', () => {
    for (const t of [
      'dialogues',
      'dialogue_lines',
      'dialogue_scenes',
      'characters',
      'lessons',
      'lesson_sections',
      'learning_objectives',
      'comprehension_banks',
      'lesson_items',
      'vocab_items',
      'grammar_points',
      'audio_assets',
    ]) {
      expect(sql, `content.${t}`).toContain(`CREATE TABLE "content"."${t}"`);
    }
  });

  it('dialogues: base + §۲ extensions (unit_order/turn_gap_default_ms/series_id)', () => {
    expectColumns(tableBody(sql, 'content', 'dialogues'), [
      'slug',
      'title_fa',
      'situation_fa',
      'jlpt',
      'scene_ref',
      'unit_order',
      'turn_gap_default_ms',
      'series_id',
    ]);
  });

  it('dialogue_lines: order/speaker/sentence + §۲ rhythm & emotion columns', () => {
    expectColumns(tableBody(sql, 'content', 'dialogue_lines'), [
      'dialogue_id',
      'order',
      'speaker_character_id',
      'sentence_id',
      'decision_point',
      'gap_after_ms',
      'voice_override',
      'emotion_tag',
    ]);
  });

  it('dialogue_scenes: framing table (frame_key/speaker/illustration/camera_note)', () => {
    expectColumns(tableBody(sql, 'content', 'dialogue_scenes'), [
      'dialogue_id',
      'frame_key',
      'speaker_character_id',
      'illustration_ref',
      'camera_note',
    ]);
  });

  it('characters: voice_profile + voice_family + color_token (DD-081/DD-067 traceability)', () => {
    expectColumns(tableBody(sql, 'content', 'characters'), [
      'slug',
      'name_ja',
      'name_fa',
      'description_fa',
      'voice_profile',
      'voice_family',
      'color_token',
      'illustration_ref',
    ]);
  });

  it('lessons: dialogue anchor (G1) + unit_stage', () => {
    expectColumns(tableBody(sql, 'content', 'lessons'), [
      'unit_id',
      'slug',
      'type',
      'stage',
      'jlpt',
      'est_minutes',
      'prerequisite_ids',
      'order',
      'dialogue_id',
      'unit_stage',
    ]);
  });

  it('lesson_sections: section_kind/objective_id/line_refs/content/mastery_threshold (G2)', () => {
    expectColumns(tableBody(sql, 'content', 'lesson_sections'), [
      'lesson_id',
      'order',
      'section_kind',
      'objective_id',
      'line_refs',
      'content',
      'mastery_threshold',
    ]);
  });

  it('learning_objectives: code/kind/title_fa (DR-04h error→section mapping)', () => {
    expectColumns(tableBody(sql, 'content', 'learning_objectives'), ['code', 'kind', 'title_fa']);
  });

  it('comprehension_banks: measure/line_ref/knowledge_type/payload/status — separate from exercises (G3/AC-952)', () => {
    expectColumns(tableBody(sql, 'content', 'comprehension_banks'), [
      'dialogue_id',
      'measure',
      'line_ref',
      'knowledge_type',
      'payload',
      'status',
    ]);
  });

  it('lesson_items: source_dialogue_line_id + objective_id (G4 wiring)', () => {
    expectColumns(tableBody(sql, 'content', 'lesson_items'), [
      'lesson_id',
      'order',
      'item_type',
      'item_id',
      'role',
      'source_dialogue_line_id',
      'objective_id',
    ]);
  });

  it('vocab_items & grammar_points: first_seen_line_id (initial encounter context)', () => {
    expectColumns(tableBody(sql, 'content', 'vocab_items'), [
      'term',
      'reading_kana',
      'meanings_fa',
      'pitch_mora',
      'first_seen_line_id',
    ]);
    expectColumns(tableBody(sql, 'content', 'grammar_points'), [
      'pattern',
      'title_fa',
      'structure',
      'explanation_fa',
      'register_tags',
      'similar_to',
      'first_seen_line_id',
    ]);
  });

  it('audio_assets: DD-081 traceability (line/speaker/character/hash/version/format/bitrate/duration/LUFS/created_at)', () => {
    expectColumns(tableBody(sql, 'content', 'audio_assets'), [
      'line_id',
      'speaker',
      'character_id',
      'hash',
      'version',
      'format',
      'bitrate',
      'duration_ms',
      'lufs',
      'created_at',
    ]);
  });

  it('key uniqueness: dialogues.slug, dialogue_lines(dialogue_id,order), vocab(term,reading_kana), audio(line,speaker,format,version), audio hash', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX "dialogues_slug_key"');
    expect(sql).toContain('CREATE UNIQUE INDEX "dialogue_lines_dialogue_id_order_key"');
    expect(sql).toContain('CREATE UNIQUE INDEX "vocab_items_term_reading_kana_key"');
    expect(sql).toContain('CREATE UNIQUE INDEX "audio_assets_line_speaker_format_version_key"');
    expect(sql).toContain('CREATE UNIQUE INDEX "audio_assets_hash_key"');
  });
});

describe('migration: app tables (dialogue-content-schema §۳)', () => {
  it('dialogue_mastery_attempts: scores/weak_points/revision_id/attempt_no/outcome', () => {
    expectColumns(tableBody(sql, 'app', 'dialogue_mastery_attempts'), [
      'user_id',
      'dialogue_id',
      'revision_id',
      'attempt_no',
      'scores',
      'weak_points',
      'outcome',
      'created_at',
    ]);
    expect(sql).toContain(
      'CREATE UNIQUE INDEX "dialogue_mastery_attempts_user_dialogue_no_key" ON "app"."dialogue_mastery_attempts"',
    );
    // cross-schema pin: attempts reference the content dialogue they assess
    expect(sql).toContain(
      '"dialogue_mastery_attempts_dialogue_id_dialogues_id_fk" FOREIGN KEY ("dialogue_id") REFERENCES "content"."dialogues"',
    );
  });

  it('lesson_progress: composite PK (user_id, lesson_id) + unit_stage/mastery_attempt_id/status', () => {
    expectColumns(tableBody(sql, 'app', 'lesson_progress'), [
      'user_id',
      'lesson_id',
      'dialogue_id',
      'current_step',
      'unit_stage',
      'status',
      'mastery_attempt_id',
      'updated_at',
    ]);
    expect(sql).toContain('CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")');
    expect(sql).toMatch(/"unit_stage" text DEFAULT 'A_selfcheck' NOT NULL/);
    expect(sql).toMatch(/"status" text DEFAULT 'active' NOT NULL/);
  });

  it('NO separate unit_progress table (KB §۳: lesson_progress IS the unit record)', () => {
    expect(sql).not.toContain('CREATE TABLE "app"."unit_progress"');
  });
});
