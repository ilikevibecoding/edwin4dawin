#!/usr/bin/env python3
"""Exact Bernstein test for all four Delta0 new-leaf Q corners.

For a source tree A of order n>=27 and attachment v, put D=A-v and
F=A-N[v].  The exact selected-degree theorem for the order-(n-1) forest D
gives d5/d6<=39/74, while induced-subforest containment gives f5<=d5 and
f6<=d6.  This script tests the four sharp c8/d7 concavity corners on exactly
that enclosing box.
"""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_q_corners_exact_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def bernstein_coefficients(polynomial: sp.Poly) -> tuple[list[Fraction], tuple[int, ...]]:
    degrees = tuple(polynomial.degree(variable) for variable in polynomial.gens)
    power = {
        monomial: Fraction(int(coefficient.p), int(coefficient.q))
        for monomial, coefficient in polynomial.terms()
    }
    out: list[Fraction] = []
    for index in __import__("itertools").product(
        *(range(degree + 1) for degree in degrees)
    ):
        value = Fraction(0)
        for monomial, coefficient in power.items():
            if any(source > target for source, target in zip(monomial, index)):
                continue
            weight = Fraction(1)
            for source, target, degree in zip(monomial, index, degrees):
                weight *= Fraction(math.comb(target, source), math.comb(degree, source))
            value += coefficient * weight
        out.append(value)
    return out, degrees


def main() -> None:
    X, U, Z = sp.symbols("X U Z", nonnegative=True)
    bound = sp.Rational(39, 74)
    rows = []
    all_nonnegative = True
    for mask in range(4):
        numerator, metadata = corner.new_leaf_corner(0, mask)
        polynomial = sp.Poly(numerator, leaf_d5 := corner.leaf.d[5], leaf_d6 := corner.leaf.d[6], corner.leaf.f[5], corner.leaf.f[6])
        total_degrees = {sum(monomial) for monomial, _ in polynomial.terms()}
        assert len(total_degrees) == 1
        homogeneous_degree = next(iter(total_degrees))
        normalized = sp.expand(
            numerator.subs(
                {
                    leaf_d6: 1,
                    leaf_d5: bound * X,
                    corner.leaf.f[5]: bound * X * U,
                    corner.leaf.f[6]: Z,
                },
                simultaneous=True,
            )
        )
        box_polynomial = sp.Poly(normalized, X, U, Z, domain=sp.QQ)
        coefficients, degrees = bernstein_coefficients(box_polynomial)
        negative = sum(value < 0 for value in coefficients)
        zero = sum(value == 0 for value in coefficients)
        positive = sum(value > 0 for value in coefficients)
        minimum = min(coefficients)
        all_nonnegative &= negative == 0
        rows.append(
            {
                "mask": mask,
                "endpoint_names": metadata["endpoint_names"],
                "positive_denominator": metadata["positive_denominator"],
                "homogeneous_degree": homogeneous_degree,
                "normalized_power_terms": len(box_polynomial.terms()),
                "bernstein_degrees": list(degrees),
                "bernstein_coefficients": len(coefficients),
                "negative": negative,
                "zero": zero,
                "positive": positive,
                "minimum": f"{minimum.numerator}/{minimum.denominator}",
            }
        )

    status = (
        "PASS_EXACT_DELTA0_NEW_LEAF_ALL_FOUR_Q_CORNERS"
        if all_nonnegative
        else "OPEN_DELTA0_NEW_LEAF_Q_CORNERS_BERNSTEIN_NEGATIVE_NO_SIGN_CLAIM"
    )
    payload = {
        "schema": "rank8-delta0-new-leaf-four-q-corners-bernstein-v1",
        "status": status,
        "theorem_if_pass": (
            "For every tree A of order n>=27, every attachment v, and the new leaf w, "
            "Delta0 R_1(A+w,w)>=0."
        ),
        "exact_inputs": [
            "new-leaf identity C'=C+xD, H'=C, and C=D+xF",
            "separate concavity in c8 and d7",
            "forest Q7(C) and Q6(D) upper endpoints",
            "selected-degree bound 6*d6/d5 >= N-15+10/N for N=|D|=n-1>=26",
            "therefore d5/d6<=39/74",
            "F induced in D, hence 0<=f5<=d5 and 0<=f6<=d6",
        ],
        "box_substitution": [
            "d6=1 by homogeneity",
            "d5=(39/74)X",
            "f5=(39/74)XU",
            "f6=Z",
            "0<=X,U,Z<=1",
        ],
        "corners": rows,
        "source_sha256": {
            "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py": sha256(
                HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py"
            ),
            "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": sha256(
                HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py"
            ),
            "verify_uniform_vk_large_order_reduction.py": sha256(
                HERE / "verify_uniform_vk_large_order_reduction.py"
            ),
        },
        "scope_warning": (
            "A negative Bernstein coefficient is only failure of this box certificate. "
            "No claim about Delta1..3, old roots, connected Q8, or Problem 993 follows."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    for row in rows:
        print("MASK", row["mask"], "DEG", row["bernstein_degrees"], "NEG", row["negative"], "MIN", row["minimum"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
