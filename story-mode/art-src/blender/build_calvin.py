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
    'nose': '#1e1b1d',
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
def coat(c):
    # OES: blue-grey blanket over the back half and the rump, white forequarters.
    x, y, z = c
    if y < -0.13:
        return jitter(PAL['white_sh'])
    if x < -0.03 and y > -0.08:
        return jitter(PAL['grey_dk'] if (y < -0.02 or x < -0.3) else PAL['grey'])
    return jitter(PAL['white'])


def ring_locks(part, cx, cz, rx, rz, y, n, length, width, colour_fn, drop=0.85, spread=0.5, skip=None):
    for i in range(n):
        a = 2 * math.pi * (i + 0.5) / n
        if skip and skip(a):
            continue
        ca, sa = math.cos(a), math.sin(a)
        root = (cx + rx * ca, y + rng.uniform(-0.03, 0.03), cz + rz * sa)
        dvec = (ca * spread, -drop, sa * spread)
        part.lock(root, dvec, length * rng.uniform(0.75, 1.3), width, colour_fn)


parts = []
W = solid(PAL['white'])
WS = solid(PAL['white_sh'])

# ---- body (dogTorso frame): one big round fluffy mop -------------------------
body = Part('calvin_body')
body.blob((0.06, 0.03, 0.0), (0.2, 0.18, 0.175), coat, noise=0.07)     # fore barrel
body.blob((-0.14, 0.05, 0.0), (0.21, 0.19, 0.18), coat, noise=0.07)    # higher rump (pear topline)
body.blob((-0.04, 0.13, 0.0), (0.25, 0.09, 0.15), coat, noise=0.08)    # rounded back coat
body.blob((0.2, 0.0, 0.0), (0.15, 0.17, 0.16), coat, noise=0.07)       # white chest
body.blob((0.3, 0.08, 0.0), (0.12, 0.15, 0.15), W, noise=0.07)         # neck ruff (head ruff overlaps it)
# shaggy coat skirt: locks hanging over the tops of the legs, rear ones grey
ring_locks(body, -0.03, 0.0, 0.25, 0.15, -0.04, 16, 0.15, 0.075, coat, drop=1.0, spread=0.12)
parts.append(make(body))

# ---- head (dogHeadPivot frame) ---------------------------------------------
head = Part('calvin_head')
head.blob((0.02, -0.02, 0.0), (0.11, 0.13, 0.14), W, noise=0.07)        # head ruff blends into the neck ruff
head.blob((0.13, 0.04, 0.0), (0.13, 0.12, 0.13), W, noise=0.06)         # broad round skull
for cz in (-0.085, 0.085):
    head.blob((0.15, -0.025, cz), (0.07, 0.07, 0.06), W, subdiv=0, noise=0.08)   # fluffy cheeks (behind the eyes)
head.blob((0.235, -0.03, 0.0), (0.085, 0.062, 0.078), W, noise=0.05, flat_front=0.29)  # square muzzle
head.blob((0.3, -0.004, 0.0), (0.026, 0.022, 0.033), solid(PAL['nose'], 0.02), noise=0.03)  # clear black nose
for ez in (-0.05, 0.05):  # dark eyes, peeking under the fringe
    head.blob((0.247, 0.03, ez), (0.014, 0.016, 0.015), solid(PAL['eye'], 0.01), subdiv=0, noise=0.0)
head.blob((0.1, 0.12, 0.0), (0.14, 0.07, 0.135), W, noise=0.06)         # top mop
for i, fz in enumerate((-0.1, -0.06, -0.02, 0.02, 0.06, 0.1)):    # fringe falling over the eyes
    ln = 0.1 if abs(fz) < 0.05 else 0.085
    head.lock((0.16, 0.15, fz), (0.55, -0.85, fz * 1.6), ln, 0.045, W)
head.blob((0.235, -0.078, 0.0), (0.065, 0.042, 0.065), WS, noise=0.12)   # beard under the muzzle
parts.append(make(head))

# ---- ears (earPivot frame): floppy grey flaps tucked into the mop ----------
for name, side in (('calvin_ear_l', -1), ('calvin_ear_r', 1)):
    ear = Part(name)
    ear.blob((0.0, -0.055, side * 0.095), (0.05, 0.075, 0.028), solid(PAL['grey']), subdiv=0, noise=0.1)
    ear.lock((-0.005, -0.06, side * 0.1), (0.05, -1.0, side * 0.25), 0.075, 0.035, solid(PAL['grey_dk']))
    parts.append(make(ear))

# ---- tail: OES bob, a grey pom (dogTailPivot frame) ------------------------
tail = Part('calvin_tail')
tail.blob((-0.05, 0.02, 0.0), (0.065, 0.06, 0.065), solid(PAL['grey']), subdiv=0, noise=0.12)
parts.append(make(tail))

# ---- legs: one continuous shaggy column per leg -----------------------------
# The upper column (hip pivot) runs past the knee and ends in a fur skirt, so
# the lower part (knee pivot: shin + big paw) slides inside it when it bends.
up = Part('calvin_leg_upper')
up.blob((0.0, -0.125, 0.0), (0.068, 0.148, 0.064), W, noise=0.07)              # column hip -> ankle, past the knee
up.blob((0.008, -0.205, 0.0), (0.078, 0.08, 0.073), W, noise=0.08)             # shaggy trouser flare over the ankle, blended into the column
parts.append(make(up))

lo = Part('calvin_leg_lower')
lo.blob((0.006, -0.07, 0.0), (0.05, 0.08, 0.048), W, subdiv=0, noise=0.05)   # shin, hidden in the column at rest
lo.blob((0.03, -0.148, 0.0), (0.08, 0.044, 0.072), W, noise=0.08, flat_bottom=-0.174)  # big fluffy paw
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
