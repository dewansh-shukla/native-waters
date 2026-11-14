"""Generate the neon hatchet (Chela cachius) GLBs through the native pipeline.

Chela cachius is the only valid Chela: a deep-bellied danionine of the
Ganges-Brahmaputra system. The spec carries the measured anatomy from Talwar &
Jhingran (1991) and Silas (1958): body depth 0.30 SL, head 0.26 SL, a
short-based 9-ray dorsal fin, a 21-ray anal fin on a quarter-body base, the
elongate leading pelvic ray, 51-56 fine lateral-line scales and no barbels.

Run with the bundled Blender:
  blender --background --python tools/blender/create_neon_hatchet.py
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Euler

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from tools.blender import fish_budgets  # noqa: E402
from tools.blender.fish_rig import FIN_RAYS, SPECIES_RAYS  # noqa: E402
from tools.blender.fish_specs import SPECIES  # noqa: E402

import tools.blender.create_fish_species as cfs  # noqa: E402

# Meristics: D ii 7-8, A ii-iii 19-23, P i 8-11, V i 5-6, caudal 17-19
# principal rays (Talwar & Jhingran 1991; Silas 1958).
SPECIES_RAYS["neon-hatchet"] = {"dorsal": 9, "anal": 21, "caudal": 19,
                                "pectoral": 10, "pelvic": 6}

# Geometry rows per fin. The anal fin needs one row per principal ray at HIGH
# or its quarter-body base collapses into eight flat panels; the other fins
# keep the rig's shared row counts.
GEOMETRY_RAYS = {
    "high": {"anal": 16},
    "mid": {"anal": 10},
    "low": {"anal": 6},
}

fish_budgets.TRIANGLE_CAPS["neon-hatchet"] = {"high": 12000, "mid": 4500,
                                              "low": 1600}


def action_curves(action):
    """Every F-curve of a Blender 5 layered action (or the legacy list)."""
    try:
        return [curve for layer in action.layers for strip in layer.strips
                for bag in strip.channelbags for curve in bag.fcurves]
    except AttributeError:
        return list(action.fcurves)


class NeonHatchetBuilder(cfs.Builder):
    """Anal-fin row density plus the species' idle and turn clips."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.rays = dict(FIN_RAYS[self.lod])
        self.rays.update(GEOMETRY_RAYS[self.lod])

    def make_action(self):
        super().make_action()
        self.action.name = "swim"
        self._emphasise_anal_fin()
        idle = self._author("idle", self._idle_pose)
        turn = self._author("turn", self._turn_pose)

        rig = self.rig
        for bone in rig.pose.bones:
            if bone.rotation_mode == "QUATERNION":
                bone.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
            else:
                bone.rotation_euler = (0.0, 0.0, 0.0)
        rig.animation_data.action = None
        bpy.context.view_layer.update()
        self.scene.frame_set(1)

        rig.animation_data_create()
        for action in (self.action, idle, turn):
            track = rig.animation_data.nla_tracks.new()
            track.name = action.name
            strip = track.strips.new(action.name, 1, action)
            strip.blend_type = "COMBINE"
            strip.extrapolation = "NOTHING"
            track.mute = True

    def _emphasise_anal_fin(self, gain=1.60):
        """Chela cruises on anal-fin undulation; give that gait more travel.

        The swim action stores the ray bones as unit quaternions. Scaling the
        vector part and renormalising increases the swing angle without
        leaving the exporter with a non-unit quaternion.
        """
        channels = {}
        for curve in action_curves(self.action):
            path = curve.data_path
            if '"AnalRay.' in path and path.endswith("rotation_quaternion"):
                channels.setdefault(path, {})[curve.array_index] = curve
        for group in channels.values():
            if len(group) != 4:
                continue
            for index in range(len(group[0].keyframe_points)):
                w, x, y, z = (group[axis].keyframe_points[index].co[1]
                              for axis in range(4))
                xyz = (x * gain, y * gain, z * gain)
                norm = math.sqrt(w * w + sum(value * value for value in xyz)) or 1.0
                for axis, value in enumerate((w,) + xyz):
                    group[axis].keyframe_points[index].co[1] = value / norm

    def _author(self, name, pose_at):
        """Key every bone in its own rotation mode so all three clips export."""
        rig = self.rig
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        rig.animation_data.action = action
        for frame in range(1, 26):
            poses = pose_at((frame - 1) / 24.0)
            for bone in rig.pose.bones:
                rotation = poses.get(bone.name, (0.0, 0.0, 0.0))
                if bone.rotation_mode == "QUATERNION":
                    bone.rotation_quaternion = Euler(rotation, "XYZ").to_quaternion()
                    bone.keyframe_insert("rotation_quaternion", frame=frame,
                                         group=bone.name)
                else:
                    bone.rotation_euler = rotation
                    bone.keyframe_insert("rotation_euler", frame=frame,
                                         group=bone.name)
        for curve in action_curves(action):
            for key in curve.keyframe_points:
                key.interpolation = "LINEAR"
        return action

    @staticmethod
    def _idle_pose(time):
        phase = math.tau * time
        gill = 0.5 - 0.5 * math.cos(math.tau * 2.0 * time)
        scull = math.tau * time
        return {
            "Gill.L": (0.055 * gill, 0.0, 0.0),
            "Gill.R": (-0.055 * gill, 0.0, 0.0),
            "Jaw": (0.030 * gill, 0.0, 0.0),
            "Hyoid": (0.016 * gill, 0.0, 0.0),
            "UpperJaw": (-0.010 * gill, 0.0, 0.0),
            "Pectoral.L": (0.055 * math.sin(scull), 0.0,
                           0.030 * math.sin(scull)),
            "Pectoral.R": (0.055 * math.sin(scull + 1.1), 0.0,
                           -0.030 * math.sin(scull + 1.1)),
            "Pelvic.L": (0.015 * math.sin(scull + 0.6), 0.0, 0.0),
            "Pelvic.R": (0.015 * math.sin(scull + 1.8), 0.0, 0.0),
            "AnalFin": (0.0, 0.0, 0.022 * math.sin(phase * 1.5)),
            "TailFin": (0.0, 0.0, 0.045 * math.sin(phase)),
        }

    @staticmethod
    def _turn_pose(time):
        bend = 0.18 * math.sin(math.tau * time)
        pose = {}
        for index in range(1, 7):
            pose["Spine.%02d" % index] = (0.0, 0.0, bend * index / 6.0)
        pose["Tail.01"] = (0.0, 0.0, bend * 0.75)
        pose["Tail.02"] = (0.0, 0.0, bend * 0.55)
        pose["Tail.03"] = (0.0, 0.0, bend * 0.40)
        pose["TailFin"] = (0.0, 0.0, bend * 0.30)
        pose["Head"] = (0.0, 0.0, bend * 0.25)
        return pose


cfs.Builder = NeonHatchetBuilder

from tools.blender.create_fish_species import build_lod  # noqa: E402


def main():
    spec = SPECIES["neon-hatchet"]
    variant = spec.variants[0]
    out_dir = ROOT / "public/models/fish"
    report_dir = ROOT / "artifacts/fish-production"
    for lod in ("high", "mid", "low"):
        build_lod(spec, variant, lod, out_dir, report_dir, flat=False)
        print("OK", variant.slug, lod)


if __name__ == "__main__":
    main()
