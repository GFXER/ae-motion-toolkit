#!/usr/bin/env python3
"""Draw every GL_FAM ease in utils/graph_lib.jsx as an SVG (value graph + speed graph) and print the
markdown table used in docs/bezier_ease.md.

    python3 docs/tools/plot_eases.py            # writes docs/img/ease_<family>.svg, prints the table

Standard library only. The AE numbers use the same formula as bezierToAE() in graph_lib.jsx.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
LIB = ROOT / "utils" / "graph_lib.jsx"
OUT = ROOT / "docs" / "img"

W, H, PAD = 220, 180, 22  # one panel; the picture is two panels side by side


def families(src):
    block = re.search(r"var GL_FAM = \{(.*?)\n\};", src, re.S)
    if not block:
        sys.exit("GL_FAM not found in graph_lib.jsx")
    fam = {}
    for name, nums in re.findall(r"(\w+):\s*\[([^\]]+)\]", block.group(1)):
        fam[name] = [float(v) for v in nums.split(",")]
    return fam


def bezier_to_ae(x1, y1, x2, y2):
    i0, i1 = max(0.001, x1), max(0.001, 1 - x2)
    r0 = y1 / i0 if x1 > 1e-4 else 0.0
    r1 = (1 - y2) / i1 if (1 - x2) > 1e-4 else 0.0
    return min(100, max(0.1, i0 * 100)), r0, min(100, max(0.1, i1 * 100)), r1


def sample(b, n=120):
    """Points (t, value, speed) along the curve; speed is relative to the average speed (1.0 = linear)."""
    x1, y1, x2, y2 = b
    pts = []
    for k in range(n + 1):
        u = k / n
        x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3
        y = 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3
        dx = 3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2)
        dy = 3 * (1 - u) ** 2 * y1 + 6 * (1 - u) * u * (y2 - y1) + 3 * u * u * (1 - y2)
        pts.append((x, y, dy / dx if dx > 1e-6 else None))
    return pts


def panel(ox, title, lo, hi, pts, handles=None):
    def px(t):
        return ox + PAD + t * (W - 2 * PAD)

    def py(v):
        return H - PAD - (v - lo) / (hi - lo) * (H - 2 * PAD)

    s = [f'<rect x="{ox + PAD}" y="{PAD}" width="{W - 2 * PAD}" height="{H - 2 * PAD}" fill="#f6f6f6" stroke="#ccc"/>']
    for g in (0.25, 0.5, 0.75):
        s.append(f'<line x1="{px(g):.1f}" y1="{PAD}" x2="{px(g):.1f}" y2="{H - PAD}" stroke="#e2e2e2"/>')
    for ref in (0, 1):
        if lo <= ref <= hi:
            s.append(f'<line x1="{px(0):.1f}" y1="{py(ref):.1f}" x2="{px(1):.1f}" y2="{py(ref):.1f}" stroke="#bbb" stroke-dasharray="3 3"/>')
    if handles:
        (ax, ay), (bx, by) = handles
        for (hx, hy), (kx, ky) in (((ax, ay), (0, 0)), ((bx, by), (1, 1))):
            s.append(f'<line x1="{px(kx):.1f}" y1="{py(ky):.1f}" x2="{px(hx):.1f}" y2="{py(hy):.1f}" stroke="#e07b00"/>')
            s.append(f'<circle cx="{px(hx):.1f}" cy="{py(hy):.1f}" r="3" fill="#e07b00"/>')
    path = " ".join(f"{px(t):.1f},{py(min(hi, max(lo, v))):.1f}" for t, v in pts if v is not None)
    s.append(f'<polyline points="{path}" fill="none" stroke="#1a5fd0" stroke-width="2"/>')
    s.append(f'<text x="{ox + PAD}" y="15" font-size="11" fill="#333">{title}</text>')
    return s


def svg(name, b):
    x1, y1, x2, y2 = b
    pts = sample(b)
    vals = [(t, v) for t, v, _ in pts]
    speeds = [(t, sp) for t, _, sp in pts]
    vlo, vhi = min(0.0, y1, y2, *(v for _, v in vals)) - 0.05, max(1.0, y1, y2, *(v for _, v in vals)) + 0.05
    sp = [v for _, v in speeds if v is not None]
    shi = min(8.0, max(2.0, max(sp) * 1.1))
    slo = min(0.0, min(sp) * 1.1)
    oi, orr, ii, ir = bezier_to_ae(*b)
    body = panel(0, "value", vlo, vhi, vals, handles=((x1, y1), (x2, y2)))
    body += panel(W, f"speed (x avg, top {shi:.1f})", slo, shi, speeds)
    cap = f"{name}  cubic-bezier({x1:g}, {y1:g}, {x2:g}, {y2:g})  AE out {oi:.1f}% x{orr:.2f} / in {ii:.1f}% x{ir:.2f}"
    body.append(f'<text x="{PAD}" y="{H + 12}" font-size="11" fill="#333">{cap}</text>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{2 * W}" height="{H + 20}" '
            f'viewBox="0 0 {2 * W} {H + 20}" font-family="Helvetica, Arial, sans-serif">'
            f'<rect width="100%" height="100%" fill="#fff"/>' + "".join(body) + "</svg>\n")


def main():
    fam = families(LIB.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    print("| Family | cubic-bezier | AE out (influence, speed x avg) | AE in (influence, speed x avg) | Picture |")
    print("|---|---|---|---|---|")
    for name, b in fam.items():
        (OUT / f"ease_{name}.svg").write_text(svg(name, b), encoding="utf-8")
        oi, orr, ii, ir = bezier_to_ae(*b)
        print(f"| `{name}` | `{', '.join(f'{v:g}' for v in b)}` | {oi:.1f} %, {orr:.2f} | {ii:.1f} %, {ir:.2f} "
              f"| [svg](img/ease_{name}.svg) |")


if __name__ == "__main__":
    main()
