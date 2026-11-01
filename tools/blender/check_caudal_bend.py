"""Assert the exported caudal fin bends rather than rotating rigidly.

Imports the GLB into an empty Blender scene, evaluates the deforming mesh at
every clip frame, and fits the best rigid swing of the caudal fan about the
peduncle. A hinged fin would fit that line almost exactly; a fin with a graded
torsional wave leaves a lateral residual. The residual must reach at least
`MIN_BEND_RATIO` of the fan's largest lateral excursion.

Run:
  blender --background --python tools/blender/check_caudal_bend.py -- \
      public/models/fish/arulius-barb/arulius-barb-high.glb
"""

import sys

import bpy

CAUDAL_BONES = {"TailFin", "TailFin.U", "TailFin.L"}
MIN_BEND_RATIO = 0.05
MIN_EXCURSION = 1e-3
WEIGHT_EPS = 1e-3


def caudal_vertices(obj):
    """Indices of vertices this mesh skins to the caudal fan."""
    names = {group.index: group.name for group in obj.vertex_groups}
    found = []
    for vertex in obj.data.vertices:
        for element in vertex.groups:
            if element.weight > WEIGHT_EPS and names.get(element.group) in CAUDAL_BONES:
                found.append(vertex.index)
                break
    return found


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


def axes(points):
    """(length axis, lateral axis) as world indices, from the fish's extents."""
    lows = [min(point[axis] for point in points) for axis in range(3)]
    highs = [max(point[axis] for point in points) for axis in range(3)]
    extents = [high - low for low, high in zip(lows, highs)]
    order = sorted(range(3), key=lambda axis: extents[axis])
    return order[-1], order[0]


def fit_line(xs, ys):
    """Least-squares (intercept, slope) so translation is not read as bending."""
    count = len(xs)
    sum_x = sum(xs)
    sum_xx = sum(x * x for x in xs)
    sum_y = sum(ys)
    sum_xy = sum(x * y for x, y in zip(xs, ys))
    determinant = count * sum_xx - sum_x * sum_x
    if abs(determinant) < 1e-12:
        return sum_y / count, 0.0
    intercept = (sum_y * sum_xx - sum_x * sum_xy) / determinant
    slope = (count * sum_xy - sum_x * sum_y) / determinant
    return intercept, slope


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if not argv:
        raise SystemExit("usage: ... check_caudal_bend.py -- <glb>")
    path = argv[0]

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    scene = bpy.context.scene
    scene.render.fps = 24

    meshes = [item for item in scene.objects if item.type == "MESH"]
    armatures = [item for item in scene.objects if item.type == "ARMATURE"]
    if not meshes or not armatures:
        raise SystemExit("imported GLB has no skinned mesh")

    tracked, rest = [], []
    for obj in meshes:
        indices = caudal_vertices(obj)
        if not indices:
            continue
        tracked.append((obj, indices))
        rest.extend(obj.matrix_world @ obj.data.vertices[index].co for index in indices)
    if len(rest) < 8:
        raise SystemExit("only %d caudal vertices found" % len(rest))

    whole = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
    length_axis, lateral_axis = axes(whole)
    pivot = min(point[length_axis] for point in rest)
    along = [point[length_axis] - pivot for point in rest]
    rest_lateral = [point[lateral_axis] for point in rest]
    if sum(step * step for step in along) <= 0.0:
        raise SystemExit("caudal fan has no length")

    start, end = frame_range(armatures)
    scene.frame_start, scene.frame_end = start, end

    best = None
    peak = None
    for frame in range(start, end + 1):
        scene.frame_set(frame)
        moved, current = [], []
        for obj, indices in tracked:
            points = deformed_world(obj)
            moved.extend(points[index] for index in indices)
            current.extend(points[index][lateral_axis] for index in indices)
        lateral = [now - before for now, before in zip(current, rest_lateral)]
        intercept, slope = fit_line(along, lateral)
        residual = [value - (intercept + slope * step)
                    for value, step in zip(lateral, along)]
        excursion = max(abs(value) for value in lateral)
        bend = max(abs(value) for value in residual)
        ratio = bend / excursion if excursion > 0.0 else 0.0
        print("frame %2d: lateral %.4f, residual %.4f, ratio %.3f"
              % (frame, excursion, bend, ratio))
        if excursion > MIN_EXCURSION:
            if best is None or ratio > best[2]:
                best = (frame, excursion, ratio)
            if peak is None or excursion > peak[1]:
                peak = (frame, excursion, ratio)

    if best is None or peak is None:
        raise SystemExit("caudal fin never moved; the clip is missing or empty")
    print("widest swing: frame %d, lateral %.4f, bend ratio %.3f"
          % (peak[0], peak[1], peak[2]))
    print("best bend: frame %d, lateral %.4f, bend ratio %.3f"
          % (best[0], best[1], best[2]))
    if peak[2] < MIN_BEND_RATIO:
        print("FAIL: at the widest swing the caudal fan moves as a rigid plate")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
