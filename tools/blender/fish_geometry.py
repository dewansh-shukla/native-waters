"""Pure, deterministic geometry builders for the native fish; no bpy or numpy."""

from dataclasses import dataclass
from math import cos, pi, sin, sqrt


Vec3 = tuple[float, float, float]


@dataclass
class Geometry:
    vertices: list[Vec3]
    faces: list[tuple[int, ...]]
    uvs: list[tuple[float, float]]


def _add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def _sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _mul(a, scale):
    return (a[0] * scale, a[1] * scale, a[2] * scale)


def _cross(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def _unit(value):
    length = sqrt(value[0] ** 2 + value[1] ** 2 + value[2] ** 2)
    if length < 1e-12:
        return (0.0, 0.0, 1.0)
    return (value[0] / length, value[1] / length, value[2] / length)


def _lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t)


def _slug(spec):
    return spec if isinstance(spec, str) else spec.slug


def loft(spec, rings: int, sides: int) -> Geometry:
    """Build the body tube from x=-1.0 to x=+0.8, with a duplicated seam."""
    from tools.blender.fish_specs import profile

    if rings < 1:
        raise ValueError("rings must be positive")
    if sides < 3:
        raise ValueError("sides must be at least 3")
    slug = _slug(spec)
    vertices, faces, uvs = [], [], []
    for ring in range(rings + 1):
        t = ring / rings
        half_height, half_width, centre = profile(slug, t)
        x = -1.0 + 1.8 * t
        for side in range(sides + 1):
            angle = 2.0 * pi * side / sides
            vertices.append((x,
                             half_width * cos(angle),
                             centre + half_height * sin(angle)))
            uvs.append((t, side / sides))
    stride = sides + 1
    for ring in range(rings):
        for side in range(sides):
            a = ring * stride + side
            b = a + 1
            d = a + stride
            c = d + 1
            faces.append((a, b, d))
            faces.append((b, c, d))
    return Geometry(vertices, faces, uvs)


def fin(roots, tips, thickness: float, columns: int) -> Geometry:
    """Build a double-sided fin with a closed rim around its perimeter."""
    if len(roots) != len(tips) or len(roots) < 2:
        raise ValueError("roots and tips must have at least two matching points")
    if columns < 1:
        raise ValueError("columns must be positive")
    if thickness <= 0:
        raise ValueError("thickness must be positive")
    rows = len(roots)
    cols = columns + 1
    points = [[_lerp(roots[row], tips[row], column / columns) for column in range(cols)]
              for row in range(rows)]
    normals = []
    for row in range(rows):
        normal_row = []
        for column in range(cols):
            r0, r1 = max(0, row - 1), min(rows - 1, row + 1)
            c0, c1 = max(0, column - 1), min(cols - 1, column + 1)
            across = _sub(points[r1][column], points[r0][column])
            along = _sub(points[row][c1], points[row][c0])
            normal = _unit(_cross(across, along))
            if across == (0.0, 0.0, 0.0) or along == (0.0, 0.0, 0.0):
                normal = (0.0, 0.0, 1.0)
            normal_row.append(normal)
        normals.append(normal_row)

    vertices, uvs = [], []
    top = [[0] * cols for _ in range(rows)]
    bottom = [[0] * cols for _ in range(rows)]
    for row in range(rows):
        for column in range(cols):
            u = row / (rows - 1)
            v = column / columns
            point = points[row][column]
            normal = normals[row][column]
            top[row][column] = len(vertices)
            vertices.append(_add(point, _mul(normal, thickness / 2.0)))
            uvs.append((u, v))
    for row in range(rows):
        for column in range(cols):
            point = points[row][column]
            normal = normals[row][column]
            bottom[row][column] = len(vertices)
            vertices.append(_sub(point, _mul(normal, thickness / 2.0)))
            uvs.append((row / (rows - 1), column / columns))

    faces = []
    for row in range(rows - 1):
        for column in range(cols - 1):
            a, b = top[row][column], top[row][column + 1]
            c, d = top[row + 1][column + 1], top[row + 1][column]
            faces.append((a, d, c, b))
            a, b = bottom[row][column], bottom[row][column + 1]
            c, d = bottom[row + 1][column + 1], bottom[row + 1][column]
            faces.append((a, b, c, d))
    for row in range(rows - 1):
        faces.append((top[row][0], bottom[row][0],
                      bottom[row + 1][0], top[row + 1][0]))
        faces.append((top[row][cols - 1], top[row + 1][cols - 1],
                      bottom[row + 1][cols - 1], bottom[row][cols - 1]))
    for column in range(cols - 1):
        faces.append((top[0][column], top[0][column + 1],
                      bottom[0][column + 1], bottom[0][column]))
        faces.append((top[rows - 1][column], bottom[rows - 1][column],
                      bottom[rows - 1][column + 1], top[rows - 1][column + 1]))
    return Geometry(vertices, faces, uvs)


