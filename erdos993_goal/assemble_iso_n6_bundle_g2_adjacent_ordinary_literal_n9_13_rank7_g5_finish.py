#!/usr/bin/env python3
"""Fail-closed assembly for the dual-replayed adjacent ordinary N=9..13 census."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_ordinary_literal_n9_13_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_LITERAL_N9_13_RANK7_G5_FINISH"
PINS = {
    "cpp_source": ("census_iso_n6_bundle_g2_adjacent_ordinary_literal_n9_13_rank7_g5_finish.cpp", "C4D9E2C033DB632DC403A85D06FB515C3F230F81A53652A3BEE5DEE15094A301"),
    "executable": ("census_iso_n6_bundle_g2_adjacent_ordinary_literal_n9_13_rank7_g5_finish.exe", "09F6096227E01CBBFE46B79DAE7A3E0F76410CCF4943740AB329DD2A01BBE036"),
    "dataset": ("iso_n6_bundle_g2_nonadjacent_ordinary_forest_graph6_n11_15_root_20260831.txt", "A043EE3A7288E7DD41D4EEB226C0B58DAEF13CB70331D77844A2FAB8B04A8484"),
    "dataset_manifest": ("iso_n6_bundle_g2_nonadjacent_ordinary_forest_graph6_n11_15_manifest_root_20260831.json", "E18A58203189E84E83E773B17CF56B0982C3D9E82A17DFFB2E8A27DB7EAC6CCF"),
    "parent_loss": ("iso_n6_bundle_g2_adjacent_ordinary_parent_loss_exact_rank7_g5_finish_20260831.json", "DCEDB94D866F61E6E0CEC1F36346D65388642F1CA9FA7B0E700C5C05D0D654DA"),
    "raw_first": ("iso_n6_bundle_g2_adjacent_ordinary_literal_n9_13_raw_rank7_g5_finish_20260831.json", "66BF8764059C4EA46C89C8827410667A68CB1E87B8E1D4DCFE076FF9469C6A3B"),
    "raw_second": ("iso_n6_bundle_g2_adjacent_ordinary_literal_n9_13_raw_replay_rank7_g5_finish_20260831.json", "66BF8764059C4EA46C89C8827410667A68CB1E87B8E1D4DCFE076FF9469C6A3B"),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    pins = {}
    for label, (name, expected) in PINS.items():
        actual = sha256(HERE / name)
        assert actual == expected, (label, expected, actual)
        pins[label] = {"file": name, "sha256": actual}
    assert (HERE / PINS["raw_first"][0]).read_bytes() == (HERE / PINS["raw_second"][0]).read_bytes()

    manifest = json.loads((HERE / PINS["dataset_manifest"][0]).read_text(encoding="utf-8"))
    assert manifest["marker"] == "GENERATED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_FOREST_GRAPH6_N11_15_ROOT"
    assert manifest["orders"] == {"11": 710, "12": 1601, "13": 3658, "14": 8599, "15": 20514}
    assert manifest["total_forests"] == 35082 and manifest["data_sha256"] == PINS["dataset"][1]
    loss = json.loads((HERE / PINS["parent_loss"][0]).read_text(encoding="utf-8"))
    assert loss["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_PARENT_LOSS_RANK7_G5_FINISH"
    assert loss["scope"] == "adjacent marks u,v; ordinary deleted parent p distinct from u,v"

    raw = json.loads((HERE / PINS["raw_first"][0]).read_text(encoding="utf-8"))
    assert raw["marker"] == MARKER
    assert raw["forest_counts"] == manifest["orders"]
    assert raw["aggregate"] == {
        "triples": 10528894,
        "negative": 0,
        "global_minimum": 136320,
        "ordered_record_fnv1a64": "441A9475B3C7C97F",
    }
    assert set(raw["rows"]) == {f"N{n}_parentAdj{adj}" for n in range(9,14) for adj in (0,1)}
    assert all(row["negative"] == 0 and row["triples"] > 0 for row in raw["rows"].values())

    report = {
        "marker": MARKER,
        "status": "PASS exact literal adjacent ordinary-parent finite census",
        "theorem": "For every forest with adjacent marks u,v, every ordinary deleted parent p distinct from u,v, and 9<=N=|G-{u,v}|<=13, G2>=0.",
        "coverage": {
            "unlabeled_forests": "Every unlabeled forest of total order 11..15.",
            "markings": "Both orientations of every edge uv and every p distinct from u,v.",
            "parent_modes": "Separate parentAdj0 and parentAdj1 rows cover p adjacent to neither mark and p adjacent to exactly one mark; adjacency to both would form a forest triangle.",
            "exact_rows": "All independence rows are evaluated on the literal induced subforests, and the pinned exact parent-loss identity is used.",
        },
        "aggregate": raw["aggregate"],
        "rows": raw["rows"],
        "forest_counts": raw["forest_counts"],
        "dual_replay": {"byte_identical": True, "raw_sha256": PINS["raw_first"][1]},
        "pins": pins,
        "scope_guard": "This closes adjacent ordinary-parent common orders N=9..13 only. Larger-order parent submodes require their separate certificates; universal G2 is not claimed here.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    serialized = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(serialized, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "triples": report["aggregate"]["triples"], "negative": 0, "minimum": report["aggregate"]["global_minimum"], "dual_replay": True}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(serialized.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
