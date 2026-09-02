#!/usr/bin/env python3
"""Authoritative gapless exact order-24 G1 census with four pinned shards."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n24_gentree_shards_rank7_g4_piecewise as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n24_"
    "gentree_shards_exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N24_GENTREE_SHARDS_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n24_gentree_shards_rank7_g4_piecewise.py":
        "9C80FB24894A1DAE811AD882152A44753EAF5C2A0DE7B8932BAB558F414F0C94",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n24_gentree_shards_rank7_g4_piecewise_20260831.json":
        "5B3100D376D55971141F1D57BF78F11246460ECD610C65A4B89A5B21C62FF8E6",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_gentree_shards_rank7_g4_piecewise.py":
        "10FEF70517F6CA46E1E7AB1534511FBFC396D466F96041D76E4E692F41D3E56B",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_gentree_shards_exact_rank7_g4_piecewise_20260831.json":
        "3E812C9827389ABC54ED90144F977DD5D013F10644A16CAC034742155557FBBE",
}
EXPECTED_STREAMS = [
    "4CA076898D07AFB2977A9AA51735C6285EAC6DABD048BAD8BAE590700BCAF8EF",
    "48A6877C49C56DD79C0CC2DA2DAED0CB731CF63C27F92770A1CA4573143CF7DA",
    "B4423797EF265E65611CE1848DEAD75A180C4F2DBCA606BE39C7A3A47C27958B",
    "D159CEDD3C04F5B0FF1D85302394CE72892D1C9387DDF34377A0B7825FCF3E5B",
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    probe.main()
    assert sha256(probe.OUTPUT) == DEPENDENCIES[probe.OUTPUT.name]
    raw = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
    assert raw["marker"] == probe.MARKER
    assert raw["order"] == 24
    assert raw["scope"].startswith("Actual connected trees of order 24,")
    assert raw["totals"] == {
        "crosschecks": 9268,
        "eligible_trees": 37970804,
        "free_trees": 39299897,
        "negative": 0,
    }
    assert [item["ordered_stream_sha256"] for item in raw["shards"]] == EXPECTED_STREAMS
    assert raw["global_minimum"]["minimum_value"] == 12333021972
    assert raw["global_minimum"]["minimum_row"] == [
        1, 24, 253, 1556, 6278, 17794, 37192, 59484, 74806
    ]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected 24-vertex tree W with maximum degree at "
            "least four and at least three branching vertices, the exact "
            "rank-seven common0/sum0 no-parent coefficient G1 is strictly "
            "positive."
        ),
        "gapless_census": {
            "order": 24,
            "partition": raw["partition"],
            "shards": raw["shards"],
            "free_trees": raw["totals"]["free_trees"],
            "eligible_trees": raw["totals"]["eligible_trees"],
            "negative": 0,
            "global_minimum": raw["global_minimum"],
            "independent_reroot_crosschecks": raw["totals"]["crosschecks"],
            "coverage_gap": None,
        },
        "scope": (
            "Actual connected-tree G1 at unmarked order exactly 24, "
            "common0/sum0 no-parent, maximum degree>=4, and at least three "
            "branching vertices. Orders 25..31 remain the finite complement "
            "before the separately pinned n32+ theorem."
        ),
        "coverage_gap_within_stated_actual_n24_scope": None,
        "replayed_probe_report_sha256": DEPENDENCIES[probe.OUTPUT.name],
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "order": 24,
        "eligible_trees": raw["totals"]["eligible_trees"],
        "negative": 0,
        "minimum_G1": raw["global_minimum"]["minimum_value"],
        "coverage_gap_within_stated_actual_n24_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
