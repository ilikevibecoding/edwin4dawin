#!/usr/bin/env python3
"""One exact Q-endpoint corner of an arbitrary leaf-extension gate.

The producer is deliberately one-corner-per-process.  It first applies the
proved lower-rank Q endpoint in raw forest coordinates and then imposes the
literal deletion recurrences.  A coefficientwise PASS is a theorem on the
resulting nonnegative structural cone; mixed coefficients are only an open
method boundary.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent as leaf


HERE = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q_upper(row: tuple[sp.Symbol, ...], rank: int) -> sp.Expr:
    """Upper i_(rank+1) endpoint supplied by Q_rank>=0."""
    return sp.cancel(
        row[rank] * (2 * rank * row[rank] - row[rank - 1])
        / (2 * (rank + 1) * row[rank - 1])
    )


def polynomial_record(expression: sp.Expr) -> dict[str, object]:
    generators = sorted(expression.free_symbols, key=str)
    polynomial = sp.Poly(sp.expand(expression), *generators)
    terms = polynomial.terms()
    serial = json.dumps(
        {
            "generators": [str(value) for value in generators],
            "terms": [[list(monomial), str(coefficient)] for monomial, coefficient in terms],
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    return {
        "generators": [str(value) for value in generators],
        "terms": len(terms),
        "negative": sum(1 for _, coefficient in terms if coefficient < 0),
        "positive": sum(1 for _, coefficient in terms if coefficient > 0),
        "sha256": hashlib.sha256(serial).hexdigest().upper(),
    }


def new_leaf_corner(rank: int, mask: int) -> tuple[sp.Expr, dict[str, object]]:
    assert 0 <= mask < 4
    expression = leaf.build_gates()["new_leaf_root_raw"][rank]
    c8_value = q_upper(leaf.c, 7) if mask & 1 else sp.Integer(0)
    d7_value = q_upper(leaf.d, 6) if mask & 2 else sp.Integer(0)
    expression = expression.subs({leaf.c[8]: c8_value, leaf.d[7]: d7_value}, simultaneous=True)

    # C=D+xF.  Do not map c8 (already removed).  Mapping c7 introduces d7,
    # so replay the selected D endpoint after the structural substitution.
    structural = {
        leaf.c[index]: leaf.d[index] + (leaf.f[index - 1] if index else 0)
        for index in range(8)
    }
    expression = expression.subs(structural, simultaneous=True)
    expression = expression.subs({leaf.d[7]: d7_value}, simultaneous=True)
    expression = sp.cancel(expression)
    numerator, denominator = sp.fraction(expression)
    assert not numerator.has(leaf.c[8], leaf.d[7])
    return sp.expand(numerator), {
        "top_coordinates": ["c8", "d7"],
        "endpoint_mask": mask,
        "endpoint_names": [
            "Q7(C)_upper" if mask & 1 else "zero",
            "Q6(D)_upper" if mask & 2 else "zero",
        ],
        "positive_denominator": str(sp.factor(denominator)),
        "structural_recurrence": "C=D+xF",
        "scope_guard": "n>=27 gives |D|=n-1>=26, so Q7(C) and the order>=13 forest Q6(D) theorem apply",
    }


def general_corner(rank: int, mask: int, adjacent: bool) -> tuple[sp.Expr, dict[str, object]]:
    assert 0 <= mask < 16
    expression = leaf.build_gates()["general_old_root_raw"][rank]
    endpoints = {
        leaf.c[8]: q_upper(leaf.c, 7) if mask & 1 else sp.Integer(0),
        leaf.h[7]: q_upper(leaf.h, 6) if mask & 2 else sp.Integer(0),
        leaf.d[7]: q_upper(leaf.d, 6) if mask & 4 else sp.Integer(0),
        leaf.e[6]: q_upper(leaf.e, 5) if mask & 8 else sp.Integer(0),
    }
    expression = expression.subs(endpoints, simultaneous=True)

    structural: dict[sp.Symbol, sp.Expr] = {}
    for index in range(8):
        previous = index - 1
        structural[leaf.c[index]] = leaf.e[index] + (
            leaf.j[previous] + leaf.f[previous] if index else 0
        )
    for index in range(7):
        previous = index - 1
        structural[leaf.d[index]] = leaf.e[index] + (leaf.j[previous] if index else 0)
        structural[leaf.h[index]] = leaf.e[index] + (leaf.g[previous] if index else 0)
    expression = expression.subs(structural, simultaneous=True)
    # h6 and d6 introduce e6 after their Q6 endpoints have been inserted.
    expression = expression.subs({leaf.e[6]: endpoints[leaf.e[6]]}, simultaneous=True)
    if adjacent:
        expression = expression.subs(
            {leaf.g[index]: leaf.f[index] for index in range(8)}, simultaneous=True
        )
    expression = sp.cancel(expression)
    numerator, denominator = sp.fraction(expression)
    assert not numerator.has(leaf.c[8], leaf.h[7], leaf.d[7], leaf.e[6])
    return sp.expand(numerator), {
        "top_coordinates": ["c8", "h7", "d7", "e6"],
        "endpoint_mask": mask,
        "endpoint_names": [
            "Q7(C)_upper" if mask & 1 else "zero",
            "Q6(H)_upper" if mask & 2 else "zero",
            "Q6(D)_upper" if mask & 4 else "zero",
            "Q5(E)_upper" if mask & 8 else "zero",
        ],
        "positive_denominator": str(sp.factor(denominator)),
        "structural_recurrence": (
            "C=E+xJ+xF, D=E+xJ, H=E+xG; q~v additionally gives G=F"
        ),
        "adjacent": adjacent,
        "scope_guard": (
            "n>=27 gives alpha(C)>=14 and orders |H|=|D|=n-1>=26, "
            "|E|=n-2>=25; final forest Q7(C), order>=13 Q6(H,D), and "
            "order>=10 Q5(E) all apply"
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gate", choices=("new_leaf", "general"), required=True)
    parser.add_argument("--rank", type=int, choices=range(4), required=True)
    parser.add_argument("--mask", type=int, required=True)
    parser.add_argument("--adjacent", action="store_true")
    args = parser.parse_args()

    if args.gate == "new_leaf":
        assert not args.adjacent
        numerator, metadata = new_leaf_corner(args.rank, args.mask)
    else:
        numerator, metadata = general_corner(args.rank, args.mask, args.adjacent)
    record = polynomial_record(numerator)
    status = (
        "PASS_EXACT_COEFFICIENTWISE_NONNEGATIVE_Q_ENDPOINT_CORNER"
        if record["negative"] == 0
        else "OPEN_EXACT_MIXED_Q_ENDPOINT_CORNER_NO_SIGN_CLAIM"
    )
    suffix = "_adjacent" if args.adjacent else ""
    output = HERE / (
        f"rank8_delta03_arbitrary_leaf_extension_{args.gate}{suffix}_r{args.rank}_m{args.mask:02d}_"
        "q_corner_agent_20260823.json"
    )
    payload = {
        "schema": "rank8-delta03-arbitrary-leaf-extension-one-q-corner-v1",
        "status": status,
        "gate": args.gate,
        "rank": args.rank,
        **metadata,
        "cleared_numerator": record,
        "exact_claim_boundary": (
            "Coefficientwise PASS proves only this endpoint corner under the stated "
            "recurrences and positive-denominator guard. MIXED is not a counterexample."
        ),
        "input_sha256": {
            "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": sha256(
                HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py"
            ),
            "rank7_integration_readonly_20260820.json": sha256(
                HERE / "rank7_integration_readonly_20260820.json"
            ),
        },
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("TERMS", record["terms"], "NEGATIVE", record["negative"], "POSITIVE", record["positive"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
