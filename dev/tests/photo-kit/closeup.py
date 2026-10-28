"""Tight crop of one raw render (default: the bond problem) so the text fills the frame: the same equation, bigger on the photo.
Usage: python3 closeup.py [raw-png] [out-png]      (needs: Pillow, numpy)
"""
import os, random, sys
import numpy as np
from PIL import Image, ImageFilter

here = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'out', 'raw-10-bond.png')
dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, 'out', 'photos', '10-bond-closeup.png')
os.makedirs(os.path.dirname(dst), exist_ok=True)
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(int)
ink = (a[..., 0] < 110) & (a[..., 1] < 110) & (a[..., 2] < 140)
ys, xs = np.where(ink)
pad = 50
c = im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))
c = c.resize((1500, int(c.height * 1500 / c.width)), Image.LANCZOS)
c = c.rotate(random.Random(10).uniform(-0.8, 0.8), resample=Image.BICUBIC, fillcolor=(250, 249, 243))
b = np.asarray(c).astype(np.float32)
h, w, _ = b.shape
yy, xx = np.mgrid[0:h, 0:w]
b *= (1.0 - 0.07 * xx / w - 0.04 * yy / h)[..., None]
b += np.random.RandomState(3).normal(0, 3.0, b.shape)
Image.fromarray(np.clip(b, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)).save(dst, optimize=True)
print(dst, Image.open(dst).size)
