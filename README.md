# Feslottet – «der ord blir til ting»

A Norwegian learning game for children around 6–8: a voxel fairy castle and an open world where the child explores,
befriends animals, helps people and solves small tasks – numbers, reading, writing, logic, shapes, patterns and more.
Words she spells with the magic wand become 3D things. Everything runs in the browser (three.js), offline, no accounts,
no data collected.

**Status:** work in progress, built for one child and now shared for feedback. Please open an
[issue](../../issues) with what you notice – what felt natural or not, what was confusing, what your child liked.

## Play

Play online: **https://radioseal.github.io/feslottet/** – or download the repository and open `Feslottet.html` in Chrome
(double-click is enough – it works from `file://`). Sound on, then «SPILL».

All spoken Norwegian lines and letter sounds are included (generated with Microsoft Azure AI Speech – see
`THIRD_PARTY_NOTICES.md`). If you change or add lines, regenerate the speech with your own Azure Speech key:

```bash
python3 -m venv .venv                     # standard library only; ffmpeg must be installed
node tools/collect_speech.js              # needs Node ≥ 22 and Google Chrome; writes tools/sentences.json
AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=northeurope .venv/bin/python tools/gen_audio.py --prune
node tools/collect_speech.js --check      # should say: missing 0
```

## For parents (Norwegian)

`LES-MEG.txt` explains how the game is played, the controls, what it teaches and the parent page (hold the gear
bottom-left for 3 seconds and answer a multiplication question).

## Code

Plain classic scripts (namespace `window.F`), no build step except `node tools/build_html.js`, which regenerates the
script list in `Feslottet.html` after adding files. Main parts: `js/core` (renderer, input, speech player), `js/game`
(world, castle, people, animals, quests, the task stage and ~60 task formats in `js/game/tasks`), `js/learn` (the
learning engine: strands, rungs, support levels, anti-guessing), `js/speech` (all spoken lines as templates), `js/models`
(voxel models made in code).

## License

MIT for the game code and data – see `LICENSE`. Third-party parts: `THIRD_PARTY_NOTICES.md`.

Developed with the help of Claude (Anthropic).
