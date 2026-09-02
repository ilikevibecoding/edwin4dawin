#!/usr/bin/env python3
"""Assemble the complete Delta2/Delta3 certificate for quartic-star e=3 cores."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta23_e3_quartic_star_complete_exact_root_20260823.json"

EXPECTED = {
    "rank8_delta23_e3_quartic_stars_n27_n36_exact_root_20260823.json": (
        "2B7B0F91BE47034979BB8D6204D3E2AD53945E6A56CAB131C1EB3C0AA40936DA",
        "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STARS_ALL_ROOTS_N27_N36",
    ),
    "rank8_delta23_e3_quartic_stars_n27_n36_independent_audit_root_20260823.json": (
        "01DB15B04A774CACE173F78A5B9155890C209AF4B354B12AB1B98F8F90535E1F",
        "PASS_INDEPENDENT_RANK8_DELTA23_E3_QUARTIC_STARS_N27_N36_AUDIT",
    ),
    "rank8_delta23_e3_quartic_star_center_all_order_exact_root_20260823.json": (
        "CAAE528760816A3E5B00294E5E868D04122263266D7B18A84680E109D0048259",
        "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS",
    ),
    "rank8_delta23_e3_quartic_star_center_all_order_independent_audit_root_20260823.json": (
        "637AC6F8D783503166E1E08E380FC68F39337C4B4381E185DC6EBF1951AB9FE4",
        "PASS_INDEPENDENT_NO_GAP_RANK8_DELTA23_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS",
    ),
    "rank8_delta23_e3_quartic_star_arm_short_boundary_exact_root_20260823.json": (
        "342BEE0FF1F3BE709BA72037FE00240B557A2D5978D04EBF95D56D8756056115",
        "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_ARM_ALL_N37_PLUS",
    ),
    "rank8_delta23_e3_quartic_star_arm_short_boundary_independent_audit_root_20260823.json": (
        "6E2A273439618BFE91A1AD46C09B989A684DAEC01A4D61690AE968AC827E004F",
        "PASS_INDEPENDENT_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_ARM_ALL_N37_PLUS",
    ),
    "rank8_delta23_e3_quartic_star_arm_all_long_compressed_exact_root_20260823.json": (
        "A85298D7742D76D20CAA50CE52465B9C4033AC91CC809E2E6EAB168E27A16236",
        "PASS_EXACT_POSITIVE_COMPRESSED_COEFFICIENT_CELL",
    ),
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_checked(name: str) -> dict:
    path = ROOT / name
    expected_hash, expected_status = EXPECTED[name]
    actual_hash = digest(path)
    assert actual_hash == expected_hash, (name, actual_hash, expected_hash)
    report = json.loads(path.read_text(encoding="utf-8"))
    assert report["status"] == expected_status, (name, report.get("status"))
    return report


def main() -> None:
    reports = {name: load_checked(name) for name in EXPECTED}
    finite = reports["rank8_delta23_e3_quartic_stars_n27_n36_exact_root_20260823.json"]
    finite_audit = reports["rank8_delta23_e3_quartic_stars_n27_n36_independent_audit_root_20260823.json"]
    center = reports["rank8_delta23_e3_quartic_star_center_all_order_exact_root_20260823.json"]
    center_audit = reports["rank8_delta23_e3_quartic_star_center_all_order_independent_audit_root_20260823.json"]
    arm = reports["rank8_delta23_e3_quartic_star_arm_short_boundary_exact_root_20260823.json"]
    arm_audit = reports["rank8_delta23_e3_quartic_star_arm_short_boundary_independent_audit_root_20260823.json"]
    all_long = reports["rank8_delta23_e3_quartic_star_arm_all_long_compressed_exact_root_20260823.json"]

    # Finite interval: literal enumeration of every core and every root.
    assert [row["order"] for row in finite["orders"]] == list(range(27, 37))
    assert finite["totals"] == {"canonical_cores": 2208, "rooted_rows": 71257}
    assert all(row["negative_or_zero_rows"] == {"2": 0, "3": 0} for row in finite["orders"])
    assert all(int(row["minimum_values"][rank]) > 0 for row in finite["orders"] for rank in ("2", "3"))
    assert finite_audit["coverage"]["orders"] == 10
    assert finite_audit["coverage"]["canonical_cores"] == 2208
    assert finite_audit["coverage"]["rooted_rows"] == 71257

    # Infinite center class.  Every coefficient in every no-gap cell is strictly positive.
    partition = center["no_gap_short_long_partition"]
    assert partition["total_cells"] == 84
    assert len(center["cells"]) == 84
    assert center["rank_totals"]["2"]["negative_coefficients"] == 0
    assert center["rank_totals"]["2"]["zero_coefficients"] == 0
    assert center["rank_totals"]["3"]["negative_coefficients"] == 0
    assert center["rank_totals"]["3"]["zero_coefficients"] == 0
    assert center_audit["no_gap_reconstruction"]["cell_keys"] == 84

    # Infinite noncenter (arm-vertex) class.  The 3,133 explicit cells plus the
    # independently certified all-long cell form the stated no-gap cover.
    cover = arm["no_gap_cover"]
    assert cover["computed_shifted_cells"] == len(arm["cells"]) == 3133
    assert cover["inherited_all_long_cells"] == 1
    assert cover["total_cover_cells"] == 3134
    assert arm["rank_totals"]["2"]["negative_coefficients"] == 0
    assert arm["rank_totals"]["2"]["zero_coefficients"] == 0
    assert arm["rank_totals"]["3"]["negative_coefficients"] == 0
    assert arm["rank_totals"]["3"]["zero_coefficients"] == 0
    inherited = arm["inherited_all_long_certificate"]
    assert inherited["report_sha256"] == EXPECTED[inherited["report"]][0]
    assert inherited["status"] == all_long["status"]
    assert all_long["claim_status"] == "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_ARM_ALL_LONG_COMPRESSED_CELL"
    assert arm_audit["coverage"]["computed_cells"] == 3133
    assert arm_audit["coverage"]["inherited_cells"] == 1

    payload = {
        "schema": "rank8-delta23-e3-quartic-star-complete-v1",
        "status": "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_COMPLETE_N27_PLUS",
        "theorem": (
            "For every subdivision A of the four-arm star with |A|>=27 and every root vertex r, "
            "the exact rank-eight rooted Newton quantities Delta2(A,r) and Delta3(A,r) are strictly positive."
        ),
        "no_gap_partition": {
            "orders_27_through_36": "all canonical quartic-star subdivisions and all roots, literal exact enumeration",
            "orders_37_plus_center_root": "the unique degree-four center, covered by the 84-cell all-order center certificate",
            "orders_37_plus_arm_roots": "all other vertices, covered by 3,133 shifted cells plus one all-long inherited cell",
            "order_intervals_disjoint": True,
            "order_intervals_exhaust_n_at_least_27": True,
            "root_classes_disjoint": True,
            "root_classes_exhaust_every_vertex": True,
        },
        "finite_coverage": {
            "orders": [27, 36],
            "canonical_cores": finite["totals"]["canonical_cores"],
            "rooted_rows": finite["totals"]["rooted_rows"],
            "negative_or_zero_delta2_rows": 0,
            "negative_or_zero_delta3_rows": 0,
        },
        "infinite_coverage": {
            "center_cells": 84,
            "arm_computed_cells": 3133,
            "arm_inherited_all_long_cells": 1,
            "delta2_negative_or_zero_coefficients": 0,
            "delta3_negative_or_zero_coefficients": 0,
        },
        "independent_audits": {
            "finite": finite_audit["status"],
            "center": center_audit["status"],
            "arm": arm_audit["status"],
        },
        "scope_warning": (
            "This closes Delta2 and Delta3 only for the quartic-star e=3 skeleton family. "
            "Cubic e=3 mixed internal-root cells, e>=4, the e=2 boundary families, forest Q8/PGC, "
            "and the low/low mixed faces remain separate obligations."
        ),
        "immutable_inputs": {name: EXPECTED[name][0] for name in EXPECTED},
        "source_sha256": digest(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print("OUTPUT", digest(OUTPUT))


if __name__ == "__main__":
    main()
