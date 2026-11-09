"""Pure anatomy data for the native fish; no bpy or numpy imports."""

from dataclasses import dataclass
from math import pi, sin

# Measured from the reference pack (artifacts/fish-production/reference) in
# body-length units, tolerance +/-0.02, on 2026-10-26 from grid overlays.
# These are the binding spec for the photoreal rebuild (R2+); the builder
# starts consuming them in R2. Lab danio photo is plumper than wild type.
MEASUREMENTS = {
    "arulius-barb": {
        "depth_SL": 0.29, "head_SL": 0.24, "eye_SL": 0.07, "eye_HL": 0.29,
        "dorsal_origin_SL": 0.53, "anal_origin_SL": 0.60,
        "peduncle_depth_SL": 0.11, "caudal_length_SL": 0.18,
        "blotches_SL": (0.43, 0.73, 0.92), "fin_colour": "red",
        "iris_colour": "red-orange",
    },
    "zebra-danio": {
        "depth_SL": 0.26, "head_SL": 0.20, "eye_SL": 0.07, "eye_HL": 0.35,
        "dorsal_origin_SL": 0.58, "anal_origin_SL": 0.55,
        "peduncle_depth_SL": 0.11, "caudal_length_SL": 0.20,
        "stripes": 5, "fin_colour": "clear-yellow", "anal_fin": "striped",
    },
}


@dataclass(frozen=True)
class Variant:
    slug: str
    label: str
    body: str
    stripe: str
    fin: str
    iris: str


@dataclass(frozen=True)
class SpeciesSpec:
    slug: str
    family: str
    label: str
    rings: dict[str, int]
    sides: dict[str, int]
    height: float
    width: float
    variants: tuple[Variant, ...]
    body_length: float = 1.8
    arch: float = 0.12
    eye: tuple[float, float, float] = (-0.78, 0.0, 0.05)
    eye_radius: float = 0.07
    barbels: bool = False
    pattern: str = "stripes"
    normal_high: int = 1024


ARULIUS = SpeciesSpec(
    slug="arulius-barb",
    family="arulius-barb",
    label="Arulius Barb",
    rings={"high": 72, "mid": 48, "low": 32},
    sides={"high": 24, "mid": 16, "low": 10},
    height=0.267,
    width=0.105,
    variants=(
        Variant("arulius-barb", "Arulius Barb", "#cfc9b8", "#0b0f08", "#c24a2e", "#a8964f"),
    ),
    body_length=1.8,
    arch=0.10,
    eye=(-0.865, 0.0, 0.035),
    eye_radius=0.072,
    barbels=True,
    pattern="blotches",
)

ZEBRA_DANIO = SpeciesSpec(
    slug="zebra-danio",
    family="zebra-danio",
    label="Zebra Danio",
    rings={"high": 72, "mid": 48, "low": 32},
    sides={"high": 24, "mid": 16, "low": 10},
    height=0.22,
    width=0.085,
    variants=(
        Variant("zebra-danio", "Zebra Danio", "#cfd5cd", "#1f4f82", "#e8dcbe", "#c9b46a"),
        Variant("zebra-danio-wild", "Wild Zebra Danio", "#a9b8a6", "#1f3f5a", "#c8d2c0", "#b7a45c"),
        Variant("zebra-danio-golden", "Golden Zebra Danio", "#e0b45c", "#f2e6c8", "#f0e4b8", "#caa24a"),
        Variant("zebra-danio-albino", "Albino Zebra Danio", "#f0ded2", "#e8c4b8", "#f2d9d0", "#d86a5a"),
        Variant("zebra-danio-glowfish-green", "GloFish Green", "#7adf6a", "#c8ffb0", "#8ce87a", "#6fbf5a"),
    ),
    body_length=1.8,
    arch=0.06,
    eye=(-0.86, 0.0, 0.040),
    eye_radius=0.065,
    barbels=False,
    pattern="stripes",
    # Five variants share one HIGH texture-memory budget with the Arulius, so
    # the danio high normal map stays at 512 instead of 1024.
    normal_high=512,
)

SPECIES = {
    "arulius-barb": ARULIUS,
    "zebra-danio": ZEBRA_DANIO,
}

# Fraction of maximum half-depth along the body. A real barb is deep through the
# middle and keeps a substantial caudal peduncle instead of tapering to a stick.
SHAPE_POINTS = {
    "arulius-barb": ((0.00, 0.22), (0.08, 0.52), (0.18, 0.78), (0.35, 0.95),
                     (0.55, 1.00), (0.72, 0.92), (0.86, 0.66), (0.94, 0.42),
                     (1.00, 0.24)),
    "zebra-danio": ((0.00, 0.10), (0.10, 0.48), (0.25, 0.82), (0.50, 1.00),
                    (0.70, 0.85), (0.88, 0.50), (1.00, 0.16)),
}

