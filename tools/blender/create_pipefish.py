"""Generate the rainbow belly pipefish (Microphis deocata) GLBs.

Standalone Blender 5.2 factory-startup script. Exports three LODs:
  public/models/fish/pipefish/pipefish-{high,mid,low}.glb

Each GLB carries a rig and three animation clips: idle, swim, turn.
"""
import bpy
import json
import math
import struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "models" / "fish" / "pipefish"
LODS = ("high", "mid", "low")

LOD_PARAMS = {
    "high": {"body_seg": 64, "body_ring": 16, "eye_seg": 16, "eye_ring": 8, "fin_seg": 12},
    "mid": {"body_seg": 40, "body_ring": 12, "eye_seg": 12, "eye_ring": 6, "fin_seg": 8},
    "low": {"body_seg": 20, "body_ring": 8, "eye_seg": 8, "eye_ring": 4, "fin_seg": 6},
}


def make_material(name, color, roughness, alpha=1.0, metallic=0.0, transmission=0.0,
                  coat=0.0, blend=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = False
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Alpha"].default_value = alpha
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
    if "Transmission Weight" in bsdf.inputs and transmission > 0.0:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    if alpha < 1.0 or blend:
        mat.surface_render_method = blend or "BLENDED"
        mat.use_transparent_shadow = True
    mat.diffuse_color = (*color, alpha)
    return mat


def ellipsoid(name, center, radii, mat, seg, rings, uv="equirect"):
    verts, faces, uvs = [], [], []
    cx, cy, cz = center
    rx, ry, rz = radii
    for i in range(rings + 1):
        phi = math.pi * i / rings
        for j in range(seg + 1):
            theta = 2.0 * math.pi * j / seg
            x = cx + rx * math.sin(phi) * math.cos(theta)
            y = cy + ry * math.sin(phi) * math.sin(theta)
            z = cz + rz * math.cos(phi)
            verts.append((x, y, z))
            if uv == "disc":
                uvs.append((0.5 + 0.5 * (x - cx) / rx, 0.5 + 0.5 * (z - cz) / rz))
            else:
                uvs.append((j / seg, i / rings))
    stride = seg + 1
    for i in range(rings):
        for j in range(seg):
            a = i * stride + j
            b = a + 1
            c = a + stride + 1
            d = a + stride
            faces.append((a, b, c, d))
    for j in range(seg):
        faces.append((0, j + 1, j + 2 if j + 2 <= seg else 1))
    last = rings * stride
    for j in range(seg):
        a = last + j
        b = last + (j + 1) % (seg + 1)
        faces.append((last + seg + 1, b, a))
    obj = make_mesh(name, verts, faces, uvs, mat)
    return obj


def make_mesh(name, verts, faces, uvs, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], [tuple(f) for f in faces])
    data.update()
    data.validate(verbose=False)
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(data)
    bm.free()
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    data.materials.append(mat)
    for poly in data.polygons:
        poly.use_smooth = True
    layer = data.uv_layers.new(name="UVMap")
    for poly in data.polygons:
        for li in poly.loop_indices:
            layer.data[li].uv = uvs[data.loops[li].vertex_index]
    return obj


def tube(points, radius, sides, mat):
    verts, faces, uvs = [], [], []
    pts = [Vector(p) for p in points]
    for i, p in enumerate(pts):
        if i == 0:
            tangent = (pts[1] - pts[0])
        elif i == len(pts) - 1:
            tangent = (pts[-1] - pts[-2])
        else:
            tangent = (pts[i + 1] - pts[i - 1])
        tangent.normalize()
        up = Vector((0, 0, 1)) if abs(tangent.z) < 0.9 else Vector((0, 1, 0))
        normal = tangent.cross(up).normalized()
        binormal = tangent.cross(normal).normalized()
        for j in range(sides + 1):
            ang = 2.0 * math.pi * j / sides
            off = normal * (radius * math.cos(ang)) + binormal * (radius * math.sin(ang))
            verts.append(tuple(p + off))
            uvs.append((i / (len(pts) - 1), j / sides))
    stride = sides + 1
    for i in range(len(pts) - 1):
        for j in range(sides):
            a = i * stride + j
            b = a + 1
            d = a + stride
            c = d + 1
            faces.append((a, b, c, d))
    center_start = len(verts)
    verts.append(tuple(pts[0]))
    uvs.append((0.5, 0.5))
    for j in range(sides):
        faces.append((center_start, j + 1, j))
    center_end = len(verts)
    verts.append(tuple(pts[-1]))
    uvs.append((0.5, 0.5))
    last = (len(pts) - 1) * stride
    for j in range(sides):
        faces.append((center_end, last + j, last + j + 1))
    obj = make_mesh("tube", verts, faces, uvs, mat)
    return obj


