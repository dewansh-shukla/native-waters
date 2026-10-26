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
    return np.asarray(hex_rgb(value), dtype=np.float32)


def srgb_to_linear(rgb):
    """Blender image pixels and node colours are linear; palettes are sRGB."""
    rgb = np.asarray(rgb, dtype=np.float32)
    return np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)


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
    cells_u = 60.0 if size >= 1024 else 32.0
    cells_v = 72.0 if size >= 1024 else 40.0
    rows = np.floor(v * cells_v)
    cell_v = (v * cells_v) % 1.0
    cell_u = (u * cells_u + 0.5 * (rows % 2.0)) % 1.0
    height = (np.sin(np.pi * cell_u) ** 1.15) * (np.sin(np.pi * cell_v) ** 1.15)
    height += 0.008 * np.sin(TAU * (u * 18.0 + v * 5.0))
    height -= 0.12 * np.exp(-((v - 0.02) / 0.010) ** 2)
    height -= 0.12 * np.exp(-((v - 0.48) / 0.010) ** 2)
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
    pale = np.asarray((0.92, 0.88, 0.76), dtype=np.float32)
    dorsal = np.clip(np.sin(TAU * v), 0.0, 1.0)
    belly = np.clip(-np.sin(TAU * v), 0.0, 1.0)
    rgb = np.broadcast_to(base, (size, size, 3)).copy()
    rgb = rgb * (1.0 - 0.22 * dorsal[..., None]) + stripe * (0.22 * dorsal[..., None])
    rgb = rgb * (1.0 - 0.24 * belly[..., None]) + pale * (0.24 * belly[..., None])
    scales = _scale_height(size)
    rgb *= (0.96 + 0.05 * scales)[..., None]

    # Flank markings. The Arulius carries three irregular blotches; the danios
    # carry five horizontal navy stripes around both flanks plus a dark
    # pre-orbital bar. `height` is the signed distance above either flank's
    # midline (positive toward the dorsal), so one set of bands marks both sides.
    side_distance = np.minimum(np.minimum(v, 1.0 - v), np.abs(v - 0.5))
    if spec.pattern == "stripes":
        off_r = ((v + 0.5) % 1.0) - 0.5
        off_l = v - 0.5
        height = np.where(np.abs(off_r) <= np.abs(off_l), off_r, -off_l)
        stripe_mask = np.zeros_like(v)
        for band in (0.17, 0.085, 0.0, -0.085, -0.17):
            stripe_mask = np.maximum(stripe_mask,
                                     np.exp(-((height - band) / 0.021) ** 2))
        stripe_mask *= np.clip((u - 0.03) / 0.08, 0.0, 1.0)
        stripe_mask *= 0.92 + 0.08 * np.sin(TAU * (u * 3.0 + v * 5.0))
        rgb = rgb * (1.0 - 0.80 * stripe_mask[..., None]) + stripe * (0.80 * stripe_mask[..., None])
        bar_u = (spec.eye[0] + 1.0) / spec.body_length - 0.045
        preorbital = (np.exp(-((u - bar_u) / 0.016) ** 2)
                      * np.exp(-((height / 0.16) ** 2)))
        rgb = rgb * (1.0 - 0.45 * preorbital[..., None]) + stripe * (0.45 * preorbital[..., None])
    else:
        for x in (-0.50, 0.05, 0.55):
            centre = (x + 1.0) / 1.8
            du = ((u - centre + 0.5) % 1.0) - 0.5
            mask = np.exp(-((du / 0.040) ** 2 + (side_distance / 0.11) ** 2))
            mask *= 0.86 + 0.14 * np.sin(TAU * (u * 5.0 + v * 9.0))
            rgb = rgb * (1.0 - 0.82 * mask[..., None]) + stripe * (0.82 * mask[..., None])

    gill = np.exp(-((u - 0.20) / 0.026) ** 2) * np.exp(-(side_distance / 0.13) ** 2)
    rgb *= (1.0 - 0.24 * gill[..., None])
    # Mouth line at the snout tip, painted symmetrically on both flanks
    # (side_distance is zero on either flank, not just the v=0.5 side).
    mouth = np.exp(-((u - 0.006) / 0.014) ** 2) * np.exp(-(side_distance / 0.10) ** 2)
    rgb *= (1.0 - 0.38 * mouth[..., None])
    lateral = np.exp(-((v - 0.02) / 0.006) ** 2) + np.exp(-((v - 0.48) / 0.006) ** 2)
    rgb *= (1.0 - 0.09 * lateral[..., None])

    dorsal_base = (np.exp(-((v - 0.25) / 0.026) ** 2)
                   * np.clip((u - 0.05) / 0.40, 0.0, 1.0) * 0.12)
    anal_base = (np.exp(-((v - 0.75) / 0.026) ** 2)
                 * np.clip((u - 0.05) / 0.50, 0.0, 1.0) * 0.10)
    caudal = (np.clip((u - 0.93) / 0.07, 0.0, 1.0)
              * np.exp(-(side_distance / 0.18) ** 2) * 0.14)
    rgb *= (1.0 - (dorsal_base + anal_base + caudal))[..., None]

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
    for eye_v in (0.04, 0.46):
        du = u - eye_u
        dv = v - eye_v
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
            eyelid = (radius >= 0.96) & (radius < 1.06)
            rgb[eyelid] = rgb[eyelid] * 0.70

    rgb += (0.006 * np.sin(TAU * (u * 37.0 + v * 23.0)))[..., None]
    return _image("FishBody - albedo", _rgba(rgb), path, "JPEG", "sRGB")


