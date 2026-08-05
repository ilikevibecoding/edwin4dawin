#!/usr/bin/env python3
"""Dump the JSON chunk summary of a .glb: nodes, skins, animations, morph target names."""
import json
import struct
import sys


def read_glb_json(path):
    with open(path, "rb") as f:
        magic, version, length = struct.unpack("<4sII", f.read(12))
        assert magic == b"glTF", magic
        while f.tell() < length:
            clen, ctype = struct.unpack("<I4s", f.read(8))
            data = f.read(clen)
            if ctype == b"JSON":
                return json.loads(data)
    raise RuntimeError("no JSON chunk")


for path in sys.argv[1:]:
    g = read_glb_json(path)
    print("=" * 70)
    print(path)
    print("  meshes:", len(g.get("meshes", [])), " nodes:", len(g.get("nodes", [])),
          " skins:", len(g.get("skins", [])), " materials:", len(g.get("materials", [])),
          " images:", len(g.get("images", [])))
    for m in g.get("meshes", []):
        prims = m.get("primitives", [])
        tri = sum(1 for p in prims)
        targets = m.get("extras", {}).get("targetNames", [])
        print(f"  mesh '{m.get('name')}' prims={tri} morphs={len(targets)}")
        if targets:
            print("    targets:", ", ".join(targets[:70]))
    for a in g.get("animations", []):
        print(f"  anim '{a.get('name')}' channels={len(a.get('channels', []))}")
    joints = set()
    for s in g.get("skins", []):
        for j in s.get("joints", []):
            joints.add(g["nodes"][j].get("name"))
    if joints:
        js = sorted(joints)
        print(f"  joints ({len(js)}):", ", ".join(js[:200]))
    roots = [g["nodes"][i].get("name") for i in g.get("scenes", [{}])[0].get("nodes", [])]
    print("  scene roots:", roots)
    for mat in g.get("materials", []):
        print("  material:", mat.get("name"))
