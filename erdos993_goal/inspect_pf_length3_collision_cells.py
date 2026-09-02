"""Inspect the exact one-dimensional PF collision cells for one base row.

This is a diagnostic companion to ``audit_pf_length3_nullvector_invariant``.
It records which minor creates each endpoint, the exact sign vector on every
negative-root cell, the collision index, and the derivative orientation.
No finite diagnostic produced here is used as an all-order proof.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from prove_quartic_minimal_compatibility_resultants import X, window_polynomial


HERE = Path(__file__).resolve().parent


def sign(value: sp.Expr) -> int:
    return 1 if value > 0 else -1 if value < 0 else 0


def isolate_negative(poly: sp.Poly) -> list[tuple[sp.Rational, sp.Rational]]:
    return [
        (sp.Rational(left), sp.Rational(right))
        for (left, right), multiplicity in sp.intervals(
            poly.sqf_part(), eps=sp.Rational(1, 10) ** 24
        )
        if sp.Rational(right) < 0 and multiplicity == 1
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--p", type=int, default=23)
    parser.add_argument("--alpha", type=int, default=6)
    parser.add_argument("--u", type=Fraction, default=Fraction(1, 10))
    parser.add_argument("--v", type=Fraction, default=Fraction(1))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    u, v = sp.Rational(args.u), sp.Rational(args.v)
    gamma = [sp.Integer(1), -(u + v), u * v]
    rows = [
        sp.Poly(
            X**j
            * window_polynomial(
                args.p - 2 * j, args.alpha + j, gamma
            ).as_expr(),
            X,
            domain=sp.QQ,
        )
        for j in range(4)
    ]
    source = window_polynomial(args.p, args.alpha, [sp.Integer(1)])
    d0 = sp.Poly(rows[1].as_expr() ** 2 - rows[0].as_expr() * rows[2].as_expr(), X)
    d2 = sp.Poly(rows[2].as_expr() ** 2 - rows[1].as_expr() * rows[3].as_expr(), X)
    e = sp.Poly(rows[0].as_expr() * rows[3].as_expr() - rows[1].as_expr() * rows[2].as_expr(), X)
    h = sp.Poly(e.as_expr() ** 2 - 4 * d0.as_expr() * d2.as_expr(), X)
    a = sp.Poly(
        d2.as_expr() * rows[0].diff().as_expr()
        + e.as_expr() * rows[1].diff().as_expr()
        + d0.as_expr() * rows[2].diff().as_expr(),
        X,
    )
    b = sp.Poly(
        d2.as_expr() * rows[1].diff().as_expr()
        + e.as_expr() * rows[2].diff().as_expr()
        + d0.as_expr() * rows[3].diff().as_expr(),
        X,
    )

    named = {"D0": d0, "D2": d2, "E": e, "H": h}
    endpoints: list[dict[str, object]] = []
    for name, poly in named.items():
        valuation = min(power[0] for power, coefficient in poly.terms())
        residual = sp.Poly(sp.cancel(poly.as_expr() / X**valuation), X)
        for left, right in isolate_negative(residual):
            endpoints.append(
                {
                    "left": left,
                    "right": right,
                    "source": name,
                    "approx": float((left + right) / 2),
                }
            )
    endpoints.sort(key=lambda item: item["left"])
    for first, second in zip(endpoints, endpoints[1:]):
        assert first["right"] < second["left"]

    samples: list[sp.Rational] = []
    if endpoints:
        samples.append(endpoints[0]["left"] - max(1, abs(endpoints[0]["left"])))
        samples.extend(
            (first["right"] + second["left"]) / 2
            for first, second in zip(endpoints, endpoints[1:])
        )
        samples.append(endpoints[-1]["right"] / 2)
    else:
        samples.append(sp.Rational(-1))

    cells = []
    for index, point in enumerate(samples):
        values = {name: poly.eval(point) for name, poly in named.items()}
        one_signed = abs(sum(sign(values[name]) for name in ("D0", "D2", "E"))) == 3
        pf = bool(one_signed and values["H"] > 0)
        record: dict[str, object] = {
            "index": index,
            "sample": str(point),
            "sample_approx": float(point),
            "left_endpoint_source": None if index == 0 else endpoints[index - 1]["source"],
            "right_endpoint_source": None if index == len(endpoints) else endpoints[index]["source"],
            "signs_D0_D2_E_H_A_B": [
                sign(poly.eval(point)) for poly in (d0, d2, e, h, a, b)
            ],
            "pf_open_cell": pf,
        }
        if pf:
            orientation = sign(values["D0"])
            weights = [orientation * values["D2"], orientation * values["E"], orientation * values["D0"]]
            q0 = sp.Poly(sum(weights[j] * rows[j].as_expr() for j in range(3)), X)
            q1 = sp.Poly(sum(weights[j] * rows[j + 1].as_expr() for j in range(3)), X)
            source_value = source.eval(point)
            source_log_derivative = sp.cancel(source.diff().eval(point) / source_value)
            normalized_derivatives = [
                sp.cancel(
                    rows[j].diff().eval(point) / source_value
                    - source_log_derivative * rows[j].eval(point) / source_value
                )
                for j in range(4)
            ]
            normalized_values = [
                sp.cancel(rows[j].eval(point) / source_value)
                for j in range(4)
            ]
            record.update(
                {
                    "strict_roots_below_q0_q1": [
                        int(sp.count_roots(q0, -sp.oo, point)),
                        int(sp.count_roots(q1, -sp.oo, point)),
                    ],
                    "source_roots_below": int(sp.count_roots(source, -sp.oo, point)),
                    "AB_sign": sign(a.eval(point) * b.eval(point)),
                    "normalized_derivative_signs": [
                        sign(value) for value in normalized_derivatives
                    ],
                    "normalized_row_signs": [
                        sign(value) for value in normalized_values
                    ],
                }
            )
        cells.append(record)

    report = {
        "status": "EXACT_PF_LENGTH3_COLLISION_CELL_DIAGNOSTIC",
        "parameters": {
            "p": args.p,
            "alpha": args.alpha,
            "u": str(u),
            "v": str(v),
        },
        "endpoint_count": len(endpoints),
        "pf_open_cell_count": sum(bool(cell["pf_open_cell"]) for cell in cells),
        "endpoints": [
            {
                "source": item["source"],
                "interval": [str(item["left"]), str(item["right"])],
                "approx": item["approx"],
            }
            for item in endpoints
        ],
        "cells": cells,
    }
    output = args.output or HERE / (
        f"pf_length3_collision_cells_p{args.p}_a{args.alpha}_"
        f"u{args.u.numerator}_{args.u.denominator}_"
        f"v{args.v.numerator}_{args.v.denominator}.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
