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

# The joint list is LOD-dependent: the hero rig carries the anatomical detail
# and the distance LODs drop it deliberately.
REQUIRED_BONES = (
    "Head",
    "Jaw",
    "Gill.L",
    "Gill.R",
    "Spine.01",
    "Spine.02",
    "Spine.03",
    "Tail.01",
    "TailFin",
    "Pectoral.L",
    "Pectoral.R",
    "Pelvic.L",
    "Pelvic.R",
    "Dorsal",
    "Dorsal.Ray.1",
    "Dorsal.Ray.2",
    "Dorsal.Ray.3",
    "AnalFin",
    "AnalRay.1",
    "AnalRay.2",
    "TailFin.U",
    "TailFin.L",
)

_MID_BONES = REQUIRED_BONES + (
    "Spine.04",
    "Tail.02",
    "Dorsal.Ray.6",
    "AnalRay.4",
    "TailFin.U.2",
    "TailFin.L.2",
    "TailFin.U.Tip",
    "TailFin.L.Tip",
    "PectoralRay.L.3",
    "PectoralRay.R.3",
    "PelvicRay.L.2",
    "PelvicRay.R.2",
    "Eye.L",
    "Eye.R",
)

_HIGH_BONES = _MID_BONES + (
    "Spine.05",
    "Spine.06",
    "Tail.03",
    "Dorsal.Ray.12",
    "AnalRay.8",
    "TailFin.U.5",
    "TailFin.L.5",
    "PectoralRay.L.5",
    "PectoralRay.R.5",
    "PelvicRay.L.4",
    "PelvicRay.R.4",
    "Hyoid",
    "UpperJaw",
)

REQUIRED_BONES_BY_LOD = {
    "high": _HIGH_BONES,
    "mid": _MID_BONES,
    "low": REQUIRED_BONES,
}


def required_bones(lod: str) -> tuple[str, ...]:
    """The joints a GLB must expose at one LOD."""
    if lod not in REQUIRED_BONES_BY_LOD:
        raise ValueError("unknown LOD: %s" % lod)
    return REQUIRED_BONES_BY_LOD[lod]


def glb_path(slug: str, lod: str) -> Path:
    """Return the repository-relative output path for one species/LOD."""
    if slug not in TRIANGLE_CAPS:
        raise ValueError("unknown fish species: %s" % slug)
    if lod not in LODS:
        raise ValueError("unknown LOD: %s" % lod)
    family = "arulius-barb" if slug == "arulius-barb" else "zebra-danio"
    return Path("public/models/fish") / family / ("%s-%s.glb" % (slug, lod))
