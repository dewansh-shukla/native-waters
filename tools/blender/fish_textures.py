"""Procedural, UV-aware maps for the native fish; Blender-only, NumPy-fast."""

from pathlib import Path

import bpy
import numpy as np

from tools.blender.fish_specs import hex_rgb, profile


TAU = 2.0 * np.pi


def _grid(size):
    yy, xx = np.mgrid[0:size, 0:size]
    return (xx + 0.5) / size, (yy + 0.5) / size


def _tile_grid(width, height):
    yy, xx = np.mgrid[0:height, 0:width]
    return (xx + 0.5) / width, (yy + 0.5) / height


def _smoothstep(value):
    value = np.clip(value, 0.0, 1.0)
    return value * value * (3.0 - 2.0 * value)


def _rgb(value):
    # Image pixels in Blender are linear; palettes are authored in sRGB. Without
    # this the maps save washed out and black blotches turn mid-grey.
    return srgb_to_linear(np.asarray(hex_rgb(value), dtype=np.float32))


def srgb_to_linear(rgb):
    """Blender image pixels and node colours are linear; palettes are sRGB."""
    rgb = np.asarray(rgb, dtype=np.float32)
    return np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)


def _body_height(v):
    """Signed height on the flank: +1 dorsal edge, 0 lateral line, -1 belly.

    The body UV wraps the girth with the +y flank at v=0, the back at v=0.25,
    the -y flank at v=0.5 and the belly at v=0.75.
    """
    return np.sin(TAU * v)


def eye_uv_radii(spec):
    """UV-space (u, v) radii of a world-round eye-sized spot on the flank.

    u spans the whole body length in world units while v wraps only the local
    girth, so a UV-round spot smears 3:1 on the skin; scale each axis so the
    spot is round where it matters. The low eye decal samples the same ellipse.
    """
    half_height, half_width, _ = profile(spec.slug, (spec.eye[0] + 1.0) / spec.body_length)
    girth = 2.0 * np.pi * np.sqrt((half_height ** 2 + half_width ** 2) / 2.0)
    world = spec.eye_radius * 0.95
    return world / spec.body_length, world / girth


def _scale_lattice(size):
    """(column index, row index, across-cell, down-cell) of the scale lattice.

    Scales are laid like roof tiles: each row is offset by half a scale, and
    the lattice is warped so the flank does not read as chainmail. Both the
    relief and the arulius sparkle sample this one lattice, so a glint always
    lands on a scale crown rather than in a groove.
    """
    u, v = _grid(size)
    cells_u = 27.0 if size >= 1024 else 18.0
    cells_v = 35.0 if size >= 1024 else 23.0
    warp_u = (0.42 * np.sin(TAU * (v * 2.0 + 0.13))
              + 0.18 * np.sin(TAU * (u * 3.0 - v * 5.0)))
    warp_v = (0.26 * np.sin(TAU * (u * 2.0 + 0.31))
              + 0.08 * np.sin(TAU * (u * 5.0 + v * 3.0)))
    sv = v * cells_v + warp_v
    rows = np.floor(sv)
    su = u * cells_u + warp_u + 0.5 * (rows % 2.0)
    columns = np.floor(su)
    return columns, rows, su - columns, sv - rows


def _scale_height(size=512, detail=False):
    """Height of the scale lattice, 0 in a groove and 1 on a crown.

    Scales are laid like roof tiles: each row is offset by half a scale, and
    each cell is a rounded crescent that stands proud at its exposed rear edge
    and tucks under the row behind it. The lattice is also warped, because a
    perfectly ruled grid is what makes a fish flank read as chainmail. The
    relief fades toward the back and the belly, where real scales lie flatter
    and the counter-shading hides them anyway.

    `detail` gives the arulius per-scale size variation: some scales sit
    flatter and some stand prouder, which is what breaks the tiled look.
    """
    _, _, cell_u, cell_v = _scale_lattice(size)
    # A cycloid scale: rounded across, with a longer exposed lip at the rear.
    crown = np.sin(np.pi * cell_u) ** 0.65
    exposed = np.clip((cell_v - 0.28) / 0.52, 0.0, 1.0)
    height = crown * (0.32 + 0.68 * exposed ** 0.9)
    u, v = _grid(size)
    signed = _body_height(v)
    height *= np.clip(1.0 - (np.abs(signed) / 1.30) ** 2, 0.12, 1.0)
    height += 0.006 * np.sin(TAU * (u * 17.0 + v * 6.0))
    if detail:
        columns, rows, _, _ = _scale_lattice(size)
        seed = np.sin(columns * 127.1 + rows * 311.7) * 43758.5453
        seed = seed - np.floor(seed)
        height *= 0.70 + 0.60 * seed
    return (height - height.min()) / (height.max() - height.min())


