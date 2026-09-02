#!/usr/bin/env python3
"""Exact unit-outlier boundary reduction for the last Pochhammer coupling.

For a polynomial Q(z)=sum q_j z^j, put

    P_C[Q](x) = sum q_j x^fall_j / C^rise_j.

The elementary operator

    L_(a,C)F = a(C+x)F(x) + (4-a)xF(x-1)

satisfies the exact contiguous identity

    L_(a,C) P_(C+1)[Q] = 4C P_C[(z+a/4)Q].

At the unit boundary u=v=1, two applications add the two source roots
-1/4.  If the intermediate polynomial J has mesh at least one, a direct
sign argument places r positive roots of the final polynomial strictly to
the right of the r positive roots of H=P_(B+2)[Q].  This proves the desired
root-product inequality on that boundary.

The symbolic identities and the r=1 mesh theorem below are proofs.  The
higher-degree exact root-isolation audit is finite evidence only.  The file
also records an exact counterexample showing why mesh of H alone cannot prove
the needed intermediate-mesh statement: the full normalized-Pochhammer source
structure is essential.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_unit_outlier_mesh_boundary_reduction_exact_20260809.json"
X, Z = sp.symbols("x z")


def fall(value: sp.Expr, order: int) -> sp.Expr:
    return sp.prod(value - index for index in range(order))


def normalized_pochhammer(expression: sp.Expr, parameter: sp.Expr) -> sp.Expr:
    source = sp.Poly(sp.expand(expression), Z)
    return sp.expand(
        sum(
            source.nth(index) * fall(X, index) / sp.rf(parameter, index)
            for index in range(source.degree() + 1)
        )
    )


def operator(expression: sp.Expr, a: sp.Expr, parameter: sp.Expr) -> sp.Expr:
    return sp.expand(
        a * (parameter + X) * expression
        + (4 - a) * X * expression.subs(X, X - 1)
    )


def symbolic_identities(maximum_degree: int = 6) -> dict[str, object]:
    a, C = sp.symbols("a C")
    checks = 0
    composition_checks = 0

    for degree in range(maximum_degree + 1):
        coefficients = sp.symbols(f"q0:{degree + 1}")
        source = sum(coefficients[index] * Z**index for index in range(degree + 1))
        transformed = normalized_pochhammer(source, C + 1)
        left = operator(transformed, a, C)
        right = 4 * C * normalized_pochhammer((Z + a / 4) * source, C)
        assert sp.cancel(sp.expand(left - right)) == 0
        checks += 1

        B = sp.symbols("B")
        H = normalized_pochhammer(source, B + 2)
        J = operator(H, 1, B + 1)
        T = operator(J, 1, B)
        expected_J = 4 * (B + 1) * normalized_pochhammer((Z + sp.Rational(1, 4)) * source, B + 1)
        expected_T = 16 * B * (B + 1) * normalized_pochhammer(
            (Z + sp.Rational(1, 4)) ** 2 * source, B
        )
        assert sp.cancel(sp.expand(J - expected_J)) == 0
        assert sp.cancel(sp.expand(T - expected_T)) == 0
        composition_checks += 2

    return {
        "checked_degrees": list(range(maximum_degree + 1)),
        "contiguous_identity_checks": checks,
        "unit_boundary_composition_checks": composition_checks,
        "contiguous_identity": (
            "L_(a,C) P_(C+1)[Q] = 4*C P_C[(z+a/4)Q]"
        ),
        "unit_boundary_intermediate": (
            "J=(B+1+x)H(x)+3xH(x-1)="
            "4(B+1)P_(B+1)[(z+1/4)Q]"
        ),
        "unit_boundary_final": (
            "T=(B+x)J(x)+3xJ(x-1)="
            "16B(B+1)P_B[(z+1/4)^2Q]"
        ),
    }


def rank_one_theorem() -> dict[str, object]:
    B, lam, beta = sp.symbols("B lambda beta", nonnegative=True)
    H = X - (B + 2) * lam
    J = sp.factor(operator(H, 1, B + 1))
    displayed = (
        -B**2 * lam
        - 4 * B * lam * X
        - 3 * B * lam
        + B * X
        - 8 * lam * X
        - 2 * lam
        + 4 * X**2
        - 2 * X
    )
    assert sp.expand(J - displayed) == 0

    polynomial = sp.Poly(J, X)
    discriminant = sp.discriminant(polynomial.as_expr(), X)
    gap_squared_minus_one = sp.factor(discriminant / polynomial.LC() ** 2 - 1)
    claimed = sp.factor(
        (B + 2)
        * (16 * B * lam**2 + 8 * B * lam + B + 32 * lam**2 + 32 * lam - 6)
        / 16
    )
    assert sp.expand(gap_squared_minus_one - claimed) == 0

    shifted_numerator = sp.Poly(
        sp.expand(16 * claimed.subs(B, beta + 7)), beta, lam
    )
    assert all(coefficient >= 0 for coefficient in shifted_numerator.coeffs())
    assert shifted_numerator.TC() > 0

    return {
        "H": str(H),
        "J": str(J),
        "root_gap_squared_minus_one": str(claimed),
        "positivity_certificate": (
            "After B=7+beta, beta>=0 and lambda>=0, sixteen times the "
            "displayed expression has nonnegative coefficients and positive "
            "constant term. Thus the two roots of J are separated by more "
            "than one for every B>=7. Its constant term is negative when "
            "lambda>0, so it has one negative and one positive root."
        ),
    }


def isolated_intervals(expression: sp.Expr) -> list[tuple[sp.Rational, sp.Rational]]:
    polynomial = sp.Poly(sp.expand(expression), X, domain=sp.QQ)
    roots: list[tuple[sp.Rational, sp.Rational]] = []
    for interval, multiplicity in polynomial.intervals(eps=sp.Rational(1, 10**32)):
        left, right = interval
        roots.extend(
            [(sp.Rational(left), sp.Rational(right))] * int(multiplicity)
        )
    roots.sort(key=lambda pair: pair[0])
    assert len(roots) == polynomial.degree()
    return roots


def mesh_is_at_least_one(
    intervals: list[tuple[sp.Rational, sp.Rational]],
) -> bool:
    return all(
        intervals[index + 1][0] - intervals[index][1] >= 1
        for index in range(len(intervals) - 1)
    )


def primitive_digest(expression: sp.Expr) -> str:
    polynomial = sp.Poly(sp.expand(expression), X, domain=sp.QQ)
    _, integer = polynomial.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    payload = ",".join(map(str, primitive.all_coeffs()))
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def exact_structured_audit() -> dict[str, object]:
    cases: list[dict[str, object]] = []
    digests: list[str] = []

    for rank in range(1, 7):
        lambdas = [
            sp.Rational((index + 1) ** 2, 5 * rank + 7)
            for index in range(rank)
        ]
        source = sp.prod(Z - value for value in lambdas)
        for offset in (0, 3):
            B = 3 * rank + 4 + offset
            H = normalized_pochhammer(source, B + 2)
            J = operator(H, 1, B + 1)
            H_roots = isolated_intervals(H)
            J_roots = isolated_intervals(J)

            assert all(left > 0 for left, _ in H_roots)
            assert mesh_is_at_least_one(H_roots)
            assert sum(int(bool(right < 0)) for _, right in J_roots) == 1
            assert sum(int(bool(left > 0)) for left, _ in J_roots) == rank
            assert mesh_is_at_least_one(J_roots)

            H_digest = primitive_digest(H)
            J_digest = primitive_digest(J)
            digests.extend([H_digest, J_digest])
            cases.append(
                {
                    "rank": rank,
                    "B": B,
                    "source_nodes": [str(value) for value in lambdas],
                    "H_primitive_sha256": H_digest,
                    "J_primitive_sha256": J_digest,
                }
            )

    return {
        "cases": len(cases),
        "maximum_rank": 6,
        "B_values": "B=3r+4 and B=3r+7",
        "exact_checks": (
            "H has r positive roots and mesh at least one; J has one negative "
            "and r positive roots and mesh at least one."
        ),
        "cases_detail": cases,
        "combined_primitive_digest": hashlib.sha256(
            "".join(digests).encode("ascii")
        ).hexdigest(),
    }


def arbitrary_mesh_counterexample() -> dict[str, object]:
    B = 10
    H = (X - sp.Rational(1, 4)) * (X - sp.Rational(5, 4))
    J = sp.factor(operator(H, 1, B + 1))
    expected = (4 * X - 5) * (16 * X**2 + 16 * X - 11) / 16
    assert sp.expand(J - expected) == 0
    positive_gap = (7 - sp.sqrt(15)) / 4
    assert positive_gap > 0
    assert positive_gap < 1
    return {
        "B": B,
        "H": str(sp.factor(H)),
        "H_mesh": "1 exactly",
        "J": str(J),
        "J_roots": [
            "(-2-sqrt(15))/4",
            "(-2+sqrt(15))/4",
            "5/4",
        ],
        "positive_root_gap": str(positive_gap),
        "conclusion": (
            "The positive gap is (7-sqrt(15))/4<1. Therefore the required "
            "mesh preservation is false for arbitrary positive mesh-one H; "
            "the normalized-Pochhammer source structure is essential."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    identities = symbolic_identities()
    rank_one = rank_one_theorem()
    audit = exact_structured_audit()
    counterexample = arbitrary_mesh_counterexample()
    report = {
        "kind": "window_unit_outlier_mesh_boundary_reduction_exact",
        "date": "2026-08-09",
        "status": "PASS_EXACT_UNIT_OUTLIER_BOUNDARY_REDUCTION_AND_FINITE_AUDIT",
        "identities": identities,
        "conditional_boundary_proof": {
            "hypotheses": (
                "Q has r positive roots; H=P_(B+2)[Q] has positive roots "
                "xi_1<...<xi_r with mesh at least one; and the intermediate "
                "J=(B+1+x)H+3xH(x-1) has one negative root and r positive "
                "roots eta_1<...<eta_r with mesh at least one."
            ),
            "first_step": (
                "The roots -B-1,xi_i of (B+1+x)H and the roots 0,xi_i+1 "
                "of xH(x-1) strictly interlace, so eta_i lies in "
                "(xi_i,xi_i+1)."
            ),
            "second_step": (
                "At every eta_i, T(eta_i)=3*eta_i*J(eta_i-1). The mesh "
                "hypothesis gives alternating signs at consecutive eta_i, "
                "T(eta_r)<0, and T(+infinity)>0. Thus T has one positive "
                "root in each (eta_i,eta_(i+1)) and one above eta_r."
            ),
            "conclusion": (
                "The r selected positive roots alpha_i of T satisfy "
                "alpha_i>eta_i>xi_i after ordering, hence "
                "prod(alpha_i)>prod(xi_i). This is the desired last-coupling "
                "product inequality at u=v=1."
            ),
        },
        "rank_one_all_parameter_theorem": rank_one,
        "higher_rank_finite_evidence": audit,
        "source_structure_guard": counterexample,
        "remaining_lemma": (
            "Prove for every r and B>=3r+4 that, when Q has positive roots, "
            "J=P_(B+1)[(z+1/4)Q] has mesh at least one (including the "
            "negative-to-positive gap), using its full normalized-Pochhammer "
            "source structure. Then extend the boundary argument from "
            "u=v=1 to 0<u,v<=1 or prove the general product inequality "
            "directly."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(args.output.resolve())}, indent=2))


if __name__ == "__main__":
    main()
