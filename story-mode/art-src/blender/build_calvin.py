"""Calvin, the Old English Sheepdog in Story Mode, as a soft low-poly rig.

  blender -b --factory-startup -P art-src/blender/build_calvin.py -- <out_dir>

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

Soft, not faceted: each part is modelled as overlapping fur clumps (blobs and
hanging locks), fused into one surface with a voxel remesh, smoothed, then
decimated to its triangle budget and shaded smooth (exported vertex normals).
Coat colour is transferred per vertex from the clump that sits nearest each
vertex, softened once across edges, then shaded with baked ambient occlusion
(darker in the crevices between clumps) and a light top-lit lift, so the fur
reads without textures. Nose, eyes and tongue are small smooth accents kept
crisp on top of the fused fur. Style-kit colour rules: no pure black/white,
cool-leaning greys, warm whites. Geometry-only GLB, no textures, all procedural
and original; every step is seeded or deterministic so a rebuild is
byte-identical.
Ship (meshopt, keeps named nodes; rebuilds byte-identical):

  gltf-transform optimize <out_dir>/calvin.glb assets/art/yard/calvin.glb --compress meshopt \
    --flatten false --join false --instance false --palette false --simplify false --prune-attributes false
"""
import bpy, bmesh, math, os, random, sys
from mathutils import Vector, noise
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(argv[0] if argv and not argv[0].startswith('--') else 'art-src/build')
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---- palette (sRGB hex) ----------------------------------------------------
PAL = {
    # Read off the owner's reference photos (reference only; nothing from them ships).
    'white': '#eee8dc',      # cream-white head, neck, chest, front legs, hind feet
    'white_sh': '#ddd5c6',   # coat underside / inner fringe
    'beard': '#e6dac4',      # slightly warmer muzzle and beard
    'grey': '#77797d',       # dark slate-grey saddle
    'grey_dk': '#686a6e',    # saddle underside / hind thighs
    'grey_lt': '#85878b',    # saddle top catching light
    'nose': '#1c1a1c',
    'eye': '#262224',
    'tongue': '#d9798a',
}


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


rng = random.Random(20261030)


def T(x, y, z):
    """three.js coords (x fwd, y up, z right) -> Blender (x, -z, y)."""
    return Vector((x, -z, y))


def ico(subdiv):
    tmp = bmesh.new()
    bmesh.ops.create_icosphere(tmp, subdivisions=subdiv, radius=1.0)
    dirs = [v.co.normalized() for v in tmp.verts]
    idx = {v: i for i, v in enumerate(tmp.verts)}
    faces = [[idx[v] for v in f.verts] for f in tmp.faces]
    tmp.free()
    return dirs, faces


