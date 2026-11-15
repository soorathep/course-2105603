"""QR codes for the 2027 exit-ticket form served on the course site (graphite on white, 600 dpi).
Usage: python3 make_exit_qr.py 1 2   ->  exit-qr-s01.png, exit-qr-s02.png in this folder."""
import sys
from pathlib import Path
import qrcode

URL = 'https://soorathep.github.io/course-2105603/teaching/2105603/slides-2027/exit.html?s={}'
for s in map(int, sys.argv[1:] or ['1']):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=22, border=4)
    qr.add_data(URL.format(s)); qr.make(fit=True)
    qr.make_image(fill_color='#333F4A', back_color='white').save(Path(__file__).with_name(f'exit-qr-s{s:02d}.png'), dpi=(600, 600))
