"""Story Mode neighbours as stylised low-poly figures on one shared base body.

  blender -b --factory-startup -P art-src/blender/build_npcs.py -- <out_dir> [--render=<png>]

Writes <out_dir>/npcs.glb. Every figure is two named meshes, both on the same
shared painted material (per-face vertex colour, flat normals, no textures):

  npc_<key>_body  -> the figure root (feet on y = 0, facing +Z in three.js)
  npc_<key>_head  -> a head pivot at NECK_Y above the root (turn / nod / idle)

<key> is one of FIGURES below. All figures share the same base body (legs,
hips, torso, arms, head, face) with per-character proportions, palette,
clothing silhouette and props:

  gus    Old Gus, veteran gardener: straw hat, denim overalls, white beard, cane
  lila   Lila, chef: hair bun, long apron, a bunch of basil
  maya   Maya, inventor: goggles on the forehead, tool belt with a wrench
  pat    Pat, weekend gardener: cap, t-shirt, shorts, watering can
  sam    Sam, beekeeper: white suit, brimmed hat with veil, smoker
  jo     Jo, composter: overalls, rubber boots, pitchfork
  robin  Robin, birdwatcher: bucket hat, field vest, binoculars
  folk   any other neighbour (content packs): plain shirt and trousers

All geometry is procedural and original (no scans, no photo textures). Units are
metres; three.js coords are authored directly (x right, y up, z toward camera).
Ship (meshopt, keeps named nodes):

  gltf-transform optimize <out_dir>/npcs.glb assets/art/neighborhood/npcs.glb --compress meshopt \
    --flatten false --join false --instance false --palette false --simplify false --prune-attributes false
"""
import bpy, bmesh, math, os, random, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(argv[0] if argv and not argv[0].startswith('--') else 'art-src/build')
RENDER = next((a.split('=', 1)[1] for a in argv if a.startswith('--render=')), None)
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

NECK_Y = 0.64          # head pivot height above the figure root (three.js y)
HEAD_R = 0.15          # base head radius; head centre sits HEAD_C above the pivot
HEAD_C = 0.15


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


rng = random.Random(20261030)


def jitter(hexc, amt=0.04):
    r, g, b = hex_rgb(hexc)
    k = 1 + rng.uniform(-amt, amt)
    return (min(1, r * k), min(1, g * k), min(1, b * k))


def T(x, y, z):
    """three.js coords (x right, y up, z toward camera) -> Blender (x, -z, y)."""
    return Vector((x, -z, y))