def _scale_sparkle(size):
    """Sparse per-scale glints, 0..1, aligned to the scale crowns."""
    columns, rows, cell_u, cell_v = _scale_lattice(size)
    seed = np.sin(columns * 127.1 + rows * 311.7) * 43758.5453
    seed = seed - np.floor(seed)
    crown = np.sin(np.pi * cell_u) ** 2
    exposed = np.clip((cell_v - 0.30) / 0.52, 0.0, 1.0)
    # Only a minority of scales catch the light; the rest stay matte so the
    # flank reads as glinting metal rather than a field of white dots.
    return crown * exposed ** 2 * np.clip((seed - 0.80) / 0.20, 0.0, 1.0)


def _rgba(rgb, alpha=None):
    rgb = np.clip(np.asarray(rgb, dtype=np.float32), 0.0, 1.0)
    if alpha is None:
        alpha = np.ones(rgb.shape[:2], dtype=np.float32)
    alpha = np.clip(np.asarray(alpha, dtype=np.float32), 0.0, 1.0)
    return np.concatenate((rgb, alpha[..., None]), axis=2)


def _finish(image, path, file_format):
    image.file_format = file_format
    if path is not None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        image.filepath_raw = str(path)
        image.save()
    image.pack()
    image.use_fake_user = True
    return image


def _image(name, rgba, path, file_format, colorspace):
    rgba = np.asarray(rgba, dtype=np.float32)
    height, width = rgba.shape[:2]
    image = bpy.data.images.new(name, width=width, height=height, alpha=True)
    image.colorspace_settings.name = colorspace
    image.pixels.foreach_set(rgba.ravel())
    image.update()
    return _finish(image, path, file_format)


