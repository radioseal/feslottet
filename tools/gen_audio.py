#!/usr/bin/env python3
"""Feslottet speech: tools/sentences.json -> audio/<hash>.mp3 + audio/speech.js

sentences.json = [ [voiceKey, text], ... ]   voiceKey = key in tools/voices.json ("" = narrator/Puff)
voices.json: { key: {"voice": edge-tts voice name, "rate": "-8%", "pitch": "+0Hz"} }
  Parent's choice (2026-10-10): narrator = fr-FR-VivienneMultilingualNeural (speaking Norwegian), men = nb-NO-FinnNeural,
  some women = de-DE-SeraphinaMultilingualNeural, Mia/kids/cook = nb-NO-PernilleNeural.
CARRIER TRICK: multilingual voices guess the language from the text, so short items (≤ 3 words, bare numbers) are spoken
inside a Norwegian carrier sentence and cut out by edge-tts word timings (start refined to the quietest 10 ms frame).
Static recorded clips (tools/static_audio.json, e.g. letter sounds) are never TTS. Incremental: existing files are kept
(the file name hashes voice+rate+pitch+text, so changing a voice regenerates only its clips).
Every new clip is trimmed with ffmpeg (lead/tail silence + internal pauses capped ~0.4 s).

    node tools/collect_speech.js && <venv>/bin/python tools/gen_audio.py [--prune] && node tools/collect_speech.js --check
"""
import asyncio, hashlib, json, os, re, shutil, subprocess, sys, struct, math, html, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
# 12.10. backend: Azure AI Speech (licensed for use in applications) – the same nb-NO voices as edge-tts. The key comes from
# AZURE_SPEECH_KEY / AZURE_SPEECH_REGION or ~/.config/feslottet/azure.env (never committed). --edge uses the old edge-tts route
# (personal use only: those clips may not be redistributed).
EDGE = '--edge' in sys.argv
if EDGE: import edge_tts
def _azure_env():
    k, r = os.environ.get('AZURE_SPEECH_KEY'), os.environ.get('AZURE_SPEECH_REGION')
    p = os.path.expanduser('~/.config/feslottet/azure.env')
    if (not k or not r) and os.path.exists(p):
        kv = dict(l.strip().split('=', 1) for l in open(p) if '=' in l)
        k, r = k or kv.get('AZURE_SPEECH_KEY'), r or kv.get('AZURE_SPEECH_REGION')
    return k, r
AZ_KEY, AZ_REGION = (None, None) if EDGE else _azure_env()
if not EDGE and not (AZ_KEY and AZ_REGION): sys.exit('No Azure key: set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION (or use --edge for personal use)')
BACKEND = 'edge' if EDGE else 'az1'
# parent 12.10.: Pernille is the trustworthy voice everywhere; ONLY «Hurra» and «sau» sounded better with Iselin (listened to)
SHORT_VOICE = 'nb-NO-IselinNeural'
ISELIN_ONLY = re.compile(r'(?i)^\s*(hurra|sau)[\s.!?]*$')

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); AUD = os.path.join(ROOT, 'audio')
FF = '/opt/homebrew/bin/ffmpeg' if os.path.exists('/opt/homebrew/bin/ffmpeg') else (shutil.which('ffmpeg') or 'ffmpeg')
CARRIER_VER = 'c4'   # c4: target inside ONE Norwegian sentence after a colon pause; cut at the quietest point of that pause
DEFAULT = {'voice': 'nb-NO-PernilleNeural', 'rate': '-8%', 'pitch': '+0Hz'}
VJ = json.load(open(os.path.join(HERE, 'voices.json'))) if os.path.exists(os.path.join(HERE, 'voices.json')) else {}
VOICES = {}
for k, v in VJ.items():
    if isinstance(v, list): v = {'voice': DEFAULT['voice'], 'rate': v[0], 'pitch': v[1]}
    VOICES[k] = dict(DEFAULT, **v)
VOICES.setdefault('', dict(DEFAULT))
AF = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,'
      'silenceremove=stop_periods=-1:stop_duration=0.25:stop_threshold=-42dB:stop_silence=0.17:detection=rms,'
      'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse')

# pronunciation map (DESIGN2 §8.1): whole-word phonetic respellings for names/words that come out Danish/English-sounding.
# tools/pronounce.json = {"Snorre": "Snorrre", ...}  (only the TTS input changes; game text/keys stay the same)
_PP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pronounce.json')
PRONOUNCE = json.load(open(_PP)) if os.path.exists(_PP) else {}
def respell(t):
    for w, r in PRONOUNCE.items(): t = re.sub(r'(?<![\wæøåÆØÅ])' + re.escape(w) + r'(?![\wæøåÆØÅ])', r, t)
    return t
