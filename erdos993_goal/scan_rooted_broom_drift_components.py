#!/usr/bin/env python3
"""Exact scan of drift components on rooted brooms.

The root q has s pendant-leaf neighbors and one path branch containing
L vertices.  Thus

    C=I(F-q)=(1+x)^s I(P_L),
    B=I(F)=C+x I(P_(L-1)).

The evolved near-extremizer for component (B) at order 60 has precisely
this shape (up to a small mutation near the long branch), so this family
is a useful asymptotic stress test.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

from flint import fmpz_poly


X = fmpz_poly([0, 1])
ONE = fmpz_poly([1])


def path_polynomials(max_order: int):
    paths = [ONE, ONE + X]
    for order in range(2, max_order + 1):
        paths.append(paths[-1] + X * paths[-2])
    return paths


def coeff(poly, rank: int) -> int:
    return int(poly[rank]) if 0 <= rank <= poly.degree() else 0


def encode(value, item):
    return (
        None
        if value is None
        else {"exact": str(value), "float": float(value), **item}
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-leaves", type=int, default=300)
    parser.add_argument("--max-path", type=int, default=300)
    parser.add_argument("--min-rank", type=int, default=6)
    parser.add_argument("--all-ranks", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    paths = path_polynomials(args.max_path)
    names = ("A", "B", "weighted_drift")
    minima = {name: None for name in names}
    items = {name: None for name in names}
    failures = {name: 0 for name in names}
    checks = 0

    isolate_factor = ONE
    for leaves in range(args.max_leaves + 1):
        if leaves:
            isolate_factor *= ONE + X
        for path_order in range(1, args.max_path + 1):
            c_poly = isolate_factor * paths[path_order]
            link_poly = paths[path_order - 1]
            b_poly = c_poly + X * link_poly
            alpha = b_poly.degree()
            order = 1 + leaves + path_order
            for r in range(args.min_rank, alpha + 1):
                bm = coeff(b_poly, r - 1)
                b = coeff(b_poly, r)
                bp = coeff(b_poly, r + 1)
                cm = coeff(c_poly, r - 1)
                c = coeff(c_poly, r)
                if min(bm, b, cm) <= 0:
                    continue
                u = Fraction(r * b, bm)
                if u < r:
                    continue
                if (
                    not args.all_ranks
                    and (alpha - r) * (order - r)
                    <= (r + 1) * (r + 2)
                ):
                    continue
                q_f = (
                    1
                    + u
                    - Fraction((r + 1) * bp, b)
                )
                a_margin = q_f - Fraction(c, b)
                b_margin = 1 + u - Fraction(r * c, cm)
                # Add a new leaf at q to form the terminal pair:
                # A_terminal=B+xC.
                ar = b + cm
                ar_next = bp + c
                v = Fraction((r + 1) * ar_next, ar)
                drift = u + 1 - v
                values = {
                    "A": a_margin,
                    "B": b_margin,
                    "weighted_drift": drift,
                }
                checks += 1
                item = {
                    "leaves_at_root": leaves,
                    "path_order": path_order,
                    "order_F": order,
                    "alpha_F": alpha,
                    "root_degree": leaves + 1,
                    "rank_r": r,
                    "u": str(u),
                    "q_F": str(q_f),
                    "avoid_probability": str(Fraction(c, b)),
                }
                for name, value in values.items():
                    if value < 0:
                        failures[name] += 1
                    if minima[name] is None or value < minima[name]:
                        minima[name] = value
                        items[name] = item
        if leaves % 25 == 0:
            print(
                f"leaves={leaves}, checks={checks:,}, "
                f"failures={failures}",
                flush=True,
            )

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "failures": failures,
        "minima": {
            name: encode(minima[name], items[name])
            for name in names
        },
    }
    args.out.write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
