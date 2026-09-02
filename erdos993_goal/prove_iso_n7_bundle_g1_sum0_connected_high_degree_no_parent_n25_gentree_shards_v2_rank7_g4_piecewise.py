#!/usr/bin/env python3
"""Authoritative dual-engine exact order-25 G1 census."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_gentree_shards_v2_rank7_g4_piecewise as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_"
    "gentree_shards_v2_exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N25_GENTREE_SHARDS_V2_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_gentree_shards_v2_rank7_g4_piecewise.py":
        "827361C8E9D9BA89A7F6034AA619E0FDB78E2317AB7EC2973E1D1987F68A02E4",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_gentree_shards_v2_rank7_g4_piecewise_20260831.json":
        "685417AC2A98AE695A678304530C546EC3FC87C6B85A1FEBB15DD11824EF3203",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_gentree_shards_rank7_g4_piecewise.py":
        "E8C9ADD4041101D52277AFD49A45310C10EC87574E0A23BB796AD8AA5F3E425F",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_gentree_shards_rank7_g4_piecewise_20260831.json":
        "33A15D3881AAE60085909B89112404435102477B3AA8784F1279A248BA8C7C35",
    "audit_iso_n7_bundle_g1_gentree_stream_v2_binary_rank7_g4_piecewise.py":
        "3893CFED799DDEBD7C0279CF955EA41C6981A4E1072649F815489AFA2070EB71",
    "iso_n7_bundle_g1_gentree_stream_v2_binary_independent_audit_exact_rank7_g4_piecewise_20260831.json":
        "6E4BC045AF5692AE201369FB92A40B9DEFBFF5A43841B562875449752FB277A2",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n24_gentree_shards_rank7_g4_piecewise.py":
        "46A456E71C85D1ECDAA5E3271E1B8FCB5BA9BAA76A3585CBF048F2349FF7DDD4",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n24_gentree_shards_exact_rank7_g4_piecewise_20260831.json":
        "6C98B889D0A23B39FBA909CA55C325A379FF5EFF5A66DC2B4EC0DD17238FD4B5",
}
EXPECTED_STREAMS = [
    "3FC0FBAA4D1CBAF227F7CB03442DEDA19F7F32920C5157B43D34F889C2F24097",
    "0B0A062249CE217D9DA333F2397ABBBBFF3C1629FD0D1EE247BD956341A12C9E",
    "191107D1526310E1A5A24F7EA6DA311237E7701C0F3709A3BD2F5878D5434EA0",
    "F2C543EE9157ADF54722199F26192DC574C908A4DEEFC5B2288F38876CBE75A1",
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    # Full independent replay through the audited binary-stream engine.
    probe.main()
    assert sha256(probe.OUTPUT) == DEPENDENCIES[probe.OUTPUT.name]
    raw = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
    baseline = json.loads((HERE / list(DEPENDENCIES)[3]).read_text(encoding="utf-8"))
    assert raw["marker"] == probe.MARKER
    assert raw["order"] == 25
    assert raw["scope"].startswith("Actual connected trees of order 25,")
    assert raw["totals"] == baseline["totals"] == {
        "crosschecks": 24828,
        "eligible_trees": 101703325,
        "free_trees": 104636890,
        "negative": 0,
    }
    assert [item["ordered_stream_sha256"] for item in raw["shards"]] == EXPECTED_STREAMS
    assert raw["global_minimum"]["minimum_value"] == baseline["global_minimum"]["minimum_value"] == 19817975778
    assert raw["global_minimum"]["minimum_degrees"] == baseline["global_minimum"]["minimum_degrees"] == [
        4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ]
    assert raw["global_minimum"]["minimum_row"] == baseline["global_minimum"]["minimum_row"] == [
        1, 25, 276, 1789, 7661, 23216, 52268, 90742, 124924
    ]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected 25-vertex tree W with maximum degree at "
            "least four and at least three branching vertices, the exact "
            "rank-seven common0/sum0 no-parent coefficient G1 is strictly "
            "positive."
        ),
        "gapless_census": {
            "order": 25,
            "partition": raw["partition"],
            "shards": raw["shards"],
            "free_trees": raw["totals"]["free_trees"],
            "eligible_trees": raw["totals"]["eligible_trees"],
            "negative": 0,
            "global_minimum": raw["global_minimum"],
            "independent_reroot_crosschecks": raw["totals"]["crosschecks"],
            "coverage_gap": None,
        },
        "dual_engine_agreement": {
            "v1_report_sha256": DEPENDENCIES[list(DEPENDENCIES)[3]],
            "v2_report_sha256": DEPENDENCIES[probe.OUTPUT.name],
            "identical": [
                "free-tree count", "eligible-tree count", "negative count",
                "crosscheck count", "global minimum G1", "minimum degree sequence",
                "minimum independence row",
            ],
        },
        "scope": (
            "Actual connected-tree G1 at unmarked order exactly 25, "
            "common0/sum0 no-parent, maximum degree>=4, and at least three "
            "branching vertices. Orders 26..31 remain the finite complement "
            "before the separately pinned n32+ theorem."
        ),
        "coverage_gap_within_stated_actual_n25_scope": None,
        "replayed_probe_report_sha256": DEPENDENCIES[probe.OUTPUT.name],
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "order": 25,
        "eligible_trees": raw["totals"]["eligible_trees"],
        "negative": 0,
        "minimum_G1": raw["global_minimum"]["minimum_value"],
        "coverage_gap_within_stated_actual_n25_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
