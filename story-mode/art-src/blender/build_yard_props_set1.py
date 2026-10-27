"""Garden OS opening yard, prop set 1: wheelbarrow, rain barrel, garden bench, birdhouse.

  blender -b --factory-startup -P art-src/blender/build_yard_props_set1.py -- <out_dir> [--quick] [--render=<png>]

Reuses the helpers, palette and materials of build_yard_assets.py (its code up to
the cottage section is exec'd here, so both scripts share one paint recipe).
Writes <out_dir>/props_set1.glb (one named node per prop, origin at base centre,
geometry only) + props_set1_atlas.png (shared 512 baked colour x AO atlas), a
Workbench preview, and with --render a Cycles lineup lit per the style kit.
All geometry and paint are procedural and original (no third-party assets).
"""
import os, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(HERE, 'build_yard_assets.py')).read()
exec(compile(_src.split('# =============================================================== cottage ==')[0],
             'build_yard_assets.py', 'exec'))
RENDER = next((a.split('=', 1)[1] for a in argv if a.startswith('--render=')), None)

M['wood_dark'] = mat_wood('wood_dark', PAL['timber'], PAL['timber_dark'], 'x', 9.0)
M['wood_v'] = mat_wood('wood_v', PAL['wood_light'], PAL['wood'], 'z', 10.0)
M['barrel'] = mat_wood('barrel', '#a8743f', '#7d5230', 'z', 12.0)
M['tray'] = mat_flat('tray', '#7d9a78', '#5f7d5c', 5.0)   # shutter green, painted steel
M['roof_g'] = mat_flat('roof_g', PAL['roof'], PAL['roof_dark'], 6.0)
M['water'] = mat_flat('water', '#4f6f78', '#6f8f90', 4.0, 0.4)
M['hole'] = mat_flat('hole', '#2e2420', None, ao=0.2)

props = []


def prop(objs, name):
    o = join(objs, name)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for p in o.data.polygons:
        p.use_smooth = False
    props.append(o)
    print('PROP', name, tris(o), 'tris')
    return o


# --- wheelbarrow (front = -Y, wheel at front) ------------------------------
# Bowl: a closed lathe-like shell of superellipse rings (outer wall, rolled lip,
# inner wall), flared and leaning toward the wheel, sitting on two cleats that
# join it to straight handle rails; the rails run from the axle to the grips.
NB = 12


def ring(a, b, c, z):
    pts = []
    for i in range(NB):
        t = 2 * math.pi * (i + 0.5) / NB
        ct, st = math.cos(t), math.sin(t)
        pts.append((a * math.copysign(abs(ct) ** 0.5, ct), c + b * math.copysign(abs(st) ** 0.5, st), z))
    return pts


RINGS = [  # outer bottom -> outer wall -> rolled lip -> inner wall -> inner bottom
    (0.19, 0.23, 0.02, 0.36), (0.27, 0.34, -0.03, 0.52), (0.335, 0.425, -0.075, 0.665),
    (0.36, 0.45, -0.08, 0.69), (0.35, 0.44, -0.08, 0.715), (0.325, 0.415, -0.075, 0.70),
    (0.31, 0.40, -0.07, 0.665), (0.175, 0.215, 0.02, 0.385),
]
bm = bmesh.new()
rv = [[bm.verts.new(p) for p in ring(*r)] for r in RINGS]
for r0, r1 in zip(rv, rv[1:]):
    for i in range(NB):
        j = (i + 1) % NB
        bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
bm.faces.new(rv[0][::-1])
bm.faces.new(rv[-1])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
ps = [mesh_obj('bowl', bm, M['tray'])]
SLOPE = 0.243  # rail rise per metre along +Y, from the axle (y -0.56, z 0.17)
RA = math.atan(SLOPE)
rz = lambda y: 0.17 + SLOPE * (y + 0.56)
for sx in (-1, 1):
    ps.append(box('rail', (0.04, 1.40, 0.045), (sx * 0.17, 0.12, rz(0.12)), M['wood'], rot=(RA, 0, 0), bevel=0.006))
    ps.append(box('grip', (0.05, 0.15, 0.05), (sx * 0.17, 0.81, rz(0.81)), M['wood_dark'], rot=(RA, 0, 0), bevel=0.008))
    ps.append(box('leg', (0.035, 0.035, rz(0.32) + 0.01), (sx * 0.18, 0.32, (rz(0.32) + 0.01) / 2), M['metal_dark'], rot=(0, sx * math.radians(-4), 0)))
ps.append(box('foot_bar', (0.4, 0.03, 0.03), (0, 0.32, 0.06), M['metal_dark']))
for y in (-0.17, 0.17):
    h = 0.375 - rz(y) + 0.02
    ps.append(box('cleat', (0.40, 0.06, h), (0, y, rz(y) + h / 2 - 0.01), M['wood_dark']))
ps.append(cyl('wheel', 0.17, 0.17, 0.07, (-0.035, -0.56, 0.17), M['iron'], segs=12, rot=(0, math.radians(90), 0)))
ps.append(cyl('axle', 0.022, 0.022, 0.38, (-0.19, -0.56, 0.17), M['metal'], segs=6, rot=(0, math.radians(90), 0)))
ps.append(blob('soil', 0.17, (0, -0.02, 0.6), M['soil'], sub=1, squash=(1.55, 1.95, 0.42), jitter=0.1))
prop(ps, 'wheelbarrow')

