# Generates the Borj Kelibia marks (SVG). Ink #17140F, press red #A3161C, paper #F5F1E8.
# Run: python3 gen.py  -> borj-mark.svg (wide), borj-icon.svg (square, small sizes)
INK, RED, PAPER = '#17140F', '#A3161C', '#F5F1E8'

def merlons(x0, x1, y, n, h):
    """n merlons evenly spread on [x0, x1], gaps = 0.7 x merlon width."""
    w = (x1 - x0) / (n + (n - 1) * 0.7)
    return ''.join(f'<rect x="{x0 + i * w * 1.7:.2f}" y="{y - h}" width="{w:.2f}" height="{h}"/>' for i in range(n))

def tower(x0, x1, top, base, n, h=5.5):
    return f'<rect x="{x0}" y="{top}" width="{x1 - x0}" height="{base - top}"/>' + merlons(x0, x1, top, n, h)

def lighthouse(cx, base, top, ink, paper, red, sw=1.8):
    hw_b, hw_t = 6.5, 4.2
    return (f'<path fill="{paper}" stroke="{ink}" stroke-width="{sw}" stroke-linejoin="round" '
            f'd="M{cx-hw_b} {base} L{cx-hw_t} {top} L{cx+hw_t} {top} L{cx+hw_b} {base} Z"/>'
            f'<rect x="{cx-8}" y="{top-3.4}" width="16" height="3.4" fill="{ink}"/>'     # gallery
            f'<rect x="{cx-5}" y="{top-13.4}" width="10" height="10" fill="{ink}"/>'    # lantern
            f'<rect x="{cx-2.7}" y="{top-11}" width="5.4" height="5.6" fill="{red}"/>'  # the light
            f'<path fill="{ink}" d="M{cx-6} {top-13.4} L{cx} {top-19.5} L{cx+6} {top-13.4} Z"/>'
            f'<rect x="{cx-0.6}" y="{top-23}" width="1.2" height="4" fill="{ink}"/>')

def wide(ink=INK, paper=PAPER, red=RED):
    g = [f'<g fill="{ink}">']
    # Rocky promontory: broken slope toward the town, sheer jagged cliff to the sea.
    g.append('<path d="M4 134 L14 131 L20 127 L27 126 L33 120 L40 118 L45 111 L51 108 L55 101 L60 99 L62 94 '
             'L204 94 L207 99 L205 104 L210 109 L208 115 L213 120 L211 126 L216 131 L218 134 Z"/>')
    # Fort: curtain wall, four towers, gate tower.
    g.append('<rect x="56" y="74" width="148" height="21"/>' + merlons(56, 204, 74, 16, 5))
    g.append(tower(48, 67, 58, 95, 3))
    g.append(tower(95, 112, 63, 95, 3))
    g.append(tower(124, 152, 52, 95, 4))
    g.append(tower(176, 206, 60, 95, 4))
    g.append('</g>')
    # Gate arch, slits.
    g.append(f'<path fill="{paper}" d="M132 95 L132 80 A6 6 0 0 1 144 80 L144 95 Z"/>')
    for x, y in [(56.5, 66), (102.5, 70), (137, 61)]:
        g.append(f'<rect x="{x}" y="{y}" width="2.4" height="7" fill="{paper}"/>')
    # Rock cracks (engraving strokes) in paper.
    for d in ['M66 101 L74 104 L82 103', 'M94 106 L104 104 L112 108', 'M150 102 L160 105 L170 103',
              'M186 108 L196 106', 'M44 121 L54 118 L62 121', 'M120 114 L132 117 L144 115', 'M76 124 L88 121 L98 124',
              'M168 120 L178 123 L192 121', 'M30 130 L40 128', 'M140 128 L150 126 L162 129']:
        g.append(f'<path d="{d}" stroke="{paper}" stroke-width="1.3" fill="none" stroke-linejoin="round"/>')
    g.append(lighthouse(191, 60, 33, ink, paper, red))
    # Sea at the foot of the cliff.
    for d in ['M218 127 L229 127 M233 127 L240 127', 'M221 132.5 L240 132.5', 'M190 138 L206 138 M212 138 L235 138']:
        g.append(f'<path d="{d}" stroke="{ink}" stroke-width="1.4"/>')
    return ''.join(g)

def icon(ink=INK, paper=PAPER, red=RED):
    """Square mark for favicon / app icon: gate tower + lighthouse bastion on the rock."""
    g = [f'<g fill="{ink}">']
    g.append('<path d="M2 62 L6 58 L8 54 L12 52 L14 48 L56 48 L57 52 L55 55 L58 58 L57 62 Z"/>')
    g.append('<rect x="10" y="36" width="44" height="13"/>' + merlons(10, 54, 36, 6, 3.5))
    g.append(tower(16, 32, 26, 49, 3, 4))
    g.append(tower(40, 56, 32, 49, 3, 4))
    g.append('</g>')
    g.append(f'<path fill="{paper}" d="M20.5 49 L20.5 41 A3.5 3.5 0 0 1 27.5 41 L27.5 49 Z"/>')
    g.append(lighthouse(48, 32, 16, ink, paper, red, sw=1.4).replace('16" height="3.4"', '13" height="3"'))
    return ''.join(g)

def svg(body, vb):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="البرج">{body}</svg>\n'

open('borj-mark.svg', 'w').write(svg(wide(), '0 0 242 142'))
open('borj-icon.svg', 'w').write(svg(icon(), '0 0 64 64'))
