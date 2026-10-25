"""Bounded, stdlib-only validation of the Polar Parrot export, not general glTF."""
import hashlib
import json
import math
from pathlib import Path
import struct
import sys
import zlib


DEFAULT_LIMITS = {
    'max_triangles': 41772,
    'max_primitives': 11,
    'max_bytes': 3 * 1024 * 1024,
    'clips': None,
    'bones': (),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def image_dimensions(data, mime):
    if mime == 'image/png':
        require(data[:8] == b'\x89PNG\r\n\x1a\n', 'image PNG signature')
        offset, pixels, dims, ended = 8, 0, None, False
        while offset < len(data):
            size, kind = struct.unpack_from('>I4s', data, offset)
            end = offset + 12 + size
            require(end <= len(data), 'image PNG chunk bounds')
            payload = data[offset + 8:offset + 8 + size]
            require(zlib.crc32(kind + payload) == struct.unpack_from('>I', data, end - 4)[0], 'image PNG CRC')
            if offset == 8:
                require(kind == b'IHDR' and size == 13, 'image PNG IHDR')
                dims = struct.unpack_from('>II', payload)
            if kind == b'IDAT':
                pixels += size
            if kind == b'IEND':
                require(size == 0 and end == len(data), 'image PNG IEND')
                ended = True
            offset = end
        require(ended and pixels and dims and min(dims) > 0, 'image PNG empty')
        return list(dims)
    require(mime == 'image/jpeg' and data[:2] == b'\xff\xd8' and data[-2:] == b'\xff\xd9', 'image JPEG signature')
    offset, dims = 2, None
    while offset < len(data) - 2:
        require(data[offset] == 255, 'image JPEG marker')
        marker = data[offset + 1]
        size = struct.unpack_from('>H', data, offset + 2)[0]
        require(size >= 2 and offset + 2 + size <= len(data), 'image JPEG segment')
        if marker in (0xC0, 0xC1, 0xC2):
            height, width = struct.unpack_from('>HH', data, offset + 5)
            dims = [width, height]
        if marker == 0xDA:
            require(dims and min(dims) > 0 and offset + 2 + size < len(data) - 2, 'image JPEG empty')
            return dims
        offset += size + 2
    raise ValueError('image JPEG missing scan')


def multiply(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def transform(node):
    if 'matrix' in node:
        require(len(node['matrix']) == 16, 'node matrix size')
        return [[node['matrix'][j * 4 + i] for j in range(4)] for i in range(4)]
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    require(abs(x*x + y*y + z*z + w*w - 1) <= 3e-4, 'node quaternion normalization')
    s, t = node.get('scale', [1, 1, 1]), node.get('translation', [0, 0, 0])
    r = [[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
         [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
         [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]]
    return [[r[i][j] * s[j] for j in range(3)] + [t[i]] for i in range(3)] + [[0, 0, 0, 1]]


def validate(path, limits=None):
    limits = {**DEFAULT_LIMITS, **(limits or {})}
    require(path.stat().st_size <= limits['max_bytes'],
            'payload exceeds %d bytes' % limits['max_bytes'])
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from('<4sII', raw)
    require(magic == b'glTF' and version == 2, 'GLB header/version')
    require(length == len(raw), 'container length mismatch')
    chunks, offset = [], 12
    while offset < length:
        size, kind = struct.unpack_from('<II', raw, offset)
        require(size % 4 == 0 and offset + 8 + size <= length, 'chunk length/alignment')
        chunks.append((kind, raw[offset + 8:offset + 8 + size]))
        offset += 8 + size
    require([kind for kind, _ in chunks] == [0x4E4F534A, 0x004E4942], 'expected JSON and BIN chunks only')
    d, binary = json.loads(chunks[0][1]), chunks[1][1]
    require(d['asset']['version'] == '2.0', 'glTF version')
    require(not d.get('extensionsRequired'), 'required extensions unsupported')
    require(len(d['buffers']) == 1 and all('uri' not in b for b in d['buffers']), 'external/multiple buffers')
    declared = d['buffers'][0]['byteLength']
    require(0 < declared <= len(binary) <= declared + 3, 'embedded buffer length')

    def view(index):
        require(isinstance(index, int) and 0 <= index < len(d['bufferViews']), 'bufferView index')
        v = d['bufferViews'][index]
        start, size = v.get('byteOffset', 0), v['byteLength']
        require(v['buffer'] == 0 and start >= 0 and size >= 0 and start + size <= declared, 'bufferView bounds')
        return v, start, size

    cache = {}

    def accessor(index):
        if index in cache:
            return cache[index]
        require(isinstance(index, int) and 0 <= index < len(d['accessors']), 'accessor index')
        a = d['accessors'][index]
        require('sparse' not in a, 'sparse accessor unsupported')
        code, size = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}[a['componentType']]
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
        v, start, length = view(a['bufferView'])
        skip, count, stride = a.get('byteOffset', 0), a['count'], v.get('byteStride', width * size)
        require(count > 0 and skip >= 0 and stride >= width * size and stride % size == 0
                and (start + skip) % size == 0 and skip + (count - 1) * stride + width * size <= length, 'accessor bounds/stride')
        rows = [struct.unpack_from('<' + code * width, binary, start + skip + i * stride) for i in range(count)]
        if a.get('normalized'):
            require(a['componentType'] in (5120, 5121, 5122, 5123), 'accessor normalized component')
            divisor = {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}[a['componentType']]
            rows = [tuple(max(-1, x / divisor) for x in row) for row in rows]
        cache[index] = rows
        return rows

    images = []
    for image in d.get('images', []):
        require('uri' not in image, 'external image URI')
        _, start, size = view(image['bufferView'])
        require(size > 0, 'image empty')
        payload = binary[start:start + size]
        images.append({'name': image.get('name', ''), 'mime': image['mimeType'],
                       'dimensions': image_dimensions(payload, image['mimeType']),
                       'bytes': size, 'sha256': hashlib.sha256(payload).hexdigest()})
    require(images, 'no embedded images')
    nodes, skins = d['nodes'], d['skins']
    require(not d.get('cameras') and 'KHR_lights_punctual' not in d.get('extensions', {}), 'staged camera/lights')
    parent = {}
    for i, node in enumerate(nodes):
        require('camera' not in node and 'KHR_lights_punctual' not in node.get('extensions', {}), 'staged camera/lights')
        require(not any(word in node.get('name', '').lower() for word in ('fixture', 'probe', 'floor', 'ground', 'tank', 'stage', 'camera', 'light')), 'staged fixture object')
        for child in node.get('children', []):
            require(0 <= child < len(nodes) and child not in parent, 'node parent/index')
            parent[child] = i
    scene = d.get('scene', 0)
    require(0 <= scene < len(d['scenes']), 'scene index')
    roots = d['scenes'][scene]['nodes']
    require(roots and all(0 <= r < len(nodes) and r not in parent for r in roots), 'scene roots')
    reached, pending = set(), list(roots)
    while pending:
        i = pending.pop()
        require(i not in reached, 'scene cycle/duplicate')
        reached.add(i)
        pending.extend(nodes[i].get('children', []))
    require(reached == set(range(len(nodes))), 'scene contains orphan nodes')
    world, visiting = {}, set()

    def matrix(i):
        require(0 <= i < len(nodes) and i not in visiting, 'node index/cycle')
        if i not in world:
            visiting.add(i)
            local = transform(nodes[i])
            world[i] = multiply(matrix(parent[i]), local) if i in parent else local
            require(all(math.isfinite(x) for row in world[i] for x in row), 'node nonfinite transform')
            visiting.remove(i)
        return world[i]

    joints = set()
    for skin in skins:
        require(skin['joints'] and len(set(skin['joints'])) == len(skin['joints']), 'skin joint list')
        for joint in skin['joints']:
            matrix(joint)
            joints.add(joint)
        if 'inverseBindMatrices' in skin:
            rows = accessor(skin['inverseBindMatrices'])
            require(len(rows) == len(skin['joints']) and all(len(r) == 16 and all(math.isfinite(x) for x in r) for r in rows), 'inverse bind matrices')
    rig = set(joints)
    for joint in joints:
        while joint in parent:
            joint = parent[joint]
            rig.add(joint)
    points, named, triangles, primitives, used = [], {}, 0, 0, set()
    for i, node in enumerate(nodes):
        m = matrix(i)
        if 'mesh' not in node:
            require(i in rig, 'unexpected non-fish object')
            continue
        require('skin' in node and 0 <= node['skin'] < len(skins), 'every mesh must be skinned')
        used.add(node['mesh'])
        geometry = []
        for p in d['meshes'][node['mesh']]['primitives']:
            require(p.get('mode', 4) == 4 and not p.get('targets') and not p.get('extensions'), 'triangle primitive only; morph/compressed geometry unsupported')
            require(0 <= p['material'] < len(d['materials']), 'primitive material index')
            attr = p['attributes']
            pos, js, ws = (accessor(attr[key]) for key in ('POSITION', 'JOINTS_0', 'WEIGHTS_0'))
            require(len(pos) == len(js) == len(ws), 'skin attribute counts')
            require(d['accessors'][attr['JOINTS_0']]['componentType'] in (5121, 5123)
                    and not d['accessors'][attr['JOINTS_0']].get('normalized'), 'joint component format')
            for xyz, joint, weight in zip(pos, js, ws):
                require(len(xyz) == 3 and all(math.isfinite(x) for x in xyz), 'POSITION nonfinite/shape')
                require(len(weight) == 4 and all(math.isfinite(x) and x >= 0 for x in weight) and abs(sum(weight) - 1) <= 3e-4, 'skin weights nonfinite/negative/not normalized')
                require(len(joint) == 4 and all(0 <= x < len(skins[node['skin']]['joints']) for x in joint), 'invalid skin joint index')
                geometry.append(tuple(sum(m[k][j] * xyz[j] for j in range(3)) + m[k][3] for k in range(3)))
            indices = accessor(p['indices']) if 'indices' in p else [(j,) for j in range(len(pos))]
            require(len(indices) % 3 == 0 and all(len(r) == 1 and isinstance(r[0], int) and 0 <= r[0] < len(pos) for r in indices), 'triangle indices')
            triangles, primitives = triangles + len(indices) // 3, primitives + 1
        points.extend(geometry)
        named[node.get('name', str(i)).lower()] = geometry
    require(used == set(range(len(d['meshes']))), 'uninstantiated mesh')
    require(0 < triangles <= limits['max_triangles'] and 0 < primitives <= limits['max_primitives'],
            'triangle/primitive budget')
    lo, hi = [min(p[k] for p in points) for k in range(3)], [max(p[k] for p in points) for k in range(3)]
    extent = [hi[k] - lo[k] for k in range(3)]
    require(1.7 <= extent[0] <= 2.3 and extent[0] > max(extent[1:]) and all(0 < x <= 2.3 for x in extent), 'world bounds expected ~2 long X')
    center = [(lo[k] + hi[k]) / 2 for k in range(3)]
    axis = {}
    for label, words, coordinate, sign in [('head', ('lip', 'mouth', 'eye', 'iris', 'pupil'), 0, -1), ('dorsal', ('dorsal',), 1, 1)]:
        # Exported ray batches can merge dorsal, anal and tail rays; use the named membrane.
        matched = [p for name, ps in named.items() if any(w in name for w in words)
                   and not (label == 'dorsal' and 'ray' in name) for p in ps]
        if matched:
            mean = sum(p[coordinate] for p in matched) / len(matched)
            require(sign * (mean - center[coordinate]) > 0, 'named geometry axis ' + label)
            axis[label] = '-X' if label == 'head' else '+Y'
        else:
            axis[label] = 'unverified: no named geometry'
    animations = []
    for anim in d.get('animations', []):
        times, errors = [], []
        require(anim['channels'] and anim['samplers'], 'empty animation')
        require({c['sampler'] for c in anim['channels']} == set(range(len(anim['samplers']))), 'unused/invalid animation sampler')
        for channel in anim['channels']:
            target = channel['target']
            require(0 <= target['node'] < len(nodes) and target['path'] in ('rotation', 'translation', 'scale'), 'animation target')
            require(0 <= channel['sampler'] < len(anim['samplers']), 'animation sampler index')
            sampler = anim['samplers'][channel['sampler']]
            require(sampler.get('interpolation', 'LINEAR') in ('LINEAR', 'STEP'), 'animation interpolation unsupported')
            ts, values = accessor(sampler['input']), accessor(sampler['output'])
            require(len(ts) >= 2 and len(values) == len(ts) and all(len(t) == 1 and math.isfinite(t[0]) and t[0] >= 0 for t in ts)
                    and all(b[0] > a[0] for a, b in zip(ts, ts[1:])), 'animation time values')
            width = 4 if target['path'] == 'rotation' else 3
            require(all(len(v) == width and all(math.isfinite(x) for x in v) for v in values), 'animation nonfinite/shape')
            if width == 4:
                require(all(abs(sum(x*x for x in v) - 1) <= 3e-4 for v in values), 'animation quaternion normalization')
            error = max(abs(a-b) for a, b in zip(values[0], values[-1]))
            if width == 4:
                error = min(error, max(abs(a+b) for a, b in zip(values[0], values[-1])))
            require(error <= 3e-4, 'animation loop endpoints')
            times.extend([ts[0][0], ts[-1][0]])
            errors.append(error)
        animations.append({'name': anim.get('name', ''), 'start': min(times), 'end': max(times), 'duration': max(times)-min(times), 'max_loop_error': max(errors)})
    require(animations, 'at least one animation required')
    if limits['clips'] is not None:
        require({animation['name'] for animation in animations} == set(limits['clips']),
                'animation clips must be exactly ' + ', '.join(sorted(limits['clips'])))
    joint_names = {nodes[joint].get('name', str(joint)) for skin in skins for joint in skin['joints']}
    missing_bones = [name for name in limits['bones'] if name not in joint_names]
    require(not missing_bones, 'required bone missing: ' + ', '.join(missing_bones))
    materials = []
    for material in d.get('materials', []):
        pbr, links = material.get('pbrMetallicRoughness', {}), {}
        for label, info in [('color', pbr.get('baseColorTexture')), ('normal', material.get('normalTexture')), ('roughness', pbr.get('metallicRoughnessTexture'))]:
            if info is not None:
                require(0 <= info['index'] < len(d['textures']), 'material texture index')
                texture = d['textures'][info['index']]
                source = texture['source']
                require(0 <= source < len(images), 'material image link')
                links[label] = source
        materials.append({'name': material.get('name', ''), 'maps': links, 'roughnessFactor': pbr.get('roughnessFactor', 1)})
    return {'ok': True, 'path': str(path), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), 'triangles': triangles,
            'primitives': primitives, 'bounds': {'min': lo, 'max': hi, 'extent': extent}, 'axis': axis,
            'bones': [[nodes[j].get('name', str(j)) for j in s['joints']] for s in skins],
            'images': images, 'materials': materials, 'animations': animations,
            'limits': {'max_triangles': limits['max_triangles'],
                       'max_primitives': limits['max_primitives'],
                       'max_bytes': limits['max_bytes'],
                       'clips': sorted(limits['clips']) if limits['clips'] is not None else None,
                       'bones': list(limits['bones'])}}


def parse_args(argv):
    usage = ('usage: python3 -B tools/assets/validate_fish_glb.py PATH '
             '[--triangles N] [--primitives N] [--bytes N] [--clip NAME ...] [--bone NAME ...]')
    require(argv, usage)
    path = Path(argv[0])
    limits, clips, bones = {}, [], []
    flags = {'--triangles': 'max_triangles', '--primitives': 'max_primitives', '--bytes': 'max_bytes'}
    index = 1
    while index < len(argv):
        flag = argv[index]
        require(index + 1 < len(argv), usage)
        value = argv[index + 1]
        if flag in flags:
            number = int(value)
            require(number > 0, usage)
            limits[flags[flag]] = number
        elif flag == '--clip':
            clips.append(value)
        elif flag == '--bone':
            bones.append(value)
        else:
            raise ValueError(usage)
        index += 2
    if clips:
        limits['clips'] = tuple(clips)
    if bones:
        limits['bones'] = tuple(bones)
    return path, limits


if __name__ == '__main__':
    try:
        path, limits = parse_args(sys.argv[1:])
        print(json.dumps(validate(path, limits), allow_nan=False, separators=(',', ':')))
    except Exception as error:
        print(json.dumps({'ok': False, 'error': str(error)[:240]}, separators=(',', ':')))
        sys.exit(1)
