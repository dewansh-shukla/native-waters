"""Assert the median fins ripple along their rays instead of pivoting.

Imports the exported GLB into an empty Blender scene and tracks the outermost
vertex of every dorsal and anal ray through the clip. Each ray is measured two
ways, because either one alone can lie:

* **world** — how far the tip travels, in body lengths. A ray can bend in the
  data and still be invisible if the fin is small, so this is the visibility
  gate.
* **parent frame** — the same tip measured in the frame of the fin's base bone.
  That cancels the fish's side-to-side sway and leaves only the ray's own bend.
  Dividing by the ray's length says whether the membrane bends along the ray or
  just rides the body, and the phase of that signal says whether the bend
  travels front to back.

A fin that swings as one plate gives every ray the same parent-frame phase; a
fin that ripples gives the rear rays a lag of a fraction of a cycle.

Run:
  blender --background --python tools/blender/check_fin_flex.py -- \
      public/models/fish/arulius-barb/arulius-barb-high.glb
"""

import math
import sys

import bpy

RAY_PREFIXES = ("Dorsal.Ray.", "AnalRay.")
WEIGHT_EPS = 0.50
# Each ray must swing by this fraction of the lever from its own head to its
# tip, which is its bend angle in radians: a rigid ray rides its parent and
# measures zero here no matter how far the body sways.
MIN_BEND_RATIO = 0.08
# And at least one ray per fin must move this far in the world, or the ripple
# exists only in the animation data and cannot be seen at aquarium distance.
MIN_VISIBLE_RATIO = 0.006
MIN_LAG_CYCLES = 0.02
MAX_LAG_CYCLES = 0.50


def ray_tips(obj):
    """{bone name: vertex index} at the outermost point of each ray.

    Candidates must carry the ray's strongest weight, which only the mesh row
    that sits on the ray does: the fin's roots are weighted to the body and the
    rows between rays are split between two tendons. Among those, the dorsal
    tip is the highest point and the anal tip the lowest. The imported bone
    *tails* are synthetic on leaf bones, so they cannot be used for this.
    """
    names = {group.index: group.name for group in obj.vertex_groups}
    tips = {}
    for vertex in obj.data.vertices:
        best, best_weight = None, 0.0
        for element in vertex.groups:
            name = names.get(element.group, "")
            if name.startswith(RAY_PREFIXES) and element.weight > best_weight:
                best, best_weight = name, element.weight
        if best is None or best_weight < WEIGHT_EPS:
            continue
        point = obj.matrix_world @ vertex.co
        height = point[2] if best.startswith("Dorsal") else -point[2]
        current = tips.get(best)
        if current is None or (round(best_weight, 4), height) > (round(current[0], 4),
                                                                 current[1]):
            tips[best] = (best_weight, height, vertex.index)
    return {name: index for name, (_, _, index) in tips.items()}


