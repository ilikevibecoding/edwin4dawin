#!/usr/bin/env python3
"""Freeze exact obstruction witnesses for abandoned rank-7 moment/support cones.

This prevents the same insufficient relaxations from being retried.  The
artifact proves only that the listed sufficient-certificate routes fail; it
does not provide a counterexample to any target coefficient inequality.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_bernstein_refinement_rank7_g4_piecewise as refinement
import probe_iso_n7_bundle_g1_sum0_connected_high_degree_signed_support_incidence_rank7_g4_piecewise as incidence


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_failed_moment_support_cones_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_FAILED_MOMENT_SUPPORT_CONES_"
    "RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g2_sum0_dense_moment_extension_rank7_g4_piecewise.py":
        "55D6BF620D3FD1169E09D790E194AFA10A6B2F85DE5F946F0F9955D56F318F84",
    "iso_n7_bundle_g2_sum0_dense_moment_extension_n11_probe_rank7_g4_piecewise_20260831.json":
        "7D5EB70E1D49B80165349027C1E566D8367C577081655F36DB2F48F39B50C3F1",
    "probe_iso_n7_bundle_g2_sum0_isolate_padding_H1_moment_rank7_g4_piecewise.py":
        "8FCA05AD988D6BF946ABC67ED2E2C91CCA6356C7461BBAA8A45F87258FE2CCF0",
    "iso_n7_bundle_g2_sum0_isolate_padding_H1_moment_h2_probe_rank7_g4_piecewise_20260831.json":
        "71C5824089D553237D04AD86065A3F80B54EEBB8AF2E686036EA7F66842102D3",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_signed_support_incidence_rank7_g4_piecewise.py":
        "ED09B9C0A3FA6CE11F4CA589CDE29175506D34FABAD107AB1F17782B71F6FC13",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_bernstein_refinement_rank7_g4_piecewise.py":
        "4A4D4211353C84EE3AA1EA7BA17CA72BC2E8295DE8DA6EE2C2A1FDEB9BB0F86F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    dense = json.loads((HERE / (
        "iso_n7_bundle_g2_sum0_dense_moment_extension_n11_probe_"
        "rank7_g4_piecewise_20260831.json"
    )).read_text(encoding="utf-8"))
    assert dense["summary"]["negative_tail_scalar_coefficients"] == 287
    assert dense["summary"]["minimum_tail_scalar_coefficient"] == "-77140743966720"
    assert dense["summary"]["ordered_stream_sha256"] == (
        "F3B31AA46F6222E66B240F53A3AA60EA8805610DD7A71440C0ABA6E3A94615FA"
    )

    h1 = json.loads((HERE / (
        "iso_n7_bundle_g2_sum0_isolate_padding_H1_moment_h2_probe_"
        "rank7_g4_piecewise_20260831.json"
    )).read_text(encoding="utf-8"))
    assert h1["summary"]["negative_tail_scalar_coefficients"] == 1264
    assert h1["summary"]["minimum_tail_scalar_coefficient"] == "-731094016/5"
    assert h1["summary"]["ordered_stream_sha256"] == (
        "05F56A7B3367089395A66B415AE9647261D7B208A35011B194876DEDF8742518"
    )

    coarse_counts, coarse_failure = refinement.scan_order(11)
    assert coarse_counts == {
        "profiles": 7,
        "coarse": 0,
        "refined": 0,
        "negative": 7,
        "unresolved": 0,
        "boxes": 7,
        "max_depth": 0,
    }
    assert coarse_failure == (
        Fraction(-30481323, 4),
        (3, 2, 2, 1, 1),
        Fraction(1),
        Fraction(0),
        8,
        23,
    )

    incidence_result = incidence.relaxed(11, (3, 2, 2, 1, 1))
    incidence_failure = refinement.dyadic_refine(incidence_result[2])
    assert incidence_failure["status"] == "negative_relaxed_value"
    assert incidence_failure["value"] == Fraction(-35640577, 6)
    assert incidence_failure["s"] == 1
    assert incidence_failure["t"] == 1

    report = {
        "marker": MARKER,
        "status": "proved exact obstruction catalog; no target theorem",
        "obstructions": {
            "rank7_G2_dense_free_moment_extension": {
                "negative_tail_scalar_coefficients": 287,
                "minimum_tail_scalar_coefficient": "-77140743966720",
                "ordered_stream_sha256": dense["summary"]["ordered_stream_sha256"],
            },
            "rank7_G2_H1_isolate_padding_free_moment": {
                "negative_tail_scalar_coefficients": 1264,
                "minimum_tail_scalar_coefficient": "-731094016/5",
                "ordered_stream_sha256": h1["summary"]["ordered_stream_sha256"],
            },
            "rank7_G1_J4_E5_cone": {
                "order": 11,
                "profile": [3, 2, 2, 1, 1],
                "exact_negative_relaxed_value": "-30481323/4",
                "parameters": {"s": "1", "t": "0"},
                "all_order11_profiles_negative_in_relaxation": 7,
            },
            "rank7_G1_signed_support_incidence_cone": {
                "order": 11,
                "profile": [3, 2, 2, 1, 1],
                "exact_negative_relaxed_value": "-35640577/6",
                "parameters": {"s": "1", "t": "1"},
            },
        },
        "interpretation": (
            "Each witness is a negative point or negative exact scalar "
            "coefficient in a relaxation.  It blocks promotion of that "
            "certificate route but is not an actual forest counterexample."
        ),
        "do_not_retry_without_new_constraint": [
            "independent dense W5..W8 blocked-extension moment box",
            "H1 isolate-padding free moment box",
            "coarse J4/E5 cone, even after exact Bernstein subdivision",
            "the recorded J4/E5-to-E7/E8 incidence caps alone",
        ],
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "obstruction_count": len(report["obstructions"]),
        "status": report["status"],
    }, indent=2))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
