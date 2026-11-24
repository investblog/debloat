#!/usr/bin/env node
// Narration for the promo video: every line of narration.json voiced by Piper, trimmed the way
// the video plays it (80 ms lead-in and tail kept).
//   PIPER_PYTHON=<python with piper-tts> PIPER_VOICES=<folder with <voice>.onnx> \
//     node scripts/video/voice.mjs <outDir>
// Piper 1.8 (GPL-3.0) runs as a separate program; its voices are public domain (LJ Speech).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const { voice, lines } = JSON.parse(readFileSync(join(here, 'narration.json'), 'utf8'));
const python = process.env.PIPER_PYTHON;
const voices = process.env.PIPER_VOICES;
const out = process.argv[2];
if (!python || !voices || !out) {
  console.error('usage: PIPER_PYTHON=… PIPER_VOICES=… node scripts/video/voice.mjs <outDir>');
  process.exit(2);
}
mkdirSync(out, { recursive: true });
const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08';
for (const line of lines) {
  const raw = join(out, `${line.id}-raw.wav`);
  const wav = join(out, `${line.id}.wav`);
  execFileSync(python, ['-m', 'piper', '-m', join(voices, `${voice}.onnx`), '-f', raw, '--sentence-silence', '0.3'], {
    input: line.say,
    stdio: ['pipe', 'ignore', 'ignore'],
  });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', `${trim},areverse,${trim},areverse`, wav]);
  const seconds = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]);
  console.log(`${line.id.padEnd(7)} ${Number(seconds).toFixed(2)} s`);
}
