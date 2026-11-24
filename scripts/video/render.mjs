#!/usr/bin/env node
// Final promo video: the captured frames, the narration placed at the timeline's cues, and an
// .srt with the same lines.
//   node scripts/video/render.mjs <framesDir> <linesDir> <out.mp4> [--fps 30]
// <framesDir> comes from capture.mjs (its console.log holds "cue <id> at <ms> ms"),
// <linesDir> from voice.mjs. Writes <out>.mp4 and <out>.srt.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const [frames, linesDir, out] = process.argv.slice(2);
const fps = 30;
if (!frames || !linesDir || !out?.endsWith('.mp4')) {
  console.error('usage: render.mjs <framesDir> <linesDir> <out.mp4>');
  process.exit(2);
}
const { lines } = JSON.parse(readFileSync(join(here, 'narration.json'), 'utf8'));
const cues = new Map(
  [...readFileSync(join(frames, 'console.log'), 'utf8').matchAll(/^cue (\S+) at (\d+) ms$/gm)].map((m) => [m[1], Number(m[2])]),
);
const count = readdirSync(frames).filter((f) => f.endsWith('.jpg')).length;
const total = count / fps;
const seconds = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]));

const clips = lines.map((l) => {
  if (!cues.has(l.id)) throw new Error(`no cue for "${l.id}" in ${frames}/console.log`);
  const file = join(linesDir, `${l.id}.wav`);
  return { ...l, file, start: cues.get(l.id), length: seconds(file) * 1000 };
});
// The next line must not start before this one ends.
for (let i = 1; i < clips.length; i++) {
  const gap = clips[i].start - (clips[i - 1].start + clips[i - 1].length);
  if (gap < 300) console.warn(`warning: "${clips[i].id}" starts ${Math.round(gap)} ms after "${clips[i - 1].id}" ends`);
}
const last = clips.at(-1);
if (last.start + last.length > total * 1000 - 500) console.warn('warning: the last line runs into the end');

const inputs = ['-framerate', String(fps), '-start_number', '0', '-i', join(frames, '%05d.jpg')];
for (const c of clips) inputs.push('-i', c.file);
const delayed = clips.map((c, i) => `[${i + 1}:a]aresample=48000,adelay=${c.start}|${c.start}[a${i}]`);
const mix = `${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0,apad=whole_dur=${total},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aout]`;
const video = `[0:v]fade=t=out:st=${(total - 0.8).toFixed(2)}:d=0.8,scale=in_range=pc:out_range=tv,format=yuv420p[vout]`;
execFileSync(
  'ffmpeg',
  [
    '-v', 'error', '-y', ...inputs,
    '-filter_complex', [video, ...delayed, mix].join(';'),
    '-map', '[vout]', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-color_range', 'tv', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-t', String(total),
    '-movflags', '+faststart', out,
  ],
  { stdio: 'inherit' },
);

const stamp = (ms) => {
  const t = Math.max(0, Math.round(ms));
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(t / 3600000))}:${p(Math.floor(t / 60000) % 60)}:${p(Math.floor(t / 1000) % 60)},${p(t % 1000, 3)}`;
};
const srt = clips.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.start + c.length + 400)}\n${c.text}\n`).join('\n');
writeFileSync(out.replace(/\.mp4$/, '.srt'), srt);
console.log(`${out} (${total.toFixed(1)} s) and .srt`);
for (const c of clips) console.log(`  ${c.id.padEnd(7)} ${(c.start / 1000).toFixed(2)}–${((c.start + c.length) / 1000).toFixed(2)} s`);