def build_lod(lod):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = 30
    scene.frame_start, scene.frame_end = 1, 61
    params = LOD_PARAMS[lod]
    seg = params["body_seg"]
    ring = params["body_ring"]

    # Materials (exactly the four required names)
    body_mat = make_material("FishBody", (0.32, 0.50, 0.36), 0.35, coat=0.15)
    fin_mat = make_material("FishFin", (0.85, 0.35, 0.20), 0.30, alpha=0.7,
                            transmission=0.5, coat=0.2, blend="BLENDED")
    eye_mat = make_material("FishEye", (0.10, 0.18, 0.10), 0.1, metallic=0.1, coat=0.3)
    cornea_mat = make_material("FishCornea", (0.95, 0.97, 1.0), 0.02, alpha=0.15,
                               coat=0.6, blend="BLENDED")

    meshes = []

    # Elongated tubular body (pipefish)
    body = ellipsoid("Body", (0.0, 0.0, 0.0), (0.85, 0.065, 0.065), body_mat, seg, ring)
    meshes.append(body)

    # Seahorse-like head bulge
    head = ellipsoid("Head", (-0.78, 0.0, 0.03), (0.14, 0.09, 0.11), body_mat,
                     params["eye_seg"], params["eye_ring"])
    meshes.append(head)

    # Tubular snout
    snout = tube([(-0.88, 0.0, 0.04), (-0.98, 0.0, 0.02)], 0.028,
                 max(6, params["fin_seg"] // 2), body_mat)
    snout.name = "Snout"
    meshes.append(snout)

    # Dorsal fin (small, on back mid-body)
    dorsal = ellipsoid("DorsalFin", (0.15, 0.0, 0.09), (0.22, 0.012, 0.07), fin_mat,
                       params["fin_seg"], params["fin_seg"] // 2 + 2)
    meshes.append(dorsal)

    # Anal fin (tiny, under tail base)
    anal = ellipsoid("AnalFin", (0.25, 0.0, -0.07), (0.10, 0.010, 0.04), fin_mat,
                     max(4, params["fin_seg"] // 2), params["fin_seg"] // 2 + 1)
    meshes.append(anal)

    # Pectoral fins (small, rounded, near head)
    for side in (-1, 1):
        p = ellipsoid("PectoralFin_%d" % side, (-0.62, side * 0.075, -0.01),
                      (0.11, 0.010, 0.09), fin_mat, params["fin_seg"],
                      params["fin_seg"] // 2 + 2)
        meshes.append(p)

    # Caudal fin (small, rounded)
    caudal = ellipsoid("CaudalFin", (0.95, 0.0, 0.0), (0.10, 0.012, 0.13), fin_mat,
                       params["fin_seg"], params["fin_seg"] // 2 + 2)
    meshes.append(caudal)

    # Eyes
    eye_seg = params["eye_seg"]
    eye_ring = params["eye_ring"]
    for side in (-1, 1):
        y = side * 0.055
        eye = ellipsoid("Eye_%d" % side, (-0.80, y, 0.05), (0.045, 0.03, 0.045),
                        eye_mat, eye_seg, eye_ring, uv="disc")
        meshes.append(eye)
        cornea = ellipsoid("Cornea_%d" % side, (-0.78, y, 0.055), (0.05, 0.02, 0.05),
                           cornea_mat, eye_seg, eye_ring, uv="disc")
        meshes.append(cornea)

    # Rig
    arm = bpy.data.armatures.new("FishRig")
    rig = bpy.data.objects.new("FishRig", arm)
    scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bone_specs = [
        ("Root", (-0.85, 0, 0), (-0.75, 0, 0), None),
        ("Head", (-0.85, 0, 0), (-0.45, 0, 0), "Root"),
        ("Spine", (-0.45, 0, 0), (0.35, 0, 0), "Head"),
        ("Tail", (0.35, 0, 0), (0.8, 0, 0), "Spine"),
        ("TailTip", (0.8, 0, 0), (0.95, 0, 0), "Tail"),
        ("Dorsal", (0.0, 0, 0.09), (0.3, 0, 0.12), "Spine"),
        ("Anal", (0.2, 0, -0.07), (0.35, 0, -0.08), "Spine"),
        ("Pectoral.L", (-0.62, -0.075, -0.01), (-0.5, -0.16, -0.05), "Head"),
        ("Pectoral.R", (-0.62, 0.075, -0.01), (-0.5, 0.16, -0.05), "Head"),
    ]
    for name, head, tail, parent in bone_specs:
        bone = arm.edit_bones.new(name)
        bone.head = Vector(head)
        bone.tail = Vector(tail)
        bone.use_deform = True
        if parent:
            bone.parent = arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in rig.pose.bones:
        pb.rotation_mode = "XYZ"

    bone_names = [b[0] for b in bone_specs]
    for obj in meshes:
        groups = {name: obj.vertex_groups.new(name=name) for name in bone_names}
        for v in obj.data.vertices:
            x = v.co.x
            if x < -0.45:
                w = {"Head": 1.0}
            elif x < 0.35:
                w = {"Spine": 1.0}
            elif x < 0.8:
                w = {"Tail": 1.0}
            else:
                w = {"TailTip": 1.0}
            nm = obj.name.lower()
            if "caudal" in nm:
                w = {"Tail": 0.4, "TailTip": 0.6}
            if "dorsal" in nm:
                w = {"Dorsal": 1.0}
            if "anal" in nm:
                w = {"Anal": 1.0}
            if "pectoral" in nm:
                side = "Pectoral.R" if v.co.y > 0 else "Pectoral.L"
                w = {side: 1.0}
            if "eye" in nm or "cornea" in nm or "snout" in nm or "head" in nm:
                w = {"Head": 1.0}
            for name, weight in w.items():
                if name in groups:
                    groups[name].add([v.index], weight, "REPLACE")
        obj.parent = rig
        mod = obj.modifiers.new("Armature", "ARMATURE")
        mod.object = rig

    # Actions: idle, swim, turn
    rig.animation_data_create()
    actions = {}
    clip_frames = {"idle": 48, "swim": 30, "turn": 40}

    def keyframe_bone(action, bone_name, frame, rot):
        pb = rig.pose.bones[bone_name]
        pb.rotation_euler = rot
        pb.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone_name)

    for clip, period in clip_frames.items():
        action = bpy.data.actions.new(clip)
        action.use_fake_user = True
        rig.animation_data.action = action
        for frame in range(1, period + 1):
            phase = 2.0 * math.pi * (frame - 1) / period
            if clip == "idle":
                rotations = {
                    "Head": (0.0, 0.0, 0.008 * math.sin(phase)),
                    "Spine": (0.0, 0.0, 0.004 * math.sin(phase)),
                    "Tail": (0.0, 0.0, 0.015 * math.sin(phase)),
                    "TailTip": (0.0, 0.0, 0.02 * math.sin(phase)),
                    "Pectoral.L": (0.04 * math.sin(phase), 0.0, 0.0),
                    "Pectoral.R": (0.04 * math.sin(phase + 1.0), 0.0, 0.0),
                }
            elif clip == "swim":
                rotations = {
                    "Head": (0.0, 0.0, 0.015 * math.sin(phase)),
                    "Spine": (0.0, 0.0, 0.05 * math.sin(phase)),
                    "Tail": (0.0, 0.0, 0.10 * math.sin(phase - 0.6)),
                    "TailTip": (0.0, 0.0, 0.16 * math.sin(phase - 1.2)),
                    "Pectoral.L": (0.08 * math.sin(phase * 0.5), 0.0, 0.04 * math.sin(phase)),
                    "Pectoral.R": (0.08 * math.sin(phase * 0.5 + 0.5), 0.0, -0.04 * math.sin(phase)),
                    "Dorsal": (0.0, 0.0, 0.03 * math.sin(phase)),
                }
            else:  # turn
                yaw = 0.30 * math.sin(phase)
                rotations = {
                    "Root": (0.0, yaw, 0.0),
                    "Head": (0.0, 0.18 * math.sin(phase), 0.0),
                    "Spine": (0.0, 0.10 * math.sin(phase), 0.0),
                    "Tail": (0.0, 0.05 * math.sin(phase), 0.0),
                    "TailTip": (0.0, 0.02 * math.sin(phase), 0.0),
                    "Pectoral.L": (0.0, 0.0, 0.1 * math.sin(phase)),
                    "Pectoral.R": (0.0, 0.0, -0.1 * math.sin(phase)),
                }
            for bname in bone_names:
                if bname not in rotations:
                    rotations[bname] = (0.0, 0.0, 0.0)
            for bname, rot in rotations.items():
                if bname in rig.pose.bones:
                    keyframe_bone(action, bname, frame, rot)
        try:
            curves = [c for layer in action.layers for strip in layer.strips
                      for bag in strip.channelbags for c in bag.fcurves]
        except AttributeError:
            curves = list(action.fcurves)
        for c in curves:
            for k in c.keyframe_points:
                k.interpolation = "LINEAR"
        actions[clip] = action
        track = rig.animation_data.nla_tracks.new()
        track.name = clip
        strip = track.strips.new(clip, 1, action)
        strip.blend_type = "COMBINE"
        strip.extrapolation = "NOTHING"
        track.mute = True

    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.rotation_euler = (0, 0, 0)
    scene.frame_set(1)

    # Export
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / ("pipefish-%s.glb" % lod)
    for obj in scene.objects:
        obj.select_set(False)
    rig.select_set(True)
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    flags = dict(export_animation_mode="ACTIONS", export_merge_animation="NONE",
                 export_force_sampling=False, export_frame_range=False,
                 export_anim_slide_to_zero=True,
                 export_optimize_animation_keep_anim_armature=False)
    bpy.ops.export_scene.gltf(filepath=str(out_path), export_format="GLB",
                               use_selection=True, use_active_scene=True,
                               export_animations=True, export_yup=True,
                               export_skins=True, export_materials="EXPORT",
                               export_apply=False, **flags)

    # Validate GLB
    raw = out_path.read_bytes()
    assert len(raw) > 0
    magic, version, length = struct.unpack_from("<III", raw)
    assert magic == 0x46546C67 and version == 2 and length == len(raw)
    jl, jt = struct.unpack_from("<II", raw, 12)
    doc = json.loads(raw[20:20 + jl])
    anim_names = {a["name"] for a in doc.get("animations", [])}
    assert {"idle", "swim", "turn"}.issubset(anim_names), anim_names
    mat_names = {m.get("name") for m in doc.get("materials", [])}
    assert {"FishBody", "FishFin", "FishEye", "FishCornea"}.issubset(mat_names), mat_names
    print("WROTE", out_path, len(raw), "bytes", "anims=", sorted(anim_names))

    return out_path


def main():
    assert bpy.app.background, "run Blender with --background"
    for lod in LODS:
        build_lod(lod)
    print("DONE all LODs")


if __name__ == "__main__":
    main()
