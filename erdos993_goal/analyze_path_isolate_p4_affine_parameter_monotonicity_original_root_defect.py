#!/usr/bin/env python3
"""Audit root location of the original symmetric-Pascal coefficient polynomial.

The original order-r coefficient sequence is

  C_j = binom(r,j) (D_j+r R_j)
      = binom(r,j) ((r+1)R_j-N_j-N_(j+1)).

This script reconstructs C from every saved complete L/R sequence and
counts negative roots, positive roots, and nonreal roots.  In the first
new stress cases the polynomial is either real-rooted or has exactly one
conjugate pair in the open left half-plane.  Such a pair corresponds to
a positive-coefficient quadratic factor.
"""

from __future__ import annotations

from fractions import Fraction
import json
import math
from pathlib import Path

from flint import ctx, fmpz_poly

from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    DEFAULT_PATHS,
    nonzero_sign_word,
)


def root_summary(values: list[int]) -> dict:
    polynomial = fmpz_poly(values)
    counts = {
        "negative_real": 0,
        "positive_real": 0,
        "positive_below_one": 0,
        "positive_above_one": 0,
        "nonreal_negative_real_part": 0,
        "nonreal_positive_real_part": 0,
        "nonreal_unresolved_real_part": 0,
    }
    for root, multiplicity in polynomial.complex_roots():
        if root.imag.is_zero():
            if root.real < 0:
                counts["negative_real"] += multiplicity
            elif root.real > 0:
                counts["positive_real"] += multiplicity
                if root.real < 1:
                    counts["positive_below_one"] += multiplicity
                elif root.real > 1:
                    counts["positive_above_one"] += multiplicity
        elif root.real < 0:
            counts["nonreal_negative_real_part"] += multiplicity
        elif root.real > 0:
            counts["nonreal_positive_real_part"] += multiplicity
        else:
            counts["nonreal_unresolved_real_part"] += multiplicity
    counts["degree"] = polynomial.degree()
    counts["nonreal"] = (
        counts["nonreal_negative_real_part"]
        + counts["nonreal_positive_real_part"]
        + counts["nonreal_unresolved_real_part"]
    )
    counts["root_count"] = (
        counts["negative_real"] + counts["positive_real"] + counts["nonreal"]
    )
    return counts


def generalized_interlacing(left_values: list[int], reserve_values: list[int]) -> dict:
    columns = []
    nonreal = {"C": 0, "R": 0}
    for label, values in (("C", left_values), ("R", reserve_values)):
        for root, multiplicity in fmpz_poly(values).complex_roots():
            if root.imag.is_zero() and root.real < 0:
                columns.extend((root.real, label) for _ in range(multiplicity))
            elif not root.imag.is_zero():
                nonreal[label] += multiplicity
    columns.sort(key=lambda item: float(item[0].mid()))
    labels = "".join(label for _, label in columns)
    runs = []
    for label in labels:
        if not runs or runs[-1]["label"] != label:
            runs.append({"label": label, "length": 1})
        else:
            runs[-1]["length"] += 1
    return {
        "coefficient_nonreal_root_count": nonreal["C"],
        "reserve_nonreal_root_count": nonreal["R"],
        "same_label_adjacency_count": sum(
            labels[j] == labels[j - 1] for j in range(1, len(labels))
        ),
        "maximum_same_polynomial_run_length": max(
            (run["length"] for run in runs), default=0
        ),
        "label_runs": runs,
    }


def reconstruct(record: dict, source: str) -> dict:
    ell = record["ell_values"]
    reserve = record["reserve_values"]
    r = int(record["r"])
    numerator = [
        Fraction(-ell[j], math.comb(r + 1, j))
        + Fraction(-ell[j + 1], math.comb(r + 1, j + 1))
        for j in range(r + 1)
    ]
    reserve_unweighted = [
        Fraction(reserve[j], math.comb(r, j)) for j in range(r + 1)
    ]
    coefficients = [
        math.comb(r, j)
        * ((r + 1) * reserve_unweighted[j] - numerator[j])
        for j in range(r + 1)
    ]
    assert all(value.denominator == 1 for value in coefficients)
    integers = [int(value) for value in coefficients]
    roots = root_summary(integers)
    reserve_integers = [int(value) for value in reserve]
    interlacing = generalized_interlacing(integers, reserve_integers)
    return {
        "source": source,
        "package": record.get("package"),
        "parity": record.get("parity"),
        "coordinate": record.get("coordinate"),
        "c": record.get("c"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": r,
        "coefficient_nonzero_sign_word": nonzero_sign_word(coefficients),
        "root_summary": roots,
        "reserve_root_summary": root_summary(reserve_integers),
        "coefficient_reserve_generalized_interlacing": interlacing,
        "root_defect_at_most_two": roots["nonreal"] <= 2,
        "all_nonreal_roots_in_open_left_half_plane": (
            roots["nonreal"] == roots["nonreal_negative_real_part"]
        ),
        "at_most_two_positive_roots": roots["positive_real"] <= 2,
    }


def main() -> None:
    ctx.prec = 100
    records = []
    for path_string in DEFAULT_PATHS:
        path = Path(path_string)
        data = json.loads(path.read_text(encoding="utf-8"))
        candidates = [data["record"]] if "record" in data else data.get("records", [])
        records.extend(
            reconstruct(record, path.name)
            for record in candidates
            if "ell_values" in record and "reserve_values" in record
        )
    passed = all(
        record["root_defect_at_most_two"]
        and record["all_nonreal_roots_in_open_left_half_plane"]
        and record["at_most_two_positive_roots"]
        for record in records
    )
    report = {
        "status": (
            "PASS_ORIGINAL_ROOT_DEFECT_AT_MOST_TWO_ALL_SAVED_CASES"
            if passed else "ORIGINAL_ROOT_DEFECT_HYPOTHESIS_HAS_FAILURE"
        ),
        "case_count": len(records),
        "records": records,
        "warning": "Finite exact Arb root isolation for saved complete sequences.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "original_root_defect_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
