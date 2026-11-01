/**
 * HANASO — dialogue bundle composition (TASK-DLG-POC-01).
 * Server-side helper shared by /api/dialogues/[slug] and the /poc RSC pages:
 * dialogue content + resolved characters (ADR-018 registry) + audio manifest (ADR-009).
 */
import { buildAudioManifest, loadVoices, type DialogueAudioManifest } from '@/modules/audio/server';
import { resolveSpeaker } from '@/modules/character';
import { loadDialogue, lineText } from '@/modules/dialogue/server';
import type { CharacterRef, Dialogue } from '@/modules/dialogue';

export interface DialogueBundle {
  dialogue: Dialogue;
  characters: CharacterRef[];
  audio: DialogueAudioManifest;
}

export function loadDialogueBundle(slug: string): DialogueBundle {
  const dialogue = loadDialogue(slug);
  const voices = loadVoices(); // fail fast on an invalid voices.yaml
  const characters: CharacterRef[] = dialogue.characterIds.map((id) => {
    const { manifest, voiceId } = resolveSpeaker(id);
    return {
      id: manifest.id,
      nameJa: manifest.nameJa,
      nameFa: manifest.nameFa,
      colorToken: manifest.colorToken,
      voiceId,
    };
  });
  const audio = buildAudioManifest({
    dialogueId: dialogue.id,
    lines: dialogue.lines.map((l) => ({
      id: l.id,
      speaker: l.speaker,
      voiceOverride: l.voiceOverride,
      text: lineText(l),
    })),
    // speaker (chr-*) → default voice via the character registry; a line-level
    // `voice_override` is a voice id resolved against config/voices.yaml (KB audio-ms §۲).
    resolveVoice: (speaker, voiceOverride) => {
      const voiceId = voiceOverride ?? resolveSpeaker(speaker).voiceId;
      if (!voices.has(voiceId)) {
        throw new Error(`voice "${voiceId}" is not registered in voices.yaml (line voice_override?)`);
      }
      return { voiceId };
    },
  });
  return { dialogue, characters, audio };
}
