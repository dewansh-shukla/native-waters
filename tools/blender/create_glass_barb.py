"""Generate glass barb (Pethia guganio) GLBs via the native fish pipeline.

Run with the bundled Blender, for example:
  blender --background --python tools/blender/create_glass_barb.py
"""
import json
import math
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from tools.blender import fish_specs, fish_rig, fish_textures
from tools.blender.fish_specs import (SPECIES, MEASUREMENTS, SHAPE_POINTS, CONTOURS,
                                      SpeciesSpec, Variant, hex_rgb, profile)
from tools.blender.fish_rig import SPECIES_RAYS
from tools.assets import fish_budgets
from tools.blender.fish_specs import SPECIES as _SPECIES

# Register glass-barb into the shared modules.
MEASUREMENTS["glass-barb"] = {
    "depth_SL": 0.26, "head_SL": 0.22, "eye_SL": 0.07, "eye_HL": 0.30,
    "dorsal_origin_SL": 0.53, "anal_origin_SL": 0.60,
    "peduncle_depth_SL": 0.10, "caudal_length_SL": 0.18,
    "fin_colour": "clear", "iris_colour": "gold",
}

SHAPE_POINTS["glass-barb"] = SHAPE_POINTS["arulius-barb"]
CONTOURS["glass-barb"] = CONTOURS["arulius-barb"]

SPECIES_RAYS["glass-barb"] = {"dorsal": 12, "anal": 8, "caudal": 19,
                              "pectoral": 16, "pelvic": 9}

GLASS_BARB = SpeciesSpec(
    slug="glass-barb",
    family="glass-barb",
    label="Glass Barb",
    rings={"high": 72, "mid": 48, "low": 32},
    sides={"high": 24, "mid": 16, "low": 10},
    height=0.26,
    width=0.09,
    variants=(Variant("glass-barb", "Glass Barb", "#c0c8d0", "#5a5a50",
                      "#d0d8e0", "#a09050"),),
    body_length=1.8,
    arch=0.08,
    eye=(-0.78, 0.0, 0.04),
    eye_radius=0.065,
    barbels=False,
    pattern="stripes",
    normal_high=1024,
)
SPECIES["glass-barb"] = GLASS_BARB

fish_budgets.TRIANGLE_CAPS["glass-barb"] = {"high": 12000, "mid": 4500, "low": 3000}

import tools.blender.create_fish_species as cfs

_original_make_materials = cfs.make_materials


def _glassify(material, alpha, transmission, roughness):
    if material is None:
        return
    bsdf = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Alpha"].default_value = alpha
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    bsdf.inputs["Roughness"].default_value = roughness
    if alpha < 1.0:
        material.surface_render_method = "BLENDED"
        material.use_transparent_shadow = True


def make_materials(spec, variant, lod, flat, texture_dir=None):
    materials = _original_make_materials(spec, variant, lod, flat, texture_dir)
    _glassify(materials["body"], 0.40, 0.85, 0.12)
    _glassify(materials["fin"], 0.55, 0.60, 0.25)
    iris = hex_rgb(variant.iris)
    if materials.get("eye") is None:
        materials["eye"] = cfs.make_material("FishEye", iris, 0.14, metallic=0.0, coat=0.40,
                                            specular=0.50, coat_roughness=0.05)
    if materials.get("cornea") is None:
        materials["cornea"] = cfs.make_material("FishCornea", (0.94, 0.96, 1.0), 0.03,
                                                alpha=0.05, metallic=0.0, coat=0.50,
                                                blend="BLENDED", specular=0.55,
                                                coat_roughness=0.02)
    _glassify(materials["eye"], 1.0, 0.0, 0.05)
    _glassify(materials["cornea"], 0.12, 0.90, 0.02)
    return materials


cfs.make_materials = make_materials

OriginalBuilder = cfs.Builder


