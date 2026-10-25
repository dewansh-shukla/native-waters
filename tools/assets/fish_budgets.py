"""Per-file budgets for the six rebuilt native fish species."""

from pathlib import Path


SPECIES = (
    "arulius-barb",
    "zebra-danio",
    "zebra-danio-wild",
    "zebra-danio-golden",
    "zebra-danio-albino",
    "zebra-danio-glowfish-green",
)

LODS = ("high", "mid", "low")

ARULIUS_CAPS = {"high": 12000, "mid": 4500, "low": 1500}
DANIO_CAPS = {"high": 10000, "mid": 4000, "low": 1400}
TRIANGLE_CAPS = {
    slug: dict(ARULIUS_CAPS if slug == "arulius-barb" else DANIO_CAPS)
    for slug in SPECIES
}

BYTE_CAPS = {"high": 1800000, "mid": 1000000, "low": 250000}
PRIMITIVE_CAPS = {"high": 6, "mid": 6, "low": 4}

REQUIRED_BONES = (
    "Head",
    "Jaw",
    "Gill.L",
    "Gill.R",
    "Spine.01",
    "Spine.02",
    "Spine.03",
    "Tail.01",
    "Tail.02",
    "TailFin",
    "Pectoral.L",
    "Pectoral.R",
    "Pelvic.L",
    "Pelvic.R",
    "Dorsal",
    "AnalFin",
)


def glb_path(slug: str, lod: str) -> Path:
    """Return the repository-relative output path for one species/LOD."""
    if slug not in TRIANGLE_CAPS:
        raise ValueError("unknown fish species: %s" % slug)
    if lod not in LODS:
        raise ValueError("unknown LOD: %s" % lod)
    family = "arulius-barb" if slug == "arulius-barb" else "zebra-danio"
    return Path("public/models/fish") / family / ("%s-%s.glb" % (slug, lod))
