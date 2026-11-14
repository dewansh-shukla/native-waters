"""Rig geometry and fin skin-weight ramps for the native fish.

Kept free of `bpy` so the placement and weighting can be unit-tested without
Blender. `create_fish_species.py` builds the armature from `bone_specs()`,
builds the fins from `fin_points()`, and weights fin vertices with the ramps
below. The mesh and the armature share one source of fin geometry so a ray
bone always starts on the membrane it deforms.

The rig has three tiers so the hero LOD can be anatomically dense without
inflating the distance LODs:

* HIGH - every principal fin ray has a bone, the spine is ten segments long,
  and the head carries separate jaws, hyoid, opercula and eye bones.
* MID  - fewer rays and a shorter spine, same names.
* LOW  - the original sparse rig, with no per-ray bones.
"""

from dataclasses import dataclass
from math import pi, sin

from tools.blender.fish_specs import MEASUREMENTS, profile


@dataclass(frozen=True)
class RigPlan:
    """How many bones one LOD carries, grouped by part."""

    spine: int
    tail: int
    pectoral_rays: int
    pelvic_rays: int
    dorsal_rays: int
    anal_rays: int
    caudal_rays: int      # per lobe
    caudal_tips: bool
    eyes: bool
    upper_jaw: bool
    hyoid: bool

    @property
    def body_segments(self):
        return self.spine + self.tail + 1  # + TailFin


RIG_PLANS = {
    "high": RigPlan(spine=6, tail=3, pectoral_rays=5, pelvic_rays=4,
                    dorsal_rays=12, anal_rays=8, caudal_rays=5,
                    caudal_tips=True, eyes=True, upper_jaw=True, hyoid=True),
    "mid": RigPlan(spine=4, tail=2, pectoral_rays=3, pelvic_rays=2,
                   dorsal_rays=6, anal_rays=4, caudal_rays=2,
                   caudal_tips=True, eyes=True, upper_jaw=False, hyoid=False),
    "low": RigPlan(spine=3, tail=1, pectoral_rays=0, pelvic_rays=0,
                   dorsal_rays=3, anal_rays=2, caudal_rays=0,
                   caudal_tips=False, eyes=False, upper_jaw=False, hyoid=False),
}

# Geometry ray counts per LOD. These are the real species counts at HIGH; MID
# and LOW thin them out while keeping the same silhouette.
FIN_RAYS = {
    "high": {"dorsal": 12, "anal": 8, "caudal": 19, "pectoral": 16, "pelvic": 9},
    "mid": {"dorsal": 8, "anal": 6, "caudal": 14, "pectoral": 10, "pelvic": 7},
    "low": {"dorsal": 5, "anal": 4, "caudal": 11, "pectoral": 6, "pelvic": 5},
}

# Species meristics from the literature: Dawkinsia arulius has 4 unbranched +
# 8 branched dorsal rays, 3 + 5 anal, 1 + 15 pectoral, 1 + 8 pelvic and 10 + 9
# principal caudal rays. The two dorsal and anal procurrents are folded into
# the first ray, which is how the fin is built here.
SPECIES_RAYS = {
    "arulius-barb": {"dorsal": 12, "anal": 8, "caudal": 19, "pectoral": 16, "pelvic": 9},
    "zebra-danio": {"dorsal": 9, "anal": 14, "caudal": 19, "pectoral": 13, "pelvic": 8},
    "badis": {"dorsal": 12, "anal": 8, "caudal": 19, "pectoral": 16, "pelvic": 9},
    "zebra-loach": {"dorsal": 9, "anal": 7, "caudal": 15, "pectoral": 12, "pelvic": 7},
}

_HEAD_X = -0.55
_TAIL_X = 1.00
_REAR_X = 0.80


