#!/usr/bin/env python3
"""Derive the immediate cross-orientation Q+D coupling in minor coordinates.

For nonsibling leaves a~u and b~v, put B=F-{a,b} and
U=I(B-u), V=I(B-v), W=I(B-{u,v}).  The lower Q term from the first leaf
and the lower D term from the second leaf are

    C_k(U,V,W)=Q_k(U+xW)+D_k(V,W).

Because U=W+xS and V=W+xT for forest minors S,T, this script expands the
coupling in the nonnegative coefficient variables of W,S,T and audits raw
coefficientwise positivity at the critical fixed ranks.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_cross_orientation_coupling_symbolic_root_20260829.json"


def at(row: dict[int, sp.Expr], index: int) -> sp.Expr:
    return row.get(index, sp.Integer(0))


def add(left: dict[int, sp.Expr], right: dict[int, sp.Expr]) -> dict[int, sp.Expr]:
    keys = set(left) | set(right)
    return {key: at(left, key) + at(right, key) for key in keys}


def shift(row: dict[int, sp.Expr]) -> dict[int, sp.Expr]:
    return {key + 1: value for key, value in row.items()}


def q(row: dict[int, sp.Expr], rank: int) -> sp.Expr:
    return sp.expand(
        rank * at(row, rank) ** 2
        + at(row, rank - 1) ** 2
        - (rank + 1) * at(row, rank - 1) * at(row, rank + 1)
    )


def d(A: dict[int, sp.Expr], C: dict[int, sp.Expr], rank: int) -> sp.Expr:
    return sp.expand(
        at(C, rank - 1) ** 2
        + 2 * rank * at(A, rank) * at(C, rank - 1)
        + 2 * at(A, rank - 1) * at(C, rank - 2)
        - (rank + 1) * at(A, rank - 1) * at(C, rank)
        - (rank + 1) * at(C, rank - 2) * at(A, rank + 1)
        - at(C, rank - 2) * at(C, rank)
    )


def coefficient_summary(expression: sp.Expr, variables: list[sp.Symbol]) -> dict[str, object]:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    terms = polynomial.terms()
    negative = [(monomial, int(value)) for monomial, value in terms if value < 0]
    positive = [(monomial, int(value)) for monomial, value in terms if value > 0]
    return {
        "terms": len(terms),
        "negative": len(negative),
        "minimum_coefficient": min(int(value) for _, value in terms),
        "maximum_coefficient": max(int(value) for _, value in terms),
        "negative_terms": negative,
        "positive": len(positive),
    }


def rank_case(rank: int) -> dict[str, object]:
    indices = range(0, rank + 2)
    W = {index: sp.Symbol(f"w{index}", nonnegative=True) for index in indices}
    S = {index: sp.Symbol(f"s{index}", nonnegative=True) for index in indices}
    T = {index: sp.Symbol(f"t{index}", nonnegative=True) for index in indices}
    U = add(W, shift(S))
    V = add(W, shift(T))
    C_uv = sp.expand(q(add(U, shift(W)), rank) + d(V, W, rank))
    C_vu = sp.expand(q(add(V, shift(W)), rank) + d(U, W, rank))
    symmetric = sp.expand(C_uv + C_vu)
    variables = [*W.values(), *S.values(), *T.values()]
    return {
        "rank": rank,
        "oriented": coefficient_summary(C_uv, variables),
        "symmetric_pair": coefficient_summary(symmetric, variables),
        "oriented_expression": str(C_uv),
        "symmetric_expression": str(symmetric),
    }


def main() -> None:
    cases = [rank_case(rank) for rank in (3, 4, 5, 6)]
    report = {
        "marker": "DERIVED_EXACT_ISO_CROSS_ORIENTATION_Q_PLUS_D_COUPLING",
        "definition": "C_k(U,V,W)=Q_k(U+xW)+D_k(V,W), U=W+xS, V=W+xT",
        "cases": cases,
        "scope": (
            "Exact symbolic derivation and raw coefficient-sign audit only. "
            "Negative raw coefficients do not refute the forest inequality; "
            "a forest-structural payment may compensate them."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
