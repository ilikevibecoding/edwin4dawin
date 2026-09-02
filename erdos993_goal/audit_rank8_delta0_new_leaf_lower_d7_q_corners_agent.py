#!/usr/bin/env python3
"""Independent replay of the two proved lower-d7 Delta0 new-leaf corners."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_lower_d7_q_corners_independent_audit_agent_20260823.json"

EXPECTED = {
    "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": "CC1F0204C2CBE3B202E35CEB60EBD6FA847CBEF1BE74DD255023198AB3707BAA",
    "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py": "D3A17F85CC3E31A229BED7E16201FCDA031E8C9D63ED5568AF0F90D0A66DBBBB",
    "prove_rank8_delta0_new_leaf_q_corners_agent.py": "8C6EA7FAC6FC2E057038C53EE55E7438E0A99FDC5B10E5AB43D335D604D3502D",
    "rank8_delta0_new_leaf_q_corners_exact_agent_20260823.json": "E7061EA4E69DCB8C03261B54F395804AC14434F6B1B121212AA49C9E9992596B",
    "verify_uniform_vk_large_order_reduction.py": "F340C4C1C45B9F10B7794DD17139594E4EC9789CA988870A46BB11B1D0DFF5B8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def residual_at_one(core: list[sp.Expr], deleted: list[sp.Expr]) -> sp.Expr:
    p7 = core[7] + core[6] + deleted[6]
    p8 = core[8] + core[7] + deleted[7]
    open9 = core[8]
    q8 = 16 * p8**2 - p7 * p8 - 18 * p7 * open9
    core_q = 16 * core[8] ** 2 - core[7] * core[8]
    deleted_q = 14 * deleted[7] ** 2 - deleted[6] * deleted[7]
    return sp.expand(
        8 * core[7] * deleted[6] * q8
        - 8 * deleted[6] * p7 * core_q
        - 9 * core[7] * p7 * deleted_q
    )


def corner_expression(upper_c8: bool) -> sp.Expr:
    d = sp.symbols("d0:9", nonnegative=True)
    f = sp.symbols("f0:8", nonnegative=True)
    source = [d[index] + (f[index - 1] if index else 0) for index in range(9)]
    # This audit owns only d7=0.  Make that substitution before forming the
    # Q7(C) endpoint because c7=d7+f6.
    source = [value.subs(d[7], 0) for value in source]
    c8_upper = sp.cancel(source[7] * (14 * source[7] - source[6]) / (16 * source[6]))
    source[8] = c8_upper if upper_c8 else sp.Integer(0)
    extended = [
        (source[index] + (d[index - 1] if index else 0)).subs(d[7], 0)
        for index in range(9)
    ]
    expression = sp.cancel(residual_at_one(extended, source))
    assert not expression.has(d[7])
    return expression


def bernstein(polynomial: sp.Poly) -> tuple[list[Fraction], tuple[int, ...]]:
    degrees = tuple(polynomial.degree(variable) for variable in polynomial.gens)
    power = {}
    for monomial, coefficient in polynomial.terms():
        numerator, denominator = coefficient.as_numer_denom()
        power[monomial] = Fraction(int(numerator), int(denominator))
    values = []
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = Fraction(0)
        for monomial, coefficient in power.items():
            if any(source > index for source, index in zip(monomial, target)):
                continue
            weight = Fraction(1)
            for source, index, degree in zip(monomial, target, degrees):
                weight *= Fraction(math.comb(index, source), math.comb(degree, source))
            value += coefficient * weight
        values.append(value)
    return values, degrees


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_q_corners_exact_agent_20260823.json").read_text()
    )
    assert primary["status"] == "OPEN_DELTA0_NEW_LEAF_Q_CORNERS_BERNSTEIN_NEGATIVE_NO_SIGN_CLAIM"

    X, U, Z = sp.symbols("X U Z", nonnegative=True)
    d5, d6, f5, f6 = sp.symbols("d5 d6 f5 f6", nonnegative=True)
    bound = sp.Rational(39, 74)
    rows = []
    expressions = []
    for mask, upper_c8 in ((0, False), (1, True)):
        expression = corner_expression(upper_c8)
        # The independently transcribed symbols are name-compatible.
        numerator, denominator = sp.fraction(expression)
        # The Q endpoint leaves a strictly positive denominator.  Certify the
        # cleared numerator itself, matching the sign reduction used by the
        # primary while deriving it here from the independently transcribed
        # residual.
        normalized = sp.cancel(
            numerator.subs(
                {d6: 1, d5: bound * X, f5: bound * X * U, f6: Z},
                simultaneous=True,
            )
        )
        normalized_numerator, normalized_denominator = sp.fraction(normalized)
        assert normalized_denominator > 0
        polynomial = sp.Poly(sp.expand(normalized_numerator), X, U, Z, domain=sp.QQ)
        coefficients, degrees = bernstein(polynomial)
        assert all(value >= 0 for value in coefficients)
        row = {
            "mask": mask,
            "upper_c8": upper_c8,
            "original_denominator": str(sp.factor(denominator)),
            "degrees": list(degrees),
            "coefficients": len(coefficients),
            "zero": sum(value == 0 for value in coefficients),
            "positive": sum(value > 0 for value in coefficients),
            "minimum": str(min(coefficients)),
        }
        expected_primary = primary["corners"][mask]
        assert row["degrees"] == expected_primary["bernstein_degrees"]
        assert row["minimum"] == Fraction(expected_primary["minimum"]).__str__()
        rows.append(row)
        expressions.append(expression)

    # Independent exact factor for the zero/zero corner.
    zero_factor = sp.factor(expressions[0])
    assert str(zero_factor).startswith("-(d6 + f6)*(")
    payload = {
        "schema": "rank8-delta0-new-leaf-lower-d7-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_DELTA0_NEW_LEAF_LOWER_D7_TWO_CORNERS",
        "hashes": actual,
        "scope": (
            "Both c8 endpoints when d7=0, under n>=27, d5/d6<=39/74, "
            "f5<=d5, f6<=d6, and C=D+xF."
        ),
        "rows": rows,
        "zero_zero_factor": str(zero_factor),
        "proof_boundary": (
            "The d7=Q6(D) upper corners remain unproved; therefore this does not "
            "close the complete new-leaf gate, any old-root gate, or connected Q8."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
