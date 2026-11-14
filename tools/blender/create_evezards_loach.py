"""Generate Evezard's stone loach (Indoreonectes evezardi) GLBs via the native fish pipeline.

Run with the bundled Blender, for example:
  blender --background --python tools/blender/create_evezards_loach.py
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

# Register evezards-loach into the shared modules.
MEASUREMENTS["evezards-loach"] = {
    "depth_SL": 0.20, "head_SL": 0.22, "eye_SL": 0.06, "eye_HL": 0.30,
    "dorsal_origin_SL": 0.55, "anal_origin_SL": 0.62,
    "peduncle_depth_SL": 0.10, "caudal_length_SL": 0.18,
    "fin_colour": "clear-yellow", "iris_colour": "gold",
}

SHAPE_POINTS["evezards-loach"] = ((0.00, 0.12), (0.10, 0.42), (0.25, 0.78), (0.50, 0.95),
                                 (0.72, 0.82), (0.88, 0.48), (1.00, 0.20))

CONTOURS["evezards-loach"] = {
    "top": ((0.00, 0.040), (0.02, 0.065), (0.05, 0.105), (0.09, 0.145),
            (0.16, 0.180), (0.28, 0.200), (0.42, 0.210), (0.55, 0.205),
            (0.68, 0.185), (0.80, 0.150), (0.90, 0.105), (0.96, 0.080),
            (1.00, 0.075)),
    "bottom": ((0.00, -0.035), (0.02, -0.055), (0.05, -0.080), (0.09, -0.110),
               (0.16, -0.135), (0.28, -0.155), (0.42, -0.165), (0.55, -0.160),
               (0.68, -0.145), (0.80, -0.115), (0.90, -0.085), (0.96, -0.072),
               (1.00, -0.068)),
}

SPECIES_RAYS["evezards-loach"] = {"dorsal": 11, "anal": 8, "caudal": 17,
                                 "pectoral": 11, "pelvic": 8}

EVEZARDS_LOACH = SpeciesSpec(
    slug="evezards-loach",
    family="evezards-loach",
    label="Evezard's Loach",
    rings={"high": 72, "mid": 48, "low": 32},
    sides={"high": 24, "mid": 16, "low": 10},
    height=0.20,
    width=0.09,
    variants=(Variant("evezards-loach", "Evezard's Loach", "#e0d2a8", "#4a3020",
                      "#c8b088", "#b89a4a"),),
    body_length=1.8,
    arch=0.05,
    eye=(-0.78, 0.0, 0.05),
    eye_radius=0.06,
    barbels=True,
    pattern="blotches",
    normal_high=1024,
)
SPECIES["evezards-loach"] = EVEZARDS_LOACH

fish_budgets.TRIANGLE_CAPS["evezards-loach"] = {"high": 10000, "mid": 4000, "low": 1600}

import tools.blender.create_fish_species as cfs

OriginalBuilder = cfs.Builder


class EvezardsLoachBuilder(OriginalBuilder):
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


cfs.Builder = EvezardsLoachBuilder

from tools.blender.create_fish_species import build_lod


def main():
    spec = SPECIES["evezards-loach"]
    variants = list(spec.variants)
    out_dir = ROOT / "public/models/fish"
    report_dir = ROOT / "artifacts/fish-production"
    for variant in variants:
        for lod in ("high", "mid", "low"):
            build_lod(spec, variant, lod, out_dir, report_dir, flat=False, render_dir=None)
            print("OK", spec.slug, lod)


if __name__ == "__main__":
    main()