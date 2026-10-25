"""Pure anatomy data for the native fish; no bpy or numpy imports."""

from dataclasses import dataclass
from math import pi, sin


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


ARULIUS = SpeciesSpec(
    slug="arulius-barb",
    family="arulius-barb",
    label="Arulius Barb",
    rings={"high": 72, "mid": 48, "low": 32},
    sides={"high": 24, "mid": 16, "low": 10},
    height=0.34,
    width=0.135,
    variants=(
        Variant("arulius-barb", "Arulius Barb", "#b8b6a4", "#2a2a24", "#c9b07a", "#b08a3a"),
    ),
    body_length=1.8,
    arch=0.18,
    eye=(-0.78, 0.0, 0.06),
    eye_radius=0.085,
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
        Variant("zebra-danio", "Zebra Danio", "#c9d6d8", "#2f4f6f", "#d8c98a", "#c9b46a"),
        Variant("zebra-danio-wild", "Wild Zebra Danio", "#a9b8a6", "#1f3f5a", "#c8d2c0", "#b7a45c"),
        Variant("zebra-danio-golden", "Golden Zebra Danio", "#e0b45c", "#f2e6c8", "#e8c76a", "#caa24a"),
        Variant("zebra-danio-albino", "Albino Zebra Danio", "#f0ded2", "#e8c4b8", "#f2d9d0", "#d86a5a"),
        Variant("zebra-danio-glowfish-green", "GloFish Green", "#7adf6a", "#c8ffb0", "#8ce87a", "#6fbf5a"),
    ),
    body_length=1.8,
    arch=0.06,
    eye=(-0.80, 0.0, 0.03),
    eye_radius=0.06,
    barbels=False,
    pattern="stripes",
)

SPECIES = {
    "arulius-barb": ARULIUS,
    "zebra-danio": ZEBRA_DANIO,
}


def profile(slug: str, t: float) -> tuple[float, float, float]:
    """Return (half-height, half-width, vertical centre) at body fraction t."""
    spec = SPECIES[slug]
    t = min(1.0, max(0.0, t))
    u = min(1.0, max(0.0, (t - 0.03) / 0.78))
    shape = 0.12 + 0.88 * (sin(pi * u) ** 0.65)
    half_height = max(0.02, spec.height * shape)
    half_width = max(0.012, spec.width * shape)
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