def body_albedo(spec, variant, size, path=None, eye_spots=True):
    u, v = _grid(size)
    base = _rgb(variant.body)
    stripe = _rgb(variant.stripe)
    pale = srgb_to_linear(np.asarray((0.93, 0.92, 0.86), dtype=np.float32))
    # v runs around the girth: 0.25 = dorsal edge, 0/0.5 = flanks, 0.75 = belly.
    dorsal = np.clip(np.sin(TAU * v), 0.0, 1.0)
    belly = np.clip(-np.sin(TAU * v), 0.0, 1.0)
    height = _body_height(v)
    flank = np.clip(1.0 - np.abs(height) ** 3, 0.0, 1.0)
    rgb = np.broadcast_to(base, (size, size, 3)).copy()

    # Counter-shading, layered rather than one flat tint: a cooled silvered
    # flank, a deeper back and a pale belly. On the arulius the back is a dark
    # olive and the flank a warm brass, which is what the live fish shows; a
    # neutral silver is what made the old render read as white plastic.
    silver = np.asarray((0.50, 0.52, 0.55), np.float32)
    if spec.pattern == "stripes":
        back = np.asarray((0.18, 0.22, 0.25), np.float32)
        silver_mix = 0.22
    else:
        back = np.asarray((0.115, 0.125, 0.075), np.float32)
        silver = np.asarray((0.64, 0.62, 0.54), np.float32)
        silver_mix = 0.50
    dorsal_mix = 0.55 if spec.pattern == "stripes" else 0.82
    rgb = rgb * (1.0 - dorsal_mix * dorsal[..., None]) + back * (dorsal_mix * dorsal[..., None])
    rgb = rgb * (1.0 - silver_mix * flank[..., None]) + silver * (silver_mix * flank[..., None])
    belly_mix = 0.50 if spec.pattern == "stripes" else 0.64
    rgb = rgb * (1.0 - belly_mix * belly[..., None]) + pale * (belly_mix * belly[..., None])
    # Iridescence: a narrow gold-green sheen along the upper flank where the
    # light catches the scale edges, and a cool blue one on the danios.
    sheen_band = np.clip(1.0 - np.abs(height - 0.52) / 0.34, 0.0, 1.0) * flank
    if spec.pattern == "stripes":
        sheen = np.asarray((0.24, 0.40, 0.58), np.float32)
        sheen_mix = 0.10
    else:
        sheen = np.asarray((0.54, 0.50, 0.20), np.float32)
        sheen_mix = 0.20
    rgb = (rgb * (1.0 - sheen_mix * sheen_band[..., None])
           + sheen * (sheen_mix * sheen_band[..., None]))

    detailed = spec.pattern == "blotches"
    scales = _scale_height(size, detail=detailed)
    rgb *= (0.976 + 0.024 * scales)[..., None]
    if detailed:
        # Wet, glancing scales: sparse per-scale highlights over the brass
        # flank. Without these the flank is one flat wash at aquarium distance.
        sparkle = _scale_sparkle(size) * flank
        rgb *= (1.0 + 0.24 * sparkle[..., None])

    # Flank markings. The Arulius carries three irregular blotches; the danios
    # carry five horizontal navy stripes around both flanks plus a dark
    # pre-orbital bar. `height` is the signed height relative to the lateral
    # line on either flank: +1 at the dorsal edge, 0 at the flank midline,
    # -1 at the belly. One set of bands therefore marks both sides.
    if spec.pattern == "stripes":
        stripe_mask = np.zeros_like(height)
        for band in (0.66, 0.33, 0.0, -0.33, -0.66):
            # A little wander in the band keeps the bars from reading as
            # ruled graphics, while the edge stays crisp over ~2% of the body.
            centre = band + 0.012 * np.sin(TAU * u * 2.0 + band * 3.0)
            distance = np.abs(height - centre)
            stripe_mask = np.maximum(stripe_mask,
                                     np.clip((0.070 - distance) / 0.022, 0.0, 1.0))
        # Zebra danio bars stop short of the belly and of the snout.
        stripe_mask *= np.clip((height + 0.80) / 0.16, 0.0, 1.0)
        stripe_mask *= np.clip((u - 0.14) / 0.06, 0.0, 1.0)
        stripe_mask *= 0.96 + 0.04 * np.sin(TAU * (u * 3.0 + v * 5.0))
        # Warm interstripe: the creamy band between the navy bars in the
        # reference, which is what makes a live zebrafish look lit from inside.
        warm = np.clip(base * np.asarray((1.10, 1.02, 0.86), np.float32) + 0.012, 0.0, 1.0)
        inter = np.clip(1.0 - 1.4 * stripe_mask, 0.0, 1.0) * flank
        rgb = rgb * (1.0 - 0.22 * inter[..., None]) + warm * (0.22 * inter[..., None])
        rgb = rgb * (1.0 - 0.96 * stripe_mask[..., None]) + stripe * (0.96 * stripe_mask[..., None])
        bar_u = (spec.eye[0] + 1.0) / spec.body_length - 0.040
        preorbital = (np.exp(-((u - bar_u) / 0.013) ** 2)
                      * np.exp(-((height / 0.42) ** 2)))
        rgb = rgb * (1.0 - 0.34 * preorbital[..., None]) + stripe * (0.34 * preorbital[..., None])
    else:
        # The live fish carries two broad, soft-edged vertical bars and a
        # smaller saddle over the caudal peduncle. They are painted patches,
        # not stamped ovals: each edge wanders, the fill is a green-black, and
        # the flank keeps a lit rim around every patch.
        def bar(centre, half_width, low, high, strength):
            # The edge wanders with height so the patch reads as skin pigment
            # rather than a photographed rectangle, and the transition is soft
            # over a few percent of the body.
            centre = centre + 0.007 * np.sin(TAU * (height * 1.7 + centre * 5.0))
            du = u - centre
            across = _smoothstep(np.clip((half_width - np.abs(du)) / 0.034, 0.0, 1.0))
            window = (_smoothstep((height - low) / 0.26)
                      * _smoothstep((high - height) / 0.22))
            ragged = (1.0 + 0.10 * np.sin(TAU * (height * 2.6 + centre * 7.0))
                      + 0.05 * np.sin(TAU * (height * 5.1 - centre * 3.0)))
            return np.clip(strength * across * window * ragged, 0.0, 1.0)

        first = bar(0.430, 0.050, -0.70, 0.97, 0.90)
        second = bar(0.735, 0.054, -0.74, 0.94, 0.91)
        # The third marking: a compact saddle sitting above the lateral line
        # just ahead of the caudal base, not a third round spot on the flank.
        saddle = bar(0.918, 0.033, -0.28, 0.78, 0.88)
        mask = np.clip(np.maximum(np.maximum(first, second), saddle), 0.0, 1.0)
        halo = np.clip(np.maximum(np.maximum(
            bar(0.430, 0.075, -0.80, 1.02, 0.30),
            bar(0.735, 0.080, -0.84, 0.98, 0.30)),
            bar(0.918, 0.050, -0.38, 0.90, 0.26)), 0.0, 1.0)
        rgb *= (1.0 - 0.14 * halo[..., None])
        # A lifted, mottled green-black rather than printer's black: the scale
        # relief then reads as scale relief instead of a checkerboard.
        mottled = 0.90 + 0.10 * np.sin(TAU * (u * 11.0 + height * 5.0))
        fill = _rgb("#151a10") * mottled[..., None]
        rgb = rgb * (1.0 - mask[..., None]) + fill * mask[..., None]
        # The head is not a black hood. A dusty rose flush over the gill cover
        # matches the reference fish and keeps the front of the body silvery.
        flush = (np.exp(-((u - 0.135) / 0.080) ** 2)
                 * np.exp(-((height + 0.10) / 0.52) ** 2))
        rose = srgb_to_linear(np.asarray((0.72, 0.38, 0.36), np.float32))
        rgb = rgb * (1.0 - 0.34 * flush[..., None]) + rose * (0.34 * flush[..., None])
        # An olive brow runs from the nape over the eye; it frames the silver
        # cheek and stops the head reading as a bare cone.
        brow = (np.exp(-((u - 0.115) / 0.105) ** 2)
                * _smoothstep((height - 0.18) / 0.42))
        rgb *= (1.0 - 0.24 * brow[..., None])

    # Operculum: a curved seam with a pale lip behind it. The edge leans
    # forward toward the dorsal and ventral seams, as on a real gill cover.
    gill_base = 0.20 if spec.pattern == "stripes" else 0.236
    gill_u = gill_base - 0.020 * np.abs(height) ** 1.2
    side_band = np.clip(1.0 - np.abs(height) ** 3, 0.0, 1.0)
    gill = np.exp(-((u - gill_u) / 0.009) ** 2) * side_band
    gill_strength = 0.18 if spec.pattern == "blotches" else 0.20
    rgb *= (1.0 - gill_strength * gill[..., None])
    gill_lip = np.exp(-((u - gill_u - 0.011) / 0.006) ** 2) * side_band
    rgb *= (1.0 + 0.10 * gill_lip[..., None])
    # Mouth: a short dark gape running back from the snout at the lower part of
    # the head, visible as the mouth corner from either side.
    mouth = np.exp(-((u - 0.030) / 0.028) ** 2) * (
        np.exp(-((v - 0.045) / 0.045) ** 2) + np.exp(-((v - 0.455) / 0.045) ** 2))
    rgb *= (1.0 - 0.50 * mouth[..., None])
    # Front of the snout: the cap samples this column, so a dark band here
    # becomes the mouth corners around the nose.
    lip = np.exp(-((u - 0.004) / 0.012) ** 2) * (
        np.exp(-((v - 0.060) / 0.055) ** 2) + np.exp(-((v - 0.440) / 0.055) ** 2))
    rgb *= (1.0 - 0.55 * lip[..., None])
    # Lateral line: a faint canal groove with a brighter edge above it.
    lateral = np.exp(-(height / 0.045) ** 2) * np.clip((u - 0.05) / 0.10, 0.0, 1.0)
    rgb *= (1.0 - 0.07 * lateral[..., None])

    # Cheek shadow under the eye, a jaw crease running back from the mouth
    # corner, and a nostril on the upper snout: the small landmarks that stop a
    # head reading as a smooth cone at close range.
    cheek = (np.exp(-((u - 0.085) / 0.050) ** 2)
             * np.exp(-((height + 0.38) / 0.34) ** 2))
    rgb *= (1.0 - 0.09 * cheek[..., None])
    jaw_u = 0.085 + 0.055 * np.clip(-height, 0.0, 1.0)
    jaw = (np.exp(-((u - jaw_u) / 0.011) ** 2)
           * np.clip((-height + 0.15) / 0.55, 0.0, 1.0)
           * np.clip((u - 0.02) / 0.05, 0.0, 1.0))
    rgb *= (1.0 - 0.13 * jaw[..., None])
    nostril = np.exp(-(((u - 0.046) / 0.008) ** 2 + ((height - 0.34) / 0.11) ** 2))
    rgb *= (1.0 - 0.30 * nostril[..., None])

    # Only the low LOD needs painted eyes: its flat eye decals sample these spots.
    # High and mid carry real geometry, so a painted socket ring would show around it.
    eye_u = (spec.eye[0] + 1.0) / spec.body_length
    iris = _rgb(variant.iris)
    # u spans the body length while v only wraps the ~0.6 girth, so a UV-round
    # spot smears into a 3:1 ellipse on the skin. Normalise each axis so the low
    # eye spot is round in world space (matching its decal) and the high/mid
    # eyelid rim hugs the eye globe.
    ru, rv = eye_uv_radii(spec)
    if not eye_spots:
        ru, rv = ru * 1.28, rv * 1.28
    for eye_v in (0.0, 0.5):
        du = u - eye_u
        dv = ((v - eye_v + 0.5) % 1.0) - 0.5
        radius = np.sqrt((du / ru) ** 2 + (dv / rv) ** 2)
        if eye_spots:
            fibre = 0.08 * np.sin(np.arctan2(dv / rv, du / ru) * 26.0)
            iris_rgb = np.clip(iris * (0.90 + fibre[..., None]), 0.0, 1.0)
            rgb[radius < 0.52] = (0.008, 0.008, 0.008)
            ring = (radius >= 0.52) & (radius < 0.80)
            rgb[ring] = iris_rgb[ring]
            outer = (radius >= 0.72) & (radius < 1.0)
            rgb[outer] = iris * 0.55
        else:
            # High/mid carry real eye geometry: no painted socket ring on the
            # skin (it reads as a tattoo at every distance).
            pass

    rgb += (0.006 * np.sin(TAU * (u * 37.0 + v * 23.0)))[..., None]
    return _image("FishBody - albedo", _rgba(rgb), path, "JPEG", "sRGB")


