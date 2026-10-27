"""Garden OS opening-yard hero assets, built and baked headless in Blender.

  blender -b --factory-startup -P art-src/blender/build_yard_assets.py -- <out_dir> [--quick]

Writes <out_dir>/cottage.glb (1 mesh, 1 material) + cottage_atlas.png (1024
baked atlas) and <out_dir>/props.glb (one node per prop) + props_atlas.png
(shared 512 baked atlas). Textures are kept out of the .glb on purpose. Plus
preview renders in <out_dir>/preview/. Style: "A on B" -- low-poly shapes,
painted colour baked with ambient occlusion. Units are metres; the cottage
front faces -Y in Blender, which is +Z in three.js after glTF export.
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else '/tmp/yard-assets')
QUICK = '--quick' in argv
os.makedirs(os.path.join(OUT, 'preview'), exist_ok=True)
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 16 if QUICK else 96
scene.cycles.use_denoising = False

PAL = {
    'plaster': '#efe2c8', 'plaster_shade': '#dcc8a4', 'timber': '#6e4a2e', 'timber_dark': '#553722',
    'roof': '#b0583a', 'roof_dark': '#8a3f2a', 'roof_gap': '#5a2a1c',
    'brick': '#a5553a', 'brick_dark': '#874230', 'mortar': '#d8c3a5',
    'stone': '#b8ad9a', 'stone_dark': '#8f8574', 'stone_gap': '#6b6356',
    'glass': '#34505e', 'glass_hi': '#c9d6c8', 'door': '#8a5a34', 'door_dark': '#6a4224',
    'shutter': '#7d9a78', 'iron': '#3a3634', 'leaf': '#4f7f3a', 'leaf_light': '#7fa850',
    'flower_pink': '#e89ab0', 'flower_white': '#f4efe0', 'flower_yellow': '#f0c94a', 'flower_lav': '#a68ad0',
    'terracotta': '#c4703c', 'terracotta_dark': '#9a5228', 'can': '#6f9a8a', 'can_dark': '#4f7468',
    'metal': '#9aa3a6', 'metal_dark': '#6b7275', 'wood': '#9a6a3e', 'wood_light': '#c08a55', 'soil': '#3a2718',
    'cabbage': '#8fb85a', 'carrot': '#e07a32',
}


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, 1.0)


def new_mat(name):
    m = bpy.data.materials.new(name)
    if getattr(m, 'node_tree', None) is None:
        m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    return m, nt, out


def finish(nt, out, color_socket, ao_strength=0.85, ao_dist=0.45):
    """Paint = colour * lifted AO, emitted so an EMIT bake captures it unlit."""
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion')
    ao.samples = 8 if QUICK else 24
    ao.inputs['Distance'].default_value = ao_dist
    rmp = nt.nodes.new('ShaderNodeMapRange')
    rmp.inputs['To Min'].default_value = 1.0 - ao_strength * 0.62
    nt.links.new(ao.outputs['AO'], rmp.inputs['Value'])
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    nt.links.new(color_socket, mix.inputs['A'])
    nt.links.new(rmp.outputs['Result'], mix.inputs['B'])
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(mix.outputs['Result'], em.inputs['Color'])
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])


def coords(nt, mode='Object'):
    return nt.nodes.new('ShaderNodeTexCoord').outputs[mode]


def ramp2(nt, fac_socket, a, b):
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    nt.links.new(fac_socket, mix.inputs['Factor'])
    mix.inputs['A'].default_value = srgb(a)
    mix.inputs['B'].default_value = srgb(b)
    return mix.outputs['Result']


def noise(nt, vec, scale, detail=3.0, rough=0.55):
    n = nt.nodes.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = rough
    nt.links.new(vec, n.inputs['Vector'])
    return n.outputs['Fac']


def math_node(nt, op, a, b=None):
    m = nt.nodes.new('ShaderNodeMath')
    m.operation = op
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            m.inputs[i].default_value = v
        else:
            nt.links.new(v, m.inputs[i])
    return m.outputs[0]


def sep(nt, vec):
    s = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(vec, s.inputs[0])
    return s.outputs


def comb(nt, x, y, z=0.0):
    c = nt.nodes.new('ShaderNodeCombineXYZ')
    for i, v in enumerate((x, y, z)):
        if isinstance(v, (int, float)):
            c.inputs[i].default_value = v
        else:
            nt.links.new(v, c.inputs[i])
    return c.outputs[0]


def mat_flat(name, a, b=None, scale=3.0, ao=0.85):
    m, nt, out = new_mat(name)
    if b is None:
        rgb = nt.nodes.new('ShaderNodeRGB')
        rgb.outputs[0].default_value = srgb(a)
        col = rgb.outputs[0]
    else:
        col = ramp2(nt, noise(nt, coords(nt), scale), a, b)
    finish(nt, out, col, ao)
    return m


def mat_plaster():
    m, nt, out = new_mat('plaster')
    v = coords(nt)
    col = ramp2(nt, noise(nt, v, 2.2, 4, 0.6), PAL['plaster_shade'], PAL['plaster'])
    z = sep(nt, v)[2]
    grime = math_node(nt, 'SUBTRACT', 1.0, math_node(nt, 'MINIMUM', math_node(nt, 'MULTIPLY', z, 2.2), 1.0))
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    nt.links.new(math_node(nt, 'MULTIPLY', grime, 0.45), mix.inputs['Factor'])
    nt.links.new(col, mix.inputs['A']); mix.inputs['B'].default_value = srgb('#b9a27c')
    finish(nt, out, mix.outputs['Result'], 0.9)
    return m


def mat_bricklike(name, c1, c2, gap, rows, ratio=2.2, use='xz', offset=0.5, ao=0.85, mortar=0.015):
    m, nt, out = new_mat(name)
    v = coords(nt)
    s = sep(nt, v)
    u = s[0] if use == 'xz' else math_node(nt, 'ADD', s[0], s[1])
    vec = comb(nt, u, s[2])
    b = nt.nodes.new('ShaderNodeTexBrick')
    b.offset = offset
    b.inputs['Scale'].default_value = 1.0
    b.inputs['Brick Width'].default_value = ratio / rows
    b.inputs['Row Height'].default_value = 1.0 / rows
    b.inputs['Mortar Size'].default_value = mortar
    b.inputs['Mortar Smooth'].default_value = 0.2
    b.inputs['Color1'].default_value = srgb(c1)
    b.inputs['Color2'].default_value = srgb(c2)
    b.inputs['Mortar'].default_value = srgb(gap)
    nt.links.new(vec, b.inputs['Vector'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'OVERLAY'
    mix.inputs['Factor'].default_value = 0.35
    nt.links.new(b.outputs['Color'], mix.inputs['A'])
    nt.links.new(noise(nt, v, 5.0), mix.inputs['B'])
    finish(nt, out, mix.outputs['Result'], ao)
    return m


def mat_wood(name, a, b, along='x', scale=14.0):
    m, nt, out = new_mat(name)
    v = coords(nt)
    w = nt.nodes.new('ShaderNodeTexWave')
    w.wave_type = 'BANDS'
    w.bands_direction = {'x': 'Y', 'y': 'X', 'z': 'X'}[along]
    w.inputs['Scale'].default_value = scale
    w.inputs['Distortion'].default_value = 6.0
    w.inputs['Detail'].default_value = 3.0
    nt.links.new(v, w.inputs['Vector'])
    finish(nt, out, ramp2(nt, w.outputs['Fac'], b, a), 0.85)
    return m


def mat_glass():
    m, nt, out = new_mat('glass')
    z = sep(nt, coords(nt))[2]
    f = math_node(nt, 'FRACT', math_node(nt, 'MULTIPLY', z, 1.6))
    finish(nt, out, ramp2(nt, f, PAL['glass'], PAL['glass_hi']), 0.5)
    return m


def mat_stone(name='stone'):
    m, nt, out = new_mat(name)
    v = coords(nt)
    vo = nt.nodes.new('ShaderNodeTexVoronoi')
    vo.feature = 'DISTANCE_TO_EDGE'
    vo.inputs['Scale'].default_value = 7.0
    nt.links.new(v, vo.inputs['Vector'])
    edge = math_node(nt, 'GREATER_THAN', vo.outputs['Distance'], 0.04)
    stone = ramp2(nt, noise(nt, v, 6.0), PAL['stone_dark'], PAL['stone'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    nt.links.new(edge, mix.inputs['Factor'])
    mix.inputs['A'].default_value = srgb(PAL['stone_gap'])
    nt.links.new(stone, mix.inputs['B'])
    finish(nt, out, mix.outputs['Result'], 0.9)
    return m


M = {
    'plaster': mat_plaster(),
    'timber': mat_wood('timber', PAL['timber'], PAL['timber_dark'], 'z', 9.0),
    'timber_h': mat_wood('timber_h', PAL['timber'], PAL['timber_dark'], 'x', 9.0),
    'roof': mat_bricklike('roof', PAL['roof'], PAL['roof_dark'], PAL['roof_gap'], rows=8.5, ratio=1.6, mortar=0.012),
    'brick': mat_bricklike('brick', PAL['brick'], PAL['brick_dark'], PAL['mortar'], rows=14, ratio=2.4, use='xy', mortar=0.006),
    'stone': mat_stone(),
    'glass': mat_glass(),
    'door': mat_wood('door', PAL['door'], PAL['door_dark'], 'z', 7.0),
    'door_dark': mat_flat('door_dark', PAL['door_dark']),
    'shutter': mat_flat('shutter', PAL['shutter'], '#6a8566', 4.0),
    'iron': mat_flat('iron', PAL['iron']),
    'leaf': mat_flat('leaf', PAL['leaf'], PAL['leaf_light'], 9.0, 0.7),
    'f_pink': mat_flat('f_pink', PAL['flower_pink'], None, ao=0.4),
    'f_white': mat_flat('f_white', PAL['flower_white'], None, ao=0.4),
    'f_yellow': mat_flat('f_yellow', PAL['flower_yellow'], None, ao=0.4),
    'f_lav': mat_flat('f_lav', PAL['flower_lav'], None, ao=0.4),
    'terracotta': mat_flat('terracotta', PAL['terracotta'], PAL['terracotta_dark'], 6.0),
    'can': mat_flat('can', PAL['can'], PAL['can_dark'], 5.0),
    'metal': mat_flat('metal', PAL['metal'], PAL['metal_dark'], 8.0),
    'metal_dark': mat_flat('metal_dark', PAL['metal_dark']),
    'wood': mat_wood('wood', PAL['wood_light'], PAL['wood'], 'x', 10.0),
    'soil': mat_flat('soil', PAL['soil'], '#55392a', 12.0, 0.6),
    'cabbage': mat_flat('cabbage', PAL['cabbage'], '#6f9a45', 7.0, 0.6),
    'carrot': mat_flat('carrot', PAL['carrot'], None, ao=0.5),
    'burlap': mat_flat('burlap', '#b89a6a', '#9c7f52', 14.0),
}


def link(obj):
    bpy.context.collection.objects.link(obj)
    return obj


def mesh_obj(name, bm, mat):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me))
    ob.data.materials.append(mat)
    return ob


def xform(bm, loc, rot):
    R = Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X')
    bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector(loc)) @ R, verts=bm.verts)


def box(name, size, loc, mat, rot=(0, 0, 0), bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect='EDGES', profile=0.5)
    xform(bm, loc, rot)
    return mesh_obj(name, bm, mat)


def cyl(name, r1, r2, h, loc, mat, segs=10, rot=(0, 0, 0), jitter=0.0):
    """Cylinder/cone whose base sits at loc (before rotation about the base)."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=h)
    bmesh.ops.translate(bm, vec=Vector((0, 0, h / 2)), verts=bm.verts)
    if jitter:
        for v in bm.verts:
            v.co.x *= 1 + random.uniform(-jitter, jitter)
            v.co.y *= 1 + random.uniform(-jitter, jitter)
    xform(bm, loc, rot)
    return mesh_obj(name, bm, mat)


