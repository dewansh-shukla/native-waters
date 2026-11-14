import json, struct, pathlib
for lod in ("high","mid","low"):
    p = pathlib.Path("D:/AI/native-waters/public/models/fish/bengal-loach/bengal-loach-%s.glb"%lod)
    raw=p.read_bytes()
    magic,version,length=struct.unpack_from("<III",raw)
    jl,jt=struct.unpack_from("<II",raw,12)
    doc=json.loads(raw[20:20+jl])
    mats={m.get("name") for m in doc["materials"]}
    anims={a["name"] for a in doc["animations"]}
    print(lod, p.stat().st_size, "mats", sorted(mats), "anims", sorted(anims), "meshes", len(doc["meshes"]))
    assert {"idle","swim","turn"}.issubset(anims), anims
    if lod!="low":
        assert {"FishBody","FishFin","FishEye","FishCornea"}.issubset(mats), mats
    else:
        assert {"FishBody","FishFin"}.issubset(mats), mats
print("ALL OK")