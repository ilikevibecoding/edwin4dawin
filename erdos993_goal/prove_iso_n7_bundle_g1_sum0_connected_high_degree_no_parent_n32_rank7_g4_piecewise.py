#!/usr/bin/env python3
"""Exact order-32 specialization of the frozen weighted-core batch engine.

The imported producer is hash-pinned and parameterized only through its order,
output, marker, and fixed expected certificate values.  After the exhaustive
run, this wrapper replaces the inherited order-33 prose/coverage-key fields
with the exact order-32 scope; no computed field is altered.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33_rank7_g4_piecewise as engine


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n32_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N32_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33_rank7_g4_piecewise.py":
        "BE5E35CD4943A69FC5DFC2990FCABE45744DF99A94E9C3589908A8C20DF1D39C",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33_exact_rank7_g4_piecewise_20260831.json":
        "72AB32156136151E44E39D55D1AAC70BCD4EA8CF81D819AA1A2C1D8B6F11626D",
}
EXPECTED = {
    "total_profiles": 5365,
    "profile_analytic": 1444,
    "profile_residual": 3921,
    "compatible_assignments": 10354089227,
    "literal_assignments": 104420797,
    "core_orders": tuple(range(4, 18)),
    "accelerator_crosschecks": 1594,
    "literal_minimum": (
        322687977704,
        (7, 7, 7, 6, 1, 1, 1),
        0,
        (1, 7, 1, 7, 7, 1, 6),
        41,
        97,
        (1, 32, 465, 4138, 25720, 120594, 448052, 1362606, 3467775),
    ),
}
EXPECTED_PROFILE_STREAM = (
    "D9714064EE8F9B5741984023F517C8DDCC257307FF068C53B14A9EF8C2E2FD13"
)
EXPECTED_TOPOLOGY_STREAM = (
    "3F0CCB65CBC7CAA204BC8B7189DCE3A602360A032EBB044D94668F8F9E6099D9"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    engine.ORDER = 32
    engine.OUTPUT = OUTPUT
    engine.MARKER = MARKER
    engine.EXPECTED = EXPECTED
    engine.EXPECTED_PROFILE_STREAM = EXPECTED_PROFILE_STREAM
    engine.EXPECTED_TOPOLOGY_STREAM = EXPECTED_TOPOLOGY_STREAM
    engine.__file__ = str(Path(__file__).resolve())
    engine.main()

    report = json.loads(OUTPUT.read_text(encoding="utf-8"))
    assert report["marker"] == MARKER
    assert report["status"] == "proved exact"
    assert report["certificate"]["profile_stream_sha256"] == EXPECTED_PROFILE_STREAM
    assert report["certificate"]["topology_stream_sha256"] == EXPECTED_TOPOLOGY_STREAM
    assert report["gapless_split"]["residual_compatible_assignments"] == 10354089227
    assert report["gapless_split"]["literal_low_P4_assignments"] == 104420797
    assert report["certificate"]["literal_negative"] == 0
    assert report.pop("coverage_gap_within_stated_actual_n33_scope") is None
    report["theorem"] = (
        "For every connected 32-vertex tree W with maximum degree at least "
        "four and at least three branching vertices, the exact rank-seven "
        "common0/sum0 no-parent coefficient G1 is nonnegative."
    )
    report["coverage_gap_within_stated_actual_n32_scope"] = None
    report["scope"] = (
        "Actual connected-tree G1 at unmarked order exactly 32, "
        "common0/sum0 no-parent, maximum degree>=4, and at least three "
        "branching vertices. Other orders and modes remain separate."
    )
    report["parameterized_engine"] = {
        "order": 32,
        "engine_source": (
            "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_"
            "n33_rank7_g4_piecewise.py"
        ),
        "engine_source_sha256": DEPENDENCIES[
            "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33_rank7_g4_piecewise.py"
        ],
        "computed_fields_changed_after_engine_run": [],
    }
    report["dependencies_sha256"] = {
        **report["dependencies_sha256"],
        **DEPENDENCIES,
    }
    report["source_sha256"] = sha256(Path(__file__))
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "compatible_assignments": 10354089227,
        "literal_assignments": 104420797,
        "literal_negative": 0,
        "literal_minimum_G1": "322687977704",
        "profile_stream_sha256": EXPECTED_PROFILE_STREAM,
        "topology_stream_sha256": EXPECTED_TOPOLOGY_STREAM,
        "coverage_gap_within_stated_actual_n32_scope": None,
    }, indent=2, sort_keys=True))
    print("FINAL_SOURCE_SHA256", report["source_sha256"])
    print("FINAL_REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
