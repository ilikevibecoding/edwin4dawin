#!/usr/bin/env python3
"""Diagnostic Bernstein audit for the four Delta1 new-leaf corners.

The box uses only the all-order selected-degree bounds for D at N>=26 and
same-rank induced-subforest containment F<=D.  A PASS would be a useful
theorem; a negative Bernstein coefficient is only a method obstruction.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from fractions import Fraction
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_normalized_containment_box_probe_root_20260825.json"
VARIABLES = sp.symbols("X Y U4 U5 U6", nonnegative=True)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q_upper(row: tuple[sp.Symbol, ...], rank: int) -> sp.Expr:
    return sp.cancel(
        row[rank] * (2 * rank * row[rank] - row[rank - 1])
        / (2 * (rank + 1) * row[rank - 1])
    )


def corners_once() -> list[tuple[sp.Expr, dict[str, object]]]:
    gate = corner.leaf.build_gates()["new_leaf_root_raw"][1]
    out = []
    for mask in range(4):
        c8_value = q_upper(corner.leaf.c, 7) if mask & 1 else sp.Integer(0)
        d7_value = q_upper(corner.leaf.d, 6) if mask & 2 else sp.Integer(0)
        expression = gate.subs(
            {corner.leaf.c[8]: c8_value, corner.leaf.d[7]: d7_value},
            simultaneous=True,
        )
        structural = {
            corner.leaf.c[index]: corner.leaf.d[index]
            + (corner.leaf.f[index - 1] if index else 0)
            for index in range(8)
        }
        expression = expression.subs(structural, simultaneous=True)
        expression = expression.subs(
            {corner.leaf.d[7]: d7_value}, simultaneous=True
        )
        numerator, denominator = sp.fraction(sp.cancel(expression))
        out.append(
            (
                sp.expand(numerator),
                {
                    "mask": mask,
                    "endpoint_names": [
                        "Q7(C)_upper" if mask & 1 else "zero",
                        "Q6(D)_upper" if mask & 2 else "zero",
                    ],
                    "positive_denominator": str(sp.factor(denominator)),
                },
            )
        )
    return out


def bernstein(polynomial: sp.Poly) -> dict[str, object]:
    degrees = tuple(polynomial.degree(variable) for variable in VARIABLES)
    power = {
        monomial: Fraction(int(coefficient.p), int(coefficient.q))
        for monomial, coefficient in polynomial.terms()
    }
    negative = 0
    zero = 0
    positive = 0
    minimum = None
    first_negative = None
    digest = hashlib.sha256()
    count = 0
    for index in itertools.product(
        *(range(degree + 1) for degree in degrees)
    ):
        value = Fraction(0)
        for monomial, coefficient in power.items():
            if any(source > target for source, target in zip(monomial, index)):
                continue
            weight = Fraction(1)
            for source, target, degree in zip(monomial, index, degrees):
                weight *= Fraction(
                    math.comb(target, source), math.comb(degree, source)
                )
            value += coefficient * weight
        count += 1
        digest.update(
            (",".join(map(str, index)) + ":" + str(value) + "\n").encode()
        )
        minimum = value if minimum is None else min(minimum, value)
        if value < 0:
            negative += 1
            if first_negative is None:
                first_negative = {
                    "index": list(index), "value": str(value)
                }
        elif value == 0:
            zero += 1
        else:
            positive += 1
    return {
        "degrees": list(degrees),
        "coefficients": count,
        "negative": negative,
        "zero": zero,
        "positive": positive,
        "minimum": str(minimum),
        "first_negative": first_negative,
        "ordered_sha256": digest.hexdigest().upper(),
    }


def vertex_audit(expression: sp.Expr) -> dict[str, object]:
    values = []
    for vertex in itertools.product((0, 1), repeat=len(VARIABLES)):
        exact = sp.factor(expression.subs(dict(zip(VARIABLES, vertex))))
        assert exact.is_Rational
        value = Fraction(int(exact.p), int(exact.q))
        values.append((vertex, value))
    minimum_vertex, minimum = min(values, key=lambda item: item[1])
    return {
        "vertices": len(values),
        "negative": sum(1 for _, value in values if value < 0),
        "minimum_vertex": list(minimum_vertex),
        "minimum": str(minimum),
    }


def main() -> None:
    x_upper = sp.Rational(39, 74)  # d5/d6, N=26 worst upper bound
    y_upper = sp.Rational(65, 186)  # d4/d5, N=26 worst upper bound
    X, Y, U4, U5, U6 = VARIABLES
    substitutions = {
        corner.leaf.d[6]: 1,
        corner.leaf.d[5]: x_upper * X,
        corner.leaf.d[4]: x_upper * X * y_upper * Y,
        corner.leaf.f[6]: U6,
        corner.leaf.f[5]: x_upper * X * U5,
        corner.leaf.f[4]: x_upper * X * y_upper * Y * U4,
    }
    rows = []
    for numerator, metadata in corners_once():
        original = sp.Poly(
            numerator,
            corner.leaf.d[4], corner.leaf.d[5], corner.leaf.d[6],
            corner.leaf.f[4], corner.leaf.f[5], corner.leaf.f[6],
        )
        total_degrees = {sum(monomial) for monomial, _ in original.terms()}
        assert len(total_degrees) == 1
        normalized = sp.expand(
            numerator.subs(substitutions, simultaneous=True)
        )
        polynomial = sp.Poly(normalized, *VARIABLES, domain=sp.QQ)
        result = bernstein(polynomial)
        rows.append(
            {
                **metadata,
                "homogeneous_degree": next(iter(total_degrees)),
                "normalized_power_terms": len(polynomial.terms()),
                "bernstein": result,
                "vertices": vertex_audit(normalized),
            }
        )
        print(
            "MASK", metadata["mask"], "TERMS", len(polynomial.terms()),
            "DEGREES", result["degrees"], "NEG", result["negative"],
            "MIN", result["minimum"], flush=True,
        )

    passed = all(row["bernstein"]["negative"] == 0 for row in rows)
    payload = {
        "schema": "rank8-delta1-new-leaf-normalized-containment-box-probe-root-v1",
        "status": (
            "PASS_EXACT_ALL_FOUR_DELTA1_NEW_LEAF_CORNERS_ON_CONTAINMENT_BOX"
            if passed
            else "OPEN_BERNSTEIN_NEGATIVE_CONTAINMENT_BOX_METHOD_OBSTRUCTION"
        ),
        "scope": {
            "normalization": "d6=1",
            "d5_over_d6": "(39/74)X",
            "d4_over_d5": "(65/186)Y",
            "same_rank_containment": [
                "f4=d4*U4", "f5=d5*U5", "f6=d6*U6"
            ],
            "unit_box": [str(variable) for variable in VARIABLES],
            "relaxations": (
                "Drops the positive N-dependent lower ratio bounds and every "
                "cross-rank compatibility relation between D and F."
            ),
        },
        "corners": rows,
        "proof_boundary": (
            "A PASS proves the four normalized endpoint numerators on this "
            "enclosing box (with d6=0 handled separately by homogeneity). "
            "A negative Bernstein coefficient or box value is not a graph "
            "counterexample and gives no sign claim on realizable tuples."
        ),
        "dependencies": {
            "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py": sha256(
                HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py"
            ),
            "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": sha256(
                HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SOURCE", sha256(Path(__file__)), flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
