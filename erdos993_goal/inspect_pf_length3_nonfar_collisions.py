"""Inspect exact PF length-three collision cells without far-left assertions."""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from audit_pf_length3_nullvector_invariant import negative_root_intervals, sign
from prove_quartic_minimal_compatibility_resultants import X, window_polynomial


HERE = Path(__file__).resolve().parent


def one_case(parity: str, reserve_index: int, u: Fraction, v: Fraction):
    if parity == "odd":
        p, alpha = 2 * reserve_index + 17, 2 * reserve_index
    else:
        p, alpha = 2 * reserve_index + 18, 2 * reserve_index + 1
    gamma = [sp.Integer(1), -(sp.Rational(u) + sp.Rational(v)), sp.Rational(u * v)]
    rows = [
        sp.Poly(
            X**j * window_polynomial(p - 2 * j, alpha + j, gamma).as_expr(),
            X,
            domain=sp.QQ,
        )
        for j in range(4)
    ]
    source = window_polynomial(p, alpha, [sp.Integer(1)])
    d0 = sp.Poly(rows[1].as_expr() ** 2 - rows[0].as_expr() * rows[2].as_expr(), X)
    d2 = sp.Poly(rows[2].as_expr() ** 2 - rows[1].as_expr() * rows[3].as_expr(), X)
    e = sp.Poly(rows[0].as_expr() * rows[3].as_expr() - rows[1].as_expr() * rows[2].as_expr(), X)
    h = sp.Poly(e.as_expr() ** 2 - 4 * d0.as_expr() * d2.as_expr(), X)
    derivative0 = sp.Poly(
        d2.as_expr() * rows[0].diff().as_expr()
        + e.as_expr() * rows[1].diff().as_expr()
        + d0.as_expr() * rows[2].diff().as_expr(),
        X,
    )
    derivative1 = sp.Poly(
        d2.as_expr() * rows[1].diff().as_expr()
        + e.as_expr() * rows[2].diff().as_expr()
        + d0.as_expr() * rows[3].diff().as_expr(),
        X,
    )

    critical = sp.Poly(d0.as_expr() * d2.as_expr() * e.as_expr() * h.as_expr(), X)
    valuation = min(power[0] for power, _ in critical.terms())
    residual = sp.Poly(sp.cancel(critical.as_expr() / X**valuation), X).sqf_part()
    boundaries = [
        (left, right)
        for left, right, multiplicity in negative_root_intervals(residual)
        if multiplicity == 1
    ]
    samples = []
    sample_intervals = []
    if boundaries:
        samples.append(boundaries[0][0] - max(1, abs(boundaries[0][0])))
        sample_intervals.append((None, boundaries[0][0]))
        for first, second in zip(boundaries, boundaries[1:]):
            samples.append((first[1] + second[0]) / 2)
            sample_intervals.append((first[1], second[0]))
        samples.append(boundaries[-1][1] / 2)
        sample_intervals.append((boundaries[-1][1], sp.Rational(0)))
    else:
        samples.append(sp.Rational(-1))
        sample_intervals.append((None, sp.Rational(0)))

    cells = []
    for point, interval in zip(samples, sample_intervals):
        values = [d0.eval(point), d2.eval(point), e.eval(point), h.eval(point)]
        same = abs(sum(sign(value) for value in values[:3])) == 3
        if not (same and values[3] >= 0):
            continue
        orientation = 1 if values[0] > 0 else -1
        weights = [
            orientation * values[1],
            orientation * values[2],
            orientation * values[0],
        ]
        q0 = sp.Poly(
            sum(weights[j] * rows[j].as_expr() for j in range(3)), X, domain=sp.QQ
        )
        q1 = sp.Poly(
            sum(weights[j] * rows[j + 1].as_expr() for j in range(3)), X, domain=sp.QQ
        )
        assert q0.eval(point) == q1.eval(point) == 0
        cells.append(
            {
                "sample": str(point),
                "sample_decimal": str(sp.N(point, 18)),
                "z_decimal": str(sp.N(-point, 18)),
                "cell_left": None if interval[0] is None else str(interval[0]),
                "cell_right": str(interval[1]),
                "z_at_least_outer_floor": bool(-point >= reserve_index + 5),
                "outer_floor": reserve_index + 5,
                "source_roots_below": int(
                    sp.polys.polytools.count_roots(source, -sp.oo, point)
                ),
                "q0_roots_below": int(
                    sp.polys.polytools.count_roots(q0, -sp.oo, point)
                ),
                "q1_roots_below": int(
                    sp.polys.polytools.count_roots(q1, -sp.oo, point)
                ),
                "derivative_product_sign": sign(
                    derivative0.eval(point) * derivative1.eval(point)
                ),
                "pf_discriminant_strict": bool(
                    weights[1] ** 2 > 4 * weights[0] * weights[2]
                ),
                "kernel_sum_decimal": str(
                    sp.N(weights[1] / weights[2], 18)
                ),
                "kernel_product_decimal": str(
                    sp.N(weights[0] / weights[2], 18)
                ),
                "kernel_roots_decimal": [
                    str(sp.N(root, 18))
                    for root in sp.solve(
                        sp.Symbol("k") ** 2
                        - (weights[1] / weights[2]) * sp.Symbol("k")
                        + weights[0] / weights[2],
                        sp.Symbol("k"),
                    )
                ],
            }
        )
    return {
        "parity": parity,
        "reserve_index": reserve_index,
        "p": p,
        "alpha": alpha,
        "u": str(u),
        "v": str(v),
        "pf_open_cells": cells,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), default="odd")
    parser.add_argument("--r", type=int, default=10)
    parser.add_argument("--u", default="1/10")
    parser.add_argument("--v", default="1")
    args = parser.parse_args()
    result = one_case(
        args.parity,
        args.r,
        Fraction(args.u),
        Fraction(args.v),
    )
    output = HERE / (
        f"pf_length3_nonfar_{args.parity}_r{args.r}_"
        f"u{args.u.replace('/', '_')}_v{args.v.replace('/', '_')}_20260807.json"
    )
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(output)
    print(json.dumps(result["pf_open_cells"], indent=2))


if __name__ == "__main__":
    main()
