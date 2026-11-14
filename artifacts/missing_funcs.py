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
