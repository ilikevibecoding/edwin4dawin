#!/usr/bin/env python3
"""Probe root interlacing of the two adjacent original parameter polynomials.

Each affine monotonicity increment is the difference Right(y)-Left(y)
of two order-r coefficient polynomials.  This script reconstructs those
two positive-side polynomials before subtraction, certifies their root
locations, and measures their interlacing defect.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A, T, V, load_bottom, m, q, x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c, to_sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    aggregate,
    quotient,
    roots,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def component_sources(package: str, parity: int, coordinate: str, r: int):
    if package == "group":
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p = sp.expand(slope * A)
        base = sp.expand(T**3 * affine * V + p)
        common = T**3
    else:
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p = sp.expand(slope * A)
        base = sp.expand(q**2 * T**3 * affine * V + p)
        common = q**2 * T**3

    left_raw = sp.expand(base + r * p)
    if coordinate == "x":
        assert sp.expand(p.subs(x, x + 1) - p) == 0
        right_raw = sp.expand(A * (base.subs(x, x + 1) + r * p))
    elif coordinate == "c":
        assert package == "group"
        assert sp.expand(p.subs(c, c + 1) - p) == 0
        right_raw = sp.expand(A**2 * (base.subs(c, c + 1) + r * p))
    elif coordinate == "m":
        shifted_p = p.subs(m, m + 1) if package == "bottom" else p
        if package == "group":
            assert sp.expand(p.subs(m, m + 1) - p) == 0
        right_raw = sp.expand(
            A * T**2 * (base.subs(m, m + 1) + r * shifted_p)
        )
        left_raw = sp.expand(q * left_raw)
    else:
        raise AssertionError(coordinate)
    return quotient(left_raw, common), quotient(right_raw, common)


def real_roots(values: list[int]):
    real = []
    nonreal = 0
    for root, multiplicity in fmpz_poly(values).complex_roots():
        if root.imag.is_zero():
            real.extend([root.real] * multiplicity)
        else:
            nonreal += multiplicity
    return real, nonreal


def interlacing_summary(left_values: list[int], right_values: list[int]) -> dict:
    left_roots, left_nonreal = real_roots(left_values)
    right_roots, right_nonreal = real_roots(right_values)
    left_negative = [root for root in left_roots if root < 0]
    right_negative = [root for root in right_roots if root < 0]
    merged = [(root, "L") for root in left_negative]
    merged.extend((root, "R") for root in right_negative)
    merged.sort(key=lambda item: float(item[0].mid()))
    labels = "".join(label for _, label in merged)
    runs = []
    for label in labels:
        if not runs or runs[-1]["label"] != label:
            runs.append({"label": label, "length": 1})
        else:
            runs[-1]["length"] += 1
    return {
        "left_degree": fmpz_poly(left_values).degree(),
        "right_degree": fmpz_poly(right_values).degree(),
        "left_nonreal_root_count": left_nonreal,
        "right_nonreal_root_count": right_nonreal,
        "left_negative_root_count": len(left_negative),
        "right_negative_root_count": len(right_negative),
        "left_positive_root_count": sum(root > 0 for root in left_roots),
        "right_positive_root_count": sum(root > 0 for root in right_roots),
        "negative_root_label_word": labels,
        "same_label_adjacency_count": sum(
            labels[j] == labels[j - 1] for j in range(1, len(labels))
        ),
        "maximum_same_side_run_length": max(
            (run["length"] for run in runs), default=0
        ),
        "label_runs": runs,
    }


def audit_case(package, parity, coordinate, c_value, m_value, x_value, r):
    left_source, right_source = component_sources(package, parity, coordinate, r)
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    original_b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    target = m_value + r + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2
    reduced_b = original_b + 3
    left = aggregate(
        to_sparse(left_source), a, reduced_b, r, target,
        c_value, m_value, x_value,
    )
    right = aggregate(
        to_sparse(right_source), a, reduced_b, r, target,
        c_value, m_value, x_value,
    )
    difference = [right[j] - left[j] for j in range(r + 1)]
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "left_nonpositive_coefficient_count": sum(value <= 0 for value in left),
        "right_nonpositive_coefficient_count": sum(value <= 0 for value in right),
        "interlacing": interlacing_summary(left, right),
        "difference_root_summary": roots(difference),
    }


def main() -> None:
    ctx.prec = 100
    cases = [
        ("group", 0, "m", 1, 16, 40, 25),
        ("bottom", 1, "x", 0, 20, 40, 26),
        ("group", 0, "m", 1, 24, 96, 48),
        ("bottom", 1, "x", 0, 36, 144, 72),
        ("group", 0, "m", 1, 120, 240, 160),
        ("bottom", 1, "x", 0, 120, 240, 180),
    ]
    records = []
    for case in cases:
        record = audit_case(*case)
        records.append(record)
        print(
            record["package"], record["m"], record["x"], record["r"],
            record["interlacing"]["left_nonreal_root_count"],
            record["interlacing"]["right_nonreal_root_count"],
            record["interlacing"]["same_label_adjacency_count"],
            record["difference_root_summary"]["nonreal"],
            flush=True,
        )
    report = {
        "status": "ORIGINAL_ADJACENT_INTERLACING_PROBE",
        "case_count": len(records),
        "records": records,
        "warning": "Finite exact coefficient arrays and certified Arb root balls.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "original_adjacent_interlacing_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
