#!/usr/bin/env python3
"""Replay the all-order theorem for homogeneous layer deficit s=9."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from analyze_group_arbitrary_layer_schur_pattern import derive_selector


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_tenth_homogeneous_cone_theorem_20260804.json"


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def digest(value: object) -> str:
    return hashlib.sha256(str(value).encode()).hexdigest()


def main() -> None:
    upper = load("group_tenth_homogeneous_schur_pattern_probe_20260804.json")
    assert upper["status"] == "ARBITRARY_LAYER_SCHUR_PATTERN_AUDIT"
    assert len(upper["records"]) == 1
    upper_record = upper["records"][0]
    assert upper_record["layer_deficit"] == 9
    assert upper_record["tail_order"] == 6
    assert len(upper_record["simple_couplings"]) == 2
    assert all(item["identity"] for item in upper_record["simple_couplings"])
    assert len(upper_record["nonsimple_couplings"]) == 3
    for coupling in upper_record["nonsimple_couplings"]:
        assert coupling["numerator_coefficientwise_positive"]
        assert coupling["denominator_coefficientwise_positive"]

    parity = load("group_tenth_homogeneous_upper_parity_20260804.json")
    assert parity["status"] == "EXACT_S9_UPPER_PARITY_IDENTITY"
    assert all(parity["A6_coefficient_identities"])
    assert all(parity["B5_coefficient_identities"])

    boundaries = load("group_tenth_homogeneous_boundary_jacobi_20260804.json")
    assert boundaries["status"] == "EXACT_S9_BOUNDARY_POSITIVE_JACOBI_AUDIT"
    assert len(boundaries["cases"]) == 18
    for case in boundaries["cases"]:
        assert len(case["couplings"]) == 5
        for coupling in case["couplings"]:
            assert coupling["numerator_coefficientwise_positive"]
            assert coupling["denominator_coefficientwise_positive"]

    verification = load("group_tenth_homogeneous_tail_verification_20260804.json")
    assert verification["status"] == "PASS_EXACT_S9_TAIL_THEOREM_CROSSCHECK"
    assert verification["comparison_count"] == 71
    assert verification["small_base_case_count"] == 58

    p, alpha, selector = derive_selector(9)
    assert len(selector) == 7
    report = {
        "status": "ALL_ORDER_TENTH_HOMOGENEOUS_LAYER_THEOREM",
        "layer_deficit": 9,
        "selector_degree": 6,
        "selector_derived_directly_from_defect_sum": True,
        "selector_variables": [str(p), str(alpha)],
        "selector_coefficient_digests": [digest(value) for value in selector],
        "upper_positive_jacobi_couplings": upper_record,
        "upper_parities_identical": True,
        "boundary_family_count": len(boundaries["cases"]),
        "boundary_positive_jacobi_families": boundaries["cases"],
        "exact_symbolic_to_row_comparison_count": verification[
            "comparison_count"
        ],
        "small_base_cases": verification["small_base_cases"],
        "small_base_case_count": verification["small_base_case_count"],
        "proof_consequence": (
            "Every s=9 residual row is the characteristic polynomial of a "
            "real symmetric Jacobi extension and has strictly negative roots "
            "throughout 2d-N>=5."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "upper_nonsimple_term_counts": [
                    (item["numerator_terms"], item["denominator_terms"])
                    for item in upper_record["nonsimple_couplings"]
                ],
                "boundary_family_count": report["boundary_family_count"],
                "comparison_count": report[
                    "exact_symbolic_to_row_comparison_count"
                ],
                "small_base_case_count": report["small_base_case_count"],
                "report": str(REPORT),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
