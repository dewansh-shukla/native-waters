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
import numpy as np
from mathutils import Quaternion, Vector

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from tools.blender.fish_geometry import fin, loft, sphere, tube  # noqa: E402
from tools.blender.fish_rig import (FIN_RAYS, body_attachment, bone_names,  # noqa: E402
                                    bone_specs, caudal_span, caudal_tip_share,
                                    chain_centers, fin_base_share, fin_points,
                                    plan_for, ray_rows, ray_weights, spine_segments)
from tools.blender.fish_specs import SPECIES, hex_rgb, profile  # noqa: E402
from tools.blender.fish_textures import (FIN_REGIONS, body_albedo,  # noqa: E402
                                         body_normal, body_orm, eye_albedo,
                                         eye_uv_radii, fin_albedo, fin_atlas_uv,
                                         srgb_to_linear)
from tools.assets.fish_budgets import BYTE_CAPS, TRIANGLE_CAPS  # noqa: E402


LOD_PARAMS = {
    "high": {"columns": 6, "eye_segments": 20, "eye_rings": 12,
             "gill_cols": 9, "gill_rows": 7, "barbel_sides": 7, "cap_sides": 24,
             "decal_segments": 16, "thickness": 0.008},
    "mid": {"columns": 4, "eye_segments": 14, "eye_rings": 8,
            "gill_cols": 7, "gill_rows": 5, "barbel_sides": 6, "cap_sides": 16,
            "decal_segments": 12, "thickness": 0.007},
    "low": {"columns": 3, "eye_segments": 8, "eye_rings": 6,
            "gill_cols": 5, "gill_rows": 4, "barbel_sides": 5, "cap_sides": 10,
            "decal_segments": 10, "thickness": 0.006},
}

# Where each fin's UV island sits in the shared fin atlas, as (column, row).
# One atlas keeps the arulius at four materials while giving every fin its own
# colour: a clear pectoral, a red caudal, a dusky dorsal. The danio keeps the
# old single-region map.


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
    parser.add_argument("--render", default=None)
    return parser.parse_args(argv)


def flat_image(name, rgb, size=64):
    image = bpy.data.images.new(name, width=size, height=size, alpha=True)
    image.file_format = "PNG"
    image.colorspace_settings.name = "sRGB"
    pixel = (float(rgb[0]), float(rgb[1]), float(rgb[2]), 1.0)
    image.pixels.foreach_set(list(pixel) * (size * size))
    image.update()
    image.pack()
    image.use_fake_user = True
    return image


def make_material(name, color, roughness, image=None, normal=None, orm=None,
                  alpha=1.0, metallic=0.0, coat=0.0, blend=None, transmission=0.0,
                  specular=None, normal_strength=0.50, coat_roughness=None,
                  alpha_from_image=False):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.use_backface_culling = False
    bsdf = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    linear = srgb_to_linear(np.asarray(color, dtype=np.float32))
    factor = (1.0, 1.0, 1.0, 1.0) if image is not None else (
        float(linear[0]), float(linear[1]), float(linear[2]), 1.0)
    bsdf.inputs["Base Color"].default_value = factor
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Alpha"].default_value = alpha
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
    if coat_roughness is not None and "Coat Roughness" in bsdf.inputs:
        bsdf.inputs["Coat Roughness"].default_value = coat_roughness
    if specular is not None and "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = specular
    if "Transmission Weight" in bsdf.inputs and transmission > 0.0:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    if alpha < 1.0 or alpha_from_image:
        material.surface_render_method = blend or "DITHERED"
        material.use_transparent_shadow = True
    elif blend:
        material.surface_render_method = blend
    if image is not None:
        texture = material.node_tree.nodes.new("ShaderNodeTexImage")
        texture.image = image
        material.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
        if alpha_from_image:
            # The fin map carries per-pixel translucency; without this link the
            # exporter would write a flat alpha factor and the membrane's edge
            # would stay as solid as its root.
            material.node_tree.links.new(texture.outputs["Alpha"], bsdf.inputs["Alpha"])
    if normal is not None:
        texture = material.node_tree.nodes.new("ShaderNodeTexImage")
        texture.image = normal
        normal_map = material.node_tree.nodes.new("ShaderNodeNormalMap")
        normal_map.inputs["Strength"].default_value = normal_strength
        material.node_tree.links.new(texture.outputs["Color"], normal_map.inputs["Color"])
        material.node_tree.links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    if orm is not None:
        texture = material.node_tree.nodes.new("ShaderNodeTexImage")
        texture.image = orm
        separate = material.node_tree.nodes.new("ShaderNodeSeparateColor")
        material.node_tree.links.new(texture.outputs["Color"], separate.inputs["Color"])
        material.node_tree.links.new(separate.outputs["Green"], bsdf.inputs["Roughness"])
        material.node_tree.links.new(separate.outputs["Blue"], bsdf.inputs["Metallic"])
    material.diffuse_color = (float(linear[0]), float(linear[1]), float(linear[2]), alpha)
    return material


