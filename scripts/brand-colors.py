#!/usr/bin/env python3
"""Extract dominant brand colors from the BOYWASH logo."""
from PIL import Image
from collections import Counter

img = Image.open("/home/z/my-project/upload/pasted_image_1794927466239.png").convert("RGBA")
img = img.resize((img.width * 4, img.height * 4), Image.NEAREST)  # upscale for smoother clusters
w, h = img.size
px = img.load()

def cluster_key(r, g, b):
    # quantize to reduce noise
    return (r // 24 * 24, g // 24 * 24, b // 24 * 24)

counts = Counter()
samples = {}
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 128:
            continue
        # skip near-white and near-black
        if r > 235 and g > 235 and b > 235:
            continue
        if r < 25 and g < 25 and b < 25:
            continue
        k = cluster_key(r, g, b)
        counts[k] += 1
        samples.setdefault(k, []).append((r, g, b))

print(f"Image {w}x{h}, top clusters:")
for k, c in counts.most_common(18):
    rs = [s[0] for s in samples[k]]; gs = [s[1] for s in samples[k]]; bs = [s[2] for s in samples[k]]
    avg = (sum(rs)//len(rs), sum(gs)//len(gs), sum(bs)//len(bs))
    print(f"  #{avg[0]:02X}{avg[1]:02X}{avg[2]:02X}  count={c}")

# Also sample specific regions: top band (text), middle (drop), bottom (green)
print("\nRegion samples:")
regions = {
    "text band (top)": (0.0, 0.25),
    "drop area (mid)": (0.25, 0.60),
    "petal area (mid)": (0.35, 0.75),
    "bottom band": (0.75, 1.0),
}
for name, (y0, y1) in regions.items():
    c2 = Counter()
    for y in range(int(h*y0), int(h*y1)):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 128 or (r > 235 and g > 235 and b > 235):
                continue
            c2[cluster_key(r, g, b)] += 1
    top = []
    for k, c in c2.most_common(6):
        s = samples.get(k, [(k[0], k[1], k[2])])
        avg = (sum(x[0] for x in s)//len(s), sum(x[1] for x in s)//len(s), sum(x[2] for x in s)//len(s))
        top.append(f"#{avg[0]:02X}{avg[1]:02X}{avg[2]:02X}({c})")
    print(f"  {name}: {', '.join(top)}")