def body_normal(spec, size, path=None):
    """Scale relief plus the head landmarks, as a tangent-space normal map.

    The gain is scaled with the texture size so a 512 and a 1024 map carry the
    same world-space relief instead of the larger one washing out.
    """
    u, v = _grid(size)
    height = _scale_height(size, detail=spec.pattern == "blotches")
    signed = _body_height(v)
    # Scaleless head: fade the scale relief out ahead of the operculum.
    head = np.clip((u - 0.215) / 0.040, 0.0, 1.0)
    field = 0.5 + (height - 0.5) * 0.58 * head
    # Lateral line: a canal groove with a raised rim, only along the flank.
    lateral = np.exp(-(signed / 0.035) ** 2)
    field -= 0.09 * lateral
    field += 0.04 * np.exp(-((np.abs(signed) - 0.075) / 0.030) ** 2)
    # Operculum seam and mouth crease, matching the sculpted geometry.
    gill_base = 0.236 if spec.pattern == "blotches" else 0.20
    gill_u = gill_base - 0.020 * np.abs(signed) ** 1.2
    band = np.clip(1.0 - np.abs(signed) ** 3, 0.0, 1.0)
    field -= 0.16 * np.exp(-((u - gill_u) / 0.006) ** 2) * band
    field += 0.07 * np.exp(-((u - gill_u - 0.010) / 0.005) ** 2) * band
    mouth = np.exp(-((u - 0.030) / 0.024) ** 2) * (
        np.exp(-((v - 0.045) / 0.030) ** 2) + np.exp(-((v - 0.455) / 0.030) ** 2))
    field -= 0.18 * mouth
    nostril = np.exp(-(((u - 0.046) / 0.008) ** 2 + ((signed - 0.34) / 0.10) ** 2))
    field -= 0.12 * nostril
    du = (np.roll(field, -1, axis=1) - np.roll(field, 1, axis=1)) * 0.5
    dv = (np.roll(field, -1, axis=0) - np.roll(field, 1, axis=0)) * 0.5
    gain = 1.15 * size / 512.0
    nx = np.clip(-du * gain, -2.0, 2.0)
    ny = np.clip(-dv * gain, -2.0, 2.0)
    length = np.sqrt(nx * nx + ny * ny + 1.0)
    normal = np.stack((nx / length * 0.5 + 0.5,
                       ny / length * 0.5 + 0.5,
                       np.ones_like(nx) / length * 0.5 + 0.5), axis=2)
    return _image("FishBody - normal", _rgba(normal), path, "PNG", "Non-Color")


