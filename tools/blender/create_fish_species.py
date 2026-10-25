"""Generate the native fish GLBs: anatomy, rig, Swim action, and three LODs.

Run with the bundled Blender, for example:
  blender --background --python tools/blender/create_fish_species.py -- \
      --species arulius-barb --flat
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from tools.blender.fish_geometry import fin, loft, sphere, tube  # noqa: E402
from tools.blender.fish_specs import SPECIES, hex_rgb, profile  # noqa: E402

BONE_NAMES = (
    "Head", "Jaw", "Gill.L", "Gill.R",
    "Spine.01", "Spine.02", "Spine.03",
    "Tail.01", "Tail.02", "TailFin",
    "Pectoral.L", "Pectoral.R", "Pelvic.L", "Pelvic.R",
    "Dorsal", "AnalFin",
)
BONE_SPECS = (
    ("Root", (-0.95, 0.0, 0.0), (-0.90, 0.0, 0.0), None, False),
    ("Head", (-1.00, 0.0, 0.0), (-0.55, 0.0, 0.0), "Root", True),
    ("Spine.01", (-0.55, 0.0, 0.0), (-0.15, 0.0, 0.0), "Head", True),
    ("Spine.02", (-0.15, 0.0, 0.0), (0.25, 0.0, 0.0), "Spine.01", True),
    ("Spine.03", (0.25, 0.0, 0.0), (0.55, 0.0, 0.0), "Spine.02", True),
    ("Tail.01", (0.55, 0.0, 0.0), (0.75, 0.0, 0.0), "Spine.03", True),
    ("Tail.02", (0.75, 0.0, 0.0), (0.90, 0.0, 0.0), "Tail.01", True),
    ("TailFin", (0.80, 0.0, 0.0), (1.00, 0.0, 0.0), "Tail.02", True),
    ("Jaw", (-0.95, 0.0, -0.05), (-1.02, 0.0, -0.08), "Head", True),
    ("Gill.L", (-0.62, -0.10, 0.0), (-0.62, -0.10, 0.20), "Head", True),
    ("Gill.R", (-0.62, 0.10, 0.0), (-0.62, 0.10, 0.20), "Head", True),
    ("Pectoral.L", (-0.40, -0.10, -0.05), (-0.15, -0.30, -0.20), "Spine.01", True),
    ("Pectoral.R", (-0.40, 0.10, -0.05), (-0.15, 0.30, -0.20), "Spine.01", True),
    ("Pelvic.L", (-0.33, -0.05, -0.20), (-0.10, -0.10, -0.32), "Spine.01", True),
    ("Pelvic.R", (-0.33, 0.05, -0.20), (-0.10, 0.10, -0.32), "Spine.01", True),
    ("Dorsal", (-0.35, 0.0, 0.30), (0.30, 0.0, 0.35), "Spine.02", True),
    ("AnalFin", (-0.20, 0.0, -0.22), (0.35, 0.0, -0.30), "Spine.02", True),
)

LOD_PARAMS = {
    "high": {"fin_roots": 9, "columns": 4, "eye_segments": 20, "eye_rings": 12,
             "gill_cols": 9, "gill_rows": 7, "barbel_sides": 7, "cap_sides": 24,
             "decal_segments": 16, "thickness": 0.008},
    "mid": {"fin_roots": 7, "columns": 3, "eye_segments": 14, "eye_rings": 8,
            "gill_cols": 7, "gill_rows": 5, "barbel_sides": 6, "cap_sides": 16,
            "decal_segments": 12, "thickness": 0.007},
    "low": {"fin_roots": 5, "columns": 2, "eye_segments": 8, "eye_rings": 6,
            "gill_cols": 5, "gill_rows": 4, "barbel_sides": 5, "cap_sides": 10,
            "decal_segments": 10, "thickness": 0.006},
}


def clamp(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def smooth(value):
    value = clamp(value)
    return value * value * (3.0 - 2.0 * value)


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--species", default="arulius-barb", choices=sorted(SPECIES))
    parser.add_argument("--variant", default=None)
    parser.add_argument("--flat", action="store_true")
    parser.add_argument("--out", default=str(ROOT / "public/models/fish"))
    parser.add_argument("--report", default=str(ROOT / "artifacts/fish-production"))
    return parser.parse_args(argv)


def flat_image(name, rgb, size=64):
    image = bpy.data.images.new(name, width=size, height=size, alpha=True)
    image.file_format = "PNG"
    pixel = (rgb[0], rgb[1], rgb[2], 1.0)
    image.pixels.foreach_set(list(pixel) * (size * size))
    image.update()
    image.pack()
    image.use_fake_user = True
    return image


def make_material(name, color, roughness, image=None, alpha=1.0, metallic=0.0, coat=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.use_backface_culling = False
    bsdf = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Alpha"].default_value = alpha
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
    if alpha < 1.0:
        material.surface_render_method = "DITHERED"
        material.use_transparent_shadow = True
    if image is not None:
        texture = material.node_tree.nodes.new("ShaderNodeTexImage")
        texture.image = image
        material.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    material.diffuse_color = (*color, alpha)
    return material


def make_materials(spec, variant, lod, flat):
    del flat  # Task 4 uses flat placeholders; Task 5 replaces them with real maps.
    body_image = flat_image("FishBody - albedo", hex_rgb(variant.body))
    fin_image = flat_image("FishFin - albedo", hex_rgb(variant.fin))
    body = make_material("FishBody", hex_rgb(variant.body), 0.46, body_image)
    fins = make_material("FishFin", hex_rgb(variant.fin), 0.38, fin_image, alpha=0.82)
    materials = {"body": body, "fin": fins, "eye": None, "cornea": None}
    if lod != "low":
        eye_image = flat_image("FishEye - iris", hex_rgb(variant.iris))
        materials["eye"] = make_material("FishEye", hex_rgb(variant.iris), 0.24, eye_image, metallic=0.12)
        materials["cornea"] = make_material("FishCornea", (0.86, 0.94, 1.0), 0.04,
                                           alpha=0.12, metallic=0.0, coat=1.0)
    return materials


class Builder:
    def __init__(self, spec, variant, lod, flat):
        self.spec = spec
        self.variant = variant
        self.lod = lod
        self.params = LOD_PARAMS[lod]
        self.materials = make_materials(spec, variant, lod, flat)
        self.meshes = []
        self.fin_data = {}
        self.scene = bpy.context.scene
        self.scene.render.fps = 24
        self.scene.frame_start, self.scene.frame_end = 1, 49

    def make_mesh(self, name, geometry, material, part, recalc=True):
        data = bpy.data.meshes.new(name)
        data.from_pydata(geometry.vertices, [], [tuple(face) for face in geometry.faces])
        data.update()
        data.validate(verbose=False)
        if recalc:
            mesh = bmesh.new()
            mesh.from_mesh(data)
            bmesh.ops.recalc_face_normals(mesh, faces=mesh.faces)
            mesh.to_mesh(data)
            mesh.free()
            data.update()
        obj = bpy.data.objects.new(name, data)
        self.scene.collection.objects.link(obj)
        data.materials.append(material)
        for polygon in data.polygons:
            polygon.use_smooth = True
        layer = data.uv_layers.new(name="UVMap")
        for polygon in data.polygons:
            for loop_index in polygon.loop_indices:
                layer.data[loop_index].uv = geometry.uvs[data.loops[loop_index].vertex_index]
        obj["fish_part"] = part
        self.meshes.append(obj)
        return obj

    def body_cap(self, t, material):
        half_height, half_width, centre = profile(self.spec.slug, t)
        x = -1.0 + 1.8 * t
        sides = self.params["cap_sides"]
        vertices = [(x, 0.0, centre)]
        uvs = [(t, 0.5)]
        for side in range(sides):
            angle = math.tau * side / sides
            vertices.append((x, half_width * math.cos(angle),
                             centre + half_height * math.sin(angle)))
            uvs.append((t, side / sides))
        faces = []
        for side in range(sides):
            nxt = 1 + (side + 1) % sides
            if t <= 0.0:
                faces.append((0, nxt, 1 + side))
            else:
                faces.append((0, 1 + side, nxt))
        from tools.blender.fish_geometry import Geometry
        return Geometry(vertices, faces, uvs)

    def gill_patch(self, side, material):
        rows, cols = self.params["gill_cols"], self.params["gill_rows"]
        vertices, faces, uvs = [], [], []
        for row in range(rows):
            x = -0.68 + 0.20 * row / (rows - 1)
            half_height, half_width, centre = profile(self.spec.slug, (x + 1.0) / 1.8)
            for column in range(cols):
                angle = -0.55 + 1.10 * column / (cols - 1)
                body_angle = angle if side > 0 else math.pi - angle
                y = half_width * math.cos(body_angle) + side * 0.006
                z = centre + half_height * math.sin(angle)
                vertices.append((x, y, z))
                uvs.append(((x + 1.0) / 1.8, (body_angle % math.tau) / math.tau))
        for row in range(rows - 1):
            for column in range(cols - 1):
                a = row * cols + column
                faces.append((a, a + cols, a + cols + 1, a + 1))
        from tools.blender.fish_geometry import Geometry
        return Geometry(vertices, faces, uvs)

    def decal(self, side, segments):
        x, _, z = self.spec.eye
        half_height, half_width, centre = profile(self.spec.slug, (x + 1.0) / 1.8)
        surface = half_width * math.sqrt(max(0.05, 1.0 - ((z - centre) / half_height) ** 2))
        y = side * (surface + 0.004)
        radius = self.spec.eye_radius * 0.95
        u0 = (x + 1.0) / 1.8
        v0 = 0.04 if side > 0 else 0.46
        vertices = [(x, y, z)]
        uvs = [(u0, v0)]
        for segment in range(segments):
            angle = math.tau * segment / segments
            vertices.append((x + radius * math.cos(angle), y, z + radius * math.sin(angle)))
            uvs.append((u0 + 0.035 * math.cos(angle), v0 + 0.035 * math.sin(angle)))
        faces = []
        for segment in range(segments):
            nxt = 1 + (segment + 1) % segments
            if side > 0:
                faces.append((0, nxt, 1 + segment))
            else:
                faces.append((0, 1 + segment, nxt))
        from tools.blender.fish_geometry import Geometry
        return Geometry(vertices, faces, uvs)

    def add_fin(self, name, roots, tips, material, part):
        geometry = fin(roots, tips, self.params["thickness"], self.params["columns"])
        obj = self.make_mesh(name, geometry, material, part)
        self.fin_data[obj] = (roots, tips)
        return obj

    def build_parts(self):
        spec, params = self.spec, self.params
        self.make_mesh("Body", loft(spec, spec.rings[self.lod], spec.sides[self.lod]),
                       self.materials["body"], "body", recalc=False)
        for t in (0.0, 1.0):
            self.make_mesh("Body cap", self.body_cap(t, self.materials["body"]),
                           self.materials["body"], "body")
        for side, label in ((-1, "L"), (1, "R")):
            self.make_mesh("Gill cover " + label, self.gill_patch(side, self.materials["body"]),
                           self.materials["body"], "gill." + label)
        self.make_mesh("Lower jaw",
                       sphere((-0.96, 0.0, -0.075), (0.055, 0.065, 0.022),
                              params["eye_segments"], params["eye_rings"]),
                       self.materials["body"], "jaw")
        if spec.barbels:
            for side, label in ((-1, "L"), (1, "R")):
                for index, (dy, dz) in enumerate(((0.025, -0.075), (0.050, -0.090))):
                    points = [(-0.98, side * dy, dz),
                              (-1.02, side * (dy + 0.015), dz - 0.02),
                              (-1.06, side * (dy + 0.030), dz - 0.05),
                              (-1.08, side * (dy + 0.040), dz - 0.08)]
                    self.make_mesh("Barbel %s%d" % (label, index),
                                   tube(points, 0.009, params["barbel_sides"]),
                                   self.materials["body"], "barbel")
        if self.lod == "low":
            for side, label in ((-1, "L"), (1, "R")):
                self.make_mesh("EyeDecal." + label, self.decal(side, params["decal_segments"]),
                               self.materials["body"], "eye_decal." + label)
        else:
            eye_x, _, eye_z = spec.eye
            half_height, half_width, centre = profile(spec.slug, (eye_x + 1.0) / 1.8)
            surface = half_width * math.sqrt(max(0.05, 1.0 - ((eye_z - centre) / half_height) ** 2))
            for side, label in ((-1, "L"), (1, "R")):
                y = side * (surface + spec.eye_radius * 0.15)
                self.make_mesh("Eye globe " + label,
                               sphere((eye_x, y, eye_z),
                                      (spec.eye_radius, spec.eye_radius * 0.55, spec.eye_radius),
                                      params["eye_segments"], params["eye_rings"]),
                               self.materials["eye"], "eye")
                self.make_mesh("Cornea " + label,
                               sphere((eye_x, y, eye_z),
                                      (spec.eye_radius * 1.12, spec.eye_radius * 0.62,
                                       spec.eye_radius * 1.12),
                                      params["eye_segments"], params["eye_rings"]),
                               self.materials["cornea"], "cornea")
        self.build_fins()

    def build_fins(self):
        count = self.params["fin_roots"]
        roots, tips = [], []
        for index in range(count):
            t = index / (count - 1)
            x = -0.55 + 0.90 * t
            half_height, half_width, centre = profile(self.spec.slug, (x + 1.0) / 1.8)
            roots.append((x, 0.0, centre + half_height * 0.98))
            lift = 0.16 + 0.10 * math.sin(math.pi * t)
            tips.append((x + 0.03 * math.sin(math.pi * t), 0.0,
                         centre + half_height * 0.98 + lift))
        self.add_fin("DorsalFin", roots, tips, self.materials["fin"], "dorsal")

        roots, tips = [], []
        for index in range(count + 2):
            t = index / (count + 1)
            z = -0.13 + 0.26 * t
            edge = abs(z) / 0.13
            roots.append((0.79, 0.0, z))
            tips.append((0.93 + 0.07 * edge, 0.0, z * 1.75))
        self.add_fin("Caudal fin", roots, tips, self.materials["fin"], "caudal")

        roots, tips = [], []
        for index in range(count):
            t = index / (count - 1)
            x = -0.30 + 0.62 * t
            half_height, half_width, centre = profile(self.spec.slug, (x + 1.0) / 1.8)
            roots.append((x, 0.0, centre - half_height * 0.98))
            tips.append((x + 0.06, 0.0,
                         centre - half_height * 0.98 - 0.10 - 0.05 * math.sin(math.pi * t)))
        self.add_fin("Anal fin", roots, tips, self.materials["fin"], "anal")

        for side, label in ((-1, "L"), (1, "R")):
            roots, tips = [], []
            for index in range(count):
                t = index / (count - 1)
                x = -0.45 + 0.12 * t
                half_height, half_width, centre = profile(self.spec.slug, (x + 1.0) / 1.8)
                roots.append((x, side * half_width * 0.92, centre - half_height * 0.10))
                tips.append((x + 0.18, side * (half_width + 0.16),
                             centre - half_height * 0.35))
            self.add_fin("Pectoral fin " + label, roots, tips,
                         self.materials["fin"], "pectoral." + label)

            roots, tips = [], []
            for index in range(max(4, count - 2)):
                t = index / (max(4, count - 2) - 1)
                x = -0.38 + 0.12 * t
                half_height, half_width, centre = profile(self.spec.slug, (x + 1.0) / 1.8)
                roots.append((x, side * half_width * 0.55, centre - half_height * 0.70))
                tips.append((x + 0.10, side * half_width * 0.75,
                             centre - half_height * 1.15))
            self.add_fin("Pelvic fin " + label, roots, tips,
                         self.materials["fin"], "pelvic." + label)

    def make_armature(self):
        armature = bpy.data.armatures.new("FishRig")
        rig = bpy.data.objects.new("FishRig", armature)
        self.scene.collection.objects.link(rig)
        bpy.context.view_layer.objects.active = rig
        rig.select_set(True)
        bpy.ops.object.mode_set(mode="EDIT")
        for name, head, tail, parent, deform in BONE_SPECS:
            bone = armature.edit_bones.new(name)
            bone.head = Vector(head)
            bone.tail = Vector(tail)
            bone.use_deform = deform
            if parent:
                bone.parent = armature.edit_bones[parent]
                if name.startswith("Spine.") or name.startswith("Tail."):
                    bone.use_connect = True
        bpy.ops.object.mode_set(mode="OBJECT")
        for pose_bone in rig.pose.bones:
            pose_bone.rotation_mode = "XYZ"
        self.rig = rig
        return rig

    def chain_weights(self, x):
        centers = (("Head", -0.80), ("Spine.01", -0.35), ("Spine.02", 0.05),
                   ("Spine.03", 0.40), ("Tail.01", 0.65), ("Tail.02", 0.85))
        if x <= centers[0][1]:
            return {centers[0][0]: 1.0}
        for (name_a, x_a), (name_b, x_b) in zip(centers, centers[1:]):
            if x <= x_b:
                blend = smooth((x - x_a) / (x_b - x_a))
                return {name_a: 1.0 - blend, name_b: blend}
        return {centers[-1][0]: 1.0}

    def projection_spans(self, vertices, roots, tips):
        spans = []
        for vertex in vertices:
            point = Vector(vertex.co)
            best_distance, best_span = 1e9, 0.0
            for root, tip in zip(roots, tips):
                start, end = Vector(root), Vector(tip)
                axis = end - start
                length_squared = axis.length_squared
                if length_squared <= 0.0:
                    continue
                span = clamp((point - start).dot(axis) / length_squared)
                distance = (point - (start + axis * span)).length_squared
                if distance < best_distance:
                    best_distance, best_span = distance, span
            spans.append(best_span)
        return spans

    def weights_for(self, obj):
        part = obj["fish_part"]
        if part == "body":
            return [self.chain_weights(vertex.co.x) for vertex in obj.data.vertices]
        if part in ("eye", "cornea", "barbel") or part.startswith("eye_decal."):
            return [{"Head": 1.0} for _ in obj.data.vertices]
        if part == "jaw":
            return [{"Jaw": 1.0} for _ in obj.data.vertices]
        if part.startswith("gill."):
            name = "Gill." + part[-1]
            return [{name: 1.0} for _ in obj.data.vertices]
        base = {
            "dorsal": ("Spine.02", "Dorsal"),
            "caudal": ("Tail.02", "TailFin"),
            "anal": ("Spine.02", "AnalFin"),
            "pectoral.L": ("Spine.01", "Pectoral.L"),
            "pectoral.R": ("Spine.01", "Pectoral.R"),
            "pelvic.L": ("Spine.01", "Pelvic.L"),
            "pelvic.R": ("Spine.01", "Pelvic.R"),
        }[part]
        roots, tips = self.fin_data[obj]
        spans = self.projection_spans(obj.data.vertices, roots, tips)
        return [{base[0]: 1.0 - span, base[1]: span} for span in spans]

    def skin_parts(self):
        for obj in self.meshes:
            groups = {name: obj.vertex_groups.new(name=name) for name in BONE_NAMES}
            weights = self.weights_for(obj)
            for vertex, vertex_weights in zip(obj.data.vertices, weights):
                total = sum(vertex_weights.values())
                if total <= 0:
                    raise ValueError("unweighted vertex in " + obj.name)
                for name, weight in vertex_weights.items():
                    if weight > 0:
                        groups[name].add([vertex.index], weight / total, "REPLACE")
            obj.parent = self.rig
            modifier = obj.modifiers.new("Armature", "ARMATURE")
            modifier.object = self.rig

    def join(self, objects, name):
        if not objects:
            raise ValueError("nothing to join into " + name)
        for obj in self.scene.objects:
            obj.select_set(False)
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        joined = bpy.context.view_layer.objects.active
        joined.name = name
        joined.data.name = name
        modifiers = [modifier for modifier in joined.modifiers if modifier.type == "ARMATURE"]
        for modifier in modifiers[1:]:
            joined.modifiers.remove(modifier)
        if not modifiers:
            modifier = joined.modifiers.new("Armature", "ARMATURE")
            modifier.object = self.rig
        return joined

    def consolidate(self):
        body_material = self.materials["body"]
        fin_material = self.materials["fin"]
        body_objects = [obj for obj in self.meshes
                        if obj.data.materials[0] == body_material
                        and not obj["fish_part"].startswith("eye_decal.")]
        eye_objects = [obj for obj in self.meshes
                       if obj["fish_part"].startswith("eye_decal.")
                       or obj.data.materials[0] == self.materials.get("eye")]
        fin_objects = [obj for obj in self.meshes
                       if obj.data.materials[0] == fin_material and obj["fish_part"] != "dorsal"]
        dorsal_objects = [obj for obj in self.meshes if obj["fish_part"] == "dorsal"]
        cornea_objects = [obj for obj in self.meshes
                          if self.materials.get("cornea") and obj.data.materials[0] == self.materials["cornea"]]
        self.join(body_objects, "FishBody")
        self.join(fin_objects, "FishFin")
        self.join(dorsal_objects, "DorsalFin")
        self.join(eye_objects, "FishEye")
        if cornea_objects:
            self.join(cornea_objects, "FishCornea")
        self.meshes = [obj for obj in self.scene.objects if obj.type == "MESH"]

    def assert_weights(self):
        weighted = set()
        for obj in self.meshes:
            for vertex in obj.data.vertices:
                total = sum(group.weight for group in vertex.groups)
                if abs(total - 1.0) > 1e-4:
                    raise ValueError("weights do not sum to one on %s vertex %d" % (obj.name, vertex.index))
                for group in vertex.groups:
                    if group.weight > 0:
                        weighted.add(obj.vertex_groups[group.group].name)
        missing = set(BONE_NAMES) - weighted
        if missing:
            raise ValueError("bones without weighted vertices: " + ", ".join(sorted(missing)))
        modifiers = [modifier for obj in self.meshes
                     for modifier in obj.modifiers if modifier.type == "ARMATURE"]
        if not modifiers or len(modifiers) != len(self.meshes):
            raise ValueError("every mesh needs exactly one armature modifier")

    def make_action(self):
        rig = self.rig
        rig.animation_data_create()
        action = bpy.data.actions.new("Swim")
        action.use_fake_user = True
        rig.animation_data.action = action
        for frame in range(1, 50):
            phase = math.tau * ((frame - 1) % 48) / 48.0
            opening = (1.0 - math.cos(phase)) * 0.5
            rotations = {
                "Head": (0.0, 0.0, -0.006 * math.sin(phase)),
                "Spine.01": (0.0, 0.0, 0.010 * math.sin(phase)),
                "Spine.02": (0.0, 0.0, 0.018 * math.sin(phase - 0.25)),
                "Spine.03": (0.0, 0.0, 0.030 * math.sin(phase - 0.50)),
                "Tail.01": (0.0, 0.0, 0.050 * math.sin(phase - 0.75)),
                "Tail.02": (0.0, 0.0, 0.075 * math.sin(phase - 1.00)),
                "TailFin": (0.0, 0.0, 0.105 * math.sin(phase - 1.25)),
                "Pectoral.L": (0.050 * math.sin(phase + 0.20), 0.0, 0.040 * math.sin(phase)),
                "Pectoral.R": (0.050 * math.sin(phase + 0.80), 0.0, -0.040 * math.sin(phase + 0.60)),
                "Pelvic.L": (0.030 * math.sin(phase + 1.20), 0.0, 0.0),
                "Pelvic.R": (0.030 * math.sin(phase + 1.60), 0.0, 0.0),
                "Dorsal": (0.0, 0.0, 0.025 * math.sin(phase + 0.40)),
                "AnalFin": (0.0, 0.0, 0.025 * math.sin(phase + 1.00)),
                "Gill.L": (0.060 * opening, 0.0, 0.0),
                "Gill.R": (-0.060 * opening, 0.0, 0.0),
                "Jaw": (0.040 * opening, 0.0, 0.0),
            }
            for pose_bone in rig.pose.bones:
                pose_bone.rotation_euler = (0.0, 0.0, 0.0)
            for name, rotation in rotations.items():
                pose_bone = rig.pose.bones[name]
                pose_bone.rotation_euler = rotation
                pose_bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=name)
        try:
            curves = [curve for layer in action.layers for strip in layer.strips
                      for bag in strip.channelbags for curve in bag.fcurves]
        except AttributeError:
            curves = list(action.fcurves)
        for curve in curves:
            for key in curve.keyframe_points:
                key.interpolation = "LINEAR"
        self.scene.frame_set(1)
        self.action = action

    def export(self, path):
        for obj in self.scene.objects:
            obj.select_set(False)
        self.rig.select_set(True)
        for obj in self.meshes:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = self.rig
        flags = dict(export_animation_mode="ACTIONS", export_merge_animation="NONE",
                     export_force_sampling=False, export_frame_range=False,
                     export_anim_slide_to_zero=True,
                     export_optimize_animation_keep_anim_armature=False)
        bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB",
                                  use_selection=True, use_active_scene=True,
                                  export_animations=True, export_yup=True,
                                  export_skins=True, export_materials="EXPORT",
                                  export_apply=False, **flags)

    def report(self, path):
        for obj in self.meshes:
            obj.data.calc_loop_triangles()
        triangles = sum(len(obj.data.loop_triangles) for obj in self.meshes)
        vertices = sum(len(obj.data.vertices) for obj in self.meshes)
        materials = sorted({material.name for obj in self.meshes for material in obj.data.materials})
        bones = [bone.name for bone in self.rig.data.bones]
        return {"species": self.spec.slug, "lod": self.lod, "triangles": triangles,
                "vertices": vertices, "materials": materials, "bones": bones,
                "bytes": path.stat().st_size}


def build_lod(spec, variant, lod, out_dir, report_dir, flat):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    builder = Builder(spec, variant, lod, flat)
    builder.build_parts()
    builder.make_armature()
    builder.skin_parts()
    builder.consolidate()
    builder.assert_weights()
    builder.make_action()
    output = Path(out_dir) / spec.family / ("%s-%s.glb" % (spec.slug, lod))
    output.parent.mkdir(parents=True, exist_ok=True)
    builder.export(output)
    facts = builder.report(output)
    Path(report_dir).mkdir(parents=True, exist_ok=True)
    report_path = Path(report_dir) / ("%s-%s.json" % (spec.slug, lod))
    report_path.write_text(json.dumps(facts, indent=2) + "\n", encoding="utf-8")
    print("WROTE", output, facts["triangles"], "triangles", facts["bytes"], "bytes")
    assert facts["triangles"] <= (12000 if spec.slug == "arulius-barb" else 10000), facts
    assert facts["bytes"] <= 1800000, facts
    return facts


def main():
    assert bpy.app.background, "run Blender with --background"
    args = parse_args()
    spec = SPECIES[args.species]
    if args.variant:
        variant = next(item for item in spec.variants if item.slug == args.variant)
    else:
        variant = spec.variants[0]
    for lod in ("high", "mid", "low"):
        build_lod(spec, variant, lod, args.out, args.report, args.flat)


if __name__ == "__main__":
    main()
