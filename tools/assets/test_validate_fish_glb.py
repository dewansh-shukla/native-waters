"""Real v1 baseline plus in-memory mutations; never rewrite repository models."""
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
CLI = ROOT / 'tools/assets/validate_fish_glb.py'
V1 = ROOT / 'public/models/polar-parrot-study-v1.glb'
PROBE = ROOT / 'public/models/pipeline-test.glb'


def unpack(data):
    size = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + size])
    return doc, bytearray(data[28 + size:])


def pack(doc, binary):
    text = json.dumps(doc, separators=(',', ':')).encode()
    text += b' ' * (-len(text) % 4)
    binary += b'\0' * (-len(binary) % 4)
    return (struct.pack('<4sII', b'glTF', 2, 28 + len(text) + len(binary))
            + struct.pack('<II', len(text), 0x4E4F534A) + text
            + struct.pack('<II', len(binary), 0x004E4942) + binary)


def address(doc, accessor, row=0):
    a = doc['accessors'][accessor]
    v = doc['bufferViews'][a['bufferView']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    size = {5121: 1, 5123: 2, 5125: 4, 5126: 4}[a['componentType']]
    return v.get('byteOffset', 0) + a.get('byteOffset', 0) + row * v.get('byteStride', width * size)


class ValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = V1.read_bytes()
        cls.probe_hash = hashlib.sha256(PROBE.read_bytes()).hexdigest()

    def run_cli(self, data):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'fish.glb'
            path.write_bytes(data)
            result = subprocess.run([sys.executable, '-B', str(CLI), str(path)],
                                    capture_output=True, text=True)
        self.assertTrue(result.stdout.strip(), result.stderr)
        return result.returncode, json.loads(result.stdout)

    def rejected(self, doc, binary, reason):
        code, facts = self.run_cli(pack(doc, binary))
        self.assertNotEqual(code, 0)
        self.assertFalse(facts['ok'])
        self.assertIn(reason, facts['error'])

    def test_actual_v1_and_preserved_probe(self):
        code, facts = self.run_cli(self.original)
        self.assertEqual(code, 0, facts)
        self.assertEqual(facts['triangles'], 41772)
        self.assertEqual(facts['primitives'], 11)
        self.assertEqual(facts['bytes'], 1961148)
        self.assertEqual(len(facts['images']), 5)
        self.assertEqual(len(facts['bones'][0]), 5)
        self.assertAlmostEqual(facts['animations'][0]['duration'], 3, places=5)
        self.assertEqual(facts['axis']['head'], '-X')
        self.assertEqual(facts['axis']['dorsal'], '+Y')
        self.assertEqual(hashlib.sha256(PROBE.read_bytes()).hexdigest(), self.probe_hash)
        self.assertEqual(V1.read_bytes(), self.original)

    def test_active_fixture_model(self):
        fixture = json.loads((ROOT / 'content/fixtures/pipeline-test.json').read_text())
        self.assertTrue(fixture['modelUrl'].startswith('/models/'))
        path = (ROOT / 'public' / fixture['modelUrl'].lstrip('/')).resolve()
        self.assertTrue(path.is_relative_to(ROOT / 'public/models'))
        code, facts = self.run_cli(path.read_bytes())
        self.assertEqual(code, 0, facts)
        self.assertEqual(facts['axis'], {'head': '-X', 'dorsal': '+Y'})
        self.assertGreater(len(facts['materials']), 0)

    def test_corrupt_container_length(self):
        data = bytearray(self.original)
        struct.pack_into('<I', data, 8, len(data) - 4)
        code, facts = self.run_cli(data)
        self.assertNotEqual(code, 0)
        self.assertIn('container length', facts['error'])

    def test_nonfinite_position_and_bad_weights(self):
        for semantic, value, reason in [('POSITION', float('nan'), 'POSITION'),
                                       ('WEIGHTS_0', float('inf'), 'weights'),
                                       ('WEIGHTS_0', -0.5, 'weights'),
                                       ('WEIGHTS_0', 0.5, 'weights')]:
            with self.subTest(semantic=semantic, value=value):
                doc, binary = unpack(self.original)
                index = doc['meshes'][0]['primitives'][0]['attributes'][semantic]
                struct.pack_into('<f', binary, address(doc, index), value)
                self.rejected(doc, binary, reason)

    def test_external_buffer_and_image(self):
        for key in ('buffers', 'images'):
            doc, binary = unpack(self.original)
            doc[key][0]['uri'] = 'https://example.invalid/model.bin'
            self.rejected(doc, binary, 'external')

    def test_changed_animation_end(self):
        doc, binary = unpack(self.original)
        index = doc['animations'][0]['samplers'][0]['output']
        struct.pack_into('<f', binary, address(doc, index, doc['accessors'][index]['count'] - 1), 0.25)
        self.rejected(doc, binary, 'loop')

    def test_bad_joint_and_unskinned_mesh(self):
        doc, binary = unpack(self.original)
        index = doc['meshes'][0]['primitives'][0]['attributes']['JOINTS_0']
        a = doc['accessors'][index]
        struct.pack_into('<' + {5121: 'B', 5123: 'H'}[a['componentType']], binary, address(doc, index), 99)
        self.rejected(doc, binary, 'joint')
        doc, binary = unpack(self.original)
        del doc['nodes'][5]['skin']
        self.rejected(doc, binary, 'skinned')

    def test_accessor_offset_stride_and_truncation(self):
        doc, binary = unpack(self.original)
        a = doc['accessors'][0]
        rows = [bytes(binary[address(doc, 0, i):address(doc, 0, i) + 12]) for i in range(a['count'])]
        start = len(binary)
        binary.extend(b'\0' * 4 + b''.join(row + b'\0' * 4 for row in rows))
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': start, 'byteLength': 4 + 16 * len(rows), 'byteStride': 16})
        a['bufferView'], a['byteOffset'] = len(doc['bufferViews']) - 1, 4
        doc['buffers'][0]['byteLength'] = len(binary)
        code, facts = self.run_cli(pack(doc, binary))
        self.assertEqual(code, 0, facts)
        doc['bufferViews'][-1]['byteLength'] = 8
        self.rejected(doc, binary, 'accessor')

    def test_unused_animation_sampler_and_nonfinite_time(self):
        doc, binary = unpack(self.original)
        doc['animations'][0]['samplers'].append(doc['animations'][0]['samplers'][0])
        self.rejected(doc, binary, 'unused')
        doc, binary = unpack(self.original)
        index = doc['animations'][0]['samplers'][0]['input']
        struct.pack_into('<f', binary, address(doc, index), float('nan'))
        self.rejected(doc, binary, 'time')

    def test_nonunit_animation_quaternion(self):
        doc, binary = unpack(self.original)
        index = doc['animations'][0]['samplers'][1]['output']
        struct.pack_into('<4f', binary, address(doc, index), 0, 0, 0, 2)
        self.rejected(doc, binary, 'quaternion')

    def test_invalid_scene_material_and_animation_links(self):
        for mutation, reason in [('scene', 'scene'), ('material', 'material'),
                                 ('texture', 'texture'), ('sampler', 'sampler')]:
            with self.subTest(mutation=mutation):
                doc, binary = unpack(self.original)
                if mutation == 'scene':
                    doc['scenes'][doc.get('scene', 0)]['nodes'] = []
                elif mutation == 'material':
                    doc['meshes'][0]['primitives'][0]['material'] = -1
                elif mutation == 'texture':
                    doc['materials'][1]['pbrMetallicRoughness']['baseColorTexture']['index'] = -1
                else:
                    doc['animations'][0]['channels'][0]['sampler'] = -1
                self.rejected(doc, binary, reason)

    def test_budget_bad_chunks_and_world_orientation(self):
        doc, binary = unpack(self.original)
        doc['meshes'][0]['primitives'].append(doc['meshes'][0]['primitives'][0])
        self.rejected(doc, binary, 'budget')
        data = bytearray(self.original)
        struct.pack_into('<I', data, 12, 3)
        code, facts = self.run_cli(data)
        self.assertNotEqual(code, 0)
        self.assertIn('chunk', facts['error'])
        doc, binary = unpack(self.original)
        doc['nodes'][16]['rotation'] = [0, 0, 1, 0]
        self.rejected(doc, binary, 'axis')

    def test_staged_camera_and_empty_image(self):
        doc, binary = unpack(self.original)
        doc['cameras'] = [{'type': 'perspective'}]
        self.rejected(doc, binary, 'camera')
        doc, binary = unpack(self.original)
        doc['bufferViews'][doc['images'][0]['bufferView']]['byteLength'] = 0
        self.rejected(doc, binary, 'image')


if __name__ == '__main__':
    unittest.main()
