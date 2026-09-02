#!/usr/bin/env python3
"""Exact Bernstein tests for the four Delta0 attach-at-old-root Q corners.

For a tree A of order n>=27 and q=v, put H=A-v and K=A-N[v].  Then
C=H+xK, C'=C+xH, and H'=(1+x)H.  On the guarded branch |K|>=13, the
known forest Q7(H) and Q6(K) inequalities give sharp upper endpoints for
h8 and k7.  This producer tests two independent rectangular relaxations of
the remaining compatible coefficient cone.  A negative Bernstein control is
only a failure of that relaxation and receives no theorem credit.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent as leaf


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_attach_old_root_q_corners_exact_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q_upper(row: tuple[sp.Symbol, ...], rank: int) -> sp.Expr:
    return sp.cancel(
        row[rank] * (2 * rank * row[rank] - row[rank - 1])
        / (2 * (rank + 1) * row[rank - 1])
    )


def corner(mask: int) -> tuple[sp.Expr, sp.Expr]:
    expression = leaf.build_gates()["attach_at_old_root_structural"][0]
    expression = expression.subs(
        {
            leaf.h[8]: q_upper(leaf.h, 7) if mask & 1 else sp.Integer(0),
            leaf.k[7]: q_upper(leaf.k, 6) if mask & 2 else sp.Integer(0),
        },
        simultaneous=True,
    )
    numerator, denominator = sp.fraction(sp.cancel(expression))
    assert not numerator.has(leaf.h[8], leaf.k[7])
    return sp.expand(numerator), sp.factor(denominator)


def bernstein(polynomial: sp.Poly) -> tuple[list[Fraction], tuple[int, ...]]:
    degrees = tuple(polynomial.degree(variable) for variable in polynomial.gens)
    power = {}
    for monomial, coefficient in polynomial.terms():
        p, q = coefficient.as_numer_denom()
        power[monomial] = Fraction(int(p), int(q))
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
    X, Y, Z, W = sp.symbols("X Y Z W", nonnegative=True)
    # Selected-degree bounds at the least order |H|=26:
    # 7*h7/h6 >= 26-18+12/26=110/13 and
    # 6*h6/h5 >= 26-15+10/26=148/13.
    h6_over_h7 = sp.Rational(91, 110)
    h5_over_h6 = sp.Rational(39, 74)
    base = {
        leaf.h[7]: sp.Integer(1),
        leaf.h[6]: h6_over_h7 * X,
        leaf.h[5]: h6_over_h7 * X * h5_over_h6 * Y,
        leaf.k[6]: h6_over_h7 * X * Z,
    }
    relaxations = {
        # Q6(K)>=0 and |K|>=13 imply 0<k5<12*k6.  This box preserves
        # that condition but deliberately drops k5<=h5.
        "q6_feasible_box": {
            **base,
            leaf.k[5]: 12 * h6_over_h7 * X * Z * W,
        },
        # Induced containment K subset H gives k5<=h5.  This box preserves
        # containment but deliberately drops k5<=12*k6.
        "containment_box": {
            **base,
            leaf.k[5]: h6_over_h7 * X * h5_over_h6 * Y * W,
        },
    }

    rows = []
    a_relaxation_passes_all = {name: True for name in relaxations}
    for mask in range(4):
        numerator, denominator = corner(mask)
        polynomial = sp.Poly(numerator, leaf.h[5], leaf.h[6], leaf.h[7], leaf.k[5], leaf.k[6])
        total_degrees = {sum(monomial) for monomial, _ in polynomial.terms()}
        assert len(total_degrees) == 1
        tests = {}
        for name, substitution in relaxations.items():
            normalized = sp.expand(numerator.subs(substitution, simultaneous=True))
            box = sp.Poly(normalized, X, Y, Z, W, domain=sp.QQ)
            coefficients, degrees = bernstein(box)
            negative = sum(value < 0 for value in coefficients)
            a_relaxation_passes_all[name] &= negative == 0
            tests[name] = {
                "degrees": list(degrees),
                "power_terms": len(box.terms()),
                "bernstein_coefficients": len(coefficients),
                "negative": negative,
                "zero": sum(value == 0 for value in coefficients),
                "positive": sum(value > 0 for value in coefficients),
                "minimum": f"{min(coefficients).numerator}/{min(coefficients).denominator}",
            }
        rows.append(
            {
                "mask": mask,
                "h8_endpoint": "Q7(H)_upper" if mask & 1 else "zero",
                "k7_endpoint": "Q6(K)_upper" if mask & 2 else "zero",
                "positive_denominator": str(denominator),
                "homogeneous_degree": next(iter(total_degrees)),
                "tests": tests,
            }
        )

    successful = [name for name, passed in a_relaxation_passes_all.items() if passed]
    status = (
        "PASS_EXACT_DELTA0_ATTACH_OLD_ROOT_ALL_FOUR_Q_CORNERS"
        if successful
        else "OPEN_DELTA0_ATTACH_OLD_ROOT_Q_CORNERS_BERNSTEIN_NEGATIVE_NO_SIGN_CLAIM"
    )
    payload = {
        "schema": "rank8-delta0-attach-old-root-four-q-corners-bernstein-v1",
        "status": status,
        "successful_relaxations": successful,
        "scope_if_pass": (
            "Every tree A of order n>=27, q=v, and |K=A-N[v]|>=13: "
            "Delta0 R_1(A+w,q)-Delta0 R_1(A,q)>=0."
        ),
        "exact_inputs": [
            "H=A-v, K=A-N[v], C=H+xK, C'=C+xH, H'=(1+x)H",
            "separate concavity in h8 and k7",
            "forest Q7(H) and, on |K|>=13, forest Q6(K)",
            "h6/h7<=91/110 and h5/h6<=39/74 for |H|=n-1>=26",
            "K induced in H gives k5<=h5 and k6<=h6",
            "Q6(K)>=0 with |K|>=13 gives k5<12*k6",
        ],
        "box_variables": "0<=X,Y,Z,W<=1",
        "rows": rows,
        "source_sha256": {
            "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": sha256(
                HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py"
            ),
            "verify_uniform_vk_large_order_reduction.py": sha256(
                HERE / "verify_uniform_vk_large_order_reduction.py"
            ),
        },
        "proof_boundary": (
            "If no single listed relaxation passes all four corners, no attach-root "
            "theorem is credited.  The |K|<=12 (hence degree-surplus) branch, "
            "Delta1..3, other roots, connected Q8, and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    for row in rows:
        print("MASK", row["mask"], {name: value["negative"] for name, value in row["tests"].items()})
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
