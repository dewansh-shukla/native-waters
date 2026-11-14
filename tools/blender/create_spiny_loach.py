"""Generate spiny loach (Lepidocephalichthys thermalis) GLBs via the native fish pipeline.

Run with the bundled Blender, for example:
  blender --background --python tools/blender/create_spiny_loach.py
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

# Register spiny-loach into the shared modules.
MEASUREMENTS["spiny-loach"] = {
    "depth_SL": 0.16, "head_SL": 0.20, "eye_SL": 0.06, "eye_HL": 0.30,
    "dorsal_origin_SL": 0.50, "anal_origin_SL": 0.62,
    "peduncle_depth_SL": 0.09, "caudal_length_SL": 0.18,
    "fin_colour": "clear-yellow", "iris_colour": "gold",
}

SHAPE_POINTS["spiny-loach"] = ((0.00, 0.10), (0.10, 0.38), (0.25, 0.72), (0.50, 0.90),
                               (0.72, 0.75), (0.88, 0.42), (1.00, 0.18))

CONTOURS["spiny-loach"] = {
    "top": ((0.00, 0.038), (0.02, 0.060), (0.05, 0.095), (0.09, 0.130),
            (0.16, 0.165), (0.28, 0.185), (0.42, 0.195), (0.55, 0.190),
            (0.68, 0.170), (0.80, 0.140), (0.90, 0.098), (0.96, 0.076),
            (1.00, 0.070)),
    "bottom": ((0.00, -0.030), (0.02, -0.048), (0.05, -0.070), (0.09, -0.095),
               (0.16, -0.120), (0.28, -0.140), (0.42, -0.150), (0.55, -0.145),
               (0.68, -0.130), (0.80, -0.105), (0.90, -0.078), (0.96, -0.066),
               (1.00, -0.062)),
}

SPECIES_RAYS["spiny-loach"] = {"dorsal": 10, "anal": 7, "caudal": 14,
                               "pectoral": 11, "pelvic": 7}

SPINY_LOACH = SpeciesSpec(
    slug="spiny-loach",
    family="spiny-loach",
    label="Spiny Loach",
    rings={"high": 72, "mid": 48, "low": 32},
    sides={"high": 24, "mid": 16, "low": 10},
    height=0.16,
    width=0.08,
    variants=(Variant("spiny-loach", "Spiny Loach", "#d8c078", "#2a2418",
                      "#c9a86a", "#c9a040"),),
    body_length=1.8,
    arch=0.03,
    eye=(-0.78, 0.0, 0.05),
    eye_radius=0.06,
    barbels=True,
    pattern="blotches",
    normal_high=1024,
)
SPECIES["spiny-loach"] = SPINY_LOACH

fish_budgets.TRIANGLE_CAPS["spiny-loach"] = {"high": 10000, "mid": 4000, "low": 1600}

import tools.blender.create_fish_species as cfs

OriginalBuilder = cfs.Builder


class SpinyLoachBuilder(OriginalBuilder):
    def make_action(self):
        super().make_action()
        # Rename the base swim clip to lowercase.
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


cfs.Builder = SpinyLoachBuilder

from tools.blender.create_fish_species import build_lod


def main():
    spec = SPECIES["spiny-loach"]
    variants = list(spec.variants)
    out_dir = ROOT / "public/models/fish"
    report_dir = ROOT / "artifacts/fish-production"
    for variant in variants:
        for lod in ("high", "mid", "low"):
            build_lod(spec, variant, lod, out_dir, report_dir, flat=False, render_dir=None)
            print("OK", spec.slug, lod)


if __name__ == "__main__":
    main()
