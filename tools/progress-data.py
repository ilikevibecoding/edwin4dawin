#!/usr/bin/env python3
"""Rebuild progress/data.json (items + ordered snapshots) from progress/shots/*/meta.json: progress-data.py <progressDir>"""
import json, os, sys, glob
root = sys.argv[1]
tags = sorted(d for d in os.listdir(os.path.join(root, 'shots')) if os.path.isfile(os.path.join(root, 'shots', d, 'meta.json')))
items = [
  {"id": "aircraft", "name": "Aircraft (crop duster / floatplane)"},
  {"id": "water", "name": "Water: surface, wakes, landing, boats"},
  {"id": "city", "name": "City: skyline, facades, streets"},
  {"id": "highway", "name": "Highway and causeways"},
  {"id": "foliage", "name": "Foliage and ground"},
  {"id": "shore", "name": "Shoreline and beach"},
  {"id": "sky", "name": "Sky, clouds, lighting"},
]
snaps = []
for t in tags:
  m = json.load(open(os.path.join(root, 'shots', t, 'meta.json')))
  notes = open(os.path.join(root, 'shots', t, 'notes.txt')).read() if os.path.exists(os.path.join(root, 'shots', t, 'notes.txt')) else ''
  snaps.append({"tag": t, "build": m["build"], "time": m["time"], "views": m["views"], "notes": notes})
json.dump({"items": items, "snapshots": snaps, "updated": snaps[-1]["time"] if snaps else None}, open(os.path.join(root, 'data.json'), 'w'), indent=1)
print(f"data.json: {len(snaps)} snapshots")
