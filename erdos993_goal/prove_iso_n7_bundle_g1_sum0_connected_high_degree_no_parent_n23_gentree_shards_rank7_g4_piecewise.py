#!/usr/bin/env python3
"""Authoritative gapless exact order-23 G1 census with four pinned shards."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_gentree_shards_rank7_g4_piecewise as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_"
    "gentree_shards_exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N23_GENTREE_SHARDS_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_gentree_shards_rank7_g4_piecewise.py":
        "B972665E4C97D31BDA21FAE4CA671266BDD993E4801E2CEA27D7311E2BBBD8C0",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_gentree_shards_rank7_g4_piecewise_20260831.json":
        "A17F701B5073EB7C957AC75E2E6496615D30A77D30B68DF590E05138D49C5F4C",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n21_22_gentree_census_rank7_g4_piecewise.py":
        "C8AEEB585B50E2A7FB1F2D8C0AEEACB20A345973B29D7AAE2109179F29BCB29A",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n21_22_gentree_census_exact_rank7_g4_piecewise_20260831.json":
        "FC9E6DD4C64C57C06FE0C3FFFCCC25CF7C463D0740961A89E287FD7F75132E2B",
}
EXPECTED_STREAMS = [
    "9A5827D217F23481B7ABC2C3D11BAD138BE3AFDE1E4DD2BB53C2E241F8450F96",
    "9C1C4D0E1563FC028BCA4FA152A975E105558244033B800676C06228E434B21F",
    "931DE05B8F7855824C1C1EA61B8E4F4AA107201C624803DBD94A6BBC4DE2DD62",
    "D511A32EECBDF87CF1169FF656181509F0EA06980D843A0F3DFFDEAFFCC62782",
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    # Full replay: all four disjoint canonical generation subsets are rerun.
    probe.main()
    assert sha256(probe.OUTPUT) == DEPENDENCIES[probe.OUTPUT.name]
    raw = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
    assert raw["marker"] == probe.MARKER
    assert raw["totals"] == {
        "crosschecks": 3470,
        "eligible_trees": 14218916,
        "free_trees": 14828074,
        "negative": 0,
    }
    assert [item["ordered_stream_sha256"] for item in raw["shards"]] == EXPECTED_STREAMS
    assert raw["global_minimum"]["minimum_value"] == 7464262405
    assert raw["global_minimum"]["minimum_row"] == [
        1, 23, 231, 1335, 4933, 12280, 21215, 25923, 22675
    ]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected 23-vertex tree W with maximum degree at "
            "least four and at least three branching vertices, the exact "
            "rank-seven common0/sum0 no-parent coefficient G1 is strictly "
            "positive."
        ),
        "gapless_census": {
            "order": 23,
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
            "Actual connected-tree G1 at unmarked order exactly 23, "
            "common0/sum0 no-parent, maximum degree>=4, and at least three "
            "branching vertices. Orders 24..31 remain the finite complement "
            "before the separately pinned n32+ theorem."
        ),
        "coverage_gap_within_stated_actual_n23_scope": None,
        "replayed_probe_report_sha256": DEPENDENCIES[probe.OUTPUT.name],
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "order": 23,
        "eligible_trees": raw["totals"]["eligible_trees"],
        "negative": 0,
        "minimum_G1": raw["global_minimum"]["minimum_value"],
        "coverage_gap_within_stated_actual_n23_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