def blob(name, r, loc, mat, sub=1, squash=(1, 1, 1), jitter=0.12):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    for v in bm.verts:
        k = 1 + random.uniform(-jitter, jitter)
        v.co = Vector((v.co.x * squash[0] * k, v.co.y * squash[1] * k, v.co.z * squash[2] * k))
    bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    return mesh_obj(name, bm, mat)


def prism_x(name, pts_yz, x0, x1, mat):
    bm = bmesh.new()
    a = [bm.verts.new((x0, y, z)) for y, z in pts_yz]
    b = [bm.verts.new((x1, y, z)) for y, z in pts_yz]
    bm.faces.new(a); bm.faces.new(b[::-1])
    n = len(pts_yz)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[j], a[i], b[i], b[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, mat)


def prism_y(name, pts_xz, y0, y1, mat):
    bm = bmesh.new()
    a = [bm.verts.new((x, y0, z)) for x, z in pts_xz]
    b = [bm.verts.new((x, y1, z)) for x, z in pts_xz]
    bm.faces.new(a); bm.faces.new(b[::-1])
    n = len(pts_xz)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[j], a[i], b[i], b[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, mat)


def boolean_cut(target, cutter):
    mod = target.modifiers.new('cut', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = cutter
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def bake_to_single(objs, name, res, margin=6):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.006, area_weight=0.0, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    img = bpy.data.images.new(name + '_bake', res, res, alpha=False)
    mats = set()
    for o in objs:
        for slot in o.material_slots:
            mats.add(slot.material)
    for m in mats:
        node = m.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = img
        m.node_tree.nodes.active = node
    scene.render.bake.margin = margin
    bpy.ops.object.bake(type='EMIT')
    # The atlas ships as its own WebP next to the geometry-only .glb: the game's
    # CSP blocks the blob: URLs GLTFLoader uses for embedded images.
    img.filepath_raw = os.path.join(OUT, name + '_atlas.png')
    img.file_format = 'PNG'
    img.save()
    final = bpy.data.materials.new(name + '_baked')
    if getattr(final, 'node_tree', None) is None:
        final.use_nodes = True
    nt = final.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.9
    bsdf.inputs['Metallic'].default_value = 0.0
    for o in objs:
        o.data.materials.clear()
        o.data.materials.append(final)
    return final


def export(objs, path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_normals=True, export_texcoords=True,
                              export_materials='EXPORT', export_image_format='NONE')
    print('EXPORTED', path, os.path.getsize(path))


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    return ob


def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def preview(name, cam_loc, target, res=(720, 450)):
    cam = link(bpy.data.objects.new('cam', bpy.data.cameras.new('cam')))
    cam.location = cam_loc
    cam.rotation_euler = (Vector(target) - Vector(cam_loc)).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'FLAT'
    scene.display.shading.color_type = 'TEXTURE'
    scene.render.filepath = os.path.join(OUT, 'preview', name + '.png')
    bpy.ops.render.render(write_still=True)
    scene.render.engine = 'CYCLES'
    bpy.data.objects.remove(cam, do_unlink=True)


# =============================================================== cottage ==
W, D, HW = 3.4, 2.5, 1.95
RISE = 1.12
OVF, OVS, TH = 0.32, 0.22, 0.09
FY = -D / 2
RECESS = 0.09
parts = []

walls = box('walls', (W, D, HW), (0, 0, HW / 2), M['plaster'])
DOOR = dict(x=-0.42, w=0.72, h=1.42, z0=0.22)
WIN_L = dict(x=-1.2, w=0.52, z0=0.88, h=0.66)
WIN_R = dict(x=0.86, w=0.86, z0=0.86, h=0.68)
for (x, w, z0, h) in ((DOOR['x'], DOOR['w'], DOOR['z0'], DOOR['h']),
                      (WIN_L['x'], WIN_L['w'], WIN_L['z0'], WIN_L['h']),
                      (WIN_R['x'], WIN_R['w'], WIN_R['z0'], WIN_R['h'])):
    boolean_cut(walls, box('cut', (w, RECESS * 2, h), (x, FY, z0 + h / 2), M['plaster']))
SIDE_WIN = dict(y=-0.62, w=0.46, z0=0.95, h=0.56)
boolean_cut(walls, box('cut', (RECESS * 2, SIDE_WIN['w'], SIDE_WIN['h']), (W / 2, SIDE_WIN['y'], SIDE_WIN['z0'] + SIDE_WIN['h'] / 2), M['plaster']))
parts.append(walls)

parts.append(prism_x('gable', [(-D / 2, HW), (D / 2, HW), (0, HW + RISE)], -W / 2, W / 2, M['plaster']))
parts.append(box('plinth', (W + 0.1, D + 0.1, 0.24), (0, 0, 0.12), M['stone'], bevel=0.02))

ang = math.atan2(RISE, D / 2)
run = D / 2 + OVF
slope_len = run / math.cos(ang) + 0.06
for side in (-1, 1):
    # slab centred on the slope line, lifted half a thickness along its normal
    cy = side * (run / 2 - 0.03)
    cz = HW + RISE - (run / 2 - 0.03) * math.tan(ang) + TH / (2 * math.cos(ang))
    parts.append(box('roof', (W + OVS * 2, slope_len, TH), (0, cy, cz), M['roof'], rot=(-side * ang, 0, 0), bevel=0.012))
    ey = side * (run - 0.02)
    ez = HW + RISE - run * math.tan(ang) + 0.01
    parts.append(box('fascia', (W + OVS * 2, 0.05, 0.12), (0, ey, ez), M['timber_h']))
parts.append(box('ridge', (W + OVS * 2 + 0.04, 0.15, 0.15), (0, 0, HW + RISE + TH / math.cos(ang) - 0.01), M['roof_ridge'] if 'roof_ridge' in M else M['timber_h'], rot=(math.radians(45), 0, 0)))
for sx in (-1, 1):
    for side in (-1, 1):
        L = run / math.cos(ang) + 0.05
        cy = side * run / 2
        cz = HW + RISE - (run / 2) * math.tan(ang) + 0.03
        parts.append(box('barge', (0.06, L, 0.15), (sx * (W / 2 + OVS - 0.02), cy, cz), M['timber'], rot=(-side * ang, 0, 0)))
for sx in (-1, 1):
    for sy in (-1, 1):
        parts.append(box('corner', (0.12, 0.12, HW - 0.24), (sx * (W / 2 - 0.03), sy * (D / 2 - 0.03), 0.24 + (HW - 0.24) / 2), M['timber']))
parts.append(box('plate', (W + 0.06, 0.08, 0.12), (0, FY - 0.01, HW - 0.05), M['timber_h']))
parts.append(box('plate', (W + 0.06, 0.08, 0.12), (0, D / 2 + 0.01, HW - 0.05), M['timber_h']))
for sx in (-1, 1):
    parts.append(box('plate', (0.08, D + 0.06, 0.12), (sx * (W / 2 + 0.01), 0, HW - 0.05), M['timber_h']))
parts.append(box('collar', (0.07, D * 0.6, 0.09), (W / 2 + 0.015, 0, HW + RISE * 0.4), M['timber_h']))
parts.append(box('kingpost', (0.07, 0.09, RISE * 0.92), (W / 2 + 0.015, 0, HW + RISE * 0.46), M['timber']))
for side in (-1, 1):  # diagonal braces in the gable
    parts.append(box('brace', (0.06, 0.07, RISE * 0.62), (W / 2 + 0.015, side * D * 0.16, HW + RISE * 0.22), M['timber'], rot=(side * math.radians(48), 0, 0)))

# door
dx, dz0 = DOOR['x'], DOOR['z0']
parts.append(box('door_leaf', (DOOR['w'] - 0.04, 0.05, DOOR['h'] - 0.02), (dx, FY + RECESS - 0.03, dz0 + DOOR['h'] / 2), M['door'], bevel=0.008))
for i in range(1, 4):
    parts.append(box('batten', (0.022, 0.02, DOOR['h'] - 0.1), (dx - DOOR['w'] / 2 + i * DOOR['w'] / 4, FY + RECESS - 0.06, dz0 + DOOR['h'] / 2), M['door_dark']))
parts.append(box('door_brace', (DOOR['w'] - 0.1, 0.02, 0.05), (dx, FY + RECESS - 0.065, dz0 + 0.3), M['door_dark']))
parts.append(box('door_win', (0.3, 0.02, 0.22), (dx, FY + RECESS - 0.072, dz0 + DOOR['h'] - 0.27), M['glass']))
for sx in (-1, 1):
    parts.append(box('jamb', (0.08, 0.1, DOOR['h'] + 0.08), (dx + sx * (DOOR['w'] / 2 + 0.03), FY - 0.02, dz0 + DOOR['h'] / 2 + 0.02), M['timber']))
parts.append(box('door_head', (DOOR['w'] + 0.26, 0.12, 0.12), (dx, FY - 0.03, dz0 + DOOR['h'] + 0.09), M['timber_h']))
parts.append(blob('knob', 0.025, (dx + DOOR['w'] / 2 - 0.1, FY + RECESS - 0.09, dz0 + DOOR['h'] * 0.48), M['iron'], sub=1, jitter=0))
parts.append(box('step1', (1.0, 0.42, 0.14), (dx, FY - 0.2, 0.07), M['stone'], bevel=0.025))
parts.append(box('step2', (0.82, 0.3, 0.08), (dx + 0.03, FY - 0.54, 0.04), M['stone'], bevel=0.02))

def window(cx, z0, w, h, side=False, shutters=False, flowers=False):
    """Inset window: glass at the recess back, mullions, frame, sill."""
    out = []
    if side:
        def B(name, size, off, mat, bevel=0.0):
            # off = (along, out, up): along wall (-Y..+Y), out of wall (+X)
            return box(name, (size[1], size[0], size[2]), (W / 2 + off[1], cx + off[0], off[2]), mat, bevel=bevel)
    else:
        def B(name, size, off, mat, bevel=0.0):
            return box(name, size, (cx + off[0], FY - off[1], off[2]), mat, bevel=bevel)
    out.append(B('glass', (w, 0.01, h), (0, -RECESS + 0.01, z0 + h / 2), M['glass']))
    out.append(B('mull', (0.035, 0.03, h), (0, -RECESS + 0.03, z0 + h / 2), M['timber']))
    out.append(B('mull', (w, 0.03, 0.035), (0, -RECESS + 0.03, z0 + h * 0.55), M['timber_h']))
    fw = 0.07
    out.append(B('frame', (w + fw * 2, 0.07, fw), (0, 0.015, z0 + h + fw / 2), M['timber_h']))
    for sx in (-1, 1):
        out.append(B('frame', (fw, 0.07, h), (sx * (w / 2 + fw / 2), 0.015, z0 + h / 2), M['timber']))
    out.append(B('sill', (w + 0.2, 0.14, 0.06), (0, 0.05, z0 - 0.03), M['timber_h'], bevel=0.01))
    if shutters:
        for sx in (-1, 1):
            out.append(B('shutter', (w * 0.5, 0.035, h + 0.04), (sx * (w * 0.75 + fw + 0.01), 0.03, z0 + h / 2), M['shutter'], bevel=0.006))
    if flowers:
        out.append(B('fbox', (w + 0.12, 0.16, 0.14), (0, 0.14, z0 - 0.13), M['wood'], bevel=0.01))
        cols = ['f_pink', 'f_white', 'f_yellow', 'f_lav']
        n = 7
        for i in range(n):
            px = -w / 2 + (i + 0.5) * (w / n)
            if side:
                pass
            out.append(blob('leafy', 0.075, (cx + px, FY - 0.14, z0 - 0.02), M['leaf'], sub=1, squash=(1.1, 0.8, 0.8)))
            out.append(blob('flower', 0.034, (cx + px + 0.02, FY - 0.19, z0 + 0.04 + 0.02 * (i % 2)), M[cols[i % 4]], sub=1, jitter=0.2))
    return out


parts += window(WIN_L['x'], WIN_L['z0'], WIN_L['w'], WIN_L['h'], shutters=True)
parts += window(WIN_R['x'], WIN_R['z0'], WIN_R['w'], WIN_R['h'], flowers=True)
parts += window(SIDE_WIN['y'], SIDE_WIN['z0'], SIDE_WIN['w'], SIDE_WIN['h'], side=True)

# chimney attached to the +X gable wall, rising through the eave
CX0 = W / 2
top = HW + RISE + 0.5
parts.append(box('chim_base', (0.48, 0.7, 1.05), (CX0 + 0.24, 0.32, 0.525), M['brick']))
parts.append(prism_y('chim_shoulder', [(CX0, 1.05), (CX0 + 0.48, 1.05), (CX0 + 0.36, 1.3), (CX0, 1.3)], 0.32 - 0.35, 0.32 + 0.35, M['brick']))
parts.append(box('chim_stack', (0.36, 0.5, top - 1.3), (CX0 + 0.18, 0.32, 1.3 + (top - 1.3) / 2), M['brick']))
parts.append(box('chim_cap', (0.46, 0.6, 0.08), (CX0 + 0.18, 0.32, top + 0.04), M['stone'], bevel=0.01))
parts.append(cyl('chim_pot', 0.075, 0.06, 0.16, (CX0 + 0.18, 0.28, top + 0.08), M['terracotta'], segs=8))
# wall lamp by the door
parts.append(box('lamp_plate', (0.08, 0.03, 0.12), (dx + DOOR['w'] / 2 + 0.22, FY - 0.015, 1.4), M['iron']))
parts.append(cyl('lamp', 0.05, 0.035, 0.12, (dx + DOOR['w'] / 2 + 0.22, FY - 0.08, 1.3), M['iron'], segs=6))

cottage = join(parts, 'cottage')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for p in cottage.data.polygons:
    p.use_smooth = False
print('COTTAGE tris', tris(cottage))
bake_to_single([cottage], 'cottage', 512 if QUICK else 1024)
preview('cottage_front', (4.6, -7.6, 2.8), (0.3, 0, 1.3))
preview('cottage_side', (7.2, -2.6, 2.3), (0.5, 0, 1.3))
export([cottage], os.path.join(OUT, 'cottage.glb'))
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

# ================================================================= props ==
props = []


def prop(objs, name):
    o = join(objs, name)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for p in o.data.polygons:
        p.use_smooth = False
    props.append(o)
    print('PROP', name, tris(o), 'tris')
    return o


ps = [cyl('body', 0.1, 0.09, 0.2, (0, 0, 0), M['can'], segs=10),
      cyl('rim', 0.095, 0.095, 0.02, (0, 0, 0.2), M['can'], segs=10),
      cyl('band', 0.103, 0.103, 0.025, (0, 0, 0.05), M['metal'], segs=10),
      cyl('spout', 0.02, 0.012, 0.27, (0.08, 0, 0.05), M['can'], segs=6, rot=(0, math.radians(55), 0)),
      cyl('rose', 0.022, 0.042, 0.05, (0.29, 0, 0.2), M['metal'], segs=8, rot=(0, math.radians(55), 0))]
bpy.ops.mesh.primitive_torus_add(major_radius=0.085, minor_radius=0.013, major_segments=10, minor_segments=5,
                                 location=(-0.02, 0, 0.23), rotation=(math.radians(90), 0, 0))
h = bpy.context.object; h.data.materials.append(M['can']); ps.append(h)
prop(ps, 'watering_can')

ps = [cyl('shaft', 0.016, 0.016, 0.72, (0, 0, 0.22), M['wood'], segs=6),
      box('blade', (0.17, 0.025, 0.24), (0, 0, 0.12), M['metal'], bevel=0.008),
      box('step', (0.19, 0.04, 0.02), (0, 0, 0.245), M['metal_dark']),
      box('grip', (0.14, 0.03, 0.03), (0, 0, 0.98), M['wood'])]
for sx in (-1, 1):
    ps.append(box('gripside', (0.025, 0.03, 0.1), (sx * 0.06, 0, 0.93), M['wood']))
prop(ps, 'spade')

ps = [cyl('shaft', 0.015, 0.015, 0.95, (0, 0, 0.05), M['wood'], segs=6),
      box('head', (0.36, 0.03, 0.03), (0, 0, 0.06), M['metal'])]
for i in range(9):
    ps.append(box('tine', (0.012, 0.012, 0.07), (-0.16 + i * 0.04, -0.012, 0.035), M['metal']))
prop(ps, 'rake')

ps = []
CW, CDp, CH = 0.46, 0.32, 0.24
for z in (0.05, 0.13, 0.21):
    for sy in (-1, 1):
        ps.append(box('slat', (CW, 0.02, 0.06), (0, sy * CDp / 2, z), M['wood'], bevel=0.004))
    for sx in (-1, 1):
        ps.append(box('slat', (0.02, CDp, 0.06), (sx * CW / 2, 0, z), M['wood'], bevel=0.004))
for sx in (-1, 1):
    for sy in (-1, 1):
        ps.append(box('post', (0.035, 0.035, CH), (sx * (CW / 2 - 0.01), sy * (CDp / 2 - 0.01), CH / 2), M['wood']))
ps.append(box('floor', (CW, CDp, 0.02), (0, 0, 0.012), M['wood']))
for (x, y) in [(-0.12, -0.05), (0.0, 0.06), (0.12, -0.04), (-0.05, 0.02)]:
    ps.append(blob('cab', 0.075, (x, y, 0.21), M['cabbage'], sub=1, squash=(1, 1, 0.85), jitter=0.15))
for i in range(3):
    ps.append(cyl('carrot', 0.022, 0.004, 0.16, (0.13, 0.1 - i * 0.05, 0.22), M['carrot'], segs=6, rot=(math.radians(80), 0, math.radians(20 + i * 25))))
prop(ps, 'crate')

for nm, r, h, fl in (('pot_large', 0.15, 0.22, 'f_pink'), ('pot_small', 0.1, 0.15, 'f_yellow')):
    ps = [cyl('pot', r * 0.75, r, h, (0, 0, 0), M['terracotta'], segs=10),
          cyl('lip', r * 1.08, r * 1.08, 0.04, (0, 0, h - 0.035), M['terracotta'], segs=10),
          cyl('soil', r * 0.95, r * 0.95, 0.01, (0, 0, h - 0.015), M['soil'], segs=10)]
    for i in range(4):
        a = i * math.pi / 2 + 0.4
        ps.append(blob('leaf', r * 0.55, (math.cos(a) * r * 0.45, math.sin(a) * r * 0.45, h + r * 0.35), M['leaf'], sub=1, squash=(1, 1, 0.8)))
    for i in range(5):
        a = i * 2.4
        ps.append(blob('fl', r * 0.22, (math.cos(a) * r * 0.5, math.sin(a) * r * 0.5, h + r * 0.78), M[fl if i % 2 else 'f_white'], sub=1, jitter=0.2))
    prop(ps, nm)

bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.24, radius2=0.2, depth=0.05)
bmesh.ops.translate(bm, vec=Vector((0, 0, 0.015)), verts=bm.verts)
for v in bm.verts:
    k = random.uniform(0.84, 1.1)
    v.co.x *= k * 1.15; v.co.y *= k * 0.9
prop([mesh_obj('stone', bm, M['stone'])], 'stepping_stone')
prop([blob('sack', 0.16, (0, 0, 0.15), M['burlap'], sub=2, squash=(1, 0.85, 1.15), jitter=0.06),
      cyl('tie', 0.05, 0.05, 0.04, (0, 0, 0.31), M['burlap'], segs=6)], 'seed_sack')

bake_to_single(props, 'props', 256 if QUICK else 512, margin=4)
for i, p in enumerate(props):
    p.location = (i * 0.6 - 2.4, 0, 0)
preview('props_row', (0.0, -3.4, 1.3), (0.0, 0, 0.25))
for p in props:
    p.location = (0, 0, 0)
export(props, os.path.join(OUT, 'props.glb'))
print('DONE')