def deformed_world(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    evaluated.to_mesh_clear()
    return points


def frame_range(armatures):
    for armature in armatures:
        action = armature.animation_data.action if armature.animation_data else None
        if action is not None:
            start, end = action.frame_range
            return int(round(start)), int(round(end))
    raise SystemExit("imported GLB has no armature action")


def lateral_axis(points):
    """The narrowest extent: a fish's width, i.e. the direction a fin sways."""
    lows = [min(point[axis] for point in points) for axis in range(3)]
    highs = [max(point[axis] for point in points) for axis in range(3)]
    extents = [high - low for low, high in zip(lows, highs)]
    return min(range(3), key=lambda axis: extents[axis])


def spectrum(values):
    """[(k, phase, amplitude)] for every Fourier component of a signal."""
    count = len(values)
    mean = sum(values) / count
    centred = [value - mean for value in values]
    out = []
    for k in range(1, count // 2):
        re = sum(value * math.cos(2.0 * math.pi * k * i / count)
                 for i, value in enumerate(centred))
        im = sum(value * math.sin(2.0 * math.pi * k * i / count)
                 for i, value in enumerate(centred))
        out.append((k, math.atan2(im, re) / (2.0 * math.pi),
                    2.0 * math.sqrt(re * re + im * im) / count))
    return out


def dominant_shared_k(series):
    """The Fourier index carrying the most power across a whole fin."""
    totals = {}
    for values in series:
        for k, _, amplitude in spectrum(values):
            totals[k] = totals.get(k, 0.0) + amplitude * amplitude
    return max(totals, key=totals.get) if totals else 1


def component(values, k):
    """(phase, amplitude) of one Fourier component."""
    for index, phase, amplitude in spectrum(values):
        if index == k:
            return phase, amplitude
    return 0.0, 0.0


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if not argv:
        raise SystemExit("usage: ... check_fin_flex.py -- <glb>")
    path = argv[0]

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    scene = bpy.context.scene
    scene.render.fps = 24

    armatures = [item for item in scene.objects if item.type == "ARMATURE"]
    meshes = [item for item in scene.objects if item.type == "MESH"
              and any(modifier.type == "ARMATURE" and modifier.object == armatures[0]
                      for modifier in item.modifiers)]
    if not meshes or not armatures:
        raise SystemExit("imported GLB has no skinned mesh")
    armature = armatures[0]

    tracked = {}
    for obj in meshes:
        for name, index in ray_tips(obj).items():
            tracked.setdefault(name, []).append((obj, index))
    if len(tracked) < 4:
        raise SystemExit("only %d ray tips found; the ray bones are missing" % len(tracked))

    # Unit conversions stay in world space so the ratios are independent of the
    # exporter's scale and axis conversion.
    whole = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
    lows = [min(point[axis] for point in whole) for axis in range(3)]
    highs = [max(point[axis] for point in whole) for axis in range(3)]
    body_length = max(high - low for low, high in zip(lows, highs))
    lateral = lateral_axis(whole)

    # The parent's rest-to-pose transform changes every frame, so it has to be
    # rebuilt per frame; freezing it at one frame leaves the body's sway in the
    # "relative" signal.
    parent_of = {}
    ray_length = {}
    for name, entries in tracked.items():
        parent = armature.pose.bones[name].parent
        if parent is None:
            raise SystemExit("%s has no parent fin bone" % name)
        parent_of[name] = parent.name
        # Skin the tip by hand rather than trusting glTF's synthetic leaf-bone
        # tail: the lever is the distance from the ray's head to its own tip,
        # which is exactly the radius the ray rotates its membrane about.
        obj, index = entries[0]
        head = armature.matrix_world @ armature.data.bones[name].head_local
        tip = obj.matrix_world @ obj.data.vertices[index].co
        ray_length[name] = (tip - head).length

    start, end = frame_range(armatures)
    scene.frame_start, scene.frame_end = start, end
    frames = list(range(start, end))
    world_series = {name: [] for name in tracked}
    rest_series = {name: [] for name in tracked}
    for frame in frames:
        scene.frame_set(frame)
        to_rest = {}
        for parent_name in set(parent_of.values()):
            parent = armature.pose.bones[parent_name]
            delta = parent.matrix @ parent.bone.matrix_local.inverted()
            to_rest[parent_name] = (armature.matrix_world @ delta.inverted()
                                    @ armature.matrix_world.inverted())
        cache = {}
        for name, entries in tracked.items():
            for obj, index in entries:
                if obj.name not in cache:
                    cache[obj.name] = deformed_world(obj)
                point = cache[obj.name][index]
                world_series[name].append(point[lateral])
                rest_series[name].append(
                    (to_rest[parent_of[name]] @ point)[lateral])

    failures = []
    for prefix in RAY_PREFIXES:
        names = sorted(name for name in tracked if name.startswith(prefix))
        if len(names) < 2:
            failures.append("fewer than two %s bones carry a ray tip" % prefix.strip("."))
            continue
        k = dominant_shared_k(rest_series[name] for name in names)

        travels = []
        bends = []
        phases = []
        for name in names:
            travel = component(world_series[name], k)[1]
            bend = component(rest_series[name], k)[1]
            phase = component(rest_series[name], k)[0]
            travels.append(travel / body_length)
            bends.append(bend / max(ray_length[name], 1e-6))
            phases.append(phase % 1.0)
            print("  %-14s %5.2f%% BL travel  bend %4.1f%% of lever  phase %+.3f"
                  % (name, 100.0 * travels[-1], 100.0 * bends[-1], phases[-1]))

        if min(bends) < MIN_BEND_RATIO:
            weakest = names[bends.index(min(bends))]
            failures.append("%s swings %.1f%% of its lever, under %.0f%%: the ray is rigid"
                            % (weakest, 100.0 * min(bends), 100.0 * MIN_BEND_RATIO))
        if max(travels) < MIN_VISIBLE_RATIO:
            failures.append("%s rays travel at most %.2f%% of a body length, under %.2f%%"
                            % (prefix.strip("."), 100.0 * max(travels),
                               100.0 * MIN_VISIBLE_RATIO))

        delta = (phases[-1] - phases[0] + 0.5) % 1.0 - 0.5
        print("%s: lag %+.3f cycles from %s to %s (k=%d)"
              % (prefix.strip("."), delta, names[0], names[-1], k))
        if abs(delta) < MIN_LAG_CYCLES:
            failures.append("%s rays bend in phase (lag %+.3f cycles): the fin is a plate"
                            % (prefix.strip("."), delta))
        if abs(delta) > MAX_LAG_CYCLES:
            failures.append("%s ray lag %+.3f cycles is past half a cycle"
                            % (prefix.strip("."), delta))

    if failures:
        for failure in failures:
            print("FAIL: " + failure)
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
