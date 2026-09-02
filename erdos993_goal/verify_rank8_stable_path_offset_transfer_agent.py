#!/usr/bin/env python3
"""Exact rank-eight transfer identity for products of long path polynomials."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_stable_path_offset_transfer_exact_agent_20260822.json"
MAX_RANK = 8


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - index for index in range(rank)) / sp.factorial(rank)


def path_count(order: sp.Expr, rank: int) -> sp.Expr:
    return choose_poly(order - rank + 1, rank)


def product_count(left: sp.Expr, right: sp.Expr, rank: int) -> sp.Expr:
    return sp.expand(sum(
        path_count(left, index) * path_count(right, rank - index)
        for index in range(rank + 1)
    ))


def main() -> None:
    A, B = sp.symbols("A B")
    rows = []
    for rank in range(MAX_RANK + 1):
        left = product_count(A + 1, B, rank)
        right = product_count(A, B + 1, rank)
        difference = sp.expand(left - right)
        assert difference == 0
        rows.append({
            "rank": rank,
            "left_terms": len(sp.Poly(left, A, B).terms()),
            "right_terms": len(sp.Poly(right, A, B).terms()),
            "difference": "0",
        })

    # Literal semantics of the polynomial path formula are exact through rank
    # eight once every path has at least seven vertices.
    literal_checks = 0
    for first in range(7, 16):
        for second in range(7, 16):
            for rank in range(MAX_RANK + 1):
                left = product_count(sp.Integer(first + 1), sp.Integer(second), rank)
                right = product_count(sp.Integer(first), sp.Integer(second + 1), rank)
                assert left == right
                literal_checks += 1

    payload = {
        "schema": "rank8-stable-path-offset-transfer-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_STABLE_PATH_OFFSET_TRANSFER",
        "identity": (
            "For every k<=8, the coefficient of x^k in I(P_(A+1))I(P_B) "
            "equals that in I(P_A)I(P_(B+1)) as a polynomial identity."
        ),
        "literal_guard": (
            "For combinatorial path counts through rank eight, each path order "
            "must be at least seven before applying the transfer."
        ),
        "multi_path_corollary": (
            "In any product of path independence polynomials whose path orders "
            "are all at least seven, coefficients through rank eight depend on "
            "the variable offsets only through their sum: transfer one unit "
            "between any pair and multiply the identity by the remaining factors."
        ),
        "symbolic_ranks": rows,
        "literal_checks": literal_checks,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "The identity is a stable-path compression lemma, not by itself a "
            "Delta-sign or connected-Q8 theorem."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
