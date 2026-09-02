#!/usr/bin/env python3
"""Exact symmetry-adapted long-cell probes for rank-eight Delta0/1/3 on e=2."""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_e2_symmetric_long_cells import build
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(x: sp.Expr, k: int) -> sp.Expr:
    return sp.prod(x - j for j in range(k)) / sp.factorial(k)


def order_expression(cell: str, variables: tuple[sp.Symbol, ...]) -> sp.Expr:
    if cell == "branch":
        sl, _pl, sr, _pr, g = variables
        return 37 + sl + sr + g
    if cell == "bridge_interior":
        sl, _pl, sr, _pr, near, tail = variables
        return 45 + sl + sr + near + tail
    if cell == "pendant":
        x, tail, far_sum, bridge = variables
        return 45 + x + tail + far_sum + bridge
    raise ValueError(cell)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("rank", type=int, choices=(0, 1, 3))
    parser.add_argument("cell", choices=("branch", "bridge_interior", "pendant"))
    args = parser.parse_args()

    started = time.perf_counter()
    raw, variables, meta = build(args.cell)
    n = sp.expand(order_expression(args.cell, variables))
    raw.update(
        {
            c[0]: sp.Integer(1),
            c[1]: n,
            c[2]: choose_poly(n - 1, 2),
            c[3]: choose_poly(n - 2, 3) + 2,
        }
    )
    values = {symbol: sp.Poly(value, *variables) for symbol, value in raw.items()}
    source_symbols = (*c[:9], h[6], h[7])
    delta = sp.Poly(sp.expand(newton_coefficients(residual())[args.rank]), *source_symbols)
    result = sp.Poly(0, *variables)
    for powers, coefficient in delta.terms():
        term = sp.Poly(coefficient, *variables)
        for symbol, power in zip(source_symbols, powers):
            if power:
                term *= values[symbol] ** power
        result += term

    coefficients = result.coeffs()
    negative = len([value for value in coefficients if value < 0])
    zero = len([value for value in coefficients if value == 0])
    positive = len([value for value in coefficients if value > 0])
    constant = result.coeff_monomial((0,) * len(variables))
    payload = {
        "schema": "rank8-delta013-e2-symmetric-long-cell-v1",
        "status": (
            "PASS_POSITIVE_SYMMETRIC_COEFFICIENT_CELL"
            if negative == 0 and constant > 0
            else "OBSTRUCTION_SIGNED_SYMMETRIC_COEFFICIENT_CELL"
        ),
        "scope": "one symmetry-adapted all-long e=2 double-claw cell; not an all-order e=2 theorem",
        "rank": args.rank,
        "cell": args.cell,
        **meta,
        "order_expression": str(n),
        "tree_exact_coordinates": "c0=1,c1=n,c2=C(n-1,2),c3=C(n-2,3)+2",
        "basis_guard": "all displayed offset and elementary-symmetric coordinates are nonnegative on the literal cell; coefficient positivity on their independent orthant is sufficient",
        "degrees": [result.degree(v) for v in variables],
        "terms": len(result.terms()),
        "negative_coefficients": negative,
        "zero_coefficients": zero,
        "positive_coefficients": positive,
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(constant),
        "runtime_seconds": time.perf_counter() - started,
    }
    output = HERE / f"rank8_delta{args.rank}_e2_{args.cell}_symmetric_long_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"], flush=True)
    print("rank", args.rank, "cell", args.cell, flush=True)
    print("order", payload["order_expression"], flush=True)
    print("degrees", payload["degrees"], flush=True)
    print("terms", payload["terms"], flush=True)
    print("negative_coefficients", negative, flush=True)
    print("runtime_seconds", payload["runtime_seconds"], flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(output), flush=True)


if __name__ == "__main__":
    main()
