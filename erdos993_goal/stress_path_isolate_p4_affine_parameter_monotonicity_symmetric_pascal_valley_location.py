#!/usr/bin/env python3
"""Map the exact valley location of the symmetric-Pascal utilization.

This is a focused diagnostic for the two hardest affine families.  It
varies order and the x/m ratio to test whether the unique sign change in
the adjacent quotient determinant lies in a simple affine strip.
"""

from __future__ import annotations

from fractions import Fraction
import json
import math
from pathlib import Path

from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    nonzero_sign_word,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    aggregate,
    blocks,
    roots,
)
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    parity_phase_numerator_summary,
    parity_root_geometry,
    reduced_sources,
)


def audit_case(package, parity, coordinate, c_value, m_value, x_value, r):
    ell_source, reserve_source = reduced_sources(package, parity, coordinate)
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group"
        else m_value + x_value - 3
    )
    original_b = (
        2 * m_value + parity - 4
        if package == "group"
        else 2 * m_value + parity - 5
    )
    reduced_b = original_b + 3
    target = m_value + r + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2
    ell = aggregate(
        ell_source, a, reduced_b, r + 1, target,
        c_value, m_value, x_value,
    )
    reserve = aggregate(
        reserve_source, a, reduced_b, r, target,
        c_value, m_value, x_value,
    )
    numerator = [
        Fraction(-ell[j], math.comb(r + 1, j))
        + Fraction(-ell[j + 1], math.comb(r + 1, j + 1))
        for j in range(r + 1)
    ]
    reserve_unweighted = [
        Fraction(reserve[j], math.comb(r, j)) for j in range(r + 1)
    ]
    utilization = [
        numerator[j] / reserve_unweighted[j] - 1 for j in range(r + 1)
    ]
    determinants = [
        numerator[j + 1] * reserve_unweighted[j]
        - numerator[j] * reserve_unweighted[j + 1]
        for j in range(r)
    ]
    original = [
        math.comb(r, j)
        * ((r + 1) * reserve_unweighted[j] - numerator[j])
        for j in range(r + 1)
    ]
    original_word = nonzero_sign_word(original)
    parity_slope_words = {
        str(parity_class): nonzero_sign_word([
            utilization[j + 2] - utilization[j]
            for j in range(parity_class, r - 1, 2)
        ])
        for parity_class in (0, 1)
    }
    parity_coefficient_words = {
        str(parity_class): nonzero_sign_word(original[parity_class::2])
        for parity_class in (0, 1)
    }
    assert all(value.denominator == 1 for value in original)
    original_integers = [int(value) for value in original]
    slope_signs = [
        1 if value > 0 else (-1 if value < 0 else 0)
        for value in determinants
    ]
    turning_indices = [
        j
        for j in range(1, len(slope_signs))
        if slope_signs[j] and slope_signs[j - 1]
        and slope_signs[j] != slope_signs[j - 1]
    ]
    determinant_blocks = blocks(determinants)
    positive_start = next(
        (j for j, value in enumerate(determinants) if value > 0), None
    )
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "x_over_m": f"{x_value}/{m_value}",
        "positive_start": positive_start,
        "positive_start_over_m": (
            float(Fraction(positive_start, m_value))
            if positive_start is not None else None
        ),
        "determinant_nonzero_sign_word": nonzero_sign_word(determinants),
        "determinant_sign_blocks": determinant_blocks,
        "base_transform_negative_count": sum(
            reserve_unweighted[j] - numerator[j] < 0 for j in range(r + 1)
        ),
        "utilization_minus_level_minimum": float(min(
            value - r for value in utilization
        )),
        "utilization_minus_level_maximum": float(max(
            value - r for value in utilization
        )),
        "turning_points": [
            {
                "index": j,
                "utilization_minus_level": float(utilization[j] - r),
            }
            for j in turning_indices
        ],
        "original_nonzero_sign_word": original_word,
        "parity_utilization_slope_nonzero_sign_words": parity_slope_words,
        "parity_original_coefficient_nonzero_sign_words": (
            parity_coefficient_words
        ),
        "parity_root_geometry": parity_root_geometry(original_integers),
        "parity_phase_numerator": parity_phase_numerator_summary(
            original_integers
        ),
        "each_parity_coefficient_sequence_has_at_most_two_sign_changes": all(
            len(word) <= 3 for word in parity_coefficient_words.values()
        ),
        "original_root_summary": roots(original_integers),
        "original_positive_coefficients_contiguous": original_word in (
            [], [1], [-1], [-1, 1], [1, -1], [-1, 1, -1]
        ),
        "original_at_two_thirds_positive": sum(
            value * 2**j * 3 ** (r - j)
            for j, value in enumerate(original)
        ) > 0,
        "original_at_three_halves_positive": sum(
            value * 3**j * 2 ** (r - j)
            for j, value in enumerate(original)
        ) > 0,
    }


def cases():
    for package, parity, coordinate in (
        ("group", 0, "m"),
        ("bottom", 1, "x"),
    ):
        c_value = 1 if package == "group" else 0
        for m_value in (12, 24, 36):
            for ratio in (2, 4, 8):
                x_value = ratio * m_value
                for r_numerator, r_denominator in ((1, 1), (4, 3), (3, 2), (2, 1)):
                    r = r_numerator * m_value // r_denominator
                    yield (
                        package, parity, coordinate, c_value,
                        m_value, x_value, r,
                    )


def main() -> None:
    records = []
    for case in cases():
        record = audit_case(*case)
        records.append(record)
        print(
            record["package"], record["m"], record["x"], record["r"],
            record["positive_start"], record["determinant_nonzero_sign_word"],
            flush=True,
        )
    report = {
        "status": (
            "PASS_ONE_VALLEY_ALL_LOCATION_GRID_CASES"
            if all(
                record["determinant_nonzero_sign_word"] in ([-1, 1], [-1], [1], [])
                for record in records
            )
            else "VALLEY_LOCATION_GRID_HAS_FAILURE"
        ),
        "case_count": len(records),
        "records": records,
        "warning": "Finite exact grid; intended to identify a uniform transition bound.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "symmetric_pascal_valley_location_stress_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