class GlassBarbBuilder(OriginalBuilder):
    def build_parts(self):
        original_lod = self.lod
        if original_lod == "low":
            self.lod = "mid"
        try:
            super().build_parts()
        finally:
            self.lod = original_lod

    def make_action(self):
        super().make_action()
        self.action.name = "swim"
        rig = self.rig
        for bone in rig.pose.bones:
            bone.rotation_mode = "XYZ"
            bone.rotation_euler = (0.0, 0.0, 0.0)
        bpy.context.view_layer.update()

        frames = 25

        def author(name, keyframes):
            action = bpy.data.actions.new(name)
            action.use_fake_user = True
            rig.animation_data.action = action
            for frame in range(1, frames + 1):
                time = (frame - 1) / 24.0
                phase = math.tau * time
                opening = 0.5 - 0.5 * math.cos(math.tau * 2.0 * time)
                rotations = keyframes(phase, opening, time)
                for bone_name, rot in rotations.items():
                    if bone_name not in rig.pose.bones:
                        continue
                    pose_bone = rig.pose.bones[bone_name]
                    pose_bone.rotation_euler = rot
                    pose_bone.keyframe_insert(data_path="rotation_euler", frame=frame,
                                              group=bone_name)
            try:
                curves = [curve for layer in action.layers for strip in layer.strips
                          for bag in strip.channelbags for curve in bag.fcurves]
            except AttributeError:
                curves = list(action.fcurves)
            for curve in curves:
                for key in curve.keyframe_points:
                    key.interpolation = "LINEAR"
            return action

        def idle_kf(phase, opening, time):
            r = {}
            if "Gill.L" in rig.pose.bones:
                r["Gill.L"] = (0.050 * opening, 0.0, 0.0)
            if "Gill.R" in rig.pose.bones:
                r["Gill.R"] = (-0.050 * opening, 0.0, 0.0)
            if "Jaw" in rig.pose.bones:
                r["Jaw"] = (0.025 * opening, 0.0, 0.0)
            if "Pectoral.L" in rig.pose.bones:
                r["Pectoral.L"] = (0.04 * math.sin(phase), 0.0, 0.03 * math.sin(phase))
            if "Pectoral.R" in rig.pose.bones:
                r["Pectoral.R"] = (0.04 * math.sin(phase + 1.0), 0.0, -0.03 * math.sin(phase + 1.0))
            if "Pelvic.L" in rig.pose.bones:
                r["Pelvic.L"] = (0.015 * math.sin(phase + 0.5), 0.0, 0.0)
            if "Pelvic.R" in rig.pose.bones:
                r["Pelvic.R"] = (0.015 * math.sin(phase + 1.5), 0.0, 0.0)
            return r

        def turn_kf(phase, opening, time):
            r = {}
            bend = 0.12 * math.sin(phase)
            for index in range(1, 4):
                name = "Spine.%02d" % index
                if name in rig.pose.bones:
                    r[name] = (0.0, 0.0, bend * (index / 3.0))
            if "Tail.01" in rig.pose.bones:
                r["Tail.01"] = (0.0, 0.0, bend * 0.6)
            if "TailFin" in rig.pose.bones:
                r["TailFin"] = (0.0, 0.0, bend * 0.4)
            if "Head" in rig.pose.bones:
                r["Head"] = (0.0, 0.0, bend * 0.3)
            return r

        idle_action = author("idle", idle_kf)
        turn_action = author("turn", turn_kf)

        for bone in rig.pose.bones:
            bone.rotation_euler = (0.0, 0.0, 0.0)
        rig.animation_data.action = None
        bpy.context.view_layer.update()
        self.scene.frame_set(1)

        rig.animation_data_create()
        for action in (self.action, idle_action, turn_action):
            track = rig.animation_data.nla_tracks.new()
            track.name = action.name
            strip = track.strips.new(action.name, 1, action)
            strip.blend_type = "COMBINE"
            strip.extrapolation = "NOTHING"
            track.mute = True

        self.action = self.action

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


cfs.Builder = GlassBarbBuilder

from tools.blender.create_fish_species import build_lod


def main():
    spec = SPECIES["glass-barb"]
    variants = list(spec.variants)
    out_dir = ROOT / "public/models/fish"
    report_dir = ROOT / "artifacts/fish-production"
    for variant in variants:
        for lod in ("high", "mid", "low"):
            build_lod(spec, variant, lod, out_dir, report_dir, flat=False, render_dir=None)
            print("OK", spec.slug, lod)


if __name__ == "__main__":
    main()