#!/usr/bin/env python3
"""Universal exact rank-seven G2 theorem for every five-edge forest."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g2_five_edge_all_marked_all_parent_shifted_tail_rank7_g4_piecewise as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g2_five_edge_all_marked_all_parent_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G2_FIVE_EDGE_ALL_MARKED_ALL_PARENT_"
    "RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g2_five_edge_all_marked_all_parent_shifted_tail_rank7_g4_piecewise.py":
        "9B93CA0987D8B9F9F4FDFEC148C1ABEED33169C10011874159CD784EAFC5B815",
    "probe_iso_n7_bundle_g2_five_edge_all_marked_all_parent_shifted_tail_rank7_g4_piecewise_20260831.json":
        "46575177DC50EDA8EAC50DFD3CD7B2CB892BC309437293FC2569BDF02C069312",
    "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py":
        "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "prove_iso_n7_bundle_g23_two_edge_all_parent_rank7_g5_finish.py":
        "F803D6C168169A87AC2825EE2FA172D084A0853A43E5040EFAC844172BC8E3E6",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_rank7_g4_piecewise.py":
        "744618134C3D41A052345A237DA842941DC59D9F71937888321DD57216C647DD",
    "assemble_iso_n7_bundle_g2_sum0_all_parent_five_edge_isolate_padding_rank7_g4_piecewise.py":
        "C673E6B50BFBD8DA3BCCDCD5C60F28E3263FE890BC1D00C05A5DEC223B897C18",
    "iso_n7_bundle_g2_sum0_all_parent_five_edge_isolate_padding_assembled_exact_rank7_g4_piecewise_20260831.json":
        "5DC9B4826A71412C14ACC1DD6A8883480476BCB1F20A39A1E2B8C327B8653FED",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    # Independent byte-identical reconstruction of all literal cases, row
    # signatures, exact finite values, and shifted all-order tails.
    probe.main()
    assert sha256(probe.OUTPUT) == DEPENDENCIES[probe.OUTPUT.name]
    raw = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
    assert raw["isolate_free_cores"] == 16
    assert raw["cores_by_order_6_through_10"] == [6, 5, 3, 1, 1]
    assert raw["literal_cases"] == 9412
    assert raw["unique_CD_row_signatures"] == 2411
    assert raw["failure_count"] == 0
    assert raw["failure_records"] == []
    assert raw["maximum_tail_threshold"] == 13
    assert raw["global_finite_minimum_numerator"] == "0"
    assert raw["ordered_unique_row_stream_sha256"] == (
        "EB0CA7F80B3B58294A2648B0BBA6CB24D012FCCA80CC2706A23C0745FE2A285B"
    )
    assert all(
        row["certificate"]["kind"] == "proved_nonnegative"
        for core in raw["core_reports"] for row in core["unique_rows"]
    )

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every forest C with exactly five edges, every ordered pair "
            "of distinct marked vertices u,v, and every compatible canonical "
            "parent mode, the exact rank-seven bundle coefficient G2 is "
            "nonnegative."
        ),
        "gapless_five_edge_core_classification": {
            "reason": (
                "After deleting isolates, a five-edge forest is an "
                "isolate-free forest of order 6 through 10. Exact unlabeled "
                "generation gives 6,5,3,1,1 cores respectively."
            ),
            "core_orders": [6, 10],
            "cores_by_order_6_through_10": [6, 5, 3, 1, 1],
            "total_cores": 16,
            "coverage_gap": None,
        },
        "gapless_literal_role_classification": {
            "marks": (
                "Each ordered distinct mark is either a literal core vertex "
                "or a distinct isolate role."
            ),
            "parents": [
                "no_parent", "endpoint_u", "endpoint_v",
                "ordinary_parent_isolate", "ordinary_parent_core",
            ],
            "literal_cases": raw["literal_cases"],
            "unique_CD_row_signatures": raw["unique_CD_row_signatures"],
            "coverage_gap": None,
        },
        "exact_sign_certificate": {
            "method": (
                "Reconstruct literal G2 from the pinned coefficient formula. "
                "For each exact C/D independence-row signature, clear its "
                "positive constant denominator. Check every integer order "
                "from the signature's minimum actual order to its tail "
                "threshold, then expand the numerator at n=threshold+s; all "
                "coefficients in s are nonnegative."
            ),
            "failure_count": 0,
            "maximum_tail_threshold": raw["maximum_tail_threshold"],
            "global_finite_minimum_numerator": raw[
                "global_finite_minimum_numerator"
            ],
            "global_finite_minimum_witness": raw[
                "global_finite_minimum_witness"
            ],
            "ordered_unique_row_stream_sha256": raw[
                "ordered_unique_row_stream_sha256"
            ],
            "core_reports": raw["core_reports"],
        },
        "coverage_gap_within_five_edge_all_marked_all_parent_G2": None,
        "remaining_rank7_G2_boundary": (
            "Forests with six or more edges remain separate."
        ),
        "scope_guard": (
            "Rank-seven G2 only and exactly five edges. This does not assert "
            "rank-seven G3, any six-plus-edge coefficient theorem, the full "
            "rank-seven bundle, or the full conjecture."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "isolate_free_cores": 16,
        "literal_cases": raw["literal_cases"],
        "unique_CD_row_signatures": raw["unique_CD_row_signatures"],
        "failure_count": 0,
        "maximum_tail_threshold": raw["maximum_tail_threshold"],
        "coverage_gap_within_five_edge_all_marked_all_parent_G2": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