# Absolute dorsal and ventral edge heights, measured from the lateral photos:
# a barb is not a symmetric tube. The back rises steeply to a dorsal hump, the
# belly hangs deeper, and the peduncle stays substantial.
CONTOURS = {
    "arulius-barb": {
        "top": ((0.00, 0.070), (0.02, 0.105), (0.05, 0.155), (0.08, 0.200),
                (0.15, 0.255), (0.23, 0.275), (0.32, 0.283), (0.44, 0.288),
                (0.55, 0.280), (0.66, 0.255), (0.76, 0.215), (0.85, 0.165),
                (0.92, 0.115), (0.97, 0.105), (1.00, 0.100)),
        "bottom": ((0.00, -0.050), (0.02, -0.070), (0.05, -0.095), (0.08, -0.120),
                   (0.15, -0.160), (0.23, -0.195), (0.32, -0.215), (0.44, -0.225),
                   (0.55, -0.220), (0.66, -0.195), (0.76, -0.160), (0.85, -0.125),
                   (0.92, -0.098), (0.97, -0.094), (1.00, -0.090)),
    },
    "zebra-danio": {
        "top": ((0.00, 0.055), (0.02, 0.090), (0.05, 0.140), (0.09, 0.185),
                (0.16, 0.215), (0.28, 0.235), (0.42, 0.240), (0.55, 0.232),
                (0.68, 0.210), (0.80, 0.170), (0.90, 0.120), (0.96, 0.092),
                (1.00, 0.088)),
        "bottom": ((0.00, -0.045), (0.02, -0.070), (0.05, -0.100), (0.09, -0.135),
                   (0.16, -0.165), (0.28, -0.190), (0.42, -0.200), (0.55, -0.195),
                   (0.68, -0.175), (0.80, -0.140), (0.90, -0.100), (0.96, -0.087),
                   (1.00, -0.083)),
    },
}


def _line(points, t):
    if t <= points[0][0]:
        return points[0][1]
    for (t0, v0), (t1, v1) in zip(points, points[1:]):
        if t <= t1:
            blend = (t - t0) / (t1 - t0)
            blend = blend * blend * (3.0 - 2.0 * blend)
            return v0 + (v1 - v0) * blend
    return points[-1][1]


def _shape(slug, t):
    points = SHAPE_POINTS[slug]
    if t <= points[0][0]:
        return points[0][1]
    for (t0, v0), (t1, v1) in zip(points, points[1:]):
        if t <= t1:
            blend = (t - t0) / (t1 - t0)
            blend = blend * blend * (3.0 - 2.0 * blend)
            return v0 + (v1 - v0) * blend
    return points[-1][1]


def profile(slug: str, t: float) -> tuple[float, float, float]:
    """Return (half-height, half-width, vertical centre) at body fraction t."""
    spec = SPECIES[slug]
    t = min(1.0, max(0.0, t))
    contour = CONTOURS.get(slug)
    if contour is not None:
        top = _line(contour["top"], t)
        bottom = _line(contour["bottom"], t)
        half_height = max(0.012, 0.5 * (top - bottom))
        centre = 0.5 * (top + bottom)
        # Heads stay rounder than the compressed flank: a width that follows the
        # height too closely pinches the snout into a blade.
        half_width = max(0.008, spec.width * (0.45 + 0.55 * half_height / spec.height))
        return half_height, half_width, centre
    shape = _shape(slug, t)
    half_height = max(0.008, spec.height * shape)
    half_width = max(0.006, spec.width * shape)
    centre = spec.arch * spec.height * sin(pi * t)
    return half_height, half_width, centre


def variant(species_slug: str, variant_slug: str) -> Variant:
    """Find one variant by slug inside a base species."""
    for item in SPECIES[species_slug].variants:
        if item.slug == variant_slug:
            return item
    raise KeyError("unknown variant: %s/%s" % (species_slug, variant_slug))


def hex_rgb(value: str) -> tuple[float, float, float]:
    """Convert #rrggbb to a linear-ish 0..1 RGB triple for Blender nodes."""
    value = value.lstrip("#")
    if len(value) != 6:
        raise ValueError("expected #rrggbb, got %r" % value)
    return tuple(int(value[index:index + 2], 16) / 255.0 for index in (0, 2, 4))
