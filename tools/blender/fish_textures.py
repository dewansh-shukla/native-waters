"""Procedural, UV-aware maps for the native fish; Blender-only, NumPy-fast."""

from pathlib import Path

import bpy
import numpy as np

from tools.blender.fish_specs import hex_rgb, profile


TAU = 2.0 * np.pi


def _grid(size):
    yy, xx = np.mgrid[0:size, 0:size]
    return (xx + 0.5) / size, (yy + 0.5) / size


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


def _scale_height(size=512):
    u, v = _grid(size)
    cells_u = 34.0 if size >= 1024 else 22.0
    cells_v = 44.0 if size >= 1024 else 28.0
    rows = np.floor(v * cells_v)
    cell_v = (v * cells_v) % 1.0
    cell_u = (u * cells_u + 0.5 * (rows % 2.0)) % 1.0
    # Overlapping cycloid scales: a soft dome with a crisp trailing edge, not a
    # hexagonal honeycomb.
    height = (np.sin(np.pi * cell_u) ** 0.7) * (np.sin(np.pi * cell_v) ** 0.55)
    height += 0.006 * np.sin(TAU * (u * 18.0 + v * 5.0))
    height -= 0.10 * np.exp(-((v - 0.02) / 0.010) ** 2)
    height -= 0.10 * np.exp(-((v - 0.48) / 0.010) ** 2)
    return (height - height.min()) / (height.max() - height.min())


def _rgba(rgb):
    alpha = np.ones((rgb.shape[0], rgb.shape[1], 1), dtype=np.float32)
    return np.concatenate((np.clip(rgb, 0.0, 1.0), alpha), axis=2)


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
    rgb = np.broadcast_to(base, (size, size, 3)).copy()
    back = _rgb("#5e5c42")
    rgb = rgb * (1.0 - 0.45 * dorsal[..., None]) + back * (0.45 * dorsal[..., None])
    rgb = rgb * (1.0 - 0.55 * belly[..., None]) + pale * (0.55 * belly[..., None])
    scales = _scale_height(size)
    rgb *= (0.972 + 0.028 * scales)[..., None]

    # Flank markings. The Arulius carries three irregular blotches; the danios
    # carry five horizontal navy stripes around both flanks plus a dark
    # pre-orbital bar. `height` is the signed height relative to the lateral
    # line on either flank: +1 at the dorsal edge, 0 at the flank midline,
    # -1 at the belly. One set of bands therefore marks both sides.
    height = _body_height(v)
    if spec.pattern == "stripes":
        stripe_mask = np.zeros_like(v)
        for band in (0.68, 0.34, 0.0, -0.34, -0.68):
            stripe_mask = np.maximum(stripe_mask,
                                     np.exp(-((height - band) / 0.080) ** 2))
        stripe_mask *= np.clip((u - 0.03) / 0.08, 0.0, 1.0)
        stripe_mask *= 0.92 + 0.08 * np.sin(TAU * (u * 3.0 + v * 5.0))
        rgb = rgb * (1.0 - 0.80 * stripe_mask[..., None]) + stripe * (0.80 * stripe_mask[..., None])
        bar_u = (spec.eye[0] + 1.0) / spec.body_length - 0.045
        preorbital = (np.exp(-((u - bar_u) / 0.016) ** 2)
                      * np.exp(-((height / 0.62) ** 2)))
        rgb = rgb * (1.0 - 0.45 * preorbital[..., None]) + stripe * (0.45 * preorbital[..., None])
    else:
        for x in (-0.235, 0.307, 0.652):
            centre = (x + 1.0) / 1.8
            du = ((u - centre + 0.5) % 1.0) - 0.5
            du = du + 0.004 * np.sin(height * 7.0 + v * 3.0)
            # Big, flat-topped, near-black blotches on the upper flank: the
            # species' dominant marking, from just under the back to below the
            # lateral line.
            mask = np.exp(-((du / 0.046) ** 4 + ((height - 0.20) / 0.56) ** 2))
            mask *= 0.94 + 0.06 * np.sin(TAU * (u * 7.0 + v * 13.0))
            rgb = rgb * (1.0 - 0.94 * mask[..., None]) + stripe * (0.94 * mask[..., None])

    # Operculum: a curved seam with a pale lip behind it. The edge leans
    # forward toward the dorsal and ventral seams, as on a real gill cover.
    gill_u = 0.236 - 0.022 * np.abs(height) ** 1.5
    side_band = np.clip(1.0 - np.abs(height) ** 8, 0.0, 1.0)
    gill = np.exp(-((u - gill_u) / 0.009) ** 2) * side_band
    rgb *= (1.0 - 0.34 * gill[..., None])
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
            rgb[radius < 0.32] = (0.008, 0.008, 0.008)
            ring = (radius >= 0.32) & (radius < 0.72)
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
    height = _scale_height(size)
    u, _v = _grid(size)
    # Scaleless, smooth head: fade the scale relief out ahead of the operculum.
    head = np.clip((u - 0.215) / 0.040, 0.0, 1.0)
    height = (height - 0.5) * head + 0.5
    du = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * 0.5
    dv = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * 0.5
    nx, ny = -du * 0.9, -dv * 0.9
    length = np.sqrt(nx * nx + ny * ny + 1.0)
    normal = np.stack((nx / length * 0.5 + 0.5,
                       ny / length * 0.5 + 0.5,
                       np.ones_like(nx) / length * 0.5 + 0.5), axis=2)
    return _image("FishBody - normal", _rgba(normal), path, "PNG", "Non-Color")


def body_orm(spec, size, path=None):
    del spec
    u, v = _grid(size)
    height = _scale_height(size)
    cavity = 0.72 + 0.28 * height
    belly = np.clip(-np.sin(TAU * v), 0.0, 1.0)
    roughness = 0.20 + 0.16 * (1.0 - height) - 0.06 * belly
    roughness = np.clip(roughness, 0.12, 0.45)
    rgb = np.stack((cavity, roughness, np.zeros_like(height)), axis=2)
    return _image("FishBody - ORM", _rgba(rgb), path, "PNG", "Non-Color")


def eye_albedo(variant, size=256, path=None):
    u, v = _grid(size)
    sclera = np.asarray((0.030, 0.026, 0.022), dtype=np.float32)
    iris = _rgb(variant.iris)
    rgb = np.broadcast_to(sclera, (size, size, 3)).copy()
    for centre in (0.25, 0.75):
        du = u - centre
        dv = v - 0.5
        # The iris fills the visible globe; only a thin limbal ring is dark.
        radius = np.sqrt((du / 0.265) ** 2 + (dv / 0.300) ** 2)
        angle = np.arctan2(dv, du)
        fibre = 0.12 * np.sin(angle * 34.0 + 1.7) + 0.05 * np.sin(angle * 13.0)
        iris_rgb = np.clip(iris * (0.86 + fibre[..., None]), 0.0, 1.0)
        ring = (radius >= 0.255) & (radius < 0.885)
        rgb[ring] = iris_rgb[ring]
        limbal = (radius >= 0.885) & (radius < 1.0)
        rgb[limbal] = iris * 0.26
        pupil = radius < 0.255
        rgb[pupil] = (0.005, 0.005, 0.005)
    return _image("FishEye - iris", _rgba(rgb), path, "PNG", "sRGB")
