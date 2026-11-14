import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tools.blender import fish_textures
print("funcs:", [x for x in dir(fish_textures) if x in ("fin_albedo","eye_albedo","body_albedo","body_normal")])
print("fin_albedo" in dir(fish_textures))
