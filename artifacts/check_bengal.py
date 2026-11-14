import json, struct
from pathlib import Path
for lod in ("high","mid","low"):
    p = Path("D:/AI/native-waters/public/models/fish/bengal-danio/bengal-danio-%s.glb" % lod)
    raw = p.read_bytes()
    magic,ver,length = struct.unpack_from("<III", raw)
    jl,jt = struct.unpack_from("<II", raw, 12)
    doc = json.loads(raw[20:20+jl])
    mats = {m.get("name") for m in doc.get("materials",[])}
    anims = {a.get("name") for a in doc.get("animations",[])}
    print(lod, p.stat().st_size, "mats_ok=", {"FishBody","FishFin","FishEye","FishCornea"}.issubset(mats), "clips_ok=", {"idle","swim","turn"}.issubset(anims))