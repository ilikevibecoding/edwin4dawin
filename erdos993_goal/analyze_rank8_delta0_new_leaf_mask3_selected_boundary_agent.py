#!/usr/bin/env python3
"""Exact structural numerator for the Delta0 new-leaf mask-3 corner.

Mask 3 places both c8 and d7 at their forest-Q upper endpoints.  Two exact
derivations are compared; this extraction alone makes no sign claim.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent as leaf


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_selected_boundary_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q8(p7, p8, p9):
    return 16 * p8**2 - p7 * p8 - 18 * p7 * p9


def direct_literal_expression():
    N, x, y, z = sp.symbols("N x y z")
    d7 = (12 - x) / (14 * x)
    c6 = 1 + y
    c7 = d7 + z
    c8 = c7 * (14 * c7 - c6) / (16 * c6)
    a6 = c6 + x
    a7 = c7 + 1
    a8 = c8 + d7
    p7 = a7 + a6 + c6
    p8 = a8 + a7 + c7
    return sp.cancel(
        8 * a7 * c6 * q8(p7, p8, a8)
        - 8 * c6 * p7 * (16 * a8**2 - a7 * a8)
        - 9 * a7 * p7 * (14 * c7**2 - c6 * c7)
    )


def symbolic_leaf_expression():
    N, x, y, z = sp.symbols("N x y z")
    q7_upper_c8 = leaf.c[7] * (14 * leaf.c[7] - leaf.c[6]) / (
        16 * leaf.c[6]
    )
    q6_upper_d7 = leaf.d[6] * (12 * leaf.d[6] - leaf.d[5]) / (
        14 * leaf.d[5]
    )
    expression = leaf.build_gates()["new_leaf_root_raw"][0]
    expression = expression.subs(
        {leaf.c[8]: q7_upper_c8, leaf.d[7]: q6_upper_d7}, simultaneous=True
    )
    structural = {
        leaf.c[index]: leaf.d[index] + (leaf.f[index - 1] if index else 0)
        for index in range(8)
    }
    expression = expression.subs(structural, simultaneous=True)
    expression = expression.subs({leaf.d[7]: q6_upper_d7}, simultaneous=True)
    return sp.cancel(
        expression.subs(
            {leaf.d[6]: 1, leaf.d[5]: x, leaf.f[5]: y, leaf.f[6]: z},
            simultaneous=True,
        )
    )


def base_polynomial():
    N, x, y, z = sp.symbols("N x y z")
    literal = direct_literal_expression()
    symbolic = symbolic_leaf_expression()
    assert sp.cancel(literal - symbolic) == 0
    numerator, denominator = sp.fraction(literal)
    assert sp.Poly(denominator, N, x, y, z).LC() > 0
    return sp.Poly(numerator, N, x, y, z, domain=sp.ZZ)


def canonical_sha256(polynomial):
    serial = json.dumps(
        [[list(monomial), str(coefficient)] for monomial, coefficient in polynomial.terms()],
        separators=(",", ":"),
    ).encode()
    return hashlib.sha256(serial).hexdigest().upper()


def main() -> None:
    N, x, y, z = sp.symbols("N x y z")
    expression = direct_literal_expression()
    _, denominator = sp.fraction(expression)
    polynomial = base_polynomial()
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-selected-boundary-v1",
        "status": "PASS_EXACT_MASK3_STRUCTURAL_GATE_EXTRACTED_NO_SIGN_CLAIM",
        "scope": (
            "Delta0, q is the inserted leaf, N=|A-v|>=26; c8 is at Q7(C)'s "
            "upper endpoint and d7 is at Q6(D)'s upper endpoint"
        ),
        "normalization": [
            "d6=1", "x=d5/d6", "y=f5/d6", "z=f6/d6",
            "c6=1+y", "c7=(12-x)/(14x)+z",
        ],
        "endpoints": {
            "d7": "d6(12d6-d5)/(14d5)",
            "c8": "c7(14c7-c6)/(16c6)",
        },
        "positive_denominator": str(sp.factor(denominator)),
        "numerator": {
            "terms": len(polynomial.terms()),
            "total_degree": polynomial.total_degree(),
            "degrees_N_x_y_z": [polynomial.degree(v) for v in (N, x, y, z)],
            "canonical_sha256": canonical_sha256(polynomial),
        },
        "route_agreement": (
            "general symbolic leaf gate after C=D+tF equals an independently "
            "transcribed literal new-root residual exactly"
        ),
        "source_sha256": {
            "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": sha256(
                HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py"
            )
        },
        "proof_boundary": (
            "This is an exact endpoint identity only. It proves no sign and "
            "does not cover masks0..2 composition, other roots/ranks, full "
            "induction, connected Q8, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TERMS", payload["numerator"]["terms"])
    print("DEGREES", payload["numerator"]["degrees_N_x_y_z"])
    print("DENOMINATOR", payload["positive_denominator"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
