#!/usr/bin/env python3
"""Search for a low-degree rational formula for specialized suffix/term ratios."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp
from sympy.polys.polyfuncs import rational_interpolate

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_bottom_pair_lift_summand_suffix import paired_term
from stress_path_isolate_p4_intersection_lift import make_kernel
from stress_path_isolate_polarization_grouping import numeric_path_row_series


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--parity", type=int, choices=(0, 1), default=0)
    parser.add_argument("--m", type=int, default=50)
    parser.add_argument("--s", type=int, default=60)
    parser.add_argument("--x", type=int, default=45)
    parser.add_argument("--degree-max", type=int, default=40)
    args = parser.parse_args()
    j = 2 * args.m + args.parity
    q = args.m + args.s + 2
    length = 2 * q - 4 + args.x
    maximum = j + 3
    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    try:
        old_states = direct.terminal_series(
            q, length, maximum, return_states=True
        )
        old_lower = direct.terminal_series(
            q - 1, length, maximum, return_states=True
        )
        new_states = direct.terminal_series(
            q + 1, length + 2, maximum, return_states=True
        )
        old_kernel = make_kernel(old_states, old_lower)
        new_kernel = make_kernel(new_states, old_states)
        interior = [
            paired_term(new_kernel, j + 2, u + 1)
            - paired_term(old_kernel, j, u)
            for u in range(j + 1)
        ]
        suffix = paired_term(new_kernel, j + 2, j + 2)
        data_reversed = []
        for u_value in reversed(range(j + 1)):
            suffix += interior[u_value]
            if interior[u_value] != 0:
                data_reversed.append(
                    (u_value, sp.Rational(suffix, interior[u_value]))
                )
        data = list(reversed(data_reversed))
    finally:
        direct.path_row_series = original

    variable = sp.symbols("u")
    found = None
    for total_degree in range(args.degree_max + 1):
        for numerator_degree in range(total_degree + 1):
            denominator_degree = total_degree - numerator_degree
            needed = total_degree + 1
            if len(data) < needed + 5:
                continue
            candidate = sp.cancel(
                rational_interpolate(
                    data[:needed], numerator_degree, X=variable
                )
            )
            actual_num_degree = sp.degree(sp.numer(candidate), variable)
            actual_den_degree = sp.degree(sp.denom(candidate), variable)
            if actual_num_degree > numerator_degree:
                continue
            if actual_den_degree > denominator_degree:
                continue
            if all(
                sp.cancel(candidate.subs(variable, point) - value) == 0
                for point, value in data[needed:]
            ):
                found = {
                    "numerator_degree": int(actual_num_degree),
                    "denominator_degree": int(actual_den_degree),
                    "formula": str(sp.factor(candidate)),
                }
                break
        if found is not None:
            break

    report = {
        "parameters": vars(args),
        "j": j,
        "q": q,
        "nonzero_ratio_points": len(data),
        "found": found,
    }
    Path(
        "path_isolate_p4_bottom_pair_tail_rational_probe_"
        f"p{args.parity}_m{args.m}_s{args.s}_x{args.x}_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
