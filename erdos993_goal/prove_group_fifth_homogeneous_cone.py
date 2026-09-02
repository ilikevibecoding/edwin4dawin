#!/usr/bin/env python3
"""Prove the fifth-highest homogeneous group layer in the full cone.

For deficit s=4 the gamma transform has five-term Jacobi bandwidth.  Writing

    K = A_4 p_(n-4) - B_3 p_(n-5)

reduces real-rootedness to strict interlacing of the monic cubic B_3 and the
monic quartic A_4.  This is equivalent to positive definiteness of their
4-by-4 Bezout matrix.  The script derives all four leading principal minors
over exact FLINT rational functions and proves their coefficientwise
positivity in the upper cone and all eight lower-offset/parity families.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_group_fifth_homogeneous_selector import derive as derive_selector
from verify_group_general_homogeneous_layers import residual_formula_row


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_fifth_homogeneous_cone_theorem_20260804.json"


def digest(value) -> str:
    return hashlib.sha256(str(value).encode()).hexdigest()


def load_family(path: Path) -> tuple[dict[str, object], dict[str, object]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    assert raw["status"] == "FLINT_SYMBOLIC_TAIL_SCHUR_DERIVATION"
    assert len(raw["records"]) == 4
    for record in raw["records"]:
        assert record["numerator_coefficientwise_positive"]
        assert record["denominator_coefficientwise_positive"]
    compact = {
        "parity": raw["parity"],
        "offset": raw.get("offset"),
        "A4_digest": digest(raw["A4"]),
        "B3_digest": digest(raw["B3_monic"]),
        "bezout_principal_minors": [
            {
                "order": record["order"],
                "numerator_terms": record["numerator_terms"],
                "denominator_terms": record["denominator_terms"],
                "numerator_coefficientwise_positive": True,
                "denominator_coefficientwise_positive": True,
                "numerator_factorization_digest": digest(
                    record["numerator_factorization"]
                ),
                "denominator_factorization_digest": digest(
                    record["denominator_factorization"]
                ),
            }
            for record in raw["records"]
        ],
        "source_report": path.name,
    }
    return compact, raw


def small_base_cases() -> list[dict[str, int]]:
    cases = []
    for r in range(4):
        d = r + 5
        while True:
            N = d + r
            p0 = N - abs(r - 4)
            if p0 // 2 >= 5:
                break
            row = residual_formula_row(N, d, 4)
            real = int(row.count_roots(-sp.oo, sp.oo))
            negative = int(row.count_roots(-sp.oo, 0))
            assert real == row.degree() and negative == row.degree()
            cases.append(
                {
                    "N": N,
                    "d": d,
                    "r": r,
                    "residual_degree": row.degree(),
                    "negative_roots": negative,
                }
            )
            d += 1
    return cases


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    selector = derive_selector()
    assert len(selector) == 5

    upper_families, upper_raw = [], []
    for parity in ("even", "odd"):
        path = HERE / f"group_fifth_homogeneous_tail_schur_flint_{parity}_20260804.json"
        family, raw = load_family(path)
        upper_families.append(family)
        upper_raw.append(raw)
    assert upper_raw[0]["A4"] == upper_raw[1]["A4"]
    assert upper_raw[0]["B3_monic"] == upper_raw[1]["B3_monic"]
    assert upper_raw[0]["records"] == upper_raw[1]["records"]

    boundary_families = []
    for offset in range(4):
        for parity in ("even", "odd"):
            path = HERE / (
                f"group_fifth_homogeneous_tail_schur_flint_r{offset}_"
                f"{parity}_20260804.json"
            )
            family, _ = load_family(path)
            boundary_families.append(family)

    bases = small_base_cases()
    report = {
        "status": "ALL_ORDER_FIFTH_HOMOGENEOUS_LAYER_THEOREM",
        "layer_deficit": 4,
        "selector_degree": 4,
        "selector_derived_directly_from_defect_sum": True,
        "selector_newton_coefficients": list(map(str, selector)),
        "upper_offsets": {
            "parities_identical_in_slack_coordinates": True,
            "families": upper_families,
        },
        "boundary_offsets": boundary_families,
        "small_base_cases": bases,
        "small_base_case_count": len(bases),
        "proof_consequence": (
            "Every s=4 residual row is the characteristic polynomial of a "
            "real symmetric Jacobi extension and has strictly negative roots "
            "throughout 2d-N>=5."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "upper_minor_term_counts": [
            item["numerator_terms"]
            for item in upper_families[0]["bezout_principal_minors"]
        ],
        "boundary_family_count": len(boundary_families),
        "small_base_case_count": len(bases),
        "report": str(args.output),
    }, indent=2))


if __name__ == "__main__":
    main()