def make_materials(spec, variant, lod, flat, texture_dir=None):
    if flat:
        body_image = flat_image("FishBody - albedo", hex_rgb(variant.body))
        fin_image = flat_image("FishFin - albedo", hex_rgb(variant.fin))
        body = make_material("FishBody", hex_rgb(variant.body), 0.42, body_image, coat=0.25)
        fins = make_material("FishFin", hex_rgb(variant.fin), 0.38, fin_image,
                             alpha=0.82, blend="BLENDED")
        materials = {"body": body, "fin": fins, "eye": None, "cornea": None}
        if lod != "low":
            eye_image = flat_image("FishEye - iris", hex_rgb(variant.iris))
            materials["eye"] = make_material("FishEye", hex_rgb(variant.iris), 0.12,
                                             eye_image, metallic=0.0)
            materials["cornea"] = make_material("FishCornea", (0.82, 0.90, 1.0), 0.02,
                                                alpha=0.05, metallic=0.0, coat=0.5,
                                                blend="BLENDED")
        return materials

    # Albedo stays at 1024 for high/mid; the normal map is 1024 at high only
    # for species that carry one variant (the Arulius) - five danio variants
    # share one HIGH texture-memory budget, so theirs stays at 512.
    albedo_size = 512 if lod == "low" else 1024
    normal_size = {"high": spec.normal_high, "mid": 512, "low": 256}[lod]
    lod_dir = (Path(texture_dir) / lod) if texture_dir is not None else None
    albedo = body_albedo(spec, variant, albedo_size,
                         path=(lod_dir / "body-albedo.jpg") if lod_dir else None,
                         eye_spots=(lod == "low"))
    normal = body_normal(spec, normal_size,
                         path=(lod_dir / "body-normal.png") if lod_dir else None)
    orm = None
    if lod != "low":
        orm = body_orm(spec, 512, path=(lod_dir / "body-orm.png") if lod_dir else None)
    body = make_material("FishBody", hex_rgb(variant.body), 0.34,
                         image=albedo, normal=normal, orm=orm, coat=0.20,
                         specular=0.35, normal_strength=0.82, coat_roughness=0.22)
    # The arulius fin atlas is 2x3 tiles; 256 px total keeps the ray comb
    # crisp at high and mid, and 128 at low keeps the GLB inside 250 kB.
    if spec.slug in ("arulius-barb", "ticto-barb"):
        fin_size = 128 if lod == "low" else 256
    else:
        fin_size = 128
    fin_image = fin_albedo(spec, variant, fin_size,
                           path=(lod_dir / "fin-albedo.png") if lod_dir else None,
                           rays=(spec.fin_rays or {}).get(
                               lod, {"high": 11, "mid": 7, "low": 5}[lod]))
    # The alpha now lives in the map, so the factor stays at 1.0 and the
    # membrane fades from an opaque root to a translucent trailing edge.
    fins = make_material("FishFin", hex_rgb(variant.fin), 0.32, fin_image,
                         blend="BLENDED", alpha_from_image=True,
                         transmission=0.0 if lod == "low" else 0.4,
                         specular=0.35, coat=0.12)
    materials = {"body": body, "fin": fins, "eye": None, "cornea": None}
    if lod != "low":
        # 256 is enough for the largest on-screen eye; the five danio variants
        # share one HIGH texture-memory budget, so a bigger map costs 6 MB for
        # detail no one can see at aquarium distance.
        eye_image = eye_albedo(variant, 256,
                               path=(lod_dir / "eye-albedo.png") if lod_dir else None)
        materials["eye"] = make_material("FishEye", hex_rgb(variant.iris), 0.14,
                                         image=eye_image, metallic=0.0, coat=0.40,
                                         specular=0.50, coat_roughness=0.05)
        # The cornea is a clear, near-white dome. Its alpha stays very low so
        # the pupil underneath reads black instead of milky grey; the wet
        # highlight comes from the coat on the globe itself.
        materials["cornea"] = make_material("FishCornea", (0.94, 0.96, 1.0), 0.03,
                                            alpha=0.05, metallic=0.0, coat=0.50,
                                            blend="BLENDED", specular=0.55,
                                            coat_roughness=0.02)
    return materials


