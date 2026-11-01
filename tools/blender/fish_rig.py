"""Rig geometry and fin skin-weight ramps for the native fish.

Kept free of `bpy` so the placement and weighting can be unit-tested without
Blender. `create_fish_species.py` builds the armature from `bone_specs()` and
weights fin vertices with the ramps below.
"""

from tools.blender.fish_specs import MEASUREMENTS, profile

# The 24-bone rig: the 16 original deform bones, Root, and 7 detail bones that
# let fins flex and twist along their rays.
DETAIL_BONES = (
    "TailFin.U", "TailFin.L",
    "Pectoral.L.Tip", "Pectoral.R.Tip",
    "Dorsal.Mid", "Dorsal.Tip",
    "AnalFin.Tip",
)

BONE_NAMES = (
    "Head", "Jaw", "Gill.L", "Gill.R",
    "Spine.01", "Spine.02", "Spine.03",
    "Tail.01", "Tail.02", "TailFin",
    "Pectoral.L", "Pectoral.R", "Pelvic.L", "Pelvic.R",
    "Dorsal", "AnalFin",
) + DETAIL_BONES

# Bones that carry the travelling body wave, in order from nape to fin.
WAVE_BONES = ("Spine.01", "Spine.02", "Spine.03", "Tail.01", "Tail.02", "TailFin")

# Kept byte-identical to the rig before the detail bones were added.
_BASE_SPECS = (
    ("Root", (-0.95, 0.0, 0.0), (-0.90, 0.0, 0.0), None, False),
    ("Head", (-1.00, 0.0, 0.0), (-0.55, 0.0, 0.0), "Root", True),
    ("Spine.01", (-0.55, 0.0, 0.0), (-0.15, 0.0, 0.0), "Head", True),
    ("Spine.02", (-0.15, 0.0, 0.0), (0.25, 0.0, 0.0), "Spine.01", True),
    ("Spine.03", (0.25, 0.0, 0.0), (0.55, 0.0, 0.0), "Spine.02", True),
    ("Tail.01", (0.55, 0.0, 0.0), (0.75, 0.0, 0.0), "Spine.03", True),
    ("Tail.02", (0.75, 0.0, 0.0), (0.90, 0.0, 0.0), "Tail.01", True),
    ("TailFin", (0.80, 0.0, 0.0), (1.00, 0.0, 0.0), "Tail.02", True),
    ("Jaw", (-0.95, 0.0, -0.05), (-1.02, 0.0, -0.08), "Head", True),
    ("Gill.L", (-0.62, -0.10, 0.0), (-0.62, -0.10, 0.20), "Head", True),
    ("Gill.R", (-0.62, 0.10, 0.0), (-0.62, 0.10, 0.20), "Head", True),
    ("Pectoral.L", (-0.40, -0.10, -0.05), (-0.15, -0.30, -0.20), "Spine.01", True),
    ("Pectoral.R", (-0.40, 0.10, -0.05), (-0.15, 0.30, -0.20), "Spine.01", True),
    ("Pelvic.L", (-0.33, -0.05, -0.20), (-0.10, -0.10, -0.32), "Spine.01", True),
    ("Pelvic.R", (-0.33, 0.05, -0.20), (-0.10, 0.10, -0.32), "Spine.01", True),
    ("Dorsal", (-0.35, 0.0, 0.30), (0.30, 0.0, 0.35), "Spine.02", True),
    ("AnalFin", (-0.20, 0.0, -0.22), (0.35, 0.0, -0.30), "Spine.02", True),
)


def _clamp(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def _lerp(start, end, t):
    return tuple(a + (b - a) * t for a, b in zip(start, end))


def caudal_span(spec):
    """(rear_x, caudal_len, centre, spread) for one species' caudal fin."""
    bl = spec.body_length
    rear_x = -1.0 + bl
    caudal_len = bl * MEASUREMENTS.get(spec.slug, {}).get("caudal_length_SL", 0.15)
    half_height, _, centre = profile(spec.slug, 1.0)
    base = max(0.02, half_height * 0.98)
    return rear_x, caudal_len, centre, base * 2.5


def bone_specs(spec):
    """Return (name, head, tail, parent, deform) tuples for the 24-bone rig."""
    rear_x, caudal_len, centre, spread = caudal_span(spec)
    specs = list(_BASE_SPECS)
    by_name = {item[0]: item for item in _BASE_SPECS}

    lobe_root = rear_x + 0.40 * caudal_len
    lobe_tip = rear_x + caudal_len
    specs.append(("TailFin.U", (lobe_root, 0.0, centre + 0.50 * spread),
                  (lobe_tip, 0.0, centre + 0.85 * spread), "TailFin", True))
    specs.append(("TailFin.L", (lobe_root, 0.0, centre - 0.50 * spread),
                  (lobe_tip, 0.0, centre - 0.85 * spread), "TailFin", True))

    for name in ("Pectoral.L", "Pectoral.R"):
        head, tail = by_name[name][1], by_name[name][2]
        specs.append((name + ".Tip", _lerp(head, tail, 0.55), _lerp(head, tail, 1.10), name, True))

    dorsal_head, dorsal_tail = by_name["Dorsal"][1], by_name["Dorsal"][2]
    specs.append(("Dorsal.Mid", _lerp(dorsal_head, dorsal_tail, 0.34),
                  _lerp(dorsal_head, dorsal_tail, 0.67), "Dorsal", True))
    specs.append(("Dorsal.Tip", _lerp(dorsal_head, dorsal_tail, 0.67),
                  _lerp(dorsal_head, dorsal_tail, 1.00), "Dorsal.Mid", True))

    anal_head, anal_tail = by_name["AnalFin"][1], by_name["AnalFin"][2]
    specs.append(("AnalFin.Tip", _lerp(anal_head, anal_tail, 0.50),
                  _lerp(anal_head, anal_tail, 1.00), "AnalFin", True))

    return tuple(specs)


def body_attachment(span):
    """How much of a fin vertex stays welded to the body chain.

    Only the first quarter of the fin blends into the body, so the seam holds
    while the rest of the fin is owned by its own bone chain.
    """
    return _clamp(1.0 - span / 0.25)


def span_weights(span):
    """(root, tip) split along a two-bone fin chain."""
    span = _clamp(span)
    return 1.0 - span, span


def dorsal_chain_weights(u):
    """(front, middle, rear) split along a long-based fin's base."""
    u = _clamp(u)
    front = _clamp(1.0 - 2.0 * u)
    rear = _clamp(2.0 * u - 1.0)
    return front, 1.0 - front - rear, rear


def caudal_lobe_weights(z_frac):
    """(upper, lower) split across the caudal fan, 0 at the midline."""
    z_frac = max(-1.0, min(1.0, z_frac))
    upper = (z_frac + 1.0) / 2.0
    return upper, 1.0 - upper