def body_normal(spec, size, path=None):
    del spec
    height = _scale_height(size)
    du = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * 0.5
    dv = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * 0.5
    nx, ny = -du * 1.0, -dv * 1.0
    length = np.sqrt(nx * nx + ny * ny + 1.0)
    normal = np.stack((nx / length * 0.5 + 0.5,
                       ny / length * 0.5 + 0.5,
                       np.ones_like(nx) / length * 0.5 + 0.5), axis=2)
    return _image("FishBody - normal", _rgba(normal), path, "PNG", "Non-Color")


def body_orm(spec, size, path=None):
    del spec
    u, v = _grid(size)
    height = _scale_height(size)
    cavity = 0.66 + 0.34 * height
    belly = np.clip(-np.sin(TAU * v), 0.0, 1.0)
    roughness = 0.22 + 0.18 * (1.0 - height) - 0.08 * belly
    roughness = np.clip(roughness, 0.12, 0.45)
    rgb = np.stack((cavity, roughness, np.zeros_like(height)), axis=2)
    return _image("FishBody - ORM", _rgba(rgb), path, "PNG", "Non-Color")


def eye_albedo(variant, size=256, path=None):
    u, v = _grid(size)
    sclera = np.asarray((0.68, 0.62, 0.46), dtype=np.float32)
    iris = _rgb(variant.iris)
    rgb = np.broadcast_to(sclera, (size, size, 3)).copy()
    for centre in (0.25, 0.75):
        du = u - centre
        dv = v - 0.5
        radius = np.sqrt((du / 0.18) ** 2 + (dv / 0.18) ** 2)
        angle = np.arctan2(dv, du)
        fibre = 0.10 * np.sin(angle * 30.0 + 1.7) + 0.04 * np.sin(angle * 11.0)
        iris_rgb = np.clip(iris * (0.88 + fibre[..., None]), 0.0, 1.0)
        ring = (radius >= 0.30) & (radius < 0.74)
        rgb[ring] = iris_rgb[ring]
        outer = (radius >= 0.74) & (radius < 1.0)
        rgb[outer] = iris * 0.34
        pupil = radius < 0.30
        rgb[pupil] = (0.006, 0.006, 0.006)
        glint = ((u - (centre - 0.045)) ** 2 + (v - 0.455) ** 2) < 0.00035
        rgb[glint] = (0.88, 0.86, 0.78)
    return _image("FishEye - iris", _rgba(rgb), path, "PNG", "sRGB")
