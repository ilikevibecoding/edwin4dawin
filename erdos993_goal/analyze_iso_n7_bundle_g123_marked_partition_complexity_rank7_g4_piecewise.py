#!/usr/bin/env python3
"""Exact complexity/sign inventory for the three open rank-seven coefficients."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import (
    reconstruct_coefficients,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g123_marked_partition_complexity_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = "ANALYZED_EXACT_ISO_N7_BUNDLE_G123_MARKED_PARTITION_COMPLEXITY"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    coefficients = reconstruct_coefficients()
    n, q, eu, ev = sp.symbols("n q eu ev", nonnegative=True)
    structural = {}
    for name in "EUVW":
        structural[sp.Symbol(f"c{name}0")] = 1
        structural[sp.Symbol(f"d{name}0")] = 1
    structural.update({
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q,
        sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev,
        sp.Symbol("dW1"): q - eu - ev,
    })
    rows = {
        family: {
            rank: sp.Symbol(f"{family}{rank}", nonnegative=True)
            for rank in range(2, 9)
        }
        for family in "WABZ"
    }
    partition = {}
    for rank in range(2, 9):
        W, A, B, Z = (rows[family][rank] for family in "WABZ")
        partition.update({
            sp.Symbol(f"cW{rank}"): W,
            sp.Symbol(f"cU{rank}"): W + A,
            sp.Symbol(f"cV{rank}"): W + B,
            sp.Symbol(f"cE{rank}"): W + A + B + Z,
        })
    summaries = []
    for index in (1, 2, 3):
        expression = sp.expand(coefficients[index].subs(structural).subs(partition))
        variables = tuple(sorted(expression.free_symbols, key=str))
        polynomial = sp.Poly(expression, *variables)
        dvars = [value for value in variables if str(value).startswith("d")]
        d_signs = {"positive": 0, "negative": 0, "mixed": 0}
        for variable in dvars:
            derivative = sp.Poly(sp.diff(expression, variable), *variables)
            values = derivative.coeffs()
            if all(value >= 0 for value in values):
                d_signs["positive"] += 1
            elif all(value <= 0 for value in values):
                d_signs["negative"] += 1
            else:
                d_signs["mixed"] += 1
        summaries.append({
            "coefficient": f"g{index}",
            "partitioned_monomials": len(polynomial.terms()),
            "negative_scalar_coefficients": sum(
                1 for value in polynomial.coeffs() if value < 0
            ),
            "D_coordinates": len(dvars),
            "D_derivative_scalar_signs": d_signs,
            "maximum_total_degree": polynomial.total_degree(),
        })
    report = {
        "marker": MARKER,
        "summaries": summaries,
        "status": "exact inventory only; no sign theorem asserted",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
