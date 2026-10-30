"""Calvin, the Old English Sheepdog in Story Mode, as a stylised low-poly rig.

  blender -b --factory-startup -P art-src/blender/build_calvin.py -- <out_dir> [--render=<png>]

Writes <out_dir>/calvin.glb: one named mesh node per rig part, each authored in
the local frame of the three.js pivot it hangs from in garden-scene.js (the dog
faces +X, up is +Y), so the existing run / idle / hold animation drives it
unchanged:

  calvin_body       -> dogTorso       (torso group, y 0.34 above the rig root)
  calvin_head       -> dogHeadPivot   (0.30, 0.08, 0 in torso)
  calvin_ear_l / _r -> dogEars[0] / [1] (0.10, 0.10, -/+0.05 in head pivot)
  calvin_tail       -> dogTailPivot   (-0.31, 0.04, 0 in torso)
  calvin_leg_upper  -> front hipPivots (x +0.18; y -0.08)
  calvin_leg_upper_hind -> hind hipPivots (x -0.12), grey thigh, white below the hock
  calvin_leg_lower  -> each kneePivot (0, -0.16, 0 in hip), paw included
  calvin_tongue     -> dogTongue      (hangs down from its own origin)

Faceted geometry, flat normals, painted per-face vertex colours (COLOR_0) from
the style-kit rules: no pure black/white, cool-leaning greys, warm whites.
Geometry-only GLB, no textures, all procedural and original.
Ship (meshopt, keeps named nodes; rebuilds byte-identical):

  gltf-transform optimize <out_dir>/calvin.glb assets/art/yard/calvin.glb --compress meshopt \
    --flatten false --join false --instance false --palette false --simplify false --prune-attributes false
"""
import bpy, bmesh, math, os, random, sys
from mathutils import Vector, Color

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(argv[0] if argv and not argv[0].startswith('--') else 'art-src/build')
RENDER = next((a.split('=', 1)[1] for a in argv if a.startswith('--render=')), None)
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---- palette (sRGB hex) ----------------------------------------------------
PAL = {
    # Read off the owner's reference photos (reference only; nothing from them ships).
    'white': '#eee8dc',      # cream-white head, neck, chest, front legs, hind feet
    'white_sh': '#d9d1c2',   # coat underside / inner fringe
    'beard': '#e2d6bf',      # slightly warmer muzzle and beard
    'grey': '#77797d',       # dark slate-grey saddle
    'grey_dk': '#636568',    # saddle underside / hind thighs
    'grey_lt': '#8b8d91',    # saddle top catching light
    'nose': '#1c1a1c',
    'eye': '#242022',
    'tongue': '#d9798a',
}


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


rng = random.Random(20261030)


def T(x, y, z):
    """three.js coords (x fwd, y up, z right) -> Blender (x, -z, y)."""
    return Vector((x, -z, y))


