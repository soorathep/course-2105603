"""QR codes for the 2027 exit-ticket form served on the course site (graphite on white, 600 dpi).
Usage: python3 make_exit_qr.py 1 2 p1  ->  exit-qr-s01.png, exit-qr-s02.png, exit-qr-p01.png in this folder.
Sessions after the midterm are numbers; sessions before the midterm are p1 to p7."""
import sys
from pathlib import Path
import qrcode

BASE = 'https://soorathep.github.io/course-2105603/teaching/2105603/slides-2027/exit.html'
for arg in sys.argv[1:] or ['1']:
    pre = arg.lower().startswith('p'); n = int(arg.lstrip('pP'))
    url, name = (f'{BASE}?p={n}', f'exit-qr-p{n:02d}.png') if pre else (f'{BASE}?s={n}', f'exit-qr-s{n:02d}.png')
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=22, border=4)
    qr.add_data(url); qr.make(fit=True)
    qr.make_image(fill_color='#333F4A', back_color='white').save(Path(__file__).with_name(name), dpi=(600, 600))
