#!/usr/bin/env python3
"""Derive exact symbolic aligned cores for the two hard affine families."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A,
    T,
    V,
    q,
    m,
    w,
    x,
    z,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
)


def core(package: str, parity: int, coordinate: str, direction: str) -> sp.Expr:
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    source = sp.expand(d_expression + m * reserve_expression)
    if direction == "x":
        result = A * source.subs(x, x + 1) - source
    elif direction == "c":
        result = A**2 * source.subs(c, c + 1) - source
    elif direction == "m":
        result = A * T**2 * V**2 * source.subs(m, m + 1) - q**3 * source
    else:
        raise ValueError(direction)
    return sp.expand(result)


def record(package: str, parity: int, coordinate: str, direction: str) -> dict:
    expression = core(package, parity, coordinate, direction)
    reduced = sp.cancel(expression / T**3)
    if not reduced.is_polynomial():
        raise AssertionError("aligned core is not divisible by T^3")
    symmetric, remainder, mapping = sp.symmetrize(
        sp.expand(reduced), [z, w], formal=True
    )
    if remainder != 0:
        raise AssertionError("reduced aligned core is not symmetric in z,w")
    s, p = mapping[0][0], mapping[1][0]
    polynomial = sp.Poly(symmetric, s, p, c, m, x)
    factored = sp.factor(symmetric)
    result = {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "ambient_direction": direction,
        "term_count": len(polynomial.terms()),
        "symmetric_term_count_after_T3": len(polynomial.terms()),
        "symmetric_total_degree_after_T3": polynomial.total_degree(),
        "symmetric_variable_map": [[str(left), str(right)] for left, right in mapping],
        "factored_symmetric_expression_after_T3": str(factored),
    }
    print(
        package,
        direction,
        result["term_count"],
        result["symmetric_term_count_after_T3"],
        flush=True,
    )
    return result


def main() -> None:
    records = []
    for package, parity, coordinate in (
        ("group", 0, "m"),
        ("bottom", 1, "x"),
    ):
        for direction in ("x", "m"):
            records.append(record(package, parity, coordinate, direction))
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "symbolic_aligned_cores_20260802.json"
    ).write_text(json.dumps({"records": records}, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