class Part:
    """Fur clumps in three.js space with a colour per face (the source volume),
    plus smooth accents (nose, eyes) that stay separate from the fused fur."""

    def __init__(self, name, voxel, tris, smooth=6):
        self.name = name
        self.voxel = voxel        # remesh voxel size (m)
        self.tris = tris          # triangle budget for the fused fur
        self.smooth = smooth      # smoothing iterations after the remesh
        self.bm = bmesh.new()
        self.col = []             # per source face colour, sRGB tuple
        self.accents = []         # (verts, faces, rgb)

    def add_bm(self, src_verts, src_faces, colour_fn):
        vs = [self.bm.verts.new(T(*v)) for v in src_verts]
        for f in src_faces:
            try:
                self.bm.faces.new([vs[i] for i in f])
            except ValueError:
                continue
            c = sum((Vector(src_verts[i]) for i in f), Vector()) / len(f)
            self.col.append(colour_fn(c))

    def blob(self, centre, radii, colour_fn, noise_amt=0.07, flat_bottom=None, flat_front=None, freq=2.6):
        """Soft lumpy ellipsoid: low-frequency seeded noise, so it reads as a fur clump, not a crystal."""
        dirs, faces = ico(3)
        off = Vector((rng.uniform(-50, 50), rng.uniform(-50, 50), rng.uniform(-50, 50)))
        verts = []
        for n in dirs:
            k = 1.0 + noise_amt * noise.noise(n * freq + off, noise_basis='PERLIN_ORIGINAL') * 1.6
            d = (n.x, n.z, n.y)  # Blender ico is z-up; treat (x, y, z) as three (x, z, y)
            p = [centre[i] + d[i] * radii[i] * k for i in range(3)]
            if flat_bottom is not None:
                p[1] = max(p[1], flat_bottom)
            if flat_front is not None:
                p[0] = min(p[0], flat_front)
            verts.append(tuple(p))
        self.add_bm(verts, faces, colour_fn)

    def lock(self, root, direction, length, width, colour_fn, taper=0.3, flat=0.75):
        """A hanging lock of fur: a rounded, blunt-tipped drop from root along direction."""
        d = Vector(direction).normalized()
        u = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized()
        v = d.cross(u).normalized()
        dirs, faces = ico(2)
        w0 = width * rng.uniform(0.94, 1.06)
        verts = []
        for n in dirs:
            sv = (1 - n.z) / 2            # 0 at the root, 1 at the tip
            w = w0 * (1.0 - taper * sv)   # blunt tip: a clump, not a spike
            p = Vector(root) + d * (sv * length) + u * (n.x * w) + v * (n.y * w * flat)
            verts.append(tuple(p))
        self.add_bm(verts, faces, colour_fn)

    def accent(self, centre, radii, hexc, subdiv=2):
        """Small smooth ellipsoid kept out of the remesh (nose, eyes, tongue)."""
        dirs, faces = ico(subdiv)
        verts = [T(*(centre[i] + (n.x, n.z, n.y)[i] * radii[i] for i in range(3))) for n in dirs]
        self.accents.append((verts, faces, hex_rgb(hexc)))

    def tufts(self, centre, radii, n, length, width, colour_fn, y_min=-1.0, x_min=-9.0, x_max=9.0, droop=0.9):
        """Shaggy surface: n short hanging locks rooted over an ellipsoid (Fibonacci spread), so the
        fused coat has soft rounded clumps instead of one smooth balloon."""
        for i in range(n):
            yy = 1 - 2 * (i + 0.5) / n
            rr = math.sqrt(max(0.0, 1 - yy * yy))
            a = i * math.pi * (3 - math.sqrt(5)) + rng.uniform(-0.2, 0.2)
            dx, dz = rr * math.cos(a), rr * math.sin(a)
            root = (centre[0] + dx * radii[0] * 0.92, centre[1] + yy * radii[1] * 0.92, centre[2] + dz * radii[2] * 0.92)
            if root[1] < y_min or not (x_min <= root[0] <= x_max):
                continue
            dvec = (dx, yy - droop * 1.6, dz)
            self.lock(root, dvec, length * rng.uniform(0.8, 1.2), width * rng.uniform(0.85, 1.15), at_root(colour_fn, root), taper=0.25)


def jitter(hexc, amt=0.03):
    r, g, b = hex_rgb(hexc)
    k = 1 + rng.uniform(-amt, amt)
    return (min(1, r * k), min(1, g * k), min(1, b * k))


def solid(hexc, amt=0.03):
    return lambda c: jitter(hexc, amt)


def srgb_to_lin(c):
    return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92


MAT = None


def material():
    global MAT
    if MAT is None:
        MAT = bpy.data.materials.new('calvin')
        MAT.use_nodes = True
        nt = MAT.node_tree
        bsdf = nt.nodes.get('Principled BSDF')
        vc = nt.nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'Col'
        nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.95
    return MAT


# fixed hemisphere sample directions for the AO bake (Fibonacci sphere, deterministic)
AO_DIRS = []
for i in range(48):
    zz = 1 - 2 * (i + 0.5) / 48
    rr = math.sqrt(max(0.0, 1 - zz * zz))
    a = i * math.pi * (3 - math.sqrt(5))
    AO_DIRS.append(Vector((rr * math.cos(a), rr * math.sin(a), zz)))


def fuse(part):
    """Source clumps -> one smooth surface at the part's triangle budget."""
    bm = part.bm
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.faces.ensure_lookup_table()
    src_bvh = BVHTree.FromBMesh(bm)
    me = bpy.data.meshes.new(part.name + '_src')
    bm.to_mesh(me)
    ob = bpy.data.objects.new(part.name + '_src', me)
    bpy.context.scene.collection.objects.link(ob)
    rm = ob.modifiers.new('remesh', 'REMESH')
    rm.mode = 'VOXEL'
    rm.voxel_size = part.voxel
    rm.adaptivity = 0.0
    sm = ob.modifiers.new('smooth', 'SMOOTH')
    sm.factor = 0.6
    sm.iterations = part.smooth
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    tri_count = sum(len(p.vertices) - 2 for p in ev.data.polygons)
    dc = ob.modifiers.new('decimate', 'DECIMATE')
    dc.decimate_type = 'COLLAPSE'
    dc.ratio = min(1.0, part.tris / max(1, tri_count))
    dc.use_collapse_triangulate = True
    rx = ob.modifiers.new('relax', 'SMOOTH')  # relax decimation slivers without losing the clumps
    rx.factor = 0.35
    rx.iterations = 2
    dg = bpy.context.evaluated_depsgraph_get()
    fused = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(me)
    return fused, src_bvh


