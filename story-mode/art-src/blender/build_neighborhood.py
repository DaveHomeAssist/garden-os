"""Garden OS Story Mode: The Neighborhood set dressing, built and baked headless in Blender.

  blender -b --factory-startup -P art-src/blender/build_neighborhood.py -- <out_dir> [--quick]

Writes <out_dir>/neighborhood.glb (one named node per piece, all on ONE baked
material) + neighborhood_atlas.png (1024 colour x AO atlas, shipped as WebP next
to the geometry-only .glb). Same recipe and helpers as build_yard_assets.py
(the yard farmhouse), so the neighbours' houses read as the same village:
plaster / painted siding, timber trim, tiled roofs, inset windows.

Pieces (three.js world coordinates of The Neighborhood, transforms applied):
  house_west     Old Gus's farmhouse: footprint x -5.9..-3.5, z 3.9..5.7, faces +X (the lane)
  house_east     the green clapboard house: footprint x 3.6..5.6, z 1.4..3.0, faces -X
  cottage_south  Lila's cottage: footprint x -2.6..-0.2, z -4.2..-2.8, faces +Z
  arbor          the rose arbor over the north exit; posts on the gate_post blockers at (+-0.7, 7.1)
  community_bed  the raised community bed at (2.8, 4.8), 2.8 x 2.4, low enough to step around
  fence_panel    one 1 m picket panel at the origin, instanced along the zone edges at runtime
Walls, porches and steps stay inside the WORLD_MAP blocker footprints so
collision and navigation do not change; only roof eaves overhang them.
No real addresses, house numbers, photo textures or map data: all procedural.
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else '/tmp/neighborhood-assets')
QUICK = '--quick' in argv
os.makedirs(os.path.join(OUT, 'preview'), exist_ok=True)
random.seed(11)

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


PAL.update({
    'siding': '#9cb59a', 'siding_dark': '#7f9a7c', 'trim': '#efe6d2', 'slate': '#6f7f8f', 'slate_dark': '#56636f',
    'ochre': '#e6c48c', 'ochre_shade': '#cfa96e', 'shingle': '#8a5a3a', 'shingle_dark': '#6a4228',
    'picket': '#ece4d2', 'picket_shade': '#d6ccb6', 'rose': '#d9607a', 'door_blue': '#4f6c8e', 'door_red': '#a8453a',
})


def mat_plaster_tint(name, a, b):
    m, nt, out = new_mat(name)
    v = coords(nt)
    col = ramp2(nt, noise(nt, v, 2.2, 4, 0.6), b, a)
    finish(nt, out, col, 0.9)
    return m


M.update({
    'siding': mat_bricklike('siding', PAL['siding'], PAL['siding_dark'], '#6f8a6c', rows=9, ratio=40.0, use='xy', offset=0.0, mortar=0.02),
    'trim': mat_flat('trim', PAL['trim'], '#ddd2bc', 6.0),
    'slate': mat_bricklike('slate', PAL['slate'], PAL['slate_dark'], '#454f58', rows=7.5, ratio=1.4, mortar=0.014),
    'ochre': mat_plaster_tint('ochre', PAL['ochre'], PAL['ochre_shade']),
    'shingle': mat_bricklike('shingle', PAL['shingle'], PAL['shingle_dark'], '#4a2e1c', rows=8, ratio=1.2, mortar=0.016),
    'picket': mat_flat('picket', PAL['picket'], PAL['picket_shade'], 7.0),
    'rose': mat_flat('rose', PAL['rose'], '#c04a66', 9.0, 0.5),
    'door_blue': mat_wood('door_blue', PAL['door_blue'], '#3f5874', 'z', 7.0),
    'door_red': mat_wood('door_red', PAL['door_red'], '#86352c', 'z', 7.0),
})


def gable_house(w, d, wall_mat, roof_mat, door_mat, H=1.3, rise=0.72, porch=0.0, chimney=None,
                windows=(), side_windows=(), flowers=False, shutters=False):
    """A small gabled house built at the origin, front facing -Y. w along the front, d deep
    (porch included). Returns the list of parts (not joined)."""
    parts = []
    front = porch if porch > 0 else 0.22   # room in front of the wall for the porch or the step
    WD = d - front - 0.06              # wall depth (plinth flush with the back of the footprint)
    Wd = w - 0.2                       # wall width (side sills stay inside the footprint)
    yc = d / 2 - 0.03 - WD / 2         # wall centre, pushed back to make room at the front
    FY = yc - WD / 2                   # front wall plane
    REC = 0.06
    walls = box('walls', (Wd, WD, H), (0, yc, H / 2), wall_mat)
    door = dict(x=0.0 if not windows else -Wd * 0.18, w=0.46, h=1.04, z0=0.1)
    cuts = [(door['x'], door['w'], door['z0'], door['h'])] + [(x, ww, z0, hh) for (x, ww, z0, hh) in windows]
    for (x, ww, z0, hh) in cuts:
        boolean_cut(walls, box('cut', (ww, REC * 2, hh), (x, FY, z0 + hh / 2), wall_mat))
    for (yy, ww, z0, hh, sx) in side_windows:
        boolean_cut(walls, box('cut', (REC * 2, ww, hh), (sx * Wd / 2, yc + yy, z0 + hh / 2), wall_mat))
    parts.append(walls)
    parts.append(box('plinth', (Wd + 0.06, WD + 0.06, 0.12), (0, yc, 0.06), M['stone'], bevel=0.015))
    parts.append(prism_x('gable', [(yc - WD / 2, H), (yc + WD / 2, H), (yc, H + rise)], -Wd / 2, Wd / 2, wall_mat))
    OVF, OVS, TH = 0.2, 0.14, 0.07
    ang = math.atan2(rise, WD / 2)
    run = WD / 2 + OVF
    slope_len = run / math.cos(ang) + 0.05
    for side in (-1, 1):
        cy = yc + side * (run / 2 - 0.03)
        cz = H + rise - (run / 2 - 0.03) * math.tan(ang) + TH / (2 * math.cos(ang))
        parts.append(box('roof', (Wd + OVS * 2, slope_len, TH), (0, cy, cz), roof_mat, rot=(-side * ang, 0, 0), bevel=0.01))
        parts.append(box('fascia', (Wd + OVS * 2, 0.04, 0.09), (0, yc + side * (run - 0.02), H + rise - run * math.tan(ang) + 0.01), M['trim']))
    parts.append(box('ridge', (Wd + OVS * 2 + 0.03, 0.11, 0.11), (0, yc, H + rise + TH / math.cos(ang) - 0.01), M['timber_h'], rot=(math.radians(45), 0, 0)))
    for sx in (-1, 1):
        for side in (-1, 1):
            L = run / math.cos(ang) + 0.04
            parts.append(box('barge', (0.05, L, 0.11), (sx * (Wd / 2 + OVS - 0.02), yc + side * run / 2, H + rise - (run / 2) * math.tan(ang) + 0.025), M['trim'], rot=(-side * ang, 0, 0)))
        for sy in (-1, 1):
            parts.append(box('corner', (0.08, 0.08, H - 0.12), (sx * (Wd / 2 - 0.02), yc + sy * (WD / 2 - 0.02), 0.12 + (H - 0.12) / 2), M['trim']))
    # door
    dx, dz0, dw, dh = door['x'], door['z0'], door['w'], door['h']
    parts.append(box('door_leaf', (dw - 0.03, 0.04, dh - 0.02), (dx, FY + REC - 0.025, dz0 + dh / 2), door_mat, bevel=0.006))
    parts.append(box('door_win', (0.2, 0.02, 0.16), (dx, FY + REC - 0.05, dz0 + dh - 0.2), M['glass']))
    for sx in (-1, 1):
        parts.append(box('jamb', (0.06, 0.08, dh + 0.06), (dx + sx * (dw / 2 + 0.02), FY - 0.015, dz0 + dh / 2 + 0.015), M['trim']))
    parts.append(box('door_head', (dw + 0.18, 0.09, 0.08), (dx, FY - 0.02, dz0 + dh + 0.06), M['trim']))
    parts.append(blob('knob', 0.018, (dx + dw / 2 - 0.07, FY + REC - 0.06, dz0 + dh * 0.48), M['iron'], sub=1, jitter=0))
    # windows: glass at the recess back, mullions, frame, sill, optional shutters / flower box
    for (x, ww, z0, hh) in windows:
        parts.append(box('glass', (ww, 0.01, hh), (x, FY + REC - 0.01, z0 + hh / 2), M['glass']))
        parts.append(box('mull', (0.025, 0.02, hh), (x, FY + REC - 0.025, z0 + hh / 2), M['trim']))
        parts.append(box('mull', (ww, 0.02, 0.025), (x, FY + REC - 0.025, z0 + hh * 0.55), M['trim']))
        parts.append(box('frame', (ww + 0.1, 0.05, 0.05), (x, FY - 0.01, z0 + hh + 0.025), M['trim']))
        parts.append(box('sill', (ww + 0.14, 0.1, 0.045), (x, FY - 0.035, z0 - 0.02), M['trim'], bevel=0.008))
        for sx in (-1, 1):
            parts.append(box('frame', (0.05, 0.05, hh), (x + sx * (ww / 2 + 0.025), FY - 0.01, z0 + hh / 2), M['trim']))
            if shutters:
                parts.append(box('shutter', (ww * 0.42, 0.03, hh + 0.03), (x + sx * (ww * 0.71 + 0.05), FY - 0.02, z0 + hh / 2), M['shutter'], bevel=0.005))
        if flowers:
            parts.append(box('fbox', (ww + 0.08, 0.12, 0.1), (x, FY - 0.09, z0 - 0.09), M['wood'], bevel=0.008))
            n = 5
            for i in range(n):
                px = x - ww / 2 + (i + 0.5) * (ww / n)
                parts.append(blob('leafy', 0.055, (px, FY - 0.1, z0 - 0.02), M['leaf'], sub=1, squash=(1.1, 0.8, 0.8)))
                parts.append(blob('flower', 0.026, (px + 0.015, FY - 0.14, z0 + 0.02), M[['f_pink', 'f_white', 'f_yellow', 'f_lav'][i % 4]], sub=1, jitter=0.2))
    for (yy, ww, z0, hh, sx) in side_windows:
        X = sx * Wd / 2
        parts.append(box('glass', (0.01, ww, hh), (X - sx * (REC - 0.01), yc + yy, z0 + hh / 2), M['glass']))
        parts.append(box('mull', (0.02, 0.025, hh), (X - sx * (REC - 0.025), yc + yy, z0 + hh / 2), M['trim']))
        parts.append(box('frame', (0.05, ww + 0.1, 0.05), (X + sx * 0.01, yc + yy, z0 + hh + 0.025), M['trim']))
        parts.append(box('sill', (0.1, ww + 0.14, 0.045), (X + sx * 0.035, yc + yy, z0 - 0.02), M['trim'], bevel=0.008))
        for sy in (-1, 1):
            parts.append(box('frame', (0.05, 0.05, hh), (X + sx * 0.01, yc + yy + sy * (ww / 2 + 0.025), z0 + hh / 2), M['trim']))
    # porch: deck, two posts, a little shed roof (all inside the footprint depth)
    if porch > 0:
        py = -d / 2 + porch / 2
        pw = min(Wd, dw + 0.9)
        px = max(-(Wd - pw) / 2, min((Wd - pw) / 2, dx))   # porch under the door, inside the wall line
        parts.append(box('deck', (pw, porch + 0.02, 0.1), (px, py + 0.01, 0.05), M['wood'], bevel=0.01))
        parts.append(box('step', (dw + 0.1, 0.14, 0.05), (dx, -d / 2 + 0.07, 0.025), M['stone'], bevel=0.01))
        for sx in (-1, 1):
            parts.append(box('post', (0.06, 0.06, 1.12), (px + sx * (pw / 2 - 0.04), -d / 2 + 0.06, 0.1 + 0.56), M['trim']))
            # rail from the post to the door opening
            post_x = px + sx * (pw / 2 - 0.04)
            door_edge = dx + sx * (dw / 2 + 0.06)
            ln = abs(post_x - door_edge)
            if ln > 0.08:
                parts.append(box('rail', (ln, 0.04, 0.04), ((post_x + door_edge) / 2, -d / 2 + 0.06, 0.42), M['trim']))
        pang = math.radians(16)
        parts.append(box('porch_roof', (pw + 0.16, porch + 0.2, 0.05), (px, py - 0.04, 1.26 + 0.02), roof_mat, rot=(pang, 0, 0), bevel=0.008))
    else:
        parts.append(box('step', (dw + 0.16, 0.18, 0.08), (dx, FY - 0.09, 0.04), M['stone'], bevel=0.012))
    if chimney:
        cx_, cmat = chimney
        top = H + rise + 0.32
        parts.append(box('chim_stack', (0.22, 0.26, top - H + 0.1), (cx_, yc + WD * 0.18, H - 0.1 + (top - H + 0.1) / 2), cmat))
        parts.append(box('chim_cap', (0.28, 0.32, 0.05), (cx_, yc + WD * 0.18, top + 0.025), M['stone'], bevel=0.008))
        parts.append(cyl('chim_pot', 0.045, 0.036, 0.1, (cx_, yc + WD * 0.18, top + 0.05), M['terracotta'], segs=7))
    return parts


def place(parts, name, cx, cz, facing_deg):
    """Join, rotate the -Y front to face its lane, move to the three.js footprint centre."""
    o = join(parts, name)
    o.rotation_euler = (0, 0, math.radians(facing_deg))
    o.location = (cx, -cz, 0)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for p in o.data.polygons:
        p.use_smooth = False
    print('PIECE', name, tris(o), 'tris')
    return o


pieces = []
# Old Gus's farmhouse (footprint 2.4 x 1.8, front along the 1.8 side toward the lane at +X)
pieces.append(place(gable_house(1.8, 2.4, M['plaster'], M['roof'], M['door'], H=1.6, rise=0.82, porch=0.42,
                                chimney=(-0.45, M['brick']), windows=[(0.48, 0.36, 0.62, 0.48)], shutters=True,
                                side_windows=[(0.0, 0.42, 0.62, 0.48, 1), (0.0, 0.42, 0.62, 0.48, -1)]),
                    'house_west', -4.7, 4.8, 90))
# green clapboard house (footprint 2.0 x 1.6, front along the 1.6 side toward the lane at -X)
pieces.append(place(gable_house(1.6, 2.0, M['siding'], M['slate'], M['door_blue'], H=1.7, rise=0.74, porch=0.36,
                                windows=[(0.42, 0.32, 0.66, 0.48)],
                                side_windows=[(0.15, 0.4, 0.66, 0.48, 1), (0.15, 0.4, 0.66, 0.48, -1)]),
                    'house_east', 4.6, 2.2, -90))
# Lila's cottage (footprint 2.4 x 1.4, front toward the cross lane at +Z)
pieces.append(place(gable_house(2.4, 1.4, M['ochre'], M['shingle'], M['door_red'], H=1.45, rise=0.66, porch=0.0,
                                chimney=(0.7, M['stone']), flowers=True,
                                windows=[(-0.8, 0.4, 0.56, 0.46), (0.55, 0.52, 0.56, 0.46)]),
                    'cottage_south', -1.4, -3.5, 0))

# rose arbor over the north exit: posts sit on the gate_post blockers (+-0.7, 7.1)
ap = []
for sx in (-1, 1):
    ap.append(box('post', (0.15, 0.15, 1.66), (sx * 0.7, 0, 0.83), M['picket'], bevel=0.01))
    ap.append(box('cap', (0.19, 0.19, 0.05), (sx * 0.7, 0, 1.68), M['picket']))
N = 7
for i in range(N):
    a0 = math.pi * i / N
    a1 = math.pi * (i + 1) / N
    am = (a0 + a1) / 2
    r = 0.7
    cx_, cz_ = -math.cos(am) * r, 1.66 + math.sin(am) * 0.36
    seg = 2 * r * math.sin((a1 - a0) / 2) * 1.12
    tilt = math.atan2(math.sin(a1) * 0.36 - math.sin(a0) * 0.36, -math.cos(a1) * r + math.cos(a0) * r)
    for yy in (-0.06, 0.06):
        ap.append(box('arch', (seg, 0.05, 0.07), (cx_, yy, cz_), M['picket'], rot=(0, -tilt, 0)))
    if i % 2 == 0:
        ap.append(box('arch_tie', (0.04, 0.2, 0.03), (cx_, 0.0, cz_ + 0.03), M['picket']))
# climbing roses: wrapped round the posts and over the arch (kept within the post line)
for (x, z, s) in ((-0.7, 0.75, 0.11), (-0.68, 1.3, 0.13), (-0.42, 1.92, 0.13), (0.12, 2.04, 0.13), (0.6, 1.78, 0.13), (0.7, 1.05, 0.12)):
    ap.append(blob('vine', s, (x, 0.0, z), M['leaf'], sub=1, squash=(1, 0.8, 1.1)))
    ap.append(blob('rose', s * 0.38, (x + 0.03, -s * 0.85, z + 0.03), M['rose'], sub=1, jitter=0.2))
pieces.append(place(ap, 'arbor', 0.0, 7.1, 0))

# raised community bed (2.8 x 2.4), wildflowers and a few herbs, 0.26 tall
bp = []
BW, BD, BH = 2.6, 2.2, 0.26
for sy in (-1, 1):
    bp.append(box('plank', (BW, 0.08, BH), (0, sy * (BD / 2 - 0.04), BH / 2), M['wood']))
for sx in (-1, 1):
    bp.append(box('plank', (0.08, BD - 0.16, BH), (sx * (BW / 2 - 0.04), 0, BH / 2), M['wood']))
bp.append(box('soil', (BW - 0.16, BD - 0.16, 0.04), (0, 0, BH - 0.04), M['soil']))
cols = ['f_pink', 'f_white', 'f_yellow', 'f_lav']
for row in range(3):
    for i in range(5):
        x = -BW / 2 + 0.35 + i * (BW - 0.7) / 4 + random.uniform(-0.06, 0.06)
        y = -BD / 2 + 0.4 + row * (BD - 0.8) / 2 + random.uniform(-0.05, 0.05)
        bp.append(blob('clump', 0.15, (x, y, BH + 0.06), M['leaf'], sub=1, squash=(1, 1, 0.75)))
        bp.append(blob('bloom', 0.065, (x + 0.04, y - 0.05, BH + 0.17), M[cols[(row * 2 + i) % 4]], sub=1, jitter=0.2))
pieces.append(place(bp, 'community_bed', 2.8, 4.8, 0))

# 1 m picket fence panel, instanced along the zone edges at runtime
fp = []
for z in (0.22, 0.5):
    fp.append(box('rail', (1.0, 0.03, 0.05), (0, 0.025, z), M['picket']))
for i in range(5):
    x = -0.5 + (i + 0.5) / 5
    fp.append(box('picket', (0.08, 0.025, 0.6), (x, 0, 0.3), M['picket']))
    fp.append(box('tip', (0.057, 0.025, 0.057), (x, 0, 0.6), M['picket'], rot=(0, math.radians(45), 0)))
fp.append(box('post', (0.07, 0.07, 0.7), (-0.5, 0.02, 0.35), M['picket']))
pieces.append(place(fp, 'fence_panel', 0, 0, 0))

bake_to_single(pieces, 'neighborhood', 512 if QUICK else 1024)
preview('neighborhood_overview', (0.0, -13.0, 10.0), (0.0, -0.8, 0.6), res=(1024, 706))
export(pieces, os.path.join(OUT, 'neighborhood.glb'))
print('NEIGHBORHOOD_TOTAL_TRIS', sum(tris(o) for o in pieces))
print('DONE')