def body_orm(spec, size, path=None):
    """(unused, roughness, metallic): a wet flank around 0.25-0.32."""
    u, v = _grid(size)
    height = _scale_height(size, detail=spec.pattern == "blotches")
    cavity = 0.60 + 0.40 * height
    belly = np.clip(-np.sin(TAU * v), 0.0, 1.0)
    # Ridged scale crowns catch the light and the grooves between them hold a
    # little more scatter; the belly is duller than the flank.
    roughness = 0.255 + 0.050 * (1.0 - height) + 0.030 * belly
    roughness = np.clip(roughness, 0.24, 0.34)
    rgb = np.stack((cavity, roughness, np.zeros_like(height)), axis=2)
    return _image("FishBody - ORM", _rgba(rgb), path, "PNG", "Non-Color")


FIN_REGIONS = {
    "dorsal": (0, 0),
    "caudal": (1, 0),
    "anal": (0, 1),
    "pectoral": (1, 1),
    "pelvic": (0, 2),
}
FIN_ATLAS = (2, 3)
# Keep the fin islands a few texels off the tile edges so bilinear filtering
# and mips cannot drag a neighbouring fin's colour across the seam.
FIN_PAD = 0.035

# Per-fin palettes for the live arulius: a dusky dorsal with a black margin, a
# red-orange caudal with a pale edge, paler paired fins, and a nearly clear
# pectoral. `rays` matches the geometry so the painted ray lines land on the
# mesh rows; `alpha` is (root, trailing edge) translucency.
FIN_STYLES = {
    "arulius-barb": {
        "dorsal": {"colour": "#7a4a38", "rays": 12, "alpha": (0.90, 0.44),
                   "lead": 0.30, "margin": "#d6c3ab",
                   "margin_start": 0.60, "margin_mix": 0.40},
        "caudal": {"colour": "#c8542f", "rays": 19, "alpha": (0.92, 0.46),
                   "lead": 0.08, "margin": "#efdcc6",
                   "margin_start": 0.72, "margin_mix": 0.55},
        "anal": {"colour": "#bd5a42", "rays": 8, "alpha": (0.92, 0.50),
                 "lead": 0.08, "margin": "#e9d7c1",
                 "margin_start": 0.76, "margin_mix": 0.42},
        "pectoral": {"colour": "#d3cabd", "rays": 16, "alpha": (0.55, 0.14),
                     "lead": 0.06, "margin": "#f0eae0",
                     "margin_start": 0.75, "margin_mix": 0.15},
        "pelvic": {"colour": "#b06a5c", "rays": 9, "alpha": (0.72, 0.28),
                   "lead": 0.08, "margin": "#e6d6c6",
                   "margin_start": 0.78, "margin_mix": 0.30},
    },
}


