#!/usr/bin/env python3
"""Audit the symmetric-Pascal utilization hidden by V-reaggregation.

Let

  S_j^(r)=w^j(1+z)^(r-j)+z^j(1+w)^(r-j).

For the reduced identity D=VL+W, symmetry and

  S_j^(r+1)+S_(j+1)^(r+1)=V S_j^(r)

give, before binomial weights,

  N_j+N_(j+1)=R_j-D_j,

where N is the transform of -L at order r+1 and R,D use order r.
Consequently h_j=-D_j/R_j can be reconstructed exactly from the saved
L and reserve arrays.  This script tests whether h has the cleaner
strict-convex/single-valley geometry suggested by the first examples.
"""

from __future__ import annotations

from fractions import Fraction
import json
import math
from pathlib import Path

from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    DEFAULT_PATHS,
    differences,
    nonzero_sign_word,
    sign_blocks,
)


def audit(record: dict, source: str) -> dict:
    ell = record["ell_values"]
    reserve = record["reserve_values"]
    r = int(record["r"])
    n = r + 1
    assert len(ell) == n + 1 and len(reserve) == n

    numerator_unweighted = [
        Fraction(-ell[j], math.comb(n, j)) for j in range(n + 1)
    ]
    reserve_unweighted = [
        Fraction(reserve[j], math.comb(r, j)) for j in range(n)
    ]
    base_unweighted = [
        reserve_unweighted[j]
        - numerator_unweighted[j]
        - numerator_unweighted[j + 1]
        for j in range(n)
    ]
    h = [
        -base_unweighted[j] / reserve_unweighted[j]
        for j in range(n)
    ]
    h_first = differences(h)
    h_second = differences(h_first)
    normalized_reserve_ratios = [
        reserve_unweighted[j + 1] / reserve_unweighted[j]
        for j in range(r)
    ]
    ratio_first = differences(normalized_reserve_ratios)
    original_weighted = [
        math.comb(r, j)
        * (base_unweighted[j] + r * reserve_unweighted[j])
        for j in range(n)
    ]
    return {
        "source": source,
        "package": record.get("package"),
        "parity": record.get("parity"),
        "coordinate": record.get("coordinate"),
        "c": record.get("c"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": r,
        "base_transform_negative_count": sum(
            value < 0 for value in base_unweighted
        ),
        "h_first_difference_nonzero_sign_word": nonzero_sign_word(h_first),
        "h_second_difference_nonzero_sign_word": nonzero_sign_word(h_second),
        "h_strictly_discrete_convex": all(value > 0 for value in h_second),
        "normalized_reserve_ratio_strictly_decreasing": all(
            value < 0 for value in ratio_first
        ),
        "original_aggregation_sign_blocks": sign_blocks(original_weighted),
        "original_aggregation_positive_coefficients_contiguous": (
            nonzero_sign_word(original_weighted)
            in ([1], [-1, 1], [1, -1], [-1, 1, -1])
        ),
        "original_total_positive": sum(original_weighted) > 0,
        "original_at_two_thirds_positive": sum(
            value * 2**j * 3 ** (r - j)
            for j, value in enumerate(original_weighted)
        ) > 0,
        "original_at_three_halves_positive": sum(
            value * 3**j * 2 ** (r - j)
            for j, value in enumerate(original_weighted)
        ) > 0,
    }


def main() -> None:
    records = []
    for path_string in DEFAULT_PATHS:
        path = Path(path_string)
        data = json.loads(path.read_text(encoding="utf-8"))
        candidates = [data["record"]] if "record" in data else data.get("records", [])
        records.extend(
            audit(record, path.name)
            for record in candidates
            if "ell_values" in record and "reserve_values" in record
        )
    passed = all(
        record["base_transform_negative_count"] == record["r"] + 1
        and record["h_strictly_discrete_convex"]
        and record["normalized_reserve_ratio_strictly_decreasing"]
        and record["original_aggregation_positive_coefficients_contiguous"]
        and record["original_total_positive"]
        for record in records
    )
    report = {
        "status": (
            "PASS_SYMMETRIC_PASCAL_UTILIZATION_ALL_SAVED_CASES"
            if passed
            else "SYMMETRIC_PASCAL_UTILIZATION_HAS_SAVED_FAILURE"
        ),
        "identity": (
            "For S_j^(r)=w^j(1+z)^(r-j)+z^j(1+w)^(r-j), "
            "S_j^(r+1)+S_(j+1)^(r+1)=V S_j^(r). Hence D=VL+W "
            "implies N_j+N_(j+1)=R_j-D_j before binomial weights."
        ),
        "case_count": len(records),
        "records": records,
        "warning": "Finite exact audit of complete saved sequences only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "symmetric_pascal_utilization_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
