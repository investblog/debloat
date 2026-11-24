# Promo video (English, ~47 s, 1920×1080, narration + `.srt`)

Same pipeline as the other 301.st extensions (expired-domains `scripts/video/`), with one difference:
the main scenes are filmed on the **real built extension**. `scripts/video/film.mjs` makes a filming
copy of `dist/chrome-mv3` with `video.html` + `stage.js` inside and the Google content script allowed
in frames, so the stage page holds the real side panel next to a saved Google results page and clicks
the real controls (master switch, "collapse to a bar", Show/Hide, Pause). Titles, cursor and fades are
a function of time (`stage.js` `__seek`), so every frame is exact however slow the capture is.

Outputs live in `store-assets/video/` (gitignored, owner's machine only): the `.mp4`, its `.srt`,
`lines/` (narration), `art/` (`301-full.svg` from expired-domains, `bg.png` = the promo background).

## Re-shoot

1. **Narration** (only when `scripts/video/narration.json` changes) — Piper 1.8 in its own Python,
   voice `en_US-ljspeech-high` (public domain):
   `PIPER_PYTHON=<python with piper-tts> PIPER_VOICES=<folder with the .onnx> node scripts/video/voice.mjs store-assets/video/lines`
   Scene lengths follow the line lengths automatically.
2. **A saved results page** — Google captchas automated browsers, so the page comes from a real one:
   open `https://www.google.com/search?q=what+is+photosynthesis&hl=en` in a normal (signed-out or
   signed-in) Chrome, dark theme, wait for the AI Overview, and save `document.documentElement.outerHTML`
   (with Debloat's own `data-debloat-*` marks and `.debloat-minibar` removed) **outside the repo**.
   `film.mjs` strips scripts, blanks e-mail addresses and hides the account button; delete the copy
   afterwards.
3. `npm run build && node scripts/video/film.mjs <serp.html> store-assets/video/lines <framesDir>`
   — about 1,420 frames, a few minutes.
4. `node scripts/video/render.mjs <framesDir> store-assets/video/lines store-assets/video/debloat-promo-en.mp4`
   — H.264 + AAC, −16 LUFS, `.srt` next to it.

## Publish

1. **YouTube** — upload the `.mp4` (public or unlisted). Title, description, chapters and tags come
   from `store-assets/video/youtube-description.txt` (same layout as the other 301.st videos: links,
   chapters, how it works, what you get, privacy, voice credit). Add the `.srt` as English subtitles.
   Chapter times must match the cues in the `.srt`; update both when the narration changes.
2. **Stores** — the Chrome Web Store takes the video as a YouTube link (listing → "YouTube video");
   Edge Add-ons has the same field ("YouTube video URL"). AMO has no video field.