def fin_atlas_uv(u, v, region):
    """Map one fin's local UV into its tile of the shared atlas."""
    column, row = region
    columns, rows = FIN_ATLAS
    span = 1.0 - 2.0 * FIN_PAD
    return ((FIN_PAD + span * u + column) / columns,
            (FIN_PAD + span * v + row) / rows)


def _fin_tile(style, width, height):
    tu, tv = _tile_grid(width, height)
    span = 1.0 - 2.0 * FIN_PAD
    # Tile-local coordinates include the padding ring; map back to the fin's
    # own 0..1 so the painted comb stays locked to the mesh rows.
    u = np.clip((tu - FIN_PAD) / span, 0.0, 1.0)
    v = np.clip((tv - FIN_PAD) / span, 0.0, 1.0)
    base = _rgb(style["colour"])
    pale = _rgb("#efe6d8") if style["margin_mix"] < 0.4 else _rgb(style["margin"])
    margin = _rgb(style["margin"])
    rgb = np.broadcast_to(base * 0.82, (height, width, 3)).copy()
    mid = np.clip(v / 0.55, 0.0, 1.0)
    rgb = rgb + (base * 1.14 - rgb) * mid[..., None]
    # Ray lines: the membrane is denser along a ray and thinner between, which
    # is most of what makes a fin read as striated rather than as coloured
    # paper. The comb count equals the geometry's ray count.
    phase = u + 0.010 * np.sin(TAU * v * 2.0)
    between = np.abs(np.sin(np.pi * phase * style["rays"]))
    rgb *= (1.0 - 0.26 * between ** 1.2)[..., None]
    rgb *= (1.0 + 0.08 * (1.0 - between) ** 2)[..., None]
    # Darker leading ray, then the distal margin: black on the dorsal, pale on
    # the caudal and anal.
    lead = np.exp(-((u - 0.015) / 0.045) ** 2)
    rgb *= (1.0 - style["lead"] * lead)[..., None]
    edge = np.clip((v - style["margin_start"]) / (1.0 - style["margin_start"]), 0.0, 1.0)
    rgb = rgb * (1.0 - style["margin_mix"] * edge[..., None])
    rgb = rgb + margin * (style["margin_mix"] * edge[..., None])
    # Warm the pale margin so it reads as translucent skin, not white paint.
    if style["margin_mix"] < 0.4:
        rgb = rgb * (1.0 - 0.35 * edge[..., None]) + pale * (0.35 * edge[..., None])
    rgb *= (1.0 + 0.030 * np.sin(TAU * (u * 13.0 + v * 21.0)))[..., None]
    root_alpha, tip_alpha = style["alpha"]
    alpha = root_alpha + (tip_alpha - root_alpha) * np.clip(v, 0.0, 1.0) ** 1.15
    alpha *= 1.0 - 0.18 * between ** 2.0
    return _rgba(np.clip(rgb, 0.0, 1.0), alpha)


