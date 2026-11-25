"""
עמוד אחד מטופס PDF כתמונה, פעם ריק ופעם מלא — לקטע "כל הטפסים ממולאים אוטומטית".

  python3 pdf-page.py <blank.pdf> <filled.pdf> <page> <out-dir>

מדפיס JSON: {"blank": ..., "filled": ..., "ratio": רוחב/גובה}. דורש pymupdf.
"""

import json
import os
import sys

import pymupdf as fitz

HEIGHT = 1700
fitz.TOOLS.mupdf_display_errors(False)


def render(path, index, out):
    with fitz.open(path) as doc:
        page = doc[min(index, len(doc) - 1)]
        zoom = HEIGHT / page.rect.height
        page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False).save(out)
        return page.rect.width / page.rect.height


def main(blank, filled, index, work):
    index = int(index)
    blank_png = os.path.join(work, 'form-blank.png')
    filled_png = os.path.join(work, 'form-filled.png')
    ratio = render(filled, index, filled_png)
    render(blank, index, blank_png)
    print(json.dumps({'blank': blank_png, 'filled': filled_png, 'ratio': ratio}))


if __name__ == '__main__':
    main(*sys.argv[1:5])
