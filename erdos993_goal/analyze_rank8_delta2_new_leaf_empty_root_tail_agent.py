#!/usr/bin/env python3
"""Exact empty-neighbor-root tail diagnostic for the Delta2 new-leaf corner.

If s neighbors of the attachment vertex are leaves, then they are isolated
vertices of D=A-v and contribute (1+x)^s.  Write D=(1+x)^s U and retain the
literal containment U_i=F_i+X_i with X_i>=0.  This script computes both the
ordinary and binomial-basis s coefficients exactly.  Mixed controls are only
a method obstruction.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner
import analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent as leaf


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_new_leaf_empty_root_tail_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def record(expression: sp.Expr) -> dict[str, object]:
    expression = sp.expand(expression)
    if expression == 0:
        serial = b'{"generators":[],"terms":[]}'
        return {
            "generators": [],
            "terms": 0,
            "negative": 0,
            "positive": 0,
            "sha256": hashlib.sha256(serial).hexdigest().upper(),
        }
    generators = sorted(expression.free_symbols, key=str)
    polynomial = sp.Poly(expression, *generators)
    terms = polynomial.terms()
    serial = json.dumps(
        {
            "generators": [str(value) for value in generators],
            "terms": [[list(monomial), str(coefficient)] for monomial, coefficient in terms],
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    coefficients = [coefficient for _, coefficient in terms]
    return {
        "generators": [str(value) for value in generators],
        "terms": len(terms),
        "negative": sum(1 for coefficient in coefficients if coefficient < 0),
        "positive": sum(1 for coefficient in coefficients if coefficient > 0),
        "sha256": hashlib.sha256(serial).hexdigest().upper(),
    }


def binomial_coefficients(expression: sp.Expr, variable: sp.Symbol) -> list[sp.Expr]:
    degree = sp.Poly(expression, variable).degree()
    values = [sp.expand(expression.subs(variable, value)) for value in range(degree + 1)]
    rows = []
    for _ in range(degree + 1):
        rows.append(values[0])
        values = [sp.expand(values[index + 1] - values[index]) for index in range(len(values) - 1)]
    reconstruction = sum(sp.binomial(variable, rank) * row for rank, row in enumerate(rows))
    assert sp.expand_func(reconstruction).expand() == sp.expand(expression)
    return rows


def main() -> None:
    base, metadata = corner.new_leaf_corner(2, 3)
    base_record = record(base)
    assert base_record["sha256"] == "C61B3F468548F9400E60C1604F05FAD1A2448B76A47C33A4BD140DFE12754FAE"
    assert metadata["endpoint_mask"] == 3

    s = sp.symbols("s", integer=True, nonnegative=True)
    u = (sp.Integer(1),) + sp.symbols("u1:7", nonnegative=True)
    d_values = {
        leaf.d[index]: sum(
            sp.binomial(s, selected) * u[index - selected]
            for selected in range(index + 1)
        )
        for index in range(3, 7)
    }
    tail = sp.expand_func(base.subs(d_values, simultaneous=True)).expand()

    x = (sp.Integer(0),) + sp.symbols("x1:7", nonnegative=True)
    containment = {
        u[index]: leaf.f[index] + x[index] for index in range(1, 7)
    }
    tail_gap = sp.expand(tail.subs(containment, simultaneous=True))

    ordinary = sp.Poly(tail_gap, s)
    ordinary_rows = [
        {"power": power[0], "polynomial": record(coefficient)}
        for power, coefficient in ordinary.terms()
    ]
    binomial_rows = [
        {"rank": rank, "polynomial": record(coefficient)}
        for rank, coefficient in enumerate(binomial_coefficients(tail_gap, s))
    ]
    ordinary_negative = sum(row["polynomial"]["negative"] for row in ordinary_rows)
    binomial_negative = sum(row["polynomial"]["negative"] for row in binomial_rows)
    status = (
        "PASS_EXACT_COEFFICIENTWISE_NONNEGATIVE_EMPTY_ROOT_BINOMIAL_TAIL"
        if binomial_negative == 0
        else "OPEN_EXACT_EMPTY_ROOT_TAIL_MIXED_NO_SIGN_CLAIM"
    )
    payload = {
        "schema": "rank8-delta2-new-leaf-empty-root-tail-v1",
        "status": status,
        "scope": "Delta2, q=new leaf, Q7(C)-upper/Q6(D)-upper corner, D=(1+x)^s U",
        "literal_identity": "s leaf-neighbors of v are isolated vertices of D=A-v, hence I(D)=(1+x)^s I(U)",
        "containment_identity": "F is an induced subforest of U, so u_i=f_i+x_i with x_i>=0",
        "degree_in_s": sp.Poly(tail_gap, s).degree(),
        "ordinary_power_rows": ordinary_rows,
        "ordinary_negative_controls": ordinary_negative,
        "binomial_basis_rows": binomial_rows,
        "binomial_negative_controls": binomial_negative,
        "input_sha256": {
            "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py": sha256(
                HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py"
            ),
            "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": sha256(
                HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py"
            ),
            "rank8_delta03_arbitrary_leaf_extension_new_leaf_r2_m03_q_corner_agent_20260823.json": sha256(
                HERE / "rank8_delta03_arbitrary_leaf_extension_new_leaf_r2_m03_q_corner_agent_20260823.json"
            ),
        },
        "proof_boundary": "PASS would prove this single endpoint corner only on the displayed literal empty-root tail cone. MIXED is not a graph counterexample. No Delta2 gate or arbitrary-leaf theorem is credited here.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("DEGREE", payload["degree_in_s"])
    print("ORDINARY_NEGATIVE", ordinary_negative)
    print("BINOMIAL_NEGATIVE", binomial_negative)
    for row in binomial_rows:
        p = row["polynomial"]
        print("BINOM", row["rank"], p["terms"], p["negative"], p["positive"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