def make(part):
    bm = bmesh.new()
    if part.bm.faces:
        fused, src_bvh = fuse(part)
        bm.from_mesh(fused)
        bpy.data.meshes.remove(fused)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.verts.ensure_lookup_table()
    bm.normal_update()
    # coat colour from the nearest source clump
    cols = []
    for v in bm.verts:
        hit = src_bvh.find_nearest(v.co)
        cols.append(Vector(part.col[hit[2]] if hit[2] is not None else hex_rgb(PAL['white'])))
    # soften once across edges so clump-to-clump colour steps blur like fur
    soft = []
    for v, c in zip(bm.verts, cols):
        nb = [cols[e.other_vert(v).index] for e in v.link_edges]
        soft.append(c * 0.5 + (sum(nb, Vector()) / len(nb)) * 0.5 if nb else c)
    # baked ambient occlusion (crevices between clumps) + top-lit lift
    fur_bvh = BVHTree.FromBMesh(bm)
    reach = 0.06
    shaded = []
    for v, c in zip(bm.verts, soft):
        n = v.normal
        origin = v.co + n * 0.002
        hits = tot = 0
        for d in AO_DIRS:
            if d.dot(n) <= 0.05:
                continue
            tot += 1
            if fur_bvh.ray_cast(origin, d, reach)[0] is not None:
                hits += 1
        occ = hits / tot if tot else 0.0
        k = (1.0 - 0.55 * occ) * (0.93 + 0.12 * max(0.0, n.z))
        shaded.append(Vector((min(1, c.x * k), min(1, c.y * k), min(1, c.z * k))))
    # smooth accents (not fused): nose, eyes, tongue
    for verts, faces, rgb in part.accents:
        vs = [bm.verts.new(p) for p in verts]
        for f in faces:
            bm.faces.new([vs[i] for i in f])
        shaded.extend(Vector(rgb) for _ in vs)
    bm.verts.index_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(part.name)
    bm.to_mesh(me)
    bm.free()
    attr = me.color_attributes.new('Col', 'BYTE_COLOR', 'POINT')
    for i, c in enumerate(shaded):
        attr.data[i].color = (srgb_to_lin(c.x), srgb_to_lin(c.y), srgb_to_lin(c.z), 1.0)  # BYTE_COLOR stores sRGB; property takes linear
    me.color_attributes.active_color = attr
    me.shade_smooth()
    ob = bpy.data.objects.new(part.name, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(material())
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
    return lambda c: col


def ring_locks(part, cx, cz, rx, rz, y, n, length, width, colour_fn, drop=0.85, spread=0.5):
    for i in range(n):
        a = 2 * math.pi * (i + 0.5) / n
        ca, sa = math.cos(a), math.sin(a)
        root = (cx + rx * ca, y + rng.uniform(-0.02, 0.02), cz + rz * sa)
        dvec = (ca * spread, -drop, sa * spread)
        part.lock(root, dvec, length * rng.uniform(0.8, 1.2), width, at_root(colour_fn, root))


parts = []
W = solid(PAL['white'])
WS = solid(PAL['white_sh'])
B = solid(PAL['beard'])

# ---- body (dogTorso frame): big level barrel, rounded bobtailed rump --------
body = Part('calvin_body', voxel=0.009, tris=700, smooth=4)
body.blob((0.05, 0.03, 0.0), (0.22, 0.175, 0.185), coat)       # fore barrel
body.blob((-0.15, 0.045, 0.0), (0.21, 0.18, 0.19), coat)       # round rump, level-to-high topline
body.blob((-0.05, 0.13, 0.0), (0.27, 0.085, 0.16), coat)       # level back
body.blob((0.21, 0.0, 0.0), (0.15, 0.17, 0.165), coat)         # white chest + shoulders
body.blob((0.3, 0.09, 0.0), (0.13, 0.16, 0.155), W)            # thick white neck ruff
body.tufts((0.0, 0.07, 0.0), (0.36, 0.15, 0.19), 46, 0.09, 0.055, coat, y_min=-0.02)  # shaggy coat clumps
body.tufts((0.27, 0.06, 0.0), (0.11, 0.15, 0.15), 14, 0.08, 0.05, W, y_min=-0.05, x_min=0.28)  # neck ruff clumps
ring_locks(body, -0.03, 0.0, 0.25, 0.155, -0.05, 16, 0.15, 0.06, coat, drop=1.0, spread=0.12)
parts.append(make(body))

# ---- head (dogHeadPivot frame): big round white mop ---------------------------
head = Part('calvin_head', voxel=0.007, tris=630, smooth=3)
head.blob((0.02, -0.02, 0.0), (0.12, 0.14, 0.15), W)           # head ruff, overlaps the neck ruff
head.blob((0.13, 0.045, 0.0), (0.14, 0.13, 0.145), W)          # big round skull
for cz in (-0.09, 0.09):
    head.blob((0.15, -0.03, cz), (0.08, 0.08, 0.07), W)         # cheek fluff
head.blob((0.19, -0.02, 0.0), (0.09, 0.075, 0.095), B)         # stop: blends the muzzle into the skull
head.blob((0.228, -0.035, 0.0), (0.06, 0.056, 0.072), B)       # short furry muzzle
head.blob((0.1, 0.13, 0.0), (0.15, 0.075, 0.145), W)           # top of the mop
for fz in (-0.1, -0.06, -0.02, 0.02, 0.06, 0.1):               # long fringe hanging over the eyes
    ln = (0.15 if abs(fz) < 0.05 else 0.13) * rng.uniform(0.92, 1.08)
    head.lock((0.22, 0.15, fz), (0.42, -0.9, fz * 1.2), ln, 0.045, W, taper=0.2, flat=0.6)
head.tufts((0.1, 0.07, 0.0), (0.15, 0.13, 0.15), 22, 0.07, 0.045, W, y_min=0.0, x_max=0.2)  # mop clumps
head.lock((0.22, -0.07, -0.035), (0.15, -1.0, -0.2), 0.07, 0.04, B, taper=0.15)  # beard hangs down
head.lock((0.22, -0.07, 0.035), (0.15, -1.0, 0.2), 0.07, 0.04, B, taper=0.15)
head.blob((0.225, -0.08, 0.0), (0.06, 0.045, 0.065), B)        # chin
head.accent((0.276, -0.012, 0.0), (0.021, 0.018, 0.027), PAL['nose'])  # black nose
for ez in (-0.05, 0.05):  # eyes just peeking out from under the fringe
    head.accent((0.262, 0.004, ez), (0.011, 0.012, 0.013), PAL['eye'])
parts.append(make(head))

# ---- ears (earPivot frame): long floppy flaps that blend into the head fluff --
for name, side in (('calvin_ear_l', -1), ('calvin_ear_r', 1)):
    ear = Part(name, voxel=0.006, tris=70, smooth=3)
    ear.lock((0.01, 0.0, side * 0.065), (0.12, -1.0, side * 0.16), 0.18, 0.05, W, taper=0.15, flat=0.6)
    ear.lock((-0.025, -0.01, side * 0.07), (0.02, -1.0, side * 0.2), 0.15, 0.042, WS, taper=0.15, flat=0.65)
    parts.append(make(ear))

# ---- tail: bobtailed, so only a little grey rump fluff on the tail pivot -----
tail = Part('calvin_tail', voxel=0.008, tris=36, smooth=4)
tail.blob((-0.045, 0.0, 0.0), (0.06, 0.06, 0.07), solid(PAL['grey']))
parts.append(make(tail))

# ---- legs: one continuous shaggy column per leg -----------------------------
# The upper column (hip pivot) runs past the knee to the ankle; the lower part
# (knee pivot: shin + big mop foot) slides inside it when it bends.
# Front legs are white to the paws; hind legs carry the grey saddle down the
# thigh to about the hock, with white lower legs and feet.
def leg_upper(name, colour_fn):
    up = Part(name, voxel=0.007, tris=120, smooth=4)
    up.blob((0.0, -0.125, 0.0), (0.072, 0.15, 0.068), colour_fn)
    up.blob((0.008, -0.205, 0.0), (0.082, 0.08, 0.077), W)    # white trouser flare over the ankle
    up.tufts((0.0, -0.12, 0.0), (0.07, 0.13, 0.066), 10, 0.07, 0.04, colour_fn, droop=1.4)  # shaggy trousers
    parts.append(make(up))


leg_upper('calvin_leg_upper', W)
leg_upper('calvin_leg_upper_hind', lambda c: jitter(PAL['grey_dk'] if c[1] > -0.15 + 0.25 * c[0] else PAL['white']))

lo = Part('calvin_leg_lower', voxel=0.007, tris=72, smooth=4)
lo.blob((0.006, -0.07, 0.0), (0.05, 0.08, 0.048), W)          # shin, hidden in the column at rest
lo.blob((0.03, -0.148, 0.0), (0.085, 0.046, 0.076), W, flat_bottom=-0.174)  # big round mop foot
parts.append(make(lo))

tg = Part('calvin_tongue', voxel=0.004, tris=0)  # accent only; hangs down from its origin, slightly forward
tg.accent((0.008, -0.022, 0.0), (0.014, 0.026, 0.011), PAL['tongue'], subdiv=1)
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
