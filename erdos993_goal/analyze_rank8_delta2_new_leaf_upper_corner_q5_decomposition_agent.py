#!/usr/bin/env python3
"""Exact diagnostic for the Delta2 new-leaf upper/upper corner.

This is a fail-closed sign decomposition.  It records the induced-subforest
gap substitution and the four nested Q5 endpoint corners in d6 and f6.  Mixed
coefficients are only method obstructions, never graph counterexamples.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner
import analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent as leaf


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_new_leaf_upper_corner_q5_decomposition_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def record(expression: sp.Expr) -> dict[str, object]:
    expression = sp.expand(expression)
    generators = sorted(expression.free_symbols, key=str)
    if expression == 0:
        serial = json.dumps(
            {"generators": [], "terms": []},
            sort_keys=True,
            separators=(",", ":"),
        ).encode()
        return {
            "generators": [],
            "terms": 0,
            "negative": 0,
            "positive": 0,
            "sha256": hashlib.sha256(serial).hexdigest().upper(),
        }
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


def cleared(expression: sp.Expr) -> tuple[sp.Expr, str]:
    numerator, denominator = sp.fraction(sp.cancel(expression))
    return sp.expand(numerator), str(sp.factor(denominator))


def main() -> None:
    base, metadata = corner.new_leaf_corner(2, 3)
    assert metadata["endpoint_mask"] == 3
    base_record = record(base)
    assert base_record["sha256"] == "C61B3F468548F9400E60C1604F05FAD1A2448B76A47C33A4BD140DFE12754FAE"

    gaps = sp.symbols("x3:7", nonnegative=True)
    gap_substitution = {
        leaf.d[index]: leaf.f[index] + gaps[index - 3] for index in range(3, 7)
    }
    gap_record = record(base.subs(gap_substitution, simultaneous=True))

    derivative_records = {}
    for variable in (leaf.d[6], leaf.f[6]):
        first = record(sp.diff(base, variable))
        second = record(sp.diff(base, variable, 2))
        derivative_records[str(variable)] = {"first": first, "second": second}

    d6_upper = corner.q_upper(leaf.d, 5)
    f6_upper = corner.q_upper(leaf.f, 5)
    endpoint_rows = []
    for mask in range(4):
        selected = {
            leaf.d[6]: d6_upper if mask & 1 else sp.Integer(0),
            leaf.f[6]: f6_upper if mask & 2 else sp.Integer(0),
        }
        endpoint, denominator = cleared(base.subs(selected, simultaneous=True))
        endpoint_record = record(endpoint)
        endpoint_gap, gap_denominator = cleared(
            endpoint.subs(
                {
                    leaf.d[index]: leaf.f[index] + gaps[index - 3]
                    for index in range(3, 6)
                },
                simultaneous=True,
            )
        )
        endpoint_rows.append(
            {
                "mask": mask,
                "endpoints": [
                    "Q5(D)_upper" if mask & 1 else "zero",
                    "Q5(F)_upper" if mask & 2 else "zero",
                ],
                "positive_denominator": denominator,
                "polynomial": endpoint_record,
                "containment_gap_positive_denominator": gap_denominator,
                "containment_gap_polynomial": record(endpoint_gap),
            }
        )

    rows_pass = sum(row["polynomial"]["negative"] == 0 for row in endpoint_rows)
    gap_rows_pass = sum(
        row["containment_gap_polynomial"]["negative"] == 0 for row in endpoint_rows
    )
    status = (
        "PASS_EXACT_ALL_FOUR_Q5_ENDPOINT_CORNERS"
        if rows_pass == gap_rows_pass == 4
        else "OPEN_EXACT_Q5_ENDPOINT_DECOMPOSITION_MIXED_NO_SIGN_CLAIM"
    )
    payload = {
        "schema": "rank8-delta2-new-leaf-upper-corner-q5-decomposition-v1",
        "status": status,
        "scope": "Delta2, q=new inserted leaf, Q7(C)-upper and Q6(D)-upper corner only",
        "base_polynomial": base_record,
        "induced_subforest_gap_substitution": {
            "identity": "d_i=f_i+x_i with x_i>=0 for i=3..6",
            "polynomial": gap_record,
        },
        "d6_f6_derivatives": derivative_records,
        "nested_q5_endpoint_rows": endpoint_rows,
        "endpoint_rows_coefficientwise_pass": rows_pass,
        "endpoint_gap_rows_coefficientwise_pass": gap_rows_pass,
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
        "proof_boundary": "A coefficientwise PASS would concern only these algebraic endpoint cones. Any MIXED row is a method obstruction, not a realizable forest witness. Delta2 new-leaf and every broader theorem remain uncredited unless every required compatible branch is proved.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("BASE_GAP", gap_record["terms"], gap_record["negative"], gap_record["positive"])
    print("Q5_ROWS_PASS", rows_pass, "GAP_ROWS_PASS", gap_rows_pass)
    for row in endpoint_rows:
        p = row["polynomial"]
        g = row["containment_gap_polynomial"]
        print("MASK", row["mask"], "RAW", p["terms"], p["negative"], p["positive"], "GAP", g["terms"], g["negative"], g["positive"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
