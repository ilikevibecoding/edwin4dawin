#!/usr/bin/env python3
"""Exact e=6 rank-seven G2 theorem for two isolated marks, all parents."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g2_six_edge_isolated_marks_all_parent_shifted_tail_rank7_g4_piecewise as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g2_six_edge_isolated_marks_all_parent_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G2_SIX_EDGE_ISOLATED_MARKS_ALL_PARENT_"
    "RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g2_six_edge_isolated_marks_all_parent_shifted_tail_rank7_g4_piecewise.py":
        "F25D5B70416ABB58CABA9BC4F2165A9AE1AD6E40DA3AC0A815DA9CEC2D6ACF4C",
    "probe_iso_n7_bundle_g2_six_edge_isolated_marks_all_parent_shifted_tail_rank7_g4_piecewise_20260831.json":
        "AB60DF91D98B07755B2915771ED42316E4D75D200273EC29191D9BBDD58B0510",
    "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py":
        "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "prove_iso_n7_bundle_g23_two_edge_all_parent_rank7_g5_finish.py":
        "F803D6C168169A87AC2825EE2FA172D084A0853A43E5040EFAC844172BC8E3E6",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_rank7_g4_piecewise.py":
        "744618134C3D41A052345A237DA842941DC59D9F71937888321DD57216C647DD",
    "probe_iso_n7_bundle_g2_five_edge_all_marked_all_parent_shifted_tail_rank7_g4_piecewise.py":
        "9B93CA0987D8B9F9F4FDFEC148C1ABEED33169C10011874159CD784EAFC5B815",
    "prove_iso_n7_bundle_g2_five_edge_all_marked_all_parent_rank7_g4_piecewise.py":
        "5097C7C3B459C7AD49B0AF6BAB054DE3174B4C67C9A830AA7462DE1675C22CB0",
    "iso_n7_bundle_g2_five_edge_all_marked_all_parent_exact_rank7_g4_piecewise_20260831.json":
        "A55078FA722F81458C3B735D0E22E0CBB65FE8B7535685A8E69471D173DE53E0",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    # Independent byte-identical reconstruction of all 34 core/parent cones.
    probe.main()
    assert sha256(probe.OUTPUT) == DEPENDENCIES[probe.OUTPUT.name]
    raw = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
    assert raw["isolate_free_cores"] == 34
    assert raw["cores_by_order_7_through_12"] == [11, 12, 6, 3, 1, 1]
    assert raw["literal_parent_cases"] == 416
    assert raw["unique_CD_row_signatures"] == 270
    assert raw["failure_count"] == 0
    assert raw["failure_records"] == []
    assert raw["maximum_tail_threshold"] == 15
    assert raw["global_finite_minimum_numerator"] is None
    assert raw["global_finite_minimum_witness"] is None
    assert raw["ordered_unique_row_stream_sha256"] == (
        "CB1F11C551DAFDF36E9029BB1EFB37E52B1E539AEE8CB260455592325DAE54B4"
    )
    assert all(
        row["certificate"]["kind"] == "proved_nonnegative"
        and row["certificate"]["finite_integer_count"] == 0
        and row["certificate"]["tail_threshold"] == row["minimum_actual_order"]
        for core in raw["core_reports"] for row in core["unique_rows"]
    )

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let C be any forest with exactly six edges and let u,v be two "
            "distinct isolated marked vertices. For every compatible "
            "canonical parent mode, the exact rank-seven nonadjacent/common0/"
            "sum0 bundle coefficient G2 is nonnegative."
        ),
        "gapless_six_edge_core_classification": {
            "reason": (
                "After deleting isolates, a six-edge forest is an isolate-"
                "free forest of order 7 through 12. Exact unlabeled "
                "generation gives 11,12,6,3,1,1 cores respectively."
            ),
            "core_orders": [7, 12],
            "cores_by_order_7_through_12": [11, 12, 6, 3, 1, 1],
            "total_cores": 34,
            "coverage_gap": None,
        },
        "gapless_parent_partition": {
            "parent_modes": raw["parent_modes"],
            "literal_parent_cases": raw["literal_parent_cases"],
            "unique_CD_row_signatures": raw["unique_CD_row_signatures"],
            "coverage_gap": None,
        },
        "exact_sign_certificate": {
            "method": (
                "For each core and parent signature, reconstruct literal G2, "
                "clear its positive constant denominator, and expand at "
                "n=n_min+s. Every coefficient in s is nonnegative."
            ),
            "failure_count": 0,
            "maximum_tail_threshold": raw["maximum_tail_threshold"],
            "all_thresholds_equal_minimum_actual_order": True,
            "finite_seam_required": False,
            "ordered_unique_row_stream_sha256": raw[
                "ordered_unique_row_stream_sha256"
            ],
            "core_reports": raw["core_reports"],
        },
        "coverage_gap_within_six_edge_isolated_marks_all_parent_G2": None,
        "remaining_rank7_G2_boundary": (
            "Other marked placements with six edges and every seven-or-more-"
            "edge forest remain separate."
        ),
        "scope_guard": (
            "Rank-seven G2 only; exactly six edges; both marks isolated "
            "(nonadjacent/common0/sum0); all compatible parent modes. This "
            "is not yet the universal all-marked six-edge theorem."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "isolate_free_cores": 34,
        "literal_parent_cases": raw["literal_parent_cases"],
        "unique_CD_row_signatures": raw["unique_CD_row_signatures"],
        "failure_count": 0,
        "maximum_tail_threshold": raw["maximum_tail_threshold"],
        "finite_seam_required": False,
        "coverage_gap_within_six_edge_isolated_marks_all_parent_G2": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
