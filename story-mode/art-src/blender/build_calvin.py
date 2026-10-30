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
  calvin_leg_upper  -> each hipPivot  (front +/-0.18, back -0.12; y -0.08)
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
    'white': '#ece5d8',      # warm off-white coat (front, head, legs)
    'white_sh': '#d3ccc0',   # coat underside / inner fringe
    'grey': '#9aa2ad',       # blue-grey OES back/rump coat
    'grey_dk': '#858d9a',
    'nose': '#2b2729',
    'eye': '#262224',
    'tongue': '#d9798a',
    'pad': '#5b5254',
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

    def blob(self, centre, radii, colour_fn, subdiv=1, noise=0.08, flat_bottom=None):
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
def coat(c):
    # OES: blue-grey blanket over the back half and the rump, white forequarters.
    x, y, z = c
    if y < -0.085:
        return jitter(PAL['white_sh'])
    if x < -0.02 and y > -0.07:
        return jitter(PAL['grey_dk'] if (y < -0.02 or x < -0.26) else PAL['grey'])
    return jitter(PAL['white'])


parts = []

# ---- body (dogTorso frame) -------------------------------------------------
body = Part('calvin_body')
body.blob((-0.02, 0.02, 0.0), (0.27, 0.15, 0.145), coat, subdiv=2, noise=0.06)      # barrel
body.blob((-0.19, 0.045, 0.0), (0.15, 0.155, 0.15), coat, subdiv=1, noise=0.07)      # high rump
body.blob((0.17, 0.0, 0.0), (0.14, 0.14, 0.13), coat, subdiv=1, noise=0.07)          # white chest
body.blob((0.27, 0.06, 0.0), (0.09, 0.1, 0.085), solid(PAL['white']), subdiv=1, noise=0.06)  # neck ruff
body.fringe((-0.03, 0, 0), 0.25, 0.135, -0.03, -0.11, 0.018, coat, n=30, flare=1.07)  # coat skirt
parts.append(make(body))

# ---- head (dogHeadPivot frame) --------------------------------------------
head = Part('calvin_head')
W = solid(PAL['white'])
head.blob((0.12, 0.03, 0.0), (0.115, 0.1, 0.1), W, subdiv=2, noise=0.06)             # skull, big and round
head.blob((0.215, -0.025, 0.0), (0.07, 0.055, 0.065), W, subdiv=1, noise=0.05)       # muzzle
head.blob((0.2, -0.07, 0.0), (0.055, 0.04, 0.05), solid(PAL['white_sh']), subdiv=1, noise=0.12)  # beard
head.blob((0.285, -0.008, 0.0), (0.022, 0.018, 0.026), solid(PAL['nose'], 0.02), subdiv=0, noise=0.05)  # nose
for ez in (-0.045, 0.045):  # dark eyes peeking out under the fringe
    head.blob((0.214, 0.022, ez), (0.014, 0.017, 0.015), solid(PAL['eye'], 0.01), subdiv=0, noise=0.0)
head.blob((0.13, 0.095, 0.0), (0.12, 0.06, 0.11), W, subdiv=1, noise=0.1)            # top mop
head.fringe((0.15, 0, 0.0), 0.1, 0.1, 0.078, 0.05, 0.032, W, n=14, flare=1.07, start=-math.pi / 2, sweep=math.pi)  # fringe over the eyes (front half)
parts.append(make(head))

# ---- ears (earPivot frame), floppy fur flaps -------------------------------
for name, side in (('calvin_ear_l', -1), ('calvin_ear_r', 1)):
    ear = Part(name)
    ear.blob((0.0, -0.068, side * 0.062), (0.04, 0.065, 0.022), solid(PAL['grey']), subdiv=1, noise=0.1)
    parts.append(make(ear))

# ---- tail: OES bob, a grey pom (dogTailPivot frame) ------------------------
tail = Part('calvin_tail')
tail.blob((-0.025, 0.01, 0.0), (0.055, 0.05, 0.055), solid(PAL['grey']), subdiv=1, noise=0.14)
parts.append(make(tail))

# ---- legs ------------------------------------------------------------------
up = Part('calvin_leg_upper')   # fluffy trouser thigh, overlaps the knee
up.blob((0.0, -0.075, 0.0), (0.05, 0.1, 0.046), W, subdiv=1, noise=0.08)
parts.append(make(up))

lo = Part('calvin_leg_lower')   # shin + furry boot + paw (kneePivot frame)
lo.blob((0.006, -0.06, 0.0), (0.042, 0.082, 0.04), W, subdiv=1, noise=0.07)   # shaggy shin, overlaps the knee
lo.blob((0.02, -0.148, 0.0), (0.05, 0.026, 0.043), W, subdiv=1, noise=0.05, flat_bottom=-0.172)
parts.append(make(lo))

tg = Part('calvin_tongue')     # hangs down from its origin, slightly forward
tg.blob((0.008, -0.022, 0.0), (0.014, 0.026, 0.011), solid(PAL['tongue'], 0.02), subdiv=0, noise=0.04)
parts.append(make(tg))

total = 0
for ob in parts:
    t = len(ob.data.polygons)
    mult = 4 if ob.name.startswith('calvin_leg') else 1
    total += t * mult
    print('PART', ob.name, t, 'tris', '(x4 legs)' if mult == 4 else '')
print('CALVIN_TOTAL_TRIS', total)

for ob in bpy.context.scene.objects:
    ob.select_set(ob in parts)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'calvin.glb'), export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_image_format='NONE',
                          export_vertex_color='ACTIVE', export_normals=True, export_materials='EXPORT')
print('WROTE', os.path.join(OUT, 'calvin.glb'))
