"""Generate honey gourami (Trichogaster chuna) GLBs via the native fish pipeline.

Run with the bundled Blender, for example:
  blender --background --python tools/blender/create_honey_gourami.py
"""
import json
import math
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

# Register honey-gourami into the shared spec/rig/texture/budget modules before
# the pipeline imports them.
from tools.blender import fish_specs, fish_rig, fish_textures
from tools.blender.fish_specs import (SPECIES, MEASUREMENTS, SHAPE_POINTS, CONTOURS,
                                      SpeciesSpec, Variant, hex_rgb, profile)
from tools.blender.fish_rig import SPECIES_RAYS
from tools.assets import fish_budgets

MEASUREMENTS["honey-gourami"] = {
    "depth_SL": 0.32, "head_SL": 0.26, "eye_SL": 0.06, "eye_HL": 0.30,
    "dorsal_origin_SL": 0.40, "anal_origin_SL": 0.35,
    "peduncle_depth_SL": 0.10, "caudal_length_SL": 0.20,
    "fin_colour": "clear-yellow",
}

SHAPE_POINTS["honey-gourami"] = ((0.00, 0.15), (0.10, 0.50), (0.25, 0.85),
                                  (0.50, 1.00), (0.70, 0.90), (0.88, 0.55),
                                  (1.00, 0.20))

CONTOURS["honey-gourami"] = {
    "top": ((0.00, 0.060), (0.02, 0.095), (0.05, 0.150), (0.09, 0.200),
            (0.16, 0.240), (0.28, 0.275), (0.42, 0.290), (0.55, 0.285),
            (0.68, 0.260), (0.80, 0.210), (0.90, 0.150), (0.96, 0.110),
            (1.00, 0.095)),
    "bottom": ((0.00, -0.050), (0.02, -0.075), (0.05, -0.110), (0.09, -0.150),
               (0.16, -0.195), (0.28, -0.235), (0.42, -0.255), (0.55, -0.250),
               (0.68, -0.225), (0.80, -0.180), (0.90, -0.130), (0.96, -0.100),
               (1.00, -0.090)),
}

SPECIES_RAYS["honey-gourami"] = {"dorsal": 11, "anal": 14, "caudal": 19,
                                 "pectoral": 14, "pelvic": 6}

HONEY_GOURAMI = SpeciesSpec(
    slug="honey-gourami",
    family="honey-gourami",
    label="Honey Gourami",
    rings={"high": 72, "mid": 48, "low": 32},
    sides={"high": 24, "mid": 16, "low": 10},
    height=0.30,
    width=0.12,
    variants=(Variant("honey-gourami", "Honey Gourami", "#e8b84a", "#3a2a10",
                      "#f0d8a0", "#caa24a"),),
    body_length=1.8,
    arch=0.08,
    eye=(-0.78, 0.0, 0.05),
    eye_radius=0.06,
    barbels=False,
    pattern="stripes",
    normal_high=512,
)
SPECIES["honey-gourami"] = HONEY_GOURAMI

fish_budgets.TRIANGLE_CAPS["honey-gourami"] = {"high": 10000, "mid": 4000, "low": 1400}

import tools.blender.create_fish_species as cfs

# Subclass Builder to add Idle and Turn clips on top of the standard Swim clip.
OriginalBuilder = cfs.Builder


class HoneyGouramiBuilder(OriginalBuilder):
    def make_action(self):
        super().make_action()
        rig = self.rig
        # Reset pose to rest before authoring the extra clips.
        for bone in rig.pose.bones:
            bone.rotation_mode = "XYZ"
            bone.rotation_euler = (0.0, 0.0, 0.0)
        bpy.context.view_layer.update()

        frames = 25
        beat = 1.0

        def author(name, keyframes):
            action = bpy.data.actions.new(name)
            action.use_fake_user = True
            rig.animation_data.action = action
            for frame in range(1, frames + 1):
                time = (frame - 1) / 24.0
                phase = math.tau * beat * time
                opening = 0.5 - 0.5 * math.cos(math.tau * 2.0 * time)
                rotations = keyframes(phase, opening, time)
                for bone_name, rot in rotations.items():
                    if bone_name not in rig.pose.bones:
                        continue
                    pose_bone = rig.pose.bones[bone_name]
                    pose_bone.rotation_euler = rot
                    pose_bone.keyframe_insert(data_path="rotation_euler", frame=frame,
                                              group=bone_name)
            # Linear interpolation, loop-closing endpoints already match.
            try:
                curves = [curve for layer in action.layers for strip in layer.strips
                          for bag in strip.channelbags for curve in bag.fcurves]
            except AttributeError:
                curves = list(action.fcurves)
            for curve in curves:
                for key in curve.keyframe_points:
                    key.interpolation = "LINEAR"
            return action

        # Idle: gentle gill/breathing motion at rest.
        def idle_kf(phase, opening, time):
            r = {}
            r["Gill.L"] = (0.050 * opening, 0.0, 0.0)
            r["Gill.R"] = (-0.050 * opening, 0.0, 0.0)
            r["Jaw"] = (0.025 * opening, 0.0, 0.0)
            r["Pectoral.L"] = (0.04 * math.sin(phase), 0.0, 0.03 * math.sin(phase))
            r["Pectoral.R"] = (0.04 * math.sin(phase + 1.0), 0.0, -0.03 * math.sin(phase + 1.0))
            r["Pelvic.L"] = (0.015 * math.sin(phase + 0.5), 0.0, 0.0)
            r["Pelvic.R"] = (0.015 * math.sin(phase + 1.5), 0.0, 0.0)
            return r

        # Turn: a C-bend travelling along the spine.
        def turn_kf(phase, opening, time):
            r = {}
            bend = 0.12 * math.sin(phase)
            for index in range(1, 4):
                r["Spine.%02d" % index] = (0.0, 0.0, bend * (index / 3.0))
            r["Tail.01"] = (0.0, 0.0, bend * 0.6)
            r["TailFin"] = (0.0, 0.0, bend * 0.4)
            r["Head"] = (0.0, 0.0, bend * 0.3)
            return r

        self.idle_action = author("Idle", idle_kf)
        self.turn_action = author("Turn", turn_kf)

        # Restore neutral pose.
        for bone in rig.pose.bones:
            bone.rotation_euler = (0.0, 0.0, 0.0)
        rig.animation_data.action = None
        bpy.context.view_layer.update()
        self.scene.frame_set(1)

        # Push every action onto muted NLA tracks so the exporter emits all clips.
        rig.animation_data_create()
        for action in (self.action, self.idle_action, self.turn_action):
            track = rig.animation_data.nla_tracks.new()
            track.name = action.name
            strip = track.strips.new(action.name, 1, action)
            strip.blend_type = "COMBINE"
            strip.extrapolation = "NOTHING"
            track.mute = True

        self.action = self.action  # keep Swim as primary

    def export(self, path):
        # Export all actions.
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


cfs.Builder = HoneyGouramiBuilder

from tools.blender.create_fish_species import build_lod

def main():
    spec = SPECIES["honey-gourami"]
    variants = list(spec.variants)
    out_dir = ROOT / "public/models/fish"
    report_dir = ROOT / "artifacts/fish-production"
    for variant in variants:
        for lod in ("high", "mid", "low"):
            build_lod(spec, variant, lod, out_dir, report_dir, flat=False, render_dir=None)
            print("OK", spec.slug, lod)

if __name__ == "__main__":
    main()