def tts_text(t):
    t = respell(t)
    t = t.replace('«', '').replace('»', '').replace(' – ', ', ').replace('…', '.')
    t = re.sub(r'\b([A-ZÆØÅ])( - )', r'\1, ', t)          # spelled letters "K - A - T" -> "K, A, T"
    t = re.sub(r'[\U0001F000-\U0001FFFF☀-➿️‍]', '', t)
    return t.strip()

def key(v, t): return (v + '|' + t) if v else t
def nwords(t): return len(re.sub(r'[^\wæøåÆØÅ\s-]', ' ', t).split())
def spec(v, t=None):
    s = VOICES.get(v, VOICES[''])
    if not EDGE and v == '' and t is not None and ISELIN_ONLY.match(t): s = dict(s, voice=SHORT_VOICE)
    return s
def prosody(v, t):
    s = spec(v, t); rate, pitch = s['rate'], s['pitch']
    if v == '' and re.fullmatch(r'[A-ZÆØÅa-zæøå]+[.!?]?', t) and not ISELIN_ONLY.match(t): rate = '-18%'   # single words: slower and clear (Pernille, as before)
    return rate, pitch
def needs_carrier(v, t):
    if not EDGE or 'Multilingual' not in spec(v)['voice']: return False
    words = re.sub(r'[^\wæøåÆØÅ\s-]', ' ', t).split()
    return 0 < len(words) <= 4
def fname(v, t):
    s = spec(v, t); rate, pitch = prosody(v, t)
    tag = ('' if EDGE else BACKEND + '|') + s['voice'] + '|' + rate + '|' + pitch + ('|' + CARRIER_VER if needs_carrier(v, t) else '') + ('|' + respell(t) if respell(t) != t else '')
    return 'audio/' + hashlib.sha1((tag + '|' + key(v, t)).encode()).hexdigest()[:14] + '.mp3'

def trim(path):
    tmp = path + '.t.mp3'
    r = subprocess.run([FF, '-y', '-loglevel', 'error', '-i', path, '-af', AF, '-ac', '1', '-ar', '24000', '-b:a', '48k', tmp])
    if r.returncode == 0 and os.path.exists(tmp) and os.path.getsize(tmp) > 300: os.replace(tmp, path)
    elif os.path.exists(tmp): os.remove(tmp)