# --- rain barrel ------------------------------------------------------------
ps = [cyl('staves', 0.24, 0.27, 0.36, (0, 0, 0.06), M['barrel'], segs=12),
      cyl('staves_t', 0.27, 0.24, 0.36, (0, 0, 0.42), M['barrel'], segs=12),
      cyl('lid', 0.23, 0.23, 0.02, (0, 0, 0.775), M['water'], segs=12)]
for z in (0.12, 0.4, 0.7):
    ps.append(cyl('hoop', 0.275 if z == 0.4 else 0.258, 0.275 if z == 0.4 else 0.258, 0.035, (0, 0, z), M['metal_dark'], segs=12))
ps.append(box('stand', (0.5, 0.5, 0.06), (0, 0, 0.03), M['stone'], bevel=0.015))
ps.append(cyl('tap', 0.018, 0.018, 0.1, (0, -0.24, 0.2), M['metal'], segs=6, rot=(math.radians(90), 0, 0)))
ps.append(box('tap_handle', (0.06, 0.015, 0.015), (0, -0.33, 0.22), M['metal']))
prop(ps, 'rain_barrel')

# --- garden bench -----------------------------------------------------------
ps = []
BW = 1.3
for i in range(3):
    ps.append(box('seat', (BW, 0.11, 0.035), (0, -0.14 + i * 0.13, 0.44), M['wood'], bevel=0.006))
for i in range(2):
    ps.append(box('back', (BW, 0.035, 0.1), (0, 0.24, 0.62 + i * 0.15), M['wood'], rot=(math.radians(-10), 0, 0), bevel=0.006))
for sx in (-1, 1):
    x = sx * (BW / 2 - 0.08)
    ps.append(box('leg_f', (0.06, 0.06, 0.42), (x, -0.16, 0.21), M['wood_dark']))
    ps.append(box('leg_b', (0.06, 0.06, 0.86), (x, 0.24, 0.43), M['wood_dark'], rot=(math.radians(-6), 0, 0)))
    ps.append(box('arm', (0.07, 0.5, 0.04), (sx * (BW / 2 - 0.06), 0.02, 0.66), M['wood_dark'], bevel=0.006))
    ps.append(box('arm_post', (0.05, 0.05, 0.22), (x, -0.16, 0.53), M['wood_dark']))
    ps.append(box('rail', (0.05, 0.44, 0.05), (x, 0.04, 0.12), M['wood_dark']))
prop(ps, 'garden_bench')

# --- birdhouse on a post ----------------------------------------------------
ps = [box('post', (0.07, 0.07, 1.25), (0, 0, 0.625), M['wood_dark']),
      box('foot', (0.16, 0.16, 0.06), (0, 0, 0.03), M['stone'], bevel=0.01),
      box('house', (0.22, 0.2, 0.22), (0, 0, 1.36), M['wood_v'], bevel=0.006)]
ps.append(prism_x('gable', [(-0.1, 1.47), (0.1, 1.47), (0.0, 1.57)], -0.11, 0.11, M['wood_v']))
for s in (-1, 1):
    ps.append(box('roof', (0.3, 0.15, 0.02), (0, s * 0.065, 1.53), M['roof_g'], rot=(s * math.radians(-45), 0, 0)))
ps.append(cyl('hole', 0.035, 0.035, 0.01, (0, -0.104, 1.4), M['hole'], segs=8, rot=(math.radians(90), 0, 0)))
ps.append(cyl('perch', 0.008, 0.008, 0.06, (0, -0.1, 1.33), M['wood'], segs=5, rot=(math.radians(90), 0, 0)))
prop(ps, 'birdhouse')

bake_to_single(props, 'props_set1', 256 if QUICK else 512, margin=4)
LINE = [-1.85, -0.75, 0.55, 1.75]
for x, p in zip(LINE, props):
    p.location = (x, 0, 0)
preview('props_set1_row', (0.0, -4.6, 1.8), (0.0, 0, 0.5))

if RENDER:
    # Style-kit lighting: warm key ~35 deg from camera front-left, cool hemi-ish world fill, warm rim.
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32 if QUICK else 128
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = 'Standard'
    try:
        scene.view_settings.view_transform = 'Khronos PBR Neutral'
    except Exception:
        pass
    world = bpy.data.worlds.new('w'); scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = srgb('#b4cce6'); bg.inputs['Strength'].default_value = 0.9
    def sun(name, hexc, energy, elev, az):
        l = bpy.data.lights.new(name, 'SUN'); l.color = srgb(hexc)[:3]; l.energy = energy; l.angle = math.radians(4)
        o = link(bpy.data.objects.new(name, l)); o.rotation_euler = (math.radians(90 - elev), 0, math.radians(az))
    sun('key', '#ffd49a', 4.5, 35, -40)
    sun('fill', '#9fb8e0', 0.6, 25, 140)
    sun('rim', '#ffd09a', 1.5, 20, 200)
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
    g = bpy.context.object
    gm = bpy.data.materials.new('ground'); gm.use_nodes = True
    gb = next(n for n in gm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    gb.inputs['Base Color'].default_value = srgb('#76a046'); gb.inputs['Roughness'].default_value = 1.0
    g.data.materials.append(gm)
    cam = link(bpy.data.objects.new('cam', bpy.data.cameras.new('cam')))
    cam.data.lens = 40
    cam.location = (0.4, -6.0, 2.4)
    cam.rotation_euler = (Vector((0, 0, 0.5)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = 1600, 900
    scene.render.filepath = RENDER
    bpy.ops.render.render(write_still=True)
    print('RENDERED', RENDER)
    bpy.data.objects.remove(g, do_unlink=True)

for p in props:
    p.location = (0, 0, 0)
export(props, os.path.join(OUT, 'props_set1.glb'))
print('DONE')