def _fin_atlas(spec, size, path):
    tile = max(32, size // 2)
    columns, rows = FIN_ATLAS
    canvas = np.zeros((tile * rows, tile * columns, 4), dtype=np.float32)
    for key, style in FIN_STYLES[spec.slug].items():
        column, row = FIN_REGIONS[key]
        canvas[row * tile:(row + 1) * tile,
               column * tile:(column + 1) * tile] = _fin_tile(style, tile, tile)
    return _image("FishFin - albedo", canvas, path, "PNG", "sRGB")


def fin_albedo(spec, variant, size=128, path=None, rays=11):
    """Fin membrane: darker at the root, brighter mid-web, coloured edge.

    Fin UVs run v=0 at the body and v=1 at the trailing edge, and u crosses the
    rays, so one gradient along v plus a ray-line comb along u works for the
    dorsal, caudal, anal, pelvic and pectoral fins. The arulius gets a shared
    2x3 atlas so each fin can carry its own colour and translucency without a
    fifth material; the danio keeps the old single-region map.
    """
    if spec.slug in FIN_STYLES:
        return _fin_atlas(spec, size, path)
    u, v = _grid(size)
    base = _rgb(variant.fin)
    dark = np.asarray((0.020, 0.018, 0.016), dtype=np.float32)
    pale = srgb_to_linear(np.asarray((0.90, 0.89, 0.84), dtype=np.float32))
    rgb = np.broadcast_to(base * 0.86, (size, size, 3)).copy()
    mid = np.clip(v / 0.55, 0.0, 1.0)
    rgb = rgb + (base * 1.18 - rgb) * mid[..., None]
    # Ray lines: the membrane is denser along each ray and thinner between, and
    # that alternation is most of what makes a fin read as striated rather than
    # as a sheet of coloured paper. A slow wobble in the spacing keeps the comb
    # from looking printed.
    phase = u + 0.012 * np.sin(TAU * v * 2.0)
    between = np.abs(np.sin(np.pi * phase * rays))
    rgb *= (1.0 - 0.30 * between ** 1.2)[..., None]
    rgb *= (1.0 + 0.10 * (1.0 - between) ** 2)[..., None]
    if spec.pattern == "blotches":
        edge = np.clip((v - 0.86) / 0.10, 0.0, 1.0)
        rgb = rgb * (1.0 - 0.65 * edge[..., None]) + dark * (0.65 * edge[..., None])
        rim = np.clip((v - 0.955) / 0.045, 0.0, 1.0)
        rgb = rgb * (1.0 - 0.75 * rim[..., None]) + pale * (0.75 * rim[..., None])
    else:
        edge = np.clip((v - 0.90) / 0.10, 0.0, 1.0)
        rgb = rgb * (1.0 - 0.25 * edge[..., None]) + base * 0.62 * (0.25 * edge[..., None])
    # Faint mottling, so the membrane is not perfectly even under a specular.
    rgb *= (1.0 + 0.030 * np.sin(TAU * (u * 13.0 + v * 21.0)))[..., None]
    # Translucency: dense at the root, thinning toward the trailing edge, and
    # thinner in the web between rays than along a ray. Without this the fin
    # reads as an opaque paddle at any viewing distance.
    reach = np.clip((v - 0.28) / 0.72, 0.0, 1.0)
    alpha = 0.96 - 0.56 * reach ** 1.25
    alpha *= 1.0 - 0.20 * between ** 2.0
    alpha = np.maximum(alpha, 0.30 + 0.25 * reach)
    return _image("FishFin - albedo", _rgba(rgb, alpha), path, "PNG", "sRGB")


def eye_albedo(variant, size=256, path=None):
    """A disc-shaped iris: a large black pupil, a thin fibre ring, a dark rim.

    The eye is UV-mapped as a disc rather than a wrapped cylinder, so radius 0
    is the pupil centre and radius 1 the eyelid edge. Real fish eyes are mostly
    pupil: painting a wide iris band leaves a cartoon donut around a pale
    centre, which is what the eye read as before.
    """
    u, v = _grid(size)
    sclera = srgb_to_linear(np.asarray((0.16, 0.14, 0.12), np.float32))
    iris = _rgb(variant.iris)
    du = u - 0.5
    dv = v - 0.5
    radius = 2.0 * np.sqrt(du * du + dv * dv)
    angle = np.arctan2(dv, du)
    rgb = np.broadcast_to(sclera, (size, size, 3)).copy()
    fibre = (0.045 * np.sin(angle * 61.0 + 0.6)
             + 0.028 * np.sin(angle * 29.0 + 2.1)
             + 0.014 * np.sin(angle * 127.0))
    # A slightly paler collarette just outside the pupil, as in a live eye,
    # and a darker outer iris so the ring is not one flat band of colour.
    collarette = 0.18 * np.exp(-((radius - 0.625) / 0.050) ** 2)
    radial = 0.84 + 0.22 * np.clip((0.86 - radius) / 0.26, 0.0, 1.0)
    iris_rgb = np.clip(iris * (radial[..., None] + fibre[..., None]
                               + collarette[..., None]), 0.0, 1.0)
    ring = (radius >= 0.60) & (radius < 0.86)
    rgb[ring] = iris_rgb[ring]
    limbal = (radius >= 0.86) & (radius < 0.93)
    rgb[limbal] = iris * 0.28
    pupil = radius < 0.60
    rgb[pupil] = (0.002, 0.002, 0.002)
    # A dark margin where the iris meets the pupil keeps the pupil from looking
    # like a disc stuck onto a ring.
    margin = (radius >= 0.60) & (radius < 0.645)
    rgb[margin] = iris * 0.10
    # The eyelid rim is skin, not part of the globe: darken the outer edge so
    # the eye seats into the socket instead of floating on it.
    edge = np.clip((radius - 0.94) / 0.06, 0.0, 1.0)
    rgb *= (1.0 - 0.45 * edge[..., None])
    return _image("FishEye - iris", _rgba(rgb), path, "PNG", "sRGB")