def pcm(path):
    r = subprocess.run([FF, '-loglevel', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', '24000', '-'], capture_output=True)
    b = r.stdout; return struct.unpack('<%dh' % (len(b) // 2), b[:len(b) // 2 * 2])

def quietest(samples, t0, t1, sr=24000, fr=0.01):
    """start time (s) of the quietest 10 ms frame in [t0, t1]"""
    best, bt = None, t0; n = int(sr * fr); t = max(0.0, t0)
    while t + fr <= t1:
        i = int(t * sr); seg = samples[i:i + n]
        if len(seg) < n: break
        e = math.sqrt(sum(x * x for x in seg) / n)
        if best is None or e < best: best, bt = e, t
        t += 0.005
    return bt

# Multilingual voices detect the language per sentence, so the target must be IN the Norwegian sentence (not after it);
# the colon gives a pause so the cut does not catch the previous word (the «…tallet er 14» bleed).
def carrier_text(t):
    core = t.strip()
    if re.fullmatch(r'\d+[.!?]?', core): return 'Nå sier jeg et helt vanlig norsk tall: ' + core
    return 'Nå sier jeg et helt vanlig norsk ord: ' + core

async def synth_carrier(v, t, out):
    s = spec(v); rate, pitch = prosody(v, t)
    words = re.sub(r'[^\wæøåÆØÅ\s-]', ' ', t).split()
    comm = edge_tts.Communicate(tts_text(carrier_text(t)), s['voice'], rate=rate, pitch=pitch, boundary='WordBoundary')
    audio = bytearray(); bounds = []
    async for ch in comm.stream():
        if ch['type'] == 'audio': audio += ch['data']
        elif ch['type'] == 'WordBoundary': bounds.append((ch['offset'] / 1e7, ch['duration'] / 1e7, ch['text']))
    if len(bounds) < len(words) + 1: raise RuntimeError('carrier: too few word boundaries for ' + t)
    full = out + '.full.mp3'; open(full, 'wb').write(audio)
    tgt = bounds[-len(words):]; prev = bounds[-len(words) - 1]
    smp = pcm(full)
    lo = max(prev[0] + prev[1] - 0.02, tgt[0][0] - 0.2)            # never before the end of the carrier's last word
    start = quietest(smp, lo, tgt[0][0] + 0.03)
    end = tgt[-1][0] + tgt[-1][1] + 0.2
    cut = out[:-4] + '.cut.mp3'
    r = subprocess.run([FF, '-y', '-loglevel', 'error', '-i', full, '-ss', f'{start:.3f}', '-to', f'{end:.3f}',
                        '-af', 'afade=t=in:d=0.015,areverse,afade=t=in:d=0.04,areverse', '-ac', '1', '-ar', '24000', '-b:a', '48k', cut], capture_output=True, text=True)
    os.remove(full)
    if r.returncode != 0: raise RuntimeError('ffmpeg cut failed: ' + r.stderr[-200:])
    os.replace(cut, out)

SENT_SPLIT = re.compile(r'(?<=[.!?])\s+')
async def synth_multi(v, t, out):
    parts = [p for p in SENT_SPLIT.split(t.strip()) if p]
    if len(parts) == 1: return await synth_carrier(v, t, out)
    files = []
    for i, p in enumerate(parts):
        f = out[:-4] + f'.p{i}.mp3'; await synth_carrier(v, p, f); files.append(f)
    lst = out[:-4] + '.list.txt'
    with open(lst, 'w') as fh:
        for f in files: fh.write(f"file '{f}'\n")
    cat = out[:-4] + '.cat.mp3'
    r = subprocess.run([FF, '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-ac', '1', '-ar', '24000', '-b:a', '48k', cat])
    for f in files + [lst]: os.remove(f)
    if r.returncode != 0: raise RuntimeError('concat failed')
    os.replace(cat, out)

_POOL = ThreadPoolExecutor(16)
def azure_synth(voice, text, rate, pitch, out):
    ssml = ("<speak version='1.0' xml:lang='nb-NO'><voice name='%s'><prosody rate='%s' pitch='%s'>%s</prosody></voice></speak>"
            % (voice, rate, pitch, html.escape(text, quote=False)))
    req = urllib.request.Request('https://%s.tts.speech.microsoft.com/cognitiveservices/v1' % AZ_REGION, data=ssml.encode('utf-8'),
                                 headers={'Ocp-Apim-Subscription-Key': AZ_KEY, 'Content-Type': 'application/ssml+xml',
                                          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'feslottet-gen-audio'})
    with urllib.request.urlopen(req, timeout=60) as r: data = r.read()
    if len(data) < 300: raise RuntimeError('empty audio')
    open(out + '.tmp', 'wb').write(data); os.replace(out + '.tmp', out)

async def one(v, t, sem):
    out = os.path.join(ROOT, fname(v, t))
    if os.path.exists(out) and os.path.getsize(out) > 300: return
    rate, pitch = prosody(v, t)
    async with sem:
        for attempt in range(5):
            try:
                if not EDGE:
                    await asyncio.get_event_loop().run_in_executor(_POOL, azure_synth, spec(v, t)['voice'], tts_text(t), rate, pitch, out)
                elif needs_carrier(v, t): await synth_multi(v, t, out)
                else:
                    await edge_tts.Communicate(tts_text(t), spec(v)['voice'], rate=rate, pitch=pitch).save(out + '.tmp')
                    os.replace(out + '.tmp', out)
                await asyncio.get_event_loop().run_in_executor(None, trim, out)
                return
            except Exception as e:
                err = e
                await asyncio.sleep(1 + attempt * 2)
        print('FAILED', v, t, err, file=sys.stderr)

async def main():
    sents = json.load(open(os.path.join(HERE, 'sentences.json')))
    SP = os.path.join(HERE, 'static_audio.json'); STATIC = json.load(open(SP)) if os.path.exists(SP) else {}
    sents = [s for s in sents if s[1] not in STATIC]          # recorded letter sounds etc. are never TTS
    os.makedirs(AUD, exist_ok=True)
    sem = asyncio.Semaphore(16); done = 0
    tasks = [one(v, t, sem) for v, t in sents]
    for f in asyncio.as_completed(tasks):
        await f; done += 1
        if done % 500 == 0: print(done, '/', len(sents), flush=True)
    m = {key(v, t): fname(v, t) for v, t in sents if os.path.exists(os.path.join(ROOT, fname(v, t)))}
    m.update(STATIC)
    with open(os.path.join(AUD, 'speech.js'), 'w') as f:
        f.write('window.SPEECH = ' + json.dumps(m, ensure_ascii=False) + ';\n')
    print('manifest', len(m), 'of', len(sents) + len(STATIC))
    if '--prune' in sys.argv:
        used = set(os.path.basename(x) for x in m.values()); n = 0
        for fn in os.listdir(AUD):
            if fn.endswith('.mp3') and fn not in used: os.remove(os.path.join(AUD, fn)); n += 1
        print('pruned', n, 'unused clips')

asyncio.run(main())