class Builder:
    def __init__(self, spec, variant, lod, flat, texture_dir=None):
        self.spec = spec
        self.variant = variant
        self.lod = lod
        self.params = LOD_PARAMS[lod]
        self.plan = plan_for(lod)
        self.rays = FIN_RAYS[lod]
        self.bone_names = bone_names(lod)
        self.materials = make_materials(spec, variant, lod, flat, texture_dir)
        self.meshes = []
        self.fin_data = {}
        self.row_positions = {}
        self.scene = bpy.context.scene
        self.scene.render.fps = 24
        self.scene.frame_start, self.scene.frame_end = 1, 25

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
        # The front cap is domed forward so the snout ends in a rounded nose
        # instead of a flat disc; the rear cap stays a flat fan.
        domes = 3 if t <= 0.0 else 0
        bulge = 0.8 * half_height if t <= 0.0 else 0.0
        vertices = [(x - bulge, 0.0, centre)]
        uvs = [(t, 0.5)]
        for ring in range(1, domes + 1):
            phi = 0.5 * math.pi * ring / (domes + 1)
            scale = math.sin(phi)
            offset = -math.cos(phi) * bulge
            for side in range(sides):
                angle = math.tau * side / sides
                vertices.append((x + offset, half_width * scale * math.cos(angle),
                                 centre + half_height * scale * math.sin(angle)))
                uvs.append((t, side / sides))
        for side in range(sides):
            angle = math.tau * side / sides
            vertices.append((x, half_width * math.cos(angle),
                            centre + half_height * math.sin(angle)))
            uvs.append((t, side / sides))
        rings = [[0]]
        for _ring in range(domes + 1):
            start = rings[-1][-1] + 1
            rings.append(list(range(start, start + sides)))
        faces = []
        for level in range(len(rings) - 1):
            lower, upper = rings[level], rings[level + 1]
            if len(lower) == 1:
                for side in range(sides):
                    nxt = upper[(side + 1) % sides]
                    faces.append((lower[0], upper[side], nxt))
            else:
                for side in range(sides):
                    a = lower[side]
                    b = lower[(side + 1) % sides]
                    c = upper[(side + 1) % sides]
                    d = upper[side]
                    faces.append((a, b, c, d))
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
        y = side * (surface + 0.002)
        radius = self.spec.eye_radius * 0.95
        u0 = (x + 1.0) / 1.8
        v0 = 0.0 if side > 0 else 0.5
        # Sample the same world-round UV ellipse the body paint uses (u is
        # stretched across the body length, v only wraps the local girth), so
        # the decal shows the full painted eye instead of a zoomed, offset crop.
        ru, rv = eye_uv_radii(self.spec)
        vertices = [(x, y, z)]
        uvs = [(u0, v0)]
        for segment in range(segments):
            angle = math.tau * segment / segments
            vertices.append((x + radius * math.cos(angle), y, z + radius * math.sin(angle)))
            uvs.append((u0 + ru * math.cos(angle), v0 + rv * math.sin(angle)))
        faces = []
        for segment in range(segments):
            nxt = 1 + (segment + 1) % segments
            if side > 0:
                faces.append((0, nxt, 1 + segment))
            else:
                faces.append((0, 1 + segment, nxt))
        from tools.blender.fish_geometry import Geometry
        return Geometry(vertices, faces, uvs)

    def sculpt_body(self, obj):
        """Press the head landmarks into the loft without adding triangles.

        The body is a bare loft, and at the review distance a smooth cone reads
        as rubber. An eye socket, an operculum seam, a mouth crease and a
        nostril are each a short radial displacement, so the silhouette gains
        structure while the triangle budget stays put.
        """
        spec = self.spec
        eye_x, _, eye_z = spec.eye
        radius = spec.eye_radius
        base_gill = {"stripes": 0.20, "band": 0.245}.get(spec.pattern, 0.236)
        for vertex in obj.data.vertices:
            x, y, z = vertex.co
            t = clamp((x + 1.0) / 1.8)
            half_height, half_width, centre = profile(spec.slug, t)
            across = y / max(half_width, 1e-6)
            height = (z - centre) / max(half_height, 1e-6)
            length = math.hypot(across, height) or 1.0
            # Radial direction of the cross-section, so a push keeps the
            # profile shape instead of denting along one world axis.
            normal = (across / length, height / length)
            flank = clamp(abs(across))
            push = 0.0
            # Eye socket: a shallow dish the globe seats into. A deeper dish
            # than the old one keeps the sunk globe from reading as a wart.
            du = (x - eye_x) / (radius * 1.10)
            dz = (z - eye_z) / (radius * 1.35)
            socket = math.exp(-(du * du + dz * dz)) * flank ** 2
            push -= radius * 0.44 * socket
            # Operculum: the gill-cover edge stands proud, the seam behind it
            # cuts in, so the cover reads as a plate over the flank.
            gill_u = base_gill - 0.020 * abs(height) ** 1.2
            dx = ((x + 1.0) / 1.8 - gill_u) / 0.006
            side_band = clamp(1.0 - abs(height) ** 3)
            seam = math.exp(-dx * dx) * side_band
            lip = math.exp(-((dx - 1.4) / 0.9) ** 2) * side_band
            push += (0.0016 * lip - 0.0032 * seam) * flank ** 2
            # Mouth: a gape groove running back from the snout on each flank,
            # plus a small crease under the jaw.
            gape = (math.exp(-(((x + 0.955) / 0.030) ** 2))
                    * math.exp(-(((abs(height) - 0.30) / 0.16) ** 2)))
            push -= 0.0050 * gape * flank ** 2
            # Nostril: a dimple on the upper snout.
            nostril = math.exp(-(((x + 0.917) / 0.020) ** 2
                                 + ((height - 0.34) / 0.20) ** 2))
            push -= 0.0024 * nostril * flank ** 2
            if push == 0.0:
                continue
            vertex.co = (x + 0.0, y + normal[0] * push, z + normal[1] * push)

    def add_fin(self, name, roots, tips, material, part, region=None):
        geometry = fin(roots, tips, self.params["thickness"], self.params["columns"])
        if region is not None:
            geometry.uvs = [fin_atlas_uv(u, v, region) for u, v in geometry.uvs]
        obj = self.make_mesh(name, geometry, material, part)
        self.fin_data[obj] = (roots, tips)
        count = len(roots)
        self.row_positions[obj] = [index / (count - 1) for index in range(count)]
        return obj

    def build_parts(self):
        spec, params = self.spec, self.params
        body = self.make_mesh("Body", loft(spec, spec.rings[self.lod], spec.sides[self.lod]),
                              self.materials["body"], "body", recalc=False)
        self.sculpt_body(body)
        for t in (0.0, 1.0):
            self.make_mesh("Body cap", self.body_cap(t, self.materials["body"]),
                           self.materials["body"], "body")
        if spec.barbels:
            for side, label in ((-1, "L"), (1, "R")):
                points = [(-0.975, side * 0.030, -0.040),
                          (-0.995, side * 0.036, -0.052),
                          (-1.012, side * 0.040, -0.064)]
                self.make_mesh("Barbel " + label,
                               tube(points, 0.0032, params["barbel_sides"]),
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
                # A fish eye is nearly flush: a shallow lens set into the
                # socket, not a ball stuck on the flank. The old offset left
                # almost half the globe proud, which read as a googly eye.
                y = side * (surface - spec.eye_radius * 0.52)
                self.make_mesh("Eye globe " + label,
                               sphere((eye_x, y, eye_z),
                                      (spec.eye_radius, spec.eye_radius * 0.56,
                                       spec.eye_radius),
                                      params["eye_segments"], params["eye_rings"],
                                      uv="disc"),
                               self.materials["eye"], "eye")
                self.make_mesh("Cornea " + label,
                               sphere((eye_x, y, eye_z),
                                      (spec.eye_radius * 1.04, spec.eye_radius * 0.60,
                                       spec.eye_radius * 1.04),
                                      params["eye_segments"], params["eye_rings"],
                                      uv="disc"),
                               self.materials["cornea"], "cornea")
        self.build_fins()

    def build_fins(self):
        # One mesh row per ray, sampled from the same polylines the armature
        # places its ray bones on, so a ray owns its membrane row outright and
        # the ripple is not averaged away between neighbours.
        points = fin_points(self.spec, self.rays)
        atlas = FIN_REGIONS if self.spec.slug in ("arulius-barb", "ticto-barb") else None

        def region(key):
            return atlas.get(key) if atlas else None

        for key, part, name in (("dorsal", "dorsal", "DorsalFin"),
                                ("anal", "anal", "Anal fin"),
                                ("caudal", "caudal", "Caudal fin")):
            roots, tips = points[key]
            self.add_fin(name, roots, tips, self.materials["fin"], part,
                         region=region(key))

        for side, label in ((-1, "L"), (1, "R")):
            roots, tips = points["pectoral." + label]
            self.add_fin("Pectoral fin " + label, roots, tips,
                         self.materials["fin"], "pectoral." + label,
                         region=region("pectoral"))
            roots, tips = points["pelvic." + label]
            self.add_fin("Pelvic fin " + label, roots, tips,
                         self.materials["fin"], "pelvic." + label,
                         region=region("pelvic"))

    def make_armature(self):
        armature = bpy.data.armatures.new("FishRig")
        rig = bpy.data.objects.new("FishRig", armature)
        self.scene.collection.objects.link(rig)
        bpy.context.view_layer.objects.active = rig
        rig.select_set(True)
        bpy.ops.object.mode_set(mode="EDIT")
        self.bone_specs = bone_specs(self.spec, self.lod, self.rays)
        for name, head, tail, parent, deform in self.bone_specs:
            bone = armature.edit_bones.new(name)
            bone.head = Vector(head)
            bone.tail = Vector(tail)
            bone.use_deform = deform
            if parent:
                parent_bone = armature.edit_bones[parent]
                bone.parent = parent_bone
                # Connect only where the head already sits on the parent tail, so
                # chained segments stay welded without moving detail bones.
                if (Vector(head) - parent_bone.tail).length <= 1e-6:
                    bone.use_connect = True
        bpy.ops.object.mode_set(mode="OBJECT")
        for pose_bone in rig.pose.bones:
            pose_bone.rotation_mode = "XYZ"
        self.rig = rig
        return rig

    def chain_weights(self, x):
        centers = chain_centers(self.spec, self.plan)
        if x <= centers[0][1]:
            return {centers[0][0]: 1.0}
        for (name_a, x_a), (name_b, x_b) in zip(centers, centers[1:]):
            if x <= x_b:
                blend = smooth((x - x_a) / (x_b - x_a))
                return {name_a: 1.0 - blend, name_b: blend}
        return {centers[-1][0]: 1.0}

    def projection_map(self, vertices, roots, tips, row_positions):
        """(span along the nearest ray, canonical row, root point)."""
        result = []
        for vertex in vertices:
            point = Vector(vertex.co)
            best_distance, best_span, best_row = 1e9, 0.0, 0
            for index, (root, tip) in enumerate(zip(roots, tips)):
                start, end = Vector(root), Vector(tip)
                axis = end - start
                length_squared = axis.length_squared
                if length_squared <= 0.0:
                    continue
                span = clamp((point - start).dot(axis) / length_squared)
                distance = (point - (start + axis * span)).length_squared
                if distance < best_distance:
                    best_distance, best_span, best_row = distance, span, index
            result.append((best_span, row_positions[best_row], tuple(roots[best_row])))
        return result

    def top_four(self, weights):
        """Keep the four strongest influences and renormalise to one."""
        kept = sorted(((value, name) for name, value in weights.items() if value > 1e-6),
                      reverse=True)[:4]
        total = sum(value for value, _ in kept)
        if total <= 0.0:
            raise ValueError("no positive skin weight")
        return {name: value / total for value, name in kept}

    def weights_for(self, obj):
        part = obj["fish_part"]
        if part == "body":
            result = []
            for vertex in obj.data.vertices:
                weights = self.chain_weights(vertex.co.x)
                half_height, half_width, centre = profile(
                    self.spec.slug, clamp((vertex.co.x + 1.0) / 1.8))
                front = smooth((vertex.co.x + 0.70) / 0.06)
                back = smooth((-0.48 - vertex.co.x) / 0.06)
                lateral = smooth((abs(vertex.co.y) / max(half_width, 1e-6) - 0.35) / 0.30)
                mask = front * back * lateral
                if mask > 0.0:
                    gill = 0.55 * mask
                    weights = {name: value * (1.0 - gill) for name, value in weights.items()}
                    side = "Gill.L" if vertex.co.y < 0.0 else "Gill.R"
                    weights[side] = gill
                jaw_front = smooth((-0.93 - vertex.co.x) / 0.05)
                jaw_lower = smooth((centre - vertex.co.z) / max(half_height * 0.55, 1e-6))
                jaw = 0.55 * jaw_front * jaw_lower
                if jaw > 0.0:
                    weights = {name: value * (1.0 - jaw) for name, value in weights.items()}
                    weights["Jaw"] = jaw
                if "Hyoid" in self.bone_names:
                    # Floor of the mouth behind the mandible: it follows the
                    # gape so the throat does not shear against the jaw.
                    hyoid = (0.34
                             * smooth((-0.865 - vertex.co.x) / 0.045)
                             * smooth((vertex.co.x + 0.975) / 0.035)
                             * jaw_lower)
                    if hyoid > 0.0:
                        weights = {name: value * (1.0 - hyoid)
                                   for name, value in weights.items()}
                        weights["Hyoid"] = hyoid
                if "UpperJaw" in self.bone_names:
                    # The upper lip lifts a little against the mandible, which
                    # is what makes a gape read as a mouth rather than a slot.
                    upper = (0.40
                             * smooth((-0.950 - vertex.co.x) / 0.040)
                             * smooth((vertex.co.z - centre)
                                     / max(half_height * 0.40, 1e-6)))
                    if upper > 0.0:
                        weights = {name: value * (1.0 - upper)
                                   for name, value in weights.items()}
                        weights["UpperJaw"] = upper
                result.append(weights)
            return result
        if part in ("eye", "cornea"):
            side = "Eye.L" if obj.data.vertices[0].co.y < 0.0 else "Eye.R"
            if side in self.bone_names:
                return [{side: 1.0} for _ in obj.data.vertices]
            return [{"Head": 1.0} for _ in obj.data.vertices]
        if part == "barbel" or part.startswith("eye_decal."):
            return [{"Head": 1.0} for _ in obj.data.vertices]
        if part == "jaw":
            return [{"Jaw": 1.0} for _ in obj.data.vertices]
        if part.startswith("gill."):
            name = "Gill." + part[-1]
            return [{name: 1.0} for _ in obj.data.vertices]
        roots, tips = self.fin_data[obj]
        projections = self.projection_map(obj.data.vertices, roots, tips,
                                          self.row_positions[obj])
        _, _, centre, spread = caudal_span(self.spec)
        result = []
        for vertex, (span, row, root) in zip(obj.data.vertices, projections):
            # Only the attachment band stays on the body chain; the rest of the
            # fin is owned by its own bones so it can ripple along the rays.
            attached = body_attachment(span)
            # A fin's root belongs to one body segment, not a blend of two: the
            # nearest bone in the spine chain, so a pectoral rides the shoulder.
            chain = self.chain_weights(root[0])
            anchor = max(chain.items(), key=lambda item: item[1])[0]
            weights = {anchor: attached}
            share = 1.0 - attached
            # The membrane root stays on the fin's base bone; past ~42% of the
            # span the ray bones own the vertex outright, which is what lets a
            # fin bend along its rays instead of swinging as a plate.
            base = fin_base_share(span)
            if part == "caudal":
                label = "U" if row >= 0.5 else "L"
                # The membrane root is shared between the peduncle bone and the
                # lobe it belongs to; past the root band the fan's rayon bones
                # take over so the lobes can cup and feather independently.
                weights["TailFin"] = share * base * 0.35
                weights["TailFin." + label] = share * base * 0.65
                if not self.plan.caudal_rays:
                    weights["TailFin.U"] = weights.get("TailFin.U", 0.0) \
                        + share * (1.0 - base) * 0.5
                    weights["TailFin.L"] = weights.get("TailFin.L", 0.0) \
                        + share * (1.0 - base) * 0.5
                    result.append(self.top_four(weights))
                    continue
                local = (row - 0.5) * 2.0 if label == "U" else (0.5 - row) * 2.0
                lobe_rows = max(1, (len(roots) - 1) // 2)
                stations = ray_rows(lobe_rows, self.plan.caudal_rays)
                tip = caudal_tip_share(span) if self.plan.caudal_tips else 0.0
                for index, value in ray_weights(local, stations):
                    weights["TailFin.%s.%d" % (label, index + 1)] = \
                        share * (1.0 - base) * (1.0 - tip) * value
                if tip > 0.0:
                    weights["TailFin.%s.Tip" % label] = share * (1.0 - base) * tip
            elif part == "dorsal":
                weights["Dorsal"] = share * base
                stations = ray_rows(len(roots), self.plan.dorsal_rays)
                for index, value in ray_weights(row, stations):
                    weights["Dorsal.Ray.%d" % (index + 1)] = \
                        share * (1.0 - base) * value
                if not stations:
                    weights["Dorsal"] = share
            elif part == "anal":
                weights["AnalFin"] = share * base
                stations = ray_rows(len(roots), self.plan.anal_rays)
                for index, value in ray_weights(row, stations):
                    weights["AnalRay.%d" % (index + 1)] = \
                        share * (1.0 - base) * value
                if not stations:
                    weights["AnalFin"] = share
            elif part.startswith("pectoral."):
                label = part[-1]
                base_bone = "Pectoral." + label
                weights[base_bone] = share * base
                stations = ray_rows(len(roots), self.plan.pectoral_rays)
                for index, value in ray_weights(row, stations):
                    weights["PectoralRay.%s.%d" % (label, index + 1)] = \
                        share * (1.0 - base) * value
                if not stations:
                    weights[base_bone] = share
            else:
                label = part[-1]
                base_bone = "Pelvic." + label
                weights[base_bone] = share * base
                stations = ray_rows(len(roots), self.plan.pelvic_rays)
                for index, value in ray_weights(row, stations):
                    weights["PelvicRay.%s.%d" % (label, index + 1)] = \
                        share * (1.0 - base) * value
                if not stations:
                    weights[base_bone] = share
            result.append(self.top_four(weights))
        return result

    def skin_parts(self):
        for obj in self.meshes:
            groups = {name: obj.vertex_groups.new(name=name) for name in self.bone_names}
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
                influences = [group for group in vertex.groups if group.weight > 0]
                if len(influences) > 4:
                    raise ValueError("more than four influences on %s vertex %d"
                                     % (obj.name, vertex.index))
                for group in influences:
                    weighted.add(obj.vertex_groups[group.group].name)
        missing = set(self.bone_names) - weighted
        if missing:
            raise ValueError("bones without weighted vertices: " + ", ".join(sorted(missing)))
        modifiers = [modifier for obj in self.meshes
                     for modifier in obj.modifiers if modifier.type == "ARMATURE"]
        if not modifiers or len(modifiers) != len(self.meshes):
            raise ValueError("every mesh needs exactly one armature modifier")

    def lateral_local_axis(self, bone):
        """Bone-local axis whose rotation swings the tip straight sideways.

        A fin ray can point up, down or backwards, so neither of its local
        euler axes is lateral in general. The axis that moves the tip along the
        fish's width is `(tail-head) x world_up x ...`; this returns that axis
        expressed in the bone's own rest space, which is what a pose quaternion
        needs.
        """
        direction = (bone.tail_local - bone.head_local).normalized()
        lateral = Vector((-direction.z, 0.0, direction.x))
        if lateral.length < 1e-6:
            lateral = Vector((0.0, 0.0, 1.0))
        rotation = bone.matrix_local.to_3x3().inverted()
        return (rotation @ lateral.normalized()).normalized()

    def make_action(self):
        rig = self.rig
        plan = self.plan
        rig.animation_data_create()
        action = bpy.data.actions.new("Swim")
        action.use_fake_user = True
        rig.animation_data.action = action
        # One second holds three tail beats, two gill beats and one pectoral
        # scull, so every oscillator closes its loop exactly. The body wave has
        # a 1.1 body-length wavelength and an amplitude that grows from the nape
        # to the tail tip, per the measured zebrafish gait.
        beat = 3.0
        wavelength = 1.1 * 1.8
        segments = spine_segments(self.spec, plan)

        # Every ray bone is driven by quaternion about a computed lateral axis,
        # so the sway does not depend on the bone roll glTF derives from the
        # rest pose. Base fins and the body stay on euler.
        ray_bones = []
        for side in ("L", "R"):
            ray_bones += ["PectoralRay.%s.%d" % (side, index + 1)
                          for index in range(plan.pectoral_rays)]
            ray_bones += ["PelvicRay.%s.%d" % (side, index + 1)
                          for index in range(plan.pelvic_rays)]
        ray_bones += ["Dorsal.Ray.%d" % (index + 1) for index in range(plan.dorsal_rays)]
        ray_bones += ["AnalRay.%d" % (index + 1) for index in range(plan.anal_rays)]
        for label in ("U", "L"):
            ray_bones += ["TailFin.%s.%d" % (label, index + 1)
                          for index in range(plan.caudal_rays)]
        if plan.caudal_tips:
            ray_bones += ["TailFin.U.Tip", "TailFin.L.Tip"]
        ray_bones = [name for name in ray_bones if name in rig.pose.bones]
        lateral_axes = {name: self.lateral_local_axis(rig.data.bones[name])
                        for name in ray_bones}
        for name in lateral_axes:
            rig.pose.bones[name].rotation_mode = "QUATERNION"

        dorsal_phase = math.tau * (0.55 + 0.80) / wavelength
        anal_phase = math.tau * (0.20 + 0.80) / wavelength
        for frame in range(1, 26):
            time = (frame - 1) / 24.0
            tail = math.tau * beat * time
            gill = math.tau * 2.0 * time
            scull = math.tau * 1.0 * time
            flutter = math.tau * 2.0 * time
            opening = 0.5 - 0.5 * math.cos(gill)
            rotations = {}
            rotations["Head"] = (0.0, 0.0, 0.008 * math.sin(tail))
            for name, head, tail_x, _ in segments:
                x = 0.5 * (head + tail_x)
                progress = clamp((x + 0.55) / 1.50)
                amplitude = 0.010 + 0.105 * progress ** 1.7
                phase = math.tau * (x + 0.80) / wavelength
                rotations[name] = (0.0, 0.0, amplitude * math.sin(tail - phase))
            rotations["Dorsal"] = (0.0, 0.0, 0.014 * math.sin(tail - dorsal_phase))
            rotations["AnalFin"] = (0.0, 0.0, 0.018 * math.sin(tail - anal_phase))
            # Pectorals scull on their own slow cycle; they never flap in tail
            # phase. The two sides are slightly offset so the fish hovers.
            rotations["Pectoral.L"] = (0.10 * math.sin(scull), 0.0,
                                       0.055 * math.sin(scull + 0.6))
            rotations["Pectoral.R"] = (0.10 * math.sin(scull + 0.9), 0.0,
                                       -0.055 * math.sin(scull + 1.5))
            rotations["Pelvic.L"] = (0.020 * math.sin(scull + 1.2), 0.0, 0.0)
            rotations["Pelvic.R"] = (0.020 * math.sin(scull + 1.9), 0.0, 0.0)
            # Caudal torsion. The fin rolls about its chord axis a quarter
            # cycle ahead of the heave, so it presents a face on the power
            # stroke and feathers on recovery.
            rotations["TailFin"] = (0.0, 0.11 * math.sin(tail + math.pi / 2),
                                    rotations["TailFin"][2] + 0.05 * math.sin(tail))
            lobe_phase = tail + math.pi / 2.0 - math.tau * 0.06
            cup = 0.05 * math.sin(tail + math.pi)
            rotations["TailFin.U"] = (0.0, 0.18 * math.sin(lobe_phase), cup)
            rotations["TailFin.L"] = (0.0, 0.18 * math.sin(lobe_phase), -cup)
            rotations["Gill.L"] = (0.060 * opening, 0.0, 0.0)
            rotations["Gill.R"] = (-0.060 * opening, 0.0, 0.0)
            rotations["Jaw"] = (0.030 * opening, 0.0, 0.0)
            if plan.hyoid:
                rotations["Hyoid"] = (0.018 * opening, 0.0, 0.0)
            if plan.upper_jaw:
                rotations["UpperJaw"] = (-0.010 * opening, 0.0, 0.0)
            if plan.eyes:
                # A slow drift, not a twitch: it catches the light on the iris
                # and keeps the globe from looking like a glass bead.
                drift = math.tau * 1.0 * time
                rotations["Eye.L"] = (0.0, 0.0, 0.030 * math.sin(drift))
                rotations["Eye.R"] = (0.0, 0.0, 0.030 * math.sin(drift + 0.7))
            rotations["Root"] = (0.0, 0.0, 0.0)

            # Median fins ripple front to back: each ray lags the one ahead of
            # it, so a wave travels along the membrane instead of the whole fin
            # pivoting as one plate.
            swings = {}
            for index in range(plan.dorsal_rays):
                lag = math.tau * 0.085 * index
                sway = (0.105 + 0.010 * index) * math.sin(tail - dorsal_phase - lag)
                sway += 0.024 * math.sin(flutter - math.tau * 0.05 * index)
                swings["Dorsal.Ray.%d" % (index + 1)] = (sway, 0.28 * sway)
            for index in range(plan.anal_rays):
                lag = math.tau * 0.15 * index
                sway = (0.098 + 0.022 * index) * math.sin(tail - anal_phase - lag)
                sway += 0.026 * math.sin(flutter - math.tau * 0.08 * index)
                swings["AnalRay.%d" % (index + 1)] = (sway, -0.28 * sway)
            for side, offset in (("L", 0.0), ("R", 0.9)):
                for index in range(plan.pectoral_rays):
                    lag = math.tau * 0.10 * index
                    sway = (0.060 + 0.010 * index) * math.sin(scull - lag + offset)
                    swings["PectoralRay.%s.%d" % (side, index + 1)] = (sway, 0.0)
                for index in range(plan.pelvic_rays):
                    lag = math.tau * 0.12 * index
                    sway = (0.030 + 0.006 * index) * math.sin(
                        scull - lag + (1.2 if side == "L" else 1.9))
                    swings["PelvicRay.%s.%d" % (side, index + 1)] = (sway, 0.0)
            for label, sign, offset in (("U", 1, 0.0), ("L", -1, 0.8)):
                for index in range(plan.caudal_rays):
                    lag = math.tau * 0.06 * index
                    sway = (0.070 + 0.012 * index) * math.sin(tail - lag + offset)
                    swings["TailFin.%s.%d" % (label, index + 1)] = (sway, sign * 0.20 * sway)
                if plan.caudal_tips:
                    swings["TailFin.%s.Tip" % label] = (
                        0.085 * math.sin(flutter + math.pi / 2
                                         - math.tau * (0.0 if label == "U" else 0.06)),
                        0.0)

            for pose_bone in rig.pose.bones:
                if pose_bone.rotation_mode == "QUATERNION":
                    pose_bone.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
                else:
                    pose_bone.rotation_euler = (0.0, 0.0, 0.0)
            for name, rotation in rotations.items():
                pose_bone = rig.pose.bones[name]
                pose_bone.rotation_euler = rotation
                pose_bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=name)
            for name, (sway, twist) in swings.items():
                pose_bone = rig.pose.bones[name]
                pose_bone.rotation_quaternion = (
                    Quaternion(lateral_axes[name], sway) @ Quaternion((0.0, 1.0, 0.0), twist))
                pose_bone.keyframe_insert(data_path="rotation_quaternion", frame=frame,
                                          group=name)
        try:
            curves = [curve for layer in action.layers for strip in layer.strips
                      for bag in strip.channelbags for curve in bag.fcurves]
        except AttributeError:
            curves = list(action.fcurves)
        for curve in curves:
            for key in curve.keyframe_points:
                key.interpolation = "LINEAR"
        keyed = set()
        for curve in curves:
            if curve.data_path.startswith('pose.bones["'):
                keyed.add(curve.data_path.split('"')[1])
        missing = set(self.bone_names) - keyed
        if missing:
            raise ValueError("action missing bone: " + ", ".join(sorted(missing)))
        self.scene.frame_set(1)
        self.scene.frame_end = 25
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

    def render_review(self, out_dir, lod, prefix=None, shots=None):
        """Add a review-only stage after export; nothing here enters the GLB."""
        out_dir = Path(out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        prefix = prefix or self.spec.slug
        all_shots = {"side", "three-quarter", "top", "eye"}
        shots = sorted(all_shots if shots is None else all_shots.intersection(shots))
        scene = self.scene
        scene.render.engine = "BLENDER_EEVEE"
        scene.render.resolution_x = 900
        scene.render.resolution_y = 650
        scene.render.resolution_percentage = 100
        scene.render.image_settings.file_format = "PNG"
        scene.render.image_settings.color_mode = "RGB"
        scene.render.film_transparent = False
        scene.view_settings.view_transform = "Standard"
        try:
            scene.view_settings.look = "None"
        except TypeError:
            pass
        scene.view_settings.exposure = 0.0
        if hasattr(scene, "eevee"):
            scene.eevee.taa_render_samples = 32
        world = bpy.data.worlds.new("Review world")
        world.use_nodes = True
        background = next(node for node in world.node_tree.nodes if node.type == "BACKGROUND")
        background.inputs["Color"].default_value = (0.012, 0.020, 0.030, 1.0)
        background.inputs["Strength"].default_value = 0.50
        scene.world = world

        def area(name, location, energy, size):
            data = bpy.data.lights.new(name, "AREA")
            data.energy = energy
            data.shape = "DISK"
            data.size = size
            obj = bpy.data.objects.new(name, data)
            obj.location = Vector(location)
            obj.rotation_euler = (-Vector(location)).to_track_quat("-Z", "Y").to_euler()
            scene.collection.objects.link(obj)
            return obj

        area("Review key", (-2.6, -3.2, 1.0), 150.0, 1.6)
        area("Review fill", (2.5, -2.6, 0.6), 55.0, 1.3)
        area("Review front fill", (0.0, -4.0, 0.1), 30.0, 2.0)
        area("Review rim", (1.2, 2.4, 1.8), 90.0, 1.0)

        camera_data = bpy.data.cameras.new("Review camera")
        camera = bpy.data.objects.new("Review camera", camera_data)
        scene.collection.objects.link(camera)
        scene.camera = camera
        camera_data.clip_start = 0.01
        camera_data.clip_end = 50.0

        def shot(name, location, target, lens=None, ortho=None):
            if name not in shots:
                return
            camera.location = Vector(location)
            camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
            if ortho is not None:
                camera.data.type = "ORTHO"
                camera.data.ortho_scale = ortho
            else:
                camera.data.type = "PERSP"
                camera.data.lens = lens
            scene.render.filepath = str(out_dir / ("%s-%s-%s.png" % (prefix, lod, name)))
            bpy.ops.render.render(write_still=True)
            print("RENDER", scene.render.filepath)

        shot("side", (0.0, -4.0, 0.12), (0.0, 0.0, 0.04), ortho=2.45)
        shot("three-quarter", (-2.5, -3.3, 1.35), (0.0, 0.0, 0.02), lens=60)
        shot("top", (0.0, 0.0, 4.0), (0.0, 0.0, 0.04), ortho=2.45)
        shot("eye", (-1.55, -1.05, 0.30),
             (self.spec.eye[0], -0.10, self.spec.eye[2]), lens=85)


def build_lod(spec, variant, lod, out_dir, report_dir, flat, render_dir=None, shots=None):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    texture_dir = Path(report_dir) / "textures" / variant.slug
    builder = Builder(spec, variant, lod, flat, texture_dir)
    builder.build_parts()
    builder.make_armature()
    builder.skin_parts()
    builder.consolidate()
    builder.assert_weights()
    builder.make_action()
    output = Path(out_dir) / spec.family / ("%s-%s.glb" % (variant.slug, lod))
    output.parent.mkdir(parents=True, exist_ok=True)
    builder.export(output)
    facts = builder.report(output)
    facts["variant"] = variant.slug
    Path(report_dir).mkdir(parents=True, exist_ok=True)
    report_path = Path(report_dir) / ("%s-%s.json" % (variant.slug, lod))
    report_path.write_text(json.dumps(facts, indent=2) + "\n", encoding="utf-8")
    print("WROTE", output, facts["triangles"], "triangles", facts["bytes"], "bytes")
    assert facts["triangles"] <= TRIANGLE_CAPS[variant.slug][lod], facts
    assert facts["bytes"] <= BYTE_CAPS[lod], facts
    if render_dir is not None:
        builder.render_review(render_dir, lod, prefix=variant.slug, shots=shots)
    return facts


def review_shots(spec, variant, lod):
    """Which review shots one (variant, LOD) render gets.

    Single-variant species (the Arulius) keep the full four-view set. The five
    danio variants get only the contact-sheet views: one three-quarter per
    variant at high, a top view of the standard variant, and one low-LOD side
    view to confirm the painted eye and stripes survive.
    """
    if len(spec.variants) < 2:
        return None
    standard = variant.slug == spec.slug
    if lod == "high":
        return ("three-quarter", "top") if standard else ("three-quarter",)
    if lod == "low" and standard:
        return ("side",)
    return ()


def compose_contact_sheet(render_dir, spec):
    """Stitch the per-variant high renders into one danio contact sheet."""
    import numpy as np
    paths = [Path(render_dir) / ("%s-high-three-quarter.png" % variant.slug)
             for variant in spec.variants]
    top = Path(render_dir) / ("%s-high-top.png" % spec.slug)
    if top.exists():
        paths.append(top)
    paths = [path for path in paths if path.exists()]
    if len(paths) < 2:
        return
    images = [bpy.data.images.load(str(path)) for path in paths]
    width, height = images[0].size[0], images[0].size[1]
    for image in images:
        if image.size[0] != width or image.size[1] != height:
            raise ValueError("contact sheet tiles must share one size")
    columns = 3
    rows = (len(images) + columns - 1) // columns
    sheet = np.zeros((rows * height, columns * width, 4), dtype=np.float32)
    for index, image in enumerate(images):
        pixels = np.array(image.pixels[:], dtype=np.float32).reshape(height, width, 4)
        row, column = divmod(index, columns)
        sheet[row * height:(row + 1) * height,
              column * width:(column + 1) * width] = pixels
    composite = bpy.data.images.new("danio-contact-sheet", width=columns * width,
                                    height=rows * height, alpha=True)
    composite.pixels.foreach_set(sheet.ravel())
    composite.filepath_raw = str(Path(render_dir) / "danio-contact-sheet.png")
    composite.file_format = "PNG"
    composite.save()
    print("WROTE", composite.filepath_raw)


def main():
    assert bpy.app.background, "run Blender with --background"
    args = parse_args()
    spec = SPECIES[args.species]
    if args.variant:
        variants = [next(item for item in spec.variants if item.slug == args.variant)]
    else:
        variants = list(spec.variants)

    def resolve(value):
        path = Path(value)
        return path if path.is_absolute() else ROOT / path

    out_dir = resolve(args.out)
    report_dir = resolve(args.report)
    render_dir = resolve(args.render) if args.render else None
    for variant in variants:
        for lod in ("high", "mid", "low"):
            shots = review_shots(spec, variant, lod) if render_dir is not None else None
            build_lod(spec, variant, lod, out_dir, report_dir, args.flat, render_dir, shots)
    if render_dir is not None and len(spec.variants) > 1:
        compose_contact_sheet(render_dir, spec)


if __name__ == "__main__":
    main()
