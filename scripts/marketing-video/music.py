"""
מוזיקת הרקע של סרטון השיווק — מסונתזת כאן, בלי דגימות ובלי רישיון של צד שלישי.

פופ-אלקטרוני אופטימי ורגוע: פד רחב, ארפג'יו "פלאק", בס, ותופים קלים מהתיבה
התשיעית. מהלך אקורדים IV–I–V–vi בדו מז'ור, 104 פעימות לדקה.

    python3 scripts/marketing-video/music.py [seconds]   # ברירת מחדל: מ-timeline.json

הפלט: .marketing-work/music.wav (48kHz סטריאו).
"""

import json
import os
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORK = os.environ.get('WORK_DIR', os.path.join(ROOT, '.marketing-work'))
SR = 48000
BPM = 104
BEAT = 60 / BPM
BAR = BEAT * 4
rng = np.random.default_rng(7)


def seconds():
    if len(sys.argv) > 1:
        return float(sys.argv[1])
    with open(os.path.join(WORK, 'timeline.json'), encoding='utf-8') as f:
        return json.load(f)['total']


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


# F – C – G – Am (IV–I–V–vi), שלוש-ארבע תווים לאקורד, ובס
CHORDS = [
    ([53, 57, 60, 64], 41),  # Fmaj7
    ([52, 55, 60, 62], 36),  # Cadd9
    ([50, 55, 59, 62], 43),  # G
    ([52, 57, 60, 64], 45),  # Am7
]


def lowpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, 'low', fs=SR, output='sos'), x)


def highpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, 'high', fs=SR, output='sos'), x)


def saw(freq, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((freq * t + phase) % 1.0) - 1


def env_adsr(n, a, d, s, r):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n)
    e[:na] = np.linspace(0, 1, na)
    if na + nd < n:
        e[na:na + nd] = np.linspace(1, s, nd)
    if nr < n:
        e[n - nr:] *= np.linspace(1, 0, nr)
    return e


def place(track, sig, start):
    i = int(start * SR)
    if i >= len(track):
        return
    j = min(len(track), i + len(sig))
    track[i:j] += sig[: j - i]


def build(total):
    n = int((total + 3) * SR)
    pad = np.zeros(n)
    pluck = np.zeros(n)
    bass = np.zeros(n)
    kick = np.zeros(n)
    hats = np.zeros(n)
    snare = np.zeros(n)
    bars = int(np.ceil(total / BAR)) + 1
    drums_from, drums_to = 8, bars - 3  # אינטרו ואאוטרו בלי תופים

    for b in range(bars):
        notes, root = CHORDS[b % 4]
        t0 = b * BAR
        # פד: שלוש מתנדות מכוונות מעט זו מזו לכל תו
        ln = int(BAR * SR * 1.25)
        chord = np.zeros(ln)
        for note in notes:
            f = midi(note)
            for det in (-0.07, 0.0, 0.08):
                chord += saw(f * 2 ** (det / 12), ln, rng.random())
        chord = lowpass(chord, 1500) * env_adsr(ln, 0.35, 0.4, 0.8, 0.6) * 0.035
        place(pad, chord, t0)

        # ארפג'יו בשמיניות, אוקטבה מעל
        seq = notes + [notes[1] + 12, notes[2] + 12, notes[3], notes[2]]
        for k in range(8):
            f = midi(seq[k % len(seq)] + 12)
            ln2 = int(0.5 * SR)
            t = np.arange(ln2) / SR
            tone = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * saw(f, ln2)) * np.exp(-t * 9)
            vel = 0.9 if k % 2 == 0 else 0.65
            place(pluck, tone * 0.09 * vel, t0 + k * BEAT / 2)

        # בס: שמיניות על השורש, "נושם" עם התוף
        if b >= 4:
            for k in range(8):
                ln3 = int(BEAT / 2 * SR)
                t = np.arange(ln3) / SR
                f = midi(root)
                tone = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
                e = np.minimum(1, t / 0.01) * np.exp(-t * 3.5)
                place(bass, tone * e * (0.16 if k % 2 == 0 else 0.11), t0 + k * BEAT / 2)

        # תופים
        if drums_from <= b < drums_to:
            for k in range(4):
                ln4 = int(0.35 * SR)
                t = np.arange(ln4) / SR
                sweep = 45 + 75 * np.exp(-t * 32)
                ph = 2 * np.pi * np.cumsum(sweep) / SR
                place(kick, np.sin(ph) * np.exp(-t * 11) * 0.5, t0 + k * BEAT)
                hl = int(0.06 * SR)
                noise = rng.standard_normal(hl) * np.exp(-np.arange(hl) / SR * 70)
                place(hats, noise * 0.05, t0 + k * BEAT + BEAT / 2)
                if k in (1, 3):
                    sl = int(0.25 * SR)
                    st = np.arange(sl) / SR
                    body = rng.standard_normal(sl) * np.exp(-st * 18) * 0.12 + np.sin(2 * np.pi * 190 * st) * np.exp(-st * 25) * 0.08
                    place(snare, body, t0 + k * BEAT)

    hats = highpass(hats, 7000)
    snare = highpass(snare, 180)

    # "פאמפינג" של הפד מול התוף
    pump = np.ones(n)
    for b in range(drums_from, drums_to):
        for k in range(4):
            i = int((b * BAR + k * BEAT) * SR)
            ln = int(BEAT * SR)
            j = min(n, i + ln)
            curve = 1 - 0.45 * np.exp(-np.arange(j - i) / SR * 9)
            pump[i:j] = curve
    pad *= pump

    # הד
    ir_len = int(2.4 * SR)
    ir_t = np.arange(ir_len) / SR
    ir_l = rng.standard_normal(ir_len) * np.exp(-ir_t * 2.6)
    ir_r = rng.standard_normal(ir_len) * np.exp(-ir_t * 2.6)
    ir_l = lowpass(ir_l, 5000) * 0.02
    ir_r = lowpass(ir_r, 5000) * 0.02
    wet_src = pad * 0.8 + pluck
    wet_l = fftconvolve(wet_src, ir_l)[:n]
    wet_r = fftconvolve(wet_src, ir_r)[:n]

    dry = pad + pluck * 0.9 + bass + kick + hats + snare
    # פלאק מעט לצדדים
    left = dry + wet_l * 0.9 + np.roll(pluck, int(0.011 * SR)) * 0.15
    right = dry + wet_r * 0.9 + np.roll(pluck, int(0.017 * SR)) * 0.15
    mix = np.stack([left, right], axis=1)[: int(total * SR)]

    # כניסה ויציאה
    fade_in = int(1.5 * SR)
    mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    fade_out = int(3.0 * SR)
    mix[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
    mix /= np.max(np.abs(mix)) + 1e-9
    return (mix * 0.7 * 32767).astype(np.int16)


def main():
    total = seconds()
    data = build(total)
    os.makedirs(WORK, exist_ok=True)
    out = os.path.join(WORK, 'music.wav')
    with wave.open(out, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(f'נוצר {out} · {total:.1f} שניות')


if __name__ == '__main__':
    main()
