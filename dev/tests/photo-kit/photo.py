"""Turns out/raw-*.png into phone-photo-like images: slight tilt, uneven light, vignette, noise, blur.
Usage: python3 photo.py [raw_dir] [out_dir]      (needs: Pillow, numpy)
"""
import glob, os, random, sys, zlib
import numpy as np
from PIL import Image, ImageFilter

here = os.path.dirname(os.path.abspath(__file__))
raw_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'out')
out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, 'out', 'photos')
os.makedirs(out_dir, exist_ok=True)
for path in sorted(glob.glob(os.path.join(raw_dir, 'raw-*.png'))):
    name = os.path.basename(path)[4:]
    rnd = random.Random(name)
    im = Image.open(path).convert('RGB')
    im = im.resize((im.width * 7 // 10, im.height * 7 // 10), Image.LANCZOS)
    pad = 70
    canvas = Image.new('RGB', (im.width + 2 * pad, im.height + 2 * pad), (206, 202, 190))
    canvas.paste(im, (pad, pad))
    canvas = canvas.rotate(rnd.uniform(-1.1, 1.1), resample=Image.BICUBIC, expand=False, fillcolor=(190, 186, 176))
    a = np.asarray(canvas).astype(np.float32)
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    light = 1.0 - 0.10 * (xx / w) * rnd.choice([-1, 1]) - 0.05 * (yy / h)
    vig = 1.0 - 0.18 * (((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / 2
    a *= (light * vig)[..., None]
    a += np.random.RandomState(zlib.crc32(name.encode())).normal(0, 4.0, a.shape)
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    img.save(os.path.join(out_dir, name), optimize=True)
    print(name, img.size)