def _clamp(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def _smooth(value):
    value = _clamp(value)
    return value * value * (3.0 - 2.0 * value)


def _lerp(start, end, t):
    return tuple(a + (b - a) * t for a, b in zip(start, end))


def _length(value):
    return (value[0] ** 2 + value[1] ** 2 + value[2] ** 2) ** 0.5


def _unit(value):
    length = _length(value)
    if length < 1e-9:
        return (0.0, 0.0, 1.0)
    return (value[0] / length, value[1] / length, value[2] / length)


def plan_for(lod):
    """The rig plan for one LOD."""
    if lod not in RIG_PLANS:
        raise ValueError("unknown LOD: %r" % (lod,))
    return RIG_PLANS[lod]


def ray_rows(rows, bones):
    """Normalised positions of `bones` ray bones across `rows` mesh rows.

    A fin is built with one row per ray, and the bone budget is a subset of
    those rows at MID and LOW. Choosing the nearest row keeps every bone on a
    real ray instead of in the membrane between two.
    """
    if bones <= 0:
        return ()
    if bones == 1:
        return (0.0,)
    if rows <= 1:
        return tuple(0.0 for _ in range(bones))
    indices = [round(index * (rows - 1) / (bones - 1)) for index in range(bones)]
    return tuple(index / (rows - 1) for index in indices)


def spine_segments(spec, plan):
    """[(name, head, tail, parent)] for the body wave chain."""
    count = plan.body_segments
    joints = [_HEAD_X + (_TAIL_X - _HEAD_X) * index / count
              for index in range(count + 1)]
    segments = []
    for index in range(plan.spine):
        name = "Spine.%02d" % (index + 1)
        parent = "Head" if index == 0 else "Spine.%02d" % index
        segments.append((name, joints[index], joints[index + 1], parent))
    start = plan.spine
    for index in range(plan.tail):
        name = "Tail.%02d" % (index + 1)
        parent = "Spine.%02d" % plan.spine if index == 0 else "Tail.%02d" % index
        segments.append((name, joints[start + index], joints[start + index + 1], parent))
    name = "TailFin"
    parent = "Tail.%02d" % plan.tail if plan.tail else "Spine.%02d" % plan.spine
    segments.append((name, joints[-2], joints[-1], parent))
    return segments


def chain_centers(spec, plan):
    """[(name, x)] for every deform bone along the body axis, Head first.

    The Head bone runs from the snout (-1.0) to the nape (_HEAD_X), so it must
    head the chain: without it every snout vertex lands on Spine.01 and a
    species with no barbels or eye decals (the danio) leaves Head unweighted.
    """
    head = ("Head", 0.5 * (-1.0 + _HEAD_X))
    return [head] + [(name, 0.5 * (h + t)) for name, h, t, _ in spine_segments(spec, plan)]


def chain_bone_at(spec, plan, x):
    """Name of the body-chain bone whose span contains x (nearest at the ends)."""
    segments = spine_segments(spec, plan)
    for name, head, tail, _ in segments:
        if x <= tail:
            return name
    return segments[-1][0]


def caudal_span(spec):
    """(rear_x, caudal_len, centre, spread) for one species' caudal fin."""
    bl = spec.body_length
    rear_x = -1.0 + bl
    caudal_len = bl * MEASUREMENTS.get(spec.slug, {}).get("caudal_length_SL", 0.15)
    half_height, _, centre = profile(spec.slug, 1.0)
    base = max(0.02, half_height * 0.98)
    return rear_x, caudal_len, centre, base * 2.5


def _dorsal_origin(spec):
    bl = spec.body_length
    return bl * MEASUREMENTS.get(spec.slug, {}).get("dorsal_origin_SL", 0.28) - 1.0


def _anal_origin(spec):
    bl = spec.body_length
    return bl * MEASUREMENTS.get(spec.slug, {}).get("anal_origin_SL", 0.55) - 1.0


# Fin proportions in body units. A species only declares what differs from the
# barb default; every number here used to be an `if slug == "arulius-barb"`
# branch inside fin_points, which made a second fin plan impossible.
_FIN_DEFAULTS = {
    "dorsal_base": 0.30, "dorsal_height": 0.085,
    "anal_base": 0.18, "anal_height": 0.060,
    "pectoral_origin": 0.480, "pectoral_reach": 0.155, "pectoral_lift": 0.075,
    "pelvic_origin": 0.670, "pelvic_reach": 0.105, "pelvic_lift": 0.030,
    "pelvic_lead": 0.0,
}


def fin_shape(spec):
    """Per-species fin proportions in body units.

    Lengths scale with body length; the origins are stored as a fraction of SL
    so a species with a small head can hang its pectoral fin right behind the
    operculum instead of at a fixed x.
    """
    raw = MEASUREMENTS.get(spec.slug, {})
    bl = spec.body_length
    shape = {}
    for key, default in _FIN_DEFAULTS.items():
        shape[key] = bl * raw.get(key + "_SL", default / bl)
    for key in ("pectoral_origin", "pelvic_origin"):
        shape[key] = -1.0 + bl * raw.get(key + "_SL", _FIN_DEFAULTS[key] / bl)
    return shape


def fin_points(spec, rays):
    """Root/tip polylines for every fin, in body space.

    `rays` is the geometry ray count per fin (`FIN_RAYS[lod]`). The builder
    samples these polylines one row per ray, and the armature places its ray
    bones on the same indices, so a bone always owns the membrane row it
    deforms.
    """
    bl = spec.body_length
    shape = fin_shape(spec)
    points = {}

    # Dorsal: long-based on the Arulius, short-based on a danionine. The
    # leading ray is the tallest and the trailing edge dips concave so the fin
    # reads as a sail, not a triangle.
    count = rays["dorsal"]
    base_x = _dorsal_origin(spec)
    base_len = shape["dorsal_base"]
    tall = shape["dorsal_height"]
    roots, tips = [], []
    for index in range(count):
        t = index / (count - 1)
        x = base_x + base_len * t
        half_height, _, centre = profile(spec.slug, (x + 1.0) / bl)
        roots.append((x, 0.0, centre + half_height * 0.98))
        # The leading ray is the tallest; the edge falls away and dips concave
        # toward the rear so the fin reads as a sail, not a triangle.
        lift = tall * (1.0 - 0.72 * t ** 1.15) * (1.0 - 0.18 * sin(pi * t))
        lift = max(0.012, lift)
        tips.append((x + 0.030 + 0.085 * t, 0.0,
                     centre + half_height * 0.98 + lift))
    points["dorsal"] = (roots, tips)

    # Caudal: one row per principal ray across a forked fan.
    rear_x = -1.0 + bl
    _, caudal_len, centre, spread = caudal_span(spec)
    base = spread / 2.5
    count = rays["caudal"]
    roots, tips = [], []
    for index in range(count):
        across = (index / (count - 1)) * 2.0 - 1.0
        roots.append((rear_x - 0.004, 0.0, centre + across * base))
        edge = 1.0 - 0.16 * across * across
        length = caudal_len * (0.52 + 0.48 * abs(across) ** 0.80) * (1.0 - 0.08 * across ** 6)
        tips.append((rear_x - 0.004 + length, 0.0,
                     centre + across * base * 2.35 * edge))
    points["caudal"] = (roots, tips)

    # Anal: the longest-based median fin. On Chela it carries 19-23 rays and
    # runs a quarter of the body, so the base is a species value rather than a
    # fixed stub.
    count = rays["anal"]
    anal_x0 = _anal_origin(spec)
    base_len = shape["anal_base"]
    tall = shape["anal_height"]
    roots, tips = [], []
    for index in range(count):
        t = index / (count - 1)
        x = anal_x0 + base_len * t
        half_height, _, centre = profile(spec.slug, (x + 1.0) / bl)
        roots.append((x, 0.0, centre - half_height * 0.98))
        lift = tall * (0.55 + 0.45 * (1.0 - t) ** 1.3)
        tips.append((x + 0.045 + 0.030 * t, 0.0,
                     centre - half_height * 0.98 - lift))
    points["anal"] = (roots, tips)

    for side, label in ((-1, "L"), (1, "R")):
        # Pectoral: a fan behind the operculum that reaches toward the pelvic
        # origin. The origin is a fraction of SL, so a short head still puts the
        # fin behind the gill cover rather than at a fixed x on every species.
        count = rays["pectoral"]
        roots, tips = [], []
        for index in range(count):
            t = index / (count - 1)
            x = shape["pectoral_origin"] + 0.055 * t
            half_height, half_width, centre = profile(spec.slug, (x + 1.0) / bl)
            roots.append((x, side * half_width * 0.80,
                          centre + half_height * (0.10 - 0.36 * t)))
            reach = shape["pectoral_reach"] + shape["pectoral_lift"] * sin(pi * t) ** 0.8
            tips.append((x - 0.030 + reach * 0.92,
                         side * (half_width * 0.80 + 0.030 * sin(pi * t)),
                         centre + half_height * (0.02 - 0.62 * t) - 0.045 * sin(pi * t)))
        points["pectoral." + label] = (roots, tips)

        # Pelvic: a small fan under the belly, angled back and out. `pelvic_lead`
        # is the species' elongate first ray - on Chela it runs almost to the
        # end of the anal fin, which is diagnostic and reads at a glance.
        count = rays["pelvic"]
        roots, tips = [], []
        lead = shape["pelvic_lead"]
        for index in range(count):
            t = index / (count - 1)
            x = shape["pelvic_origin"] + 0.070 * t
            half_height, half_width, centre = profile(spec.slug, (x + 1.0) / bl)
            roots.append((x, side * half_width * 0.42,
                          centre - half_height * 0.80))
            if lead > 0.0:
                reach = lead * (1.0 - 0.72 * t) + 0.020 * sin(pi * t)
                span = 0.95
            else:
                reach = shape["pelvic_reach"] + shape["pelvic_lift"] * sin(pi * t) ** 0.8
                span = 0.85
            tips.append((x + reach * span,
                         side * half_width * (0.58 + 0.18 * t),
                         centre - half_height * (1.02 + 0.10 * sin(pi * t))))
        points["pelvic." + label] = (roots, tips)

    return points


def _fin_stations(rows, bones):
    """Normalised ray positions for a fin with `rows` rows and `bones` bones."""
    return ray_rows(rows, bones)


def bone_specs(spec, lod="high", rays=None):
    """Return (name, head, tail, parent, deform) tuples for one LOD's rig."""
    plan = plan_for(lod)
    if rays is None:
        rays = FIN_RAYS[lod]
    specs = [("Root", (-0.95, 0.0, 0.0), (-0.90, 0.0, 0.0), None, False),
             ("Head", (-1.00, 0.0, 0.0), (_HEAD_X, 0.0, 0.0), "Root", True)]

    for name, head, tail, parent in spine_segments(spec, plan):
        specs.append((name, (head, 0.0, 0.0), (tail, 0.0, 0.0), parent, True))

    # Jaw: the lower jaw hinges at the snout; the upper jaw and hyoid are HIGH
    # only. The old single `Jaw` bone stays as the mandible.
    specs.append(("Jaw", (-0.950, 0.0, -0.050), (-1.020, 0.0, -0.080), "Head", True))
    if plan.hyoid:
        specs.append(("Hyoid", (-0.900, 0.0, -0.075), (-0.860, 0.0, -0.105), "Jaw", True))
    if plan.upper_jaw:
        specs.append(("UpperJaw", (-0.960, 0.0, -0.010), (-1.015, 0.0, -0.025),
                      "Head", True))

    # Opercula: a plate hinged at its leading edge, not a vertical flap.
    for side, label in ((-1, "L"), (1, "R")):
        half_height, half_width, centre = profile(spec.slug, 0.25)
        specs.append(("Gill." + label,
                      (-0.640, side * half_width * 0.55, centre + 0.030),
                      (-0.560, side * half_width * 0.92, centre - 0.070),
                      "Head", True))
        if plan.eyes:
            eye_x, _, eye_z = spec.eye
            half_height, half_width, centre = profile(spec.slug, (eye_x + 1.0) / spec.body_length)
            height = (eye_z - centre) / max(half_height, 1e-6)
            surface = half_width * (max(0.05, 1.0 - height * height)) ** 0.5
            # Hinge at the globe's centre so a saccade spins the iris in place
            # instead of orbiting the eye around its socket.
            center_y = side * (surface - spec.eye_radius * 0.52)
            specs.append(("Eye." + label,
                          (eye_x, center_y, eye_z),
                          (eye_x, side * (surface + spec.eye_radius * 0.48), eye_z),
                          "Head", True))

    points = fin_points(spec, rays)

    # Pectoral and pelvic: a base bone along the fin's leading edge plus ray
    # bones fanning across it.
    for side, label in ((-1, "L"), (1, "R")):
        roots, tips = points["pectoral." + label]
        name = "Pectoral." + label
        specs.append((name, roots[0], tips[0], chain_bone_at(spec, plan, roots[0][0]), True))
        for index, position in enumerate(_fin_stations(len(roots), plan.pectoral_rays)):
            row = round(position * (len(roots) - 1))
            root, tip = roots[row], tips[row]
            specs.append(("PectoralRay.%s.%d" % (label, index + 1),
                          _lerp(root, tip, 0.10), _lerp(root, tip, 0.95),
                          "Pectoral." + label, True))

        roots, tips = points["pelvic." + label]
        name = "Pelvic." + label
        specs.append((name, roots[0], tips[0], chain_bone_at(spec, plan, roots[0][0]), True))
        for index, position in enumerate(_fin_stations(len(roots), plan.pelvic_rays)):
            row = round(position * (len(roots) - 1))
            root, tip = roots[row], tips[row]
            specs.append(("PelvicRay.%s.%d" % (label, index + 1),
                          _lerp(root, tip, 0.10), _lerp(root, tip, 0.95),
                          "Pelvic." + label, True))

    # Median fins: a base bone along the membrane root, ray bones across it.
    for key, prefix, base, parent_x in (
        ("dorsal", "Dorsal.Ray", "Dorsal", _dorsal_origin(spec)),
        ("anal", "AnalRay", "AnalFin", _anal_origin(spec)),
    ):
        roots, tips = points[key]
        specs.append((base, roots[0], roots[-1], chain_bone_at(spec, plan, parent_x), True))
        bones = plan.dorsal_rays if key == "dorsal" else plan.anal_rays
        for index, position in enumerate(_fin_stations(len(roots), max(1, bones))):
            row = round(position * (len(roots) - 1))
            root, tip = roots[row], tips[row]
            specs.append(("%s.%d" % (prefix, index + 1),
                          _lerp(root, tip, 0.10), _lerp(root, tip, 0.95),
                          base, True))

    # Caudal: two lobe bones, per-ray bones fanning across each lobe, and a
    # trailing-edge tip bone per lobe.
    rear_x, caudal_len, centre, spread = caudal_span(spec)
    lobe_root = rear_x + 0.38 * caudal_len
    with_rays = plan.caudal_rays
    for name, sign in (("TailFin.U", 1), ("TailFin.L", -1)):
        specs.append((name,
                      (lobe_root, 0.0, centre + sign * 0.46 * spread),
                      (rear_x + 0.98 * caudal_len, 0.0, centre + sign * 0.84 * spread),
                      "TailFin", True))
    if with_rays:
        roots, tips = points["caudal"]
        count = len(roots)
        middle = (count - 1) / 2.0
        for label, sign in (("U", 1), ("L", -1)):
            indices = [index for index in range(count)
                       if (index > middle if sign > 0 else index < middle)]
            for ray_index, position in enumerate(_fin_stations(len(indices), with_rays)):
                row = indices[round(position * (len(indices) - 1))]
                root, tip = roots[row], tips[row]
                specs.append(("TailFin.%s.%d" % (label, ray_index + 1),
                              _lerp(root, tip, 0.12), _lerp(root, tip, 0.94),
                              "TailFin." + label, True))
    if plan.caudal_tips:
        for label, sign in (("U", 1), ("L", -1)):
            specs.append(("TailFin.%s.Tip" % label,
                          (rear_x + 0.72 * caudal_len, 0.0, centre + sign * 0.66 * spread),
                          (rear_x + caudal_len, 0.0, centre + sign * 0.92 * spread),
                          "TailFin." + label, True))

    return tuple(specs)


def detail_bones(lod):
    """Names of the bones that exist only to deform a fin, eye or jaw detail."""
    plan = plan_for(lod)
    names = []
    if plan.eyes:
        names += ["Eye.L", "Eye.R"]
    if plan.hyoid:
        names.append("Hyoid")
    if plan.upper_jaw:
        names.append("UpperJaw")
    for side in ("L", "R"):
        names += ["PectoralRay.%s.%d" % (side, index + 1)
                  for index in range(plan.pectoral_rays)]
        names += ["PelvicRay.%s.%d" % (side, index + 1)
                  for index in range(plan.pelvic_rays)]
    names += ["Dorsal.Ray.%d" % (index + 1) for index in range(plan.dorsal_rays)]
    names += ["AnalRay.%d" % (index + 1) for index in range(plan.anal_rays)]
    # The caudal lobes are detail bones too: without them the fan cannot cup
    # and the twist has nothing to twist.
    names += ["TailFin.U", "TailFin.L"]
    for label in ("U", "L"):
        names += ["TailFin.%s.%d" % (label, index + 1)
                  for index in range(plan.caudal_rays)]
    if plan.caudal_tips:
        names += ["TailFin.U.Tip", "TailFin.L.Tip"]
    return tuple(names)


def bone_names(lod):
    """Every deform bone the LOD's skin can reference, in creation order."""
    plan = plan_for(lod)
    names = ["Head", "Jaw"]
    names += ["Spine.%02d" % (index + 1) for index in range(plan.spine)]
    names += ["Tail.%02d" % (index + 1) for index in range(plan.tail)]
    names += ["TailFin"]
    if plan.hyoid:
        names.append("Hyoid")
    if plan.upper_jaw:
        names.append("UpperJaw")
    names += ["Gill.L", "Gill.R"]
    if plan.eyes:
        names += ["Eye.L", "Eye.R"]
    for side in ("L", "R"):
        names.append("Pectoral." + side)
        names += ["PectoralRay.%s.%d" % (side, index + 1)
                  for index in range(plan.pectoral_rays)]
        names.append("Pelvic." + side)
        names += ["PelvicRay.%s.%d" % (side, index + 1)
                  for index in range(plan.pelvic_rays)]
    names.append("Dorsal")
    names += ["Dorsal.Ray.%d" % (index + 1) for index in range(plan.dorsal_rays)]
    names.append("AnalFin")
    names += ["AnalRay.%d" % (index + 1) for index in range(plan.anal_rays)]
    names += ["TailFin.U", "TailFin.L"]
    for label in ("U", "L"):
        names += ["TailFin.%s.%d" % (label, index + 1)
                  for index in range(plan.caudal_rays)]
    if plan.caudal_tips:
        names += ["TailFin.U.Tip", "TailFin.L.Tip"]
    return tuple(names)


def body_attachment(span):
    """How much of a fin vertex stays welded to the body chain.

    Only the first quarter of the fin blends into the body, so the seam holds
    while the rest of the fin is owned by its own bone chain. The band never
    reaches one: the root row keeps a small share on the fin's own base bone,
    so that bone deforms the whole membrane instead of only its middle, and a
    coarse LOD with no vertex between the seam and mid-span still gives the
    base bone real weight.
    """
    return 0.86 * _clamp(1.0 - span / 0.26)


def span_weights(span):
    """(root, tip) split along a two-bone fin chain."""
    span = _clamp(span)
    return 1.0 - span, span


def fin_base_share(span):
    """Share of a fin's own weight that stays on its base bone.

    One at the membrane root, zero by 42% of the span, so the outer fin is
    owned entirely by the ray bones and can ripple instead of pivoting.
    """
    return _clamp(1.0 - _smooth((span - 0.08) / 0.34))


def ray_weights(position, stations):
    """Weights on the two ray bones either side of a normalised position.

    `position` is the vertex's place across the fin's rays, 0 at the leading
    edge and 1 at the trailing edge, and `stations` are the normalised
    positions of the ray bones. A vertex that sits exactly on a ray station is
    owned outright by that ray; blending it half into its neighbour is what
    averages the ripple away and leaves the fin swinging as one plate.
    """
    position = _clamp(position)
    if not stations:
        return ()
    if len(stations) == 1:
        return ((0, 1.0),)
    for low in range(len(stations) - 1):
        if position <= stations[low + 1]:
            span = stations[low + 1] - stations[low]
            share = _clamp((position - stations[low]) / span) if span > 0 else 0.0
            return ((low, 1.0 - share), (low + 1, share))
    return ((len(stations) - 2, 0.0), (len(stations) - 1, 1.0))


def caudal_tip_share(span):
    """Share of a caudal lobe handed to its trailing-edge tip bone."""
    return _clamp((span - 0.55) / 0.40)


def caudal_lobe_weights(z_frac):
    """(upper, lower) split across the caudal fan, 0 at the midline."""
    z_frac = max(-1.0, min(1.0, z_frac))
    upper = (z_frac + 1.0) / 2.0
    return upper, 1.0 - upper
