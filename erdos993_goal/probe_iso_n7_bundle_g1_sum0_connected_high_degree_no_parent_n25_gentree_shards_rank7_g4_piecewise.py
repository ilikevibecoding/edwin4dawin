#!/usr/bin/env python3
"""Order-25 specialization of the pinned four-shard gentree G1 engine."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_gentree_shards_rank7_g4_piecewise as engine


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_"
    "gentree_shards_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N25_GENTREE_SHARDS_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_gentree_shards_rank7_g4_piecewise.py":
        "B972665E4C97D31BDA21FAE4CA671266BDD993E4801E2CEA27D7311E2BBBD8C0",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n24_gentree_shards_exact_rank7_g4_piecewise_20260831.json":
        "6C98B889D0A23B39FBA909CA55C325A379FF5EFF5A66DC2B4EC0DD17238FD4B5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name
    engine.ORDER = 25
    engine.OUTPUT = OUTPUT
    engine.MARKER = MARKER
    engine.EXPECTED_TOTAL = 104_636_890
    engine.__file__ = str(Path(__file__).resolve())
    engine.main()
    report = json.loads(OUTPUT.read_text(encoding="utf-8"))
    assert report["order"] == 25
    assert report["marker"] == MARKER
    report["scope"] = (
        "Actual connected trees of order 25, common0/sum0 no-parent, "
        "maximum degree>=4, and at least three branching vertices."
    )
    report["parameterized_engine"] = {
        "engine_source": Path(engine.__spec__.origin).name,
        "engine_source_sha256": DEPENDENCIES[
            "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_gentree_shards_rank7_g4_piecewise.py"
        ],
        "parameters": {"order": 25, "shards": 4, "free_trees": 104_636_890},
    }
    report["wrapper_dependencies_sha256"] = DEPENDENCIES
    report["source_sha256"] = sha256(Path(__file__))
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print("FINAL_SOURCE_SHA256", report["source_sha256"])
    print("FINAL_REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
