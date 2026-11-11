"""
מעברים רכים לסרטון ההדגמה: במקום קפיצה חדה בין שני מסכים, מעבר הדרגתי (crossfade).

record.mjs כותב רשימת פריימים (קובץ ומשך) וחלונות: בכל חלון קרה מעבר מסך (טעינה, לשונית,
חלון שנפתח). כאן מוצאים בכל חלון את זוג הפריימים שהשינוי ביניהם הכי גדול, ומכניסים ביניהם
פריימים מעורבבים. הפריימים החדשים נכתבים לתיקיית העבודה.

  python3 soften.py <in.json> <out.json>
"""

import json
import os
import sys

from PIL import Image, ImageChops, ImageStat

FADE_SECONDS = 0.45
FADE_FRAMES = 12
# שינוי קטן מזה הוא גלילה או הקלדה, לא מעבר מסך
MIN_DIFF = 7.0

_thumbs = {}


def thumb(path):
    if path not in _thumbs:
        with Image.open(path) as image:
            _thumbs[path] = image.convert('L').resize((160, 90))
    return _thumbs[path]


def diff(a, b):
    return ImageStat.Stat(ImageChops.difference(thumb(a), thumb(b))).mean[0]


def main(src, dst):
    data = json.load(open(src))
    entries = data['entries']
    work = os.path.join(os.path.dirname(os.path.abspath(dst)), 'fades')
    os.makedirs(work, exist_ok=True)

    # בכל חלון: הזוג (k-1, k) עם השינוי הגדול ביותר
    cuts = set()
    for a, b in data['windows']:
        a, b = max(1, a), min(len(entries) - 1, b)
        best, at = 0.0, None
        for k in range(a, b + 1):
            d = diff(entries[k - 1]['file'], entries[k]['file'])
            if d > best:
                best, at = d, k
        if at is not None and best >= MIN_DIFF:
            cuts.add(at)

    out = []
    # זמן ההתחלה החדש של כל פריים מקורי — כדי שהכתוביות יישארו מסונכרנות
    starts = []
    clock = 0.0
    for k, entry in enumerate(entries):
        if k in cuts:
            prev = out[-1]
            # המעבר לוקח חלק מזמן ההצגה של הפריים הקודם, כדי שהקצב לא יתארך
            take = min(FADE_SECONDS / 2, max(0.0, prev['duration'] - 1 / 30))
            prev['duration'] -= take
            clock -= take
            with Image.open(prev['file']) as a_img, Image.open(entry['file']) as b_img:
                a_img, b_img = a_img.convert('RGB'), b_img.convert('RGB')
                if a_img.size != b_img.size:
                    b_img = b_img.resize(a_img.size)
                for j in range(FADE_FRAMES):
                    x = (j + 1) / (FADE_FRAMES + 1)
                    alpha = x * x * (3 - 2 * x)  # smoothstep
                    name = os.path.join(work, f'fade-{k:06d}-{j:02d}.jpg')
                    Image.blend(a_img, b_img, alpha).save(name, quality=90)
                    out.append({'file': name, 'duration': FADE_SECONDS / FADE_FRAMES})
                    clock += FADE_SECONDS / FADE_FRAMES
            entry = dict(entry)
            entry['duration'] = max(1 / 30, entry['duration'] - (FADE_SECONDS - take))
        starts.append(clock)
        out.append(dict(entry))
        clock += entry['duration']

    json.dump({'entries': out, 'starts': starts, 'fades': len(cuts)}, open(dst, 'w'))
    print(f'soften: {len(cuts)} מעברים רכים')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