class Part:
    """Collects faces in three.js space with a colour per face."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.col = []  # per face colour, sRGB tuple

    def add_bm(self, src_verts, src_faces, colour_fn):
        vs = [self.bm.verts.new(T(*v)) for v in src_verts]
        for f in src_faces:
            try:
                face = self.bm.faces.new([vs[i] for i in f])
            except ValueError:
                continue
            c = sum((Vector(src_verts[i]) for i in f), Vector()) / len(f)
            self.col.append(colour_fn(c))

    def blob(self, centre, radii, colour_fn, subdiv=1, noise=0.08, flat_bottom=None, flat_front=None):
        """Lumpy faceted ellipsoid (icosphere, seeded jitter)."""
        tmp = bmesh.new()
        bmesh.ops.create_icosphere(tmp, subdivisions=subdiv + 1, radius=1.0)  # subdiv 1 = 80 faces
        verts = []
        for v in tmp.verts:
            n = v.co.normalized()
            k = 1.0 + rng.uniform(-noise, noise)
            # Blender ico is z-up; treat its (x, y, z) as three (x, z, y) unit directions
            d = (n.x, n.z, n.y)
            p = [centre[i] + d[i] * radii[i] * k for i in range(3)]
            if flat_bottom is not None:
                p[1] = max(p[1], flat_bottom)
            if flat_front is not None:
                p[0] = min(p[0], flat_front)
            verts.append(tuple(p))
        idx = {v: i for i, v in enumerate(tmp.verts)}
        faces = [[idx[v] for v in f.verts] for f in tmp.faces]
        tmp.free()
        self.add_bm(verts, faces, colour_fn)

    def fringe(self, centre, rx, rz, y_top, y_bot, jag, colour_fn, n=20, flare=1.12, start=0.0, sweep=2 * math.pi, tilt=0.0):
        """Shaggy hanging skirt: a ring tube with a zig-zag lower edge."""
        verts, faces = [], []
        closed = abs(sweep - 2 * math.pi) < 1e-6
        count = n if closed else n + 1
        for i in range(count):
            a = start + sweep * i / n
            ca, sa = math.cos(a), math.sin(a)
            yt = y_top + tilt * ca
            yb = y_bot + tilt * ca - (jag if i % 2 == 0 else 0) - rng.uniform(0, jag * 0.4)
            f = flare * (1 + rng.uniform(-0.04, 0.04))
            verts.append((centre[0] + rx * ca, yt, centre[2] + rz * sa))
            verts.append((centre[0] + rx * f * ca, yb, centre[2] + rz * f * sa))
        segs = n if closed else n
        for i in range(segs):
            j = (i + 1) % count
            a0, b0, a1, b1 = 2 * i, 2 * i + 1, 2 * j, 2 * j + 1
            # outward winding (Blender space flips handedness via T, so wind accordingly)
            faces.append([a0, a1, b1])
            faces.append([a0, b1, b0])
        self.add_bm(verts, faces, colour_fn)

    def lock(self, root, direction, length, width, colour_fn, subdiv=0, noise=0.06):
        """A tapered lock of fur: an elongated faceted drop hanging from root along direction."""
        d = Vector(direction).normalized()
        u = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized()
        v = d.cross(u).normalized()
        tmp = bmesh.new()
        bmesh.ops.create_icosphere(tmp, subdivisions=subdiv + 1, radius=1.0)
        verts = []
        for vert in tmp.verts:
            n = vert.co.normalized()
            sv = (1 - n.z) / 2            # 0 at the root, 1 at the tip
            w = width * (1.0 - 0.38 * sv) * (1 + rng.uniform(-noise, noise))  # blunt tip: a clump, not a spike
            p = Vector(root) + d * (sv * length) + u * (n.x * w) + v * (n.y * w * 0.75)
            verts.append(tuple(p))
        idx = {vv: i for i, vv in enumerate(tmp.verts)}
        faces = [[idx[vv] for vv in f.verts] for f in tmp.faces]
        tmp.free()
        self.add_bm(verts, faces, colour_fn)


def jitter(hexc, amt=0.045):
    r, g, b = hex_rgb(hexc)
    k = 1 + rng.uniform(-amt, amt)
    return (min(1, r * k), min(1, g * k), min(1, b * k))


def solid(hexc, amt=0.045):
    return lambda c: jitter(hexc, amt)


def make(part):
    """Build object, carrying per-face colours through triangulation via a face layer."""
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
            attr.data[li].color = (*lin, 1.0)  # BYTE_COLOR stores sRGB; property takes linear
        poly.use_smooth = False
    me.attributes.remove(me.attributes['cid'])
    me.color_attributes.active_color = attr
    ob = bpy.data.objects.new(part.name, me)
    bpy.context.scene.collection.objects.link(ob)
    mat = bpy.data.materials.get('calvin') or bpy.data.materials.new('calvin')
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    if not any(n.type == 'VERTEX_COLOR' for n in nt.nodes):
        vc = nt.nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'Col'
        nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.95
    me.materials.append(mat)
    return ob


# ---- coat pattern (torso frame) ---------------------------------------------
def saddle_edge(y):
    """x of the white/grey boundary at height y: runs from just behind the
    white neck ruff at the withers, down and back to the belly behind the
    elbow (as in the side-on walking photo)."""
    return 0.06 + 0.45 * (y + 0.02)


def coat(c):
    x, y, z = c
    if x < saddle_edge(y):
        if y > 0.12:
            return jitter(PAL['grey_lt'])
        return jitter(PAL['grey_dk'] if y < -0.06 else PAL['grey'])
    return jitter(PAL['white_sh'] if y < -0.1 else PAL['white'])


def at_root(fn, root):
    """Colour a whole lock by its root so the saddle edge stays clean."""
    col = fn(root)
    return lambda c: jitter('#%02x%02x%02x' % tuple(int(v * 255) for v in col), 0.03)


def ring_locks(part, cx, cz, rx, rz, y, n, length, width, colour_fn, drop=0.85, spread=0.5):
    for i in range(n):
        a = 2 * math.pi * (i + 0.5) / n
        ca, sa = math.cos(a), math.sin(a)
        root = (cx + rx * ca, y + rng.uniform(-0.03, 0.03), cz + rz * sa)
        dvec = (ca * spread, -drop, sa * spread)
        part.lock(root, dvec, length * rng.uniform(0.75, 1.3), width, at_root(colour_fn, root))


parts = []
W = solid(PAL['white'])
WS = solid(PAL['white_sh'])

# ---- body (dogTorso frame): big level barrel, rounded bobtailed rump --------
body = Part('calvin_body')
body.blob((0.05, 0.03, 0.0), (0.22, 0.175, 0.185), coat, noise=0.06)    # fore barrel
body.blob((-0.15, 0.045, 0.0), (0.21, 0.18, 0.19), coat, noise=0.06)    # round rump, level-to-high topline
body.blob((-0.05, 0.13, 0.0), (0.27, 0.085, 0.16), coat, noise=0.07)    # level back
body.blob((0.21, 0.0, 0.0), (0.15, 0.17, 0.165), coat, noise=0.07)      # white chest + shoulders
body.blob((0.3, 0.09, 0.0), (0.13, 0.16, 0.155), W, noise=0.07)         # thick white neck ruff
ring_locks(body, -0.03, 0.0, 0.26, 0.16, -0.05, 13, 0.14, 0.08, coat, drop=1.0, spread=0.12)
parts.append(make(body))

# ---- head (dogHeadPivot frame): big round white mop ---------------------------
head = Part('calvin_head')
B = solid(PAL['beard'])
head.blob((0.02, -0.02, 0.0), (0.12, 0.14, 0.15), W, noise=0.07)        # head ruff, overlaps the neck ruff
head.blob((0.13, 0.045, 0.0), (0.14, 0.13, 0.145), W, noise=0.06)       # big round skull
for cz in (-0.09, 0.09):
    head.blob((0.15, -0.03, cz), (0.075, 0.075, 0.065), W, subdiv=0, noise=0.08)  # cheek fluff
head.blob((0.218, -0.035, 0.0), (0.068, 0.058, 0.072), B, noise=0.07, flat_front=0.27)  # short furry muzzle
head.blob((0.275, -0.01, 0.0), (0.022, 0.019, 0.028), solid(PAL['nose'], 0.02), noise=0.03)  # black nose
for ez in (-0.052, 0.052):  # eyes mostly hidden by the fringe
    head.blob((0.24, 0.022, ez), (0.011, 0.012, 0.012), solid(PAL['eye'], 0.01), subdiv=0, noise=0.0)
head.blob((0.1, 0.13, 0.0), (0.15, 0.075, 0.145), W, noise=0.06)        # top of the mop
for fz in (-0.1, -0.06, -0.02, 0.02, 0.06, 0.1):                    # long fringe over the eyes
    ln = 0.14 if abs(fz) < 0.05 else 0.12
    head.lock((0.19, 0.15, fz), (0.42, -0.9, fz * 1.4), ln, 0.052, W)
head.blob((0.235, -0.085, 0.0), (0.07, 0.05, 0.07), B, noise=0.12)      # white beard
parts.append(make(head))

# ---- ears (earPivot frame): long floppy flaps that blend into the head fluff --
for name, side in (('calvin_ear_l', -1), ('calvin_ear_r', 1)):
    ear = Part(name)
    ear.lock((0.0, 0.0, side * 0.11), (0.08, -1.0, side * 0.12), 0.15, 0.06, solid('#e4ddd0'))
    ear.lock((-0.03, -0.01, side * 0.1), (0.0, -1.0, side * 0.2), 0.12, 0.045, solid(PAL['white_sh']))
    parts.append(make(ear))

# ---- tail: bobtailed, so only a little grey rump fluff on the tail pivot -----
tail = Part('calvin_tail')
tail.blob((-0.045, 0.0, 0.0), (0.06, 0.06, 0.07), solid(PAL['grey']), subdiv=0, noise=0.12)
parts.append(make(tail))

# ---- legs: one continuous shaggy column per leg -----------------------------
# The upper column (hip pivot) runs past the knee to the ankle; the lower part
# (knee pivot: shin + big mop foot) slides inside it when it bends.
# Front legs are white to the paws; hind legs carry the grey saddle down the
# thigh to about the hock, with white lower legs and feet.
def leg_upper(name, colour_fn):
    up = Part(name)
    up.blob((0.0, -0.125, 0.0), (0.072, 0.15, 0.068), colour_fn, noise=0.07)
    up.blob((0.008, -0.205, 0.0), (0.082, 0.08, 0.077), W, noise=0.08)    # white trouser flare over the ankle
    parts.append(make(up))


leg_upper('calvin_leg_upper', W)
leg_upper('calvin_leg_upper_hind', lambda c: jitter(PAL['grey_dk'] if c[1] > -0.15 + 0.25 * c[0] else PAL['white']))

lo = Part('calvin_leg_lower')
lo.blob((0.006, -0.07, 0.0), (0.05, 0.08, 0.048), W, subdiv=0, noise=0.05)   # shin, hidden in the column at rest
lo.blob((0.03, -0.148, 0.0), (0.085, 0.046, 0.076), W, noise=0.08, flat_bottom=-0.174)  # big round mop foot
parts.append(make(lo))

tg = Part('calvin_tongue')     # hangs down from its origin, slightly forward
tg.blob((0.008, -0.022, 0.0), (0.014, 0.026, 0.011), solid(PAL['tongue'], 0.02), subdiv=0, noise=0.04)
parts.append(make(tg))

total = 0
for ob in parts:
    t = len(ob.data.polygons)
    mult = 4 if ob.name == 'calvin_leg_lower' else (2 if ob.name.startswith('calvin_leg_upper') else 1)
    total += t * mult
    print('PART', ob.name, t, 'tris', f'(x{mult} legs)' if mult > 1 else '')
print('CALVIN_TOTAL_TRIS', total)

for ob in bpy.context.scene.objects:
    ob.select_set(ob in parts)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'calvin.glb'), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_image_format='NONE',
                          export_vertex_color='ACTIVE', export_normals=True, export_materials='EXPORT')
print('WROTE', os.path.join(OUT, 'calvin.glb'))