class Part:
    """Collects closed shells in three.js space with one painted colour per face."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.col = []

    def add(self, verts, faces, hexc, amt=0.04):
        vs = [self.bm.verts.new(T(*v)) for v in verts]
        for f in faces:
            try:
                self.bm.faces.new([vs[i] for i in f])
            except ValueError:
                continue
            self.col.append(jitter(hexc, amt))

    def blob(self, c, r, hexc, sub=1, noise=0.05, clip=None, amt=0.04):
        """Faceted ellipsoid (icosphere). clip(p) may move a vertex (flatten a side)."""
        tmp = bmesh.new()
        bmesh.ops.create_icosphere(tmp, subdivisions=sub, radius=1.0)
        verts = []
        for v in tmp.verts:
            n = v.co.normalized()
            k = 1.0 + rng.uniform(-noise, noise)
            p = [c[0] + n.x * r[0] * k, c[1] + n.z * r[1] * k, c[2] + n.y * r[2] * k]
            if clip:
                p = clip(p)
            verts.append(tuple(p))
        idx = {v: i for i, v in enumerate(tmp.verts)}
        faces = [[idx[v] for v in f.verts] for f in tmp.faces]
        tmp.free()
        self.add(verts, faces, hexc, amt)

    def tube(self, p0, p1, r0, r1, hexc, segs=6, sx=1.0, amt=0.04):
        """Closed tapered prism from p0 to p1 (radius r0 -> r1). sx squashes the cross-section."""
        a, b = Vector(p0), Vector(p1)
        d = (b - a).normalized()
        u = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized()
        v = d.cross(u).normalized()
        verts = []
        for (c, r) in ((a, r0), (b, r1)):
            for i in range(segs):
                t = 2 * math.pi * (i + 0.5) / segs
                p = c + u * (math.cos(t) * r * sx) + v * (math.sin(t) * r)
                verts.append(tuple(p))
        faces = [list(range(segs))[::-1], list(range(segs, 2 * segs))]
        for i in range(segs):
            j = (i + 1) % segs
            faces.append([i, j, segs + j, segs + i])
        self.add(verts, faces, hexc, amt)

    def disc(self, c, r, h, hexc, segs=10, r_top=None, amt=0.04):
        """Vertical cylinder / frustum, base centre c, height h."""
        self.tube(c, (c[0], c[1] + h, c[2]), r, r if r_top is None else r_top, hexc, segs, amt=amt)

    def box(self, c, s, hexc, rot_x=0.0, rot_y=0.0, amt=0.04):
        hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
        cs = [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz),
              (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]
        out = []
        for x, y, z in cs:
            y, z = y * math.cos(rot_x) - z * math.sin(rot_x), y * math.sin(rot_x) + z * math.cos(rot_x)
            x, z = x * math.cos(rot_y) + z * math.sin(rot_y), -x * math.sin(rot_y) + z * math.cos(rot_y)
            out.append((c[0] + x, c[1] + y, c[2] + z))
        faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]]
        self.add(out, faces, hexc, amt)


def make(part, mat):
    """Build the object, carrying per-face colours through triangulation."""
    bm = part.bm
    lay = bm.faces.layers.int.new('cid')
    for i, f in enumerate(bm.faces):
        f[lay] = i
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(part.name)
    bm.to_mesh(me)
    bm.free()
    attr = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    cid = me.attributes['cid'].data
    for poly in me.polygons:
        rgb = part.col[cid[poly.index].value]
        lin = [((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92 for c in rgb]
        for li in poly.loop_indices:
            attr.data[li].color = (*lin, 1.0)
        poly.use_smooth = False
    me.attributes.remove(me.attributes['cid'])
    me.color_attributes.active_color = attr
    ob = bpy.data.objects.new(part.name, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


def npc_material():
    mat = bpy.data.materials.new('npc_paint')
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    vc = nt.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Col'
    nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.92
    return mat


# ---- shared base body --------------------------------------------------------
BASE_PAL = {
    'skin': '#d8b08c', 'hair': '#4a3424', 'shirt': '#8fae74', 'pants': '#5a6478',
    'shoes': '#4a3528', 'eye': '#2a2220', 'mouth': '#7c4a35', 'brow': None,
}


def base_body(b, pal, o):
    """Legs, hips, torso and arms. o: per-character options."""
    w = o.get('width', 1.0)
    lean = o.get('lean', 0.0)                   # forward stoop of the upper body (z offset at shoulders)
    leg_top = 0.33
    # feet / shoes
    for sx in (-1, 1):
        b.blob((sx * 0.072, 0.04, 0.03), (0.058, 0.045, 0.088), pal['shoes'], sub=1, noise=0.03,
               clip=lambda p: [p[0], max(p[1], 0.0), p[2]])
    # legs (trousers, or bare shins when shorts)
    for sx in (-1, 1):
        if o.get('shorts'):
            b.tube((sx * 0.07, 0.06, 0.0), (sx * 0.072, 0.22, 0.0), 0.04, 0.044, pal['skin'], segs=6)
            b.tube((sx * 0.072, 0.2, 0.0), (sx * 0.075, leg_top + 0.02, 0.0), 0.062, 0.066, pal['pants'], segs=7)
        else:
            boot_top = o.get('boot_h', 0.0)
            if boot_top:
                b.tube((sx * 0.07, 0.04, 0.01), (sx * 0.071, boot_top, 0.0), 0.058, 0.06, pal['shoes'], segs=7)
            b.tube((sx * 0.07, 0.06, 0.0), (sx * 0.075, leg_top + 0.02, 0.0), 0.05, 0.06, pal['pants'], segs=7)
    # hips + torso
    b.blob((0.0, 0.35, 0.0), (0.135 * w, 0.075, 0.1), pal['pants'], sub=1, noise=0.03)
    top = pal.get('torso', pal['shirt'])
    b.blob((0.0, 0.47, lean * 0.5), (0.13 * w, 0.15, 0.1), top, sub=1, noise=0.04)
    b.blob((0.0, 0.57, lean), (0.14 * w, 0.075, 0.095), top, sub=1, noise=0.04)   # shoulders
    b.tube((0.0, 0.58, lean * 0.9), (0.0, NECK_Y + 0.03, lean * 0.9), 0.045, 0.04, pal['skin'], segs=6)  # neck
    # arms: shoulder -> hand, each arm can be posed via o['arm_l'] / o['arm_r'] hand targets
    sleeve = pal.get('sleeve', top)
    for sx, key in ((-1, 'arm_l'), (1, 'arm_r')):
        sh = (sx * 0.145 * w, 0.565, lean)
        hand = o.get(key) or (sx * 0.2 * w, 0.35, lean * 0.4 + 0.01)
        hand = (sx * abs(hand[0]), hand[1], hand[2])
        elbow = tuple(sh[i] + (hand[i] - sh[i]) * 0.5 for i in range(3))
        elbow = (elbow[0] + sx * 0.02, elbow[1], elbow[2] - 0.02)
        b.tube(sh, elbow, 0.042, 0.037, sleeve, segs=6)
        fore = pal['skin'] if o.get('short_sleeves') else sleeve
        b.tube(elbow, hand, 0.036, 0.032, fore, segs=6)
        b.blob(hand, (0.038, 0.042, 0.038), pal.get('gloves', pal['skin']), sub=1, noise=0.04)
    return b


def base_head(h, pal, o):
    """Head, ears, face. Head pivot frame: neck at the origin."""
    hr = o.get('head_r', HEAD_R)
    c = (0.0, HEAD_C, o.get('head_z', 0.0))
    h.blob(c, (hr, hr * 0.96, hr * 0.95), pal['skin'], sub=2, noise=0.02)
    for sx in (-1, 1):
        h.blob((sx * hr * 0.98, c[1] - 0.005, c[2] - 0.005), (0.025, 0.035, 0.022), pal['skin'], sub=1, noise=0.03)
    fz = c[2] + hr * 0.9
    for sx in (-1, 1):
        h.blob((sx * 0.052, c[1] + 0.005, fz - 0.006), (0.017, 0.022, 0.01), pal['eye'], sub=1, noise=0.0, amt=0.01)
        h.blob((sx * 0.06, c[1] + 0.01, fz - 0.0), (0.006, 0.006, 0.004), '#f4efe0', sub=1, noise=0.0, amt=0.0)   # catch light
        h.blob((sx * 0.085, c[1] - 0.04, fz - 0.03), (0.025, 0.016, 0.01), pal.get('blush', '#e09a88'), sub=1, noise=0.0, amt=0.02)
        if pal.get('brow'):
            h.box((sx * 0.055, c[1] + 0.05, fz - 0.012), (0.05, 0.014, 0.02), pal['brow'], rot_x=-0.25)
    h.blob((0.0, c[1] - 0.022, fz + 0.012), (0.02, 0.02, 0.018), pal['skin'], sub=1, noise=0.0, amt=0.06)  # nose
    if not o.get('no_mouth'):
        h.box((0.0, c[1] - 0.064, fz - 0.022), (0.034, 0.01, 0.016), pal.get('lips', '#b5655a'), rot_x=0.3)
    return c, hr


def hair_cap(h, c, hr, hexc, back=0.0, fringe=0.06):
    """Hair shell over the crown and back, clear of the eyes."""
    def clip(p):
        # keep the face open: nothing in front of the forehead line
        if p[2] > c[2] + hr * 0.55 and p[1] < c[1] + fringe:
            p[1] = c[1] + fringe + (p[1] - c[1] - fringe) * 0.15
        return p
    h.blob((c[0], c[1] + 0.03, c[2] - 0.02 - back), (hr * 1.07, hr * 0.92, hr * 1.04), hexc, sub=2, noise=0.04, clip=clip)


# ---- characters ---------------------------------------------------------------
FIGURES = {}


def figure(key):
    def deco(fn):
        FIGURES[key] = fn
        return fn
    return deco


@figure('gus')
def gus(b, h):
    pal = dict(BASE_PAL, skin='#dca582', shirt='#b0503a', sleeve='#b0503a', pants='#4f6c8e', torso='#b0503a',
               shoes='#5a3d28', brow='#ece6da', blush='#e08a74')
    o = dict(width=1.08, lean=0.035, arm_r=(0.24, 0.33, 0.12))
    base_body(b, pal, o)
    # overalls: bib + straps over the plaid shirt (shirt shows at the sides/arms)
    b.box((0.0, 0.47, 0.105), (0.17, 0.17, 0.03), '#4f6c8e', rot_x=0.12)
    b.blob((0.0, 0.39, 0.0), (0.14, 0.07, 0.107), '#4f6c8e', sub=1, noise=0.02)
    b.box((0.0, 0.5, 0.122), (0.07, 0.05, 0.012), '#3f5874', rot_x=0.12)           # bib pocket
    for sx in (-1, 1):
        b.box((sx * 0.065, 0.56, 0.05), (0.035, 0.03, 0.16), '#4f6c8e', rot_x=0.3)   # straps
        b.blob((sx * 0.06, 0.535, 0.12), (0.012, 0.012, 0.008), '#c9a54a', sub=1, noise=0.0)  # brass buttons
    # plaid hint: darker check bands on the shirt sleeves
    for sx in (-1, 1):
        b.tube((sx * 0.165, 0.52, 0.035), (sx * 0.17, 0.5, 0.04), 0.044, 0.044, '#7f3426', segs=6)
    # cane in the right hand
    b.tube((0.25, 0.0, 0.17), (0.24, 0.36, 0.12), 0.014, 0.014, '#7a5232', segs=5)
    b.tube((0.24, 0.36, 0.12), (0.2, 0.39, 0.12), 0.016, 0.016, '#7a5232', segs=5)
    c, hr = base_head(h, pal, dict(no_mouth=True))
    # white side hair, bushy brows done by pal['brow'], beard + moustache
    for sx in (-1, 1):
        h.blob((sx * 0.12, c[1] - 0.0, c[2] - 0.05), (0.05, 0.07, 0.08), '#e6e0d4', sub=1, noise=0.08)
    h.blob((0.0, c[1] - 0.085, c[2] + 0.075), (0.1, 0.085, 0.07), '#ece6da', sub=1, noise=0.08)   # beard
    h.blob((0.0, c[1] - 0.045, c[2] + 0.135), (0.06, 0.02, 0.025), '#e2dccf', sub=1, noise=0.05)  # moustache
    # straw hat: wide brim, low crown, dark band
    y0 = c[1] + 0.075
    h.disc((0.0, y0, -0.01), 0.27, 0.02, '#dcbd72', segs=12, r_top=0.25)
    h.disc((0.0, y0 + 0.018, -0.01), 0.135, 0.095, '#e3c47e', segs=10, r_top=0.115)
    h.disc((0.0, y0 + 0.02, -0.01), 0.138, 0.03, '#7a4b2a', segs=10)
    return pal


@figure('lila')
def lila(b, h):
    pal = dict(BASE_PAL, skin='#a96f4c', hair='#2e211c', shirt='#5f7f9a', sleeve='#5f7f9a', pants='#3f3a3a',
               shoes='#4a3528', blush='#c4705c', brow='#2e211c')
    o = dict(width=0.96, arm_l=(0.2, 0.42, 0.13), short_sleeves=False)
    base_body(b, pal, o)
    # long cream apron from chest to knee, with a pocket and neck/waist ties
    b.box((0.0, 0.48, 0.1), (0.2, 0.2, 0.025), '#f0e6d0', rot_x=0.06)
    b.box((0.0, 0.26, 0.11), (0.24, 0.24, 0.03), '#f0e6d0', rot_x=-0.08)
    b.box((0.0, 0.29, 0.13), (0.11, 0.07, 0.012), '#ddd0b4', rot_x=-0.08)           # pocket
    b.blob((0.0, 0.385, 0.0), (0.14, 0.022, 0.105), '#ddd0b4', sub=1, noise=0.0)    # waist tie
    b.box((0.0, 0.39, -0.105), (0.06, 0.05, 0.02), '#ddd0b4')                         # bow at the back
    for sx in (-1, 1):
        b.box((sx * 0.05, 0.6, 0.05), (0.022, 0.025, 0.12), '#ddd0b4', rot_x=0.4)    # neck strap
    # a bunch of fresh basil in the raised left hand
    for i, (dx, dy, dz) in enumerate(((0.0, 0.07, 0.0), (0.03, 0.06, 0.02), (-0.03, 0.06, 0.01), (0.0, 0.05, 0.035))):
        b.blob((-0.2 + dx, 0.44 + dy, 0.13 + dz), (0.035, 0.03, 0.03), '#4f8a3c' if i % 2 else '#68a24a', sub=1, noise=0.1)
    b.tube((-0.2, 0.4, 0.13), (-0.2, 0.47, 0.13), 0.008, 0.008, '#4f7334', segs=4)
    c, hr = base_head(h, pal, {})
    hair_cap(h, c, hr, pal['hair'], fringe=0.07)
    h.blob((0.0, c[1] + 0.13, c[2] - 0.07), (0.075, 0.065, 0.07), pal['hair'], sub=1, noise=0.06)  # bun
    h.disc((0.0, c[1] + 0.065, c[2] - 0.01), hr * 1.02, 0.03, '#c4483a', segs=10)                 # red headband
    return pal


@figure('maya')
def maya(b, h):
    pal = dict(BASE_PAL, skin='#e2b690', hair='#8a4a2e', shirt='#3f7f7a', sleeve='#3f7f7a', pants='#3f7f7a',
               shoes='#3a3030', gloves='#e07a32', blush='#e8907a', brow='#6e3a24')
    o = dict(width=0.98, arm_r=(0.2, 0.42, 0.14))
    base_body(b, pal, o)
    # rolled sleeves / cuffs and a zip line
    b.box((0.0, 0.49, 0.1), (0.012, 0.2, 0.012), '#2f5f5b')
    # tool belt with pouches and a hanging wrench
    b.blob((0.0, 0.37, 0.0), (0.145, 0.03, 0.112), '#6b4528', sub=1, noise=0.0)
    b.box((0.0, 0.372, 0.11), (0.035, 0.03, 0.012), '#c9a54a')                     # buckle
    for sx in (-1, 1):
        b.box((sx * 0.1, 0.33, 0.07), (0.06, 0.07, 0.05), '#7a5232', rot_y=sx * 0.5)
    b.box((0.13, 0.27, 0.03), (0.02, 0.12, 0.012), '#9aa3a6')
    b.tube((0.13, 0.21, 0.03), (0.13, 0.2, 0.03), 0.022, 0.022, '#9aa3a6', segs=6)
    # little gadget in the raised right hand (screwdriver)
    b.tube((0.2, 0.44, 0.15), (0.2, 0.52, 0.17), 0.012, 0.012, '#c4483a', segs=5)
    b.tube((0.2, 0.52, 0.17), (0.2, 0.58, 0.185), 0.004, 0.004, '#9aa3a6', segs=4)
    c, hr = base_head(h, pal, {})
    hair_cap(h, c, hr, pal['hair'], fringe=0.08)
    for (dx, dy, dz) in ((0.1, 0.1, -0.06), (-0.11, 0.08, -0.05), (0.02, 0.16, -0.08), (-0.06, 0.14, 0.02), (0.08, 0.04, -0.1)):
        h.blob((dx, c[1] + dy - 0.03, c[2] + dz), (0.06, 0.05, 0.06), pal['hair'], sub=1, noise=0.12)   # messy curls
    # goggles pushed up on the forehead: strap + two brass-rimmed lenses
    gy = c[1] + 0.085
    h.disc((0.0, gy - 0.015, c[2]), hr * 1.06, 0.03, '#4a3528', segs=12)
    for sx in (-1, 1):
        lens_c = (sx * 0.05, gy, c[2] + hr * 0.86)
        h.tube(lens_c, (lens_c[0], lens_c[1] + 0.012, lens_c[2] + 0.045), 0.038, 0.038, '#b88a3e', segs=8)
        h.tube((lens_c[0], lens_c[1] + 0.012, lens_c[2] + 0.045), (lens_c[0], lens_c[1] + 0.013, lens_c[2] + 0.05), 0.03, 0.03, '#8fc0cc', segs=8, amt=0.0)
    return pal


@figure('pat')
def pat(b, h):
    pal = dict(BASE_PAL, skin='#c98d64', hair='#5a3a26', shirt='#e8c04a', sleeve='#e8c04a', pants='#b59a6a',
               shoes='#e4ddd0', gloves='#8fb85a', blush='#d98a70', brow='#5a3a26')
    o = dict(width=1.02, shorts=True, short_sleeves=True, arm_r=(0.23, 0.36, 0.08))
    base_body(b, pal, o)
    b.box((0.0, 0.5, 0.105), (0.08, 0.06, 0.012), '#5f8f45')                        # shirt print
    # watering can in the right hand
    can = (0.25, 0.22, 0.08)
    b.disc(can, 0.07, 0.12, '#6f9a8a', segs=8, r_top=0.06)
    b.tube((can[0], can[1] + 0.06, can[2] + 0.04), (can[0], can[1] + 0.13, can[2] + 0.15), 0.014, 0.012, '#6f9a8a', segs=5)
    b.disc((can[0], can[1] + 0.13, can[2] + 0.155), 0.025, 0.015, '#4f7468', segs=6)
    b.tube((can[0], can[1] + 0.12, can[2] - 0.05), (can[0], can[1] + 0.15, can[2] + 0.02), 0.012, 0.012, '#4f7468', segs=4)
    c, hr = base_head(h, pal, {})
    hair_cap(h, c, hr, pal['hair'], fringe=0.07)
    # baseball cap with a bill toward the camera
    h.blob((0.0, c[1] + 0.07, c[2] - 0.005), (hr * 1.04, hr * 0.62, hr * 1.04), '#5f8f45', sub=2, noise=0.0,
           clip=lambda p: [p[0], max(p[1], c[1] + 0.06), p[2]])
    h.box((0.0, c[1] + 0.065, c[2] + hr * 1.1), (0.2, 0.014, 0.12), '#4f7a3a', rot_x=-0.1)
    return pal


@figure('sam')
def sam(b, h):
    pal = dict(BASE_PAL, skin='#d4a07a', hair='#3a2a1e', shirt='#ece6d6', sleeve='#ece6d6', pants='#ece6d6',
               shoes='#e4ddd0', gloves='#d8b65a', blush='#d98a70')
    o = dict(width=1.06, arm_l=(0.21, 0.4, 0.13), boot_h=0.14)
    base_body(b, pal, o)
    b.box((0.0, 0.49, 0.105), (0.012, 0.22, 0.012), '#cfc8b6')                       # zip
    b.box((0.06, 0.53, 0.1), (0.05, 0.04, 0.012), '#cfc8b6')                         # chest pocket
    # smoker in the left hand: can, lid cone, spout, bellows
    s = (-0.21, 0.3, 0.15)
    b.disc(s, 0.045, 0.11, '#9aa3a6', segs=8)
    b.disc((s[0], s[1] + 0.11, s[2]), 0.045, 0.04, '#7a8286', segs=8, r_top=0.02)
    b.tube((s[0], s[1] + 0.14, s[2]), (s[0], s[1] + 0.17, s[2] + 0.035), 0.012, 0.008, '#6b7275', segs=5)
    b.box((s[0], s[1] + 0.05, s[2] - 0.065), (0.05, 0.08, 0.035), '#8a5a34')
    c, hr = base_head(h, pal, {})
    # beekeeper hat: round brim + crown, mesh veil hanging to the shoulders
    y0 = c[1] + 0.07
    h.disc((0.0, y0, 0.0), 0.24, 0.018, '#f2ede0', segs=12, r_top=0.23)
    h.disc((0.0, y0 + 0.015, 0.0), 0.13, 0.08, '#f2ede0', segs=10, r_top=0.12)
    # mesh veil: drapes from the brim round the sides and back, open at the face
    n = 9
    for i in range(n):
        a = math.radians(-125 + 250 * i / (n - 1)) + math.pi    # 0 = straight back (-z)
        r = 0.2
        x, z = math.sin(a) * r, math.cos(a) * r
        h.box((x, (y0 - 0.02) / 2 + 0.0, z), (0.15, y0 + 0.02, 0.012), '#6f776c', rot_y=a, amt=0.03)
    h.disc((0.0, -0.02, 0.0), 0.12, 0.03, '#ece6d6', segs=10)                           # collar of the suit
    h.box((0.0, c[1] + 0.02, c[2] + hr * 1.0), (0.2, 0.17, 0.004), '#5c6459', amt=0.0)  # see-through front panel
    return pal


@figure('jo')
def jo(b, h):
    pal = dict(BASE_PAL, skin='#8a5a3c', hair='#1f1814', shirt='#7fa356', sleeve='#7fa356', pants='#7a5a3a',
               torso='#7fa356', shoes='#4f7334', blush='#a8604a', brow='#1f1814')
    o = dict(width=1.12, boot_h=0.17, short_sleeves=True, arm_r=(0.22, 0.42, 0.12), arm_l=(0.2, 0.33, 0.06))
    base_body(b, pal, o)
    # brown work overalls over a green shirt
    b.box((0.0, 0.46, 0.1), (0.18, 0.16, 0.03), '#7a5a3a', rot_x=0.1)
    b.blob((0.0, 0.39, 0.0), (0.15, 0.07, 0.11), '#7a5a3a', sub=1, noise=0.02)
    for sx in (-1, 1):
        b.box((sx * 0.07, 0.56, 0.045), (0.035, 0.03, 0.16), '#7a5a3a', rot_x=0.3)
    # pitchfork held upright in the right hand
    px, pz = 0.22, 0.12
    b.tube((px, 0.0, pz), (px, 0.86, pz), 0.012, 0.012, '#a87a4a', segs=5)
    b.box((px, 0.87, pz), (0.12, 0.02, 0.02), '#7a8286')
    for dx in (-0.05, -0.017, 0.017, 0.05):
        b.tube((px + dx, 0.86, pz), (px + dx, 0.99, pz + 0.01), 0.006, 0.004, '#7a8286', segs=4)
    c, hr = base_head(h, pal, {})
    # short curly hair: a cap plus a few tight curls
    hair_cap(h, c, hr, pal['hair'], fringe=0.085)
    for (dx, dy, dz) in ((0.07, 0.13, 0.02), (-0.07, 0.13, 0.0), (0.0, 0.15, -0.05), (0.1, 0.07, -0.07), (-0.1, 0.08, -0.06)):
        h.blob((dx, c[1] + dy - 0.03, c[2] + dz), (0.04, 0.035, 0.04), pal['hair'], sub=1, noise=0.1)
    return pal


@figure('robin')
def robin(b, h):
    pal = dict(BASE_PAL, skin='#f0c8a8', hair='#b5643a', shirt='#3f6b35', sleeve='#3f6b35', pants='#6b5a45',
               shoes='#4a3528', blush='#f0a090', brow='#9a5030')
    o = dict(width=0.94, boot_h=0.12, arm_l=(0.12, 0.47, 0.12), arm_r=(0.12, 0.47, 0.12))
    base_body(b, pal, o)
    # khaki field vest with pockets
    b.blob((0.0, 0.48, 0.005), (0.137, 0.135, 0.104), '#b8a27a', sub=1, noise=0.03,
           clip=lambda p: p if abs(p[0]) > 0.03 or p[2] < 0.05 else [p[0], p[1], 0.05])
    for sx in (-1, 1):
        b.box((sx * 0.07, 0.43, 0.1), (0.05, 0.05, 0.015), '#a08a62')
    # binoculars held up at the chest, with a strap round the neck
    for sx in (-1, 1):
        b.tube((sx * 0.032, 0.5, 0.13), (sx * 0.032, 0.5, 0.21), 0.03, 0.026, '#3a3634', segs=7)
        b.disc((sx * 0.032, 0.5, 0.21), 0.022, 0.003, '#5f8aa0', segs=7)
    b.box((0.0, 0.5, 0.16), (0.04, 0.025, 0.04), '#2a2624')
    for sx in (-1, 1):
        b.tube((sx * 0.06, 0.52, 0.12), (sx * 0.06, 0.63, 0.02), 0.008, 0.008, '#5a3d28', segs=4)
    c, hr = base_head(h, pal, {})
    hair_cap(h, c, hr, pal['hair'], fringe=0.07)
    h.blob((0.0, c[1] - 0.02, c[2] - 0.16), (0.045, 0.08, 0.04), pal['hair'], sub=1, noise=0.08)   # low ponytail
    # olive bucket hat
    y0 = c[1] + 0.06
    h.disc((0.0, y0, -0.01), 0.205, 0.035, '#6f7a48', segs=12, r_top=0.16)
    h.disc((0.0, y0 + 0.03, -0.01), 0.155, 0.075, '#7a8450', segs=10, r_top=0.13)
    return pal


@figure('folk')
def folk(b, h):
    pal = dict(BASE_PAL, skin='#c69472', brow='#4a3424')
    base_body(b, pal, {})
    c, hr = base_head(h, pal, {})
    hair_cap(h, c, hr, pal['hair'], fringe=0.07)
    return pal


mat = npc_material()
objs = []
totals = {}
for key, fn in FIGURES.items():
    b = Part(f'npc_{key}_body')
    h = Part(f'npc_{key}_head')
    fn(b, h)
    ob = make(b, mat)
    oh = make(h, mat)
    oh.location = T(0.0, NECK_Y, 0.0)   # head pivot; geometry is authored in the pivot frame
    objs += [ob, oh]
    t = len(ob.data.polygons) + len(oh.data.polygons)
    totals[key] = t
    print('NPC', key, 'body', len(ob.data.polygons), 'head', len(oh.data.polygons), 'total', t)
print('NPC_MAX_TRIS', max(totals.values()), 'NPC_ALL_TRIS', sum(totals.values()))

if RENDER:
    # lineup preview (Workbench, flat vertex colour)
    keys = list(FIGURES)
    for i, k in enumerate(keys):
        dx = (i - (len(keys) - 1) / 2) * 0.62
        for ob in objs:
            if ob.name.startswith(f'npc_{k}_'):
                ob.location.x += dx
    sc = bpy.context.scene
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    cam.location = T(0.0, 1.1, 6.4)
    cam.rotation_euler = (Vector(T(0, 0.55, 0)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 50
    sc.camera = cam
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'VERTEX'
    sc.render.resolution_x, sc.render.resolution_y = 2000, 560
    sc.render.filepath = RENDER
    bpy.ops.render.render(write_still=True)
    for i, k in enumerate(keys):
        dx = (i - (len(keys) - 1) / 2) * 0.62
        for ob in objs:
            if ob.name.startswith(f'npc_{k}_'):
                ob.location.x -= dx
    bpy.data.objects.remove(cam, do_unlink=True)

for ob in bpy.context.scene.objects:
    ob.select_set(ob in objs)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'npcs.glb'), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_image_format='NONE',
                          export_vertex_color='ACTIVE', export_normals=True, export_materials='EXPORT')
print('WROTE', os.path.join(OUT, 'npcs.glb'))
