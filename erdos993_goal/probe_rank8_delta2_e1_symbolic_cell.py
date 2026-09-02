#!/usr/bin/env python3
"""Low-memory coefficient probe for one symbolic subdivided-claw cell."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def path_count(order: sp.Expr, rank: int) -> sp.Expr:
    if isinstance(order, (int, sp.Integer)):
        order_int = int(order)
        if order_int == -1:
            return sp.Integer(1 if rank == 0 else 0)
        if order_int < -1:
            raise ValueError(order_int)
        top = order_int - rank + 1
        return sp.Integer(sp.binomial(top, rank) if top >= rank >= 0 else 0)
    if order == -1:
        return sp.Integer(1 if rank == 0 else 0)
    return choose_poly(order - rank + 1, rank)


def convolution(factors: list[list[sp.Expr]], rank: int) -> sp.Expr:
    values = [sp.Integer(1)] + [sp.Integer(0)] * rank
    for factor in factors:
        values = [
            sum(values[j] * factor[k - j] for j in range(k + 1))
            for k in range(rank + 1)
        ]
    return sp.expand(values[rank])


def path_vector(order: sp.Expr, rank: int) -> list[sp.Expr]:
    return [path_count(order, k) for k in range(rank + 1)]


def claw_count(arms: tuple[sp.Expr, sp.Expr, sp.Expr], rank: int) -> sp.Expr:
    out = convolution([path_vector(arm, rank) for arm in arms], rank)
    if rank:
        inc = convolution([path_vector(arm - 1, rank - 1) for arm in arms], rank - 1)
        out += inc
    return sp.expand(out)


def product_path_count(orders: tuple[sp.Expr, ...], rank: int) -> sp.Expr:
    return convolution([path_vector(order, rank) for order in orders], rank)


def build_cell(cell: str):
    delta2 = sp.expand(newton_coefficients(residual())[2])
    if cell == "center_long":
        A, B, C = sp.symbols("A B C", integer=True, nonnegative=True)
        arms = (A + 7, B + 7, C + 7)
        core = {c[k]: claw_count(arms, k) for k in range(4, 9)}
        deletion = {h[k]: product_path_count(arms, k) for k in (6, 7)}
        return sp.expand(delta2.subs({**core, **deletion}, simultaneous=True)), (A, B, C), {
            "cover": "root=center, all three arms at least 7; write arms=(A+7,B+7,C+7)",
            "arms": [str(x) for x in arms],
        }

    D, U, B, C = sp.symbols("D U B C", integer=True, nonnegative=True)
    if cell != "arm_all_long":
        raise ValueError(cell)
    near = D + 7
    tail = U + 7
    other_b = B + 7
    other_c = C + 7
    selected = near + tail + 1
    arms = (selected, other_b, other_c)
    core = {c[k]: claw_count(arms, k) for k in range(4, 9)}
    central = {k: claw_count((near, other_b, other_c), k) for k in (6, 7)}
    deletion = {
        h[k]: sum(path_count(tail, j) * central[k - j] for j in range(k + 1))
        for k in (6, 7)
    }
    return sp.expand(delta2.subs({**core, **deletion}, simultaneous=True)), (D, U, B, C), {
        "cover": "root on selected arm with near segment, tail, and both other arms all at least 7",
        "arms": [str(x) for x in arms],
        "root_distance": str(near + 1),
        "tail_order": str(tail),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("cell", choices=("center_long", "arm_all_long"))
    args = parser.parse_args()
    expression, variables, meta = build_cell(args.cell)
    polynomial = sp.Poly(expression, *variables)
    coefficients = polynomial.coeffs()
    report = {
        "status": "PASS_POSITIVE_COEFFICIENT_CELL" if min(coefficients) > 0 else "OBSTRUCTION_SIGNED_COEFFICIENT_CELL",
        "cell": args.cell,
        "variables": [str(v) for v in variables],
        "degrees": [polynomial.degree(v) for v in variables],
        "terms": len(polynomial.terms()),
        "negative_coefficients": sum(value < 0 for value in coefficients),
        "zero_coefficients": 0,
        "positive_coefficients": sum(value > 0 for value in coefficients),
        "minimum_coefficient": str(min(coefficients)),
        "meta": meta,
    }
    output = Path(__file__).with_name(f"rank8_delta2_e1_symbolic_{args.cell}_probe_20260820.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("cell", args.cell)
    print("degrees", report["degrees"])
    print("terms", report["terms"])
    print("negative_coefficients", report["negative_coefficients"])
    print("minimum_coefficient", report["minimum_coefficient"])
    print("source_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