def sphere(center, radii, segments: int, rings: int) -> Geometry:
    """Build a UV sphere with triangular caps."""
    if segments < 3 or rings < 2:
        raise ValueError("segments >= 3 and rings >= 2 required")
    if min(radii) <= 0:
        raise ValueError("radii must be positive")
    cx, cy, cz = center
    rx, ry, rz = radii
    stride = segments + 1
    vertices, uvs = [], []
    for ring in range(rings + 1):
        phi = pi * ring / rings
        for segment in range(segments + 1):
            theta = 2.0 * pi * segment / segments
            vertices.append((cx + rx * sin(phi) * cos(theta),
                             cy + ry * sin(phi) * sin(theta),
                             cz + rz * cos(phi)))
            uvs.append((segment / segments, ring / rings))

    def index(ring, segment):
        return ring * stride + segment

    faces = []
    for segment in range(segments):
        faces.append((0, index(1, segment), index(1, segment + 1)))
    for ring in range(1, rings - 1):
        for segment in range(segments):
            a = index(ring, segment)
            b = index(ring, segment + 1)
            c = index(ring + 1, segment + 1)
            d = index(ring + 1, segment)
            faces.append((a, d, c, b))
    bottom = index(rings, 0)
    for segment in range(segments):
        faces.append((bottom, index(rings - 1, segment + 1), index(rings - 1, segment)))
    return Geometry(vertices, faces, uvs)


def tube(points, radius: float, sides: int) -> Geometry:
    """Build a capped tube around a polyline, with a duplicated seam."""
    if len(points) < 2:
        raise ValueError("a tube needs at least two points")
    if radius <= 0:
        raise ValueError("radius must be positive")
    if sides < 3:
        raise ValueError("sides must be at least 3")
    points = [(float(p[0]), float(p[1]), float(p[2])) for p in points]
    tangents = []
    for index in range(len(points)):
        if index == 0:
            direction = _sub(points[1], points[0])
        elif index == len(points) - 1:
            direction = _sub(points[-1], points[-2])
        else:
            direction = _sub(points[index + 1], points[index - 1])
        tangents.append(_unit(direction))
    stride = sides + 1
    vertices, uvs = [], []
    for index, point in enumerate(points):
        tangent = tangents[index]
        up = (0.0, 0.0, 1.0) if abs(tangent[2]) < 0.9 else (0.0, 1.0, 0.0)
        normal = _unit(_cross(tangent, up))
        binormal = _unit(_cross(tangent, normal))
        for side in range(sides + 1):
            angle = 2.0 * pi * side / sides
            offset = _add(_mul(normal, radius * cos(angle)),
                          _mul(binormal, radius * sin(angle)))
            vertices.append(_add(point, offset))
            uvs.append((index / (len(points) - 1), side / sides))
    faces = []
    for index in range(len(points) - 1):
        for side in range(sides):
            a = index * stride + side
            b = a + 1
            d = a + stride
            c = d + 1
            faces.append((a, b, d))
            faces.append((b, c, d))

    start_center = len(vertices)
    vertices.append(points[0])
    uvs.append((0.5, 0.5))
    for side in range(sides):
        faces.append((start_center, side + 1, side))
    end_center = len(vertices)
    vertices.append(points[-1])
    uvs.append((0.5, 0.5))
    last = (len(points) - 1) * stride
    for side in range(sides):
        faces.append((end_center, last + side, last + side + 1))
    return Geometry(vertices, faces, uvs)
