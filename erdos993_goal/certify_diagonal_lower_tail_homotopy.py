#!/usr/bin/env python3
"""Exact finite homotopy certificate for the diagonal group source.

Use the homogeneous component notation from
``certify_diagonal_component_tail_sturm.py``.  The diagonal source is

    H_N=T_2=A_2+T_3.

The lower tails T_6,T_5,T_4,T_3 are real-rooted in the certified range.
For

    P_N(x,z)=T_3(x)+z A_2(x),       0 <= z <= 1,

the degree rises by one as z leaves zero, with the new root entering from
negative infinity.  If Disc_x(P_N) is positive on [0,1], no collision can
occur and P_N(x,1)=H_N is real-rooted.  Positivity on the interval is
certified here by strictly positive exact Bernstein coefficients.

This is a finite exact certificate and a sharply stated all-order target,
not an all-order proof of Bernstein positivity.

Equivalently, under z=t/(1+t), Bernstein positivity is ordinary
coefficientwise positivity of Disc_x(T_3+t H_N), because discriminants scale
with degree 2 deg(H_N)-2.  This form connects the certificate directly to a
Bezout-determinant factorization target.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from certify_diagonal_component_tail_sturm import (
    grouped_polynomials,
    isolating_intervals,
    strictly_interlaces,
)
from probe_quadratic_kernel_monomial_components import X


HERE = Path(__file__).resolve().parent
Z = sp.symbols("Z")


def rational_vector_digest(values: list[sp.Rational]) -> str:
    payload = ";".join(f"{sp.numer(v)}/{sp.denom(v)}" for v in values)
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def bernstein_coefficients(poly: sp.Poly) -> list[sp.Rational]:
    degree = poly.degree()
    powers = [poly.nth(k) for k in range(degree + 1)]
    return [
        sp.cancel(sum(
            powers[k] * sp.binomial(j, k) / sp.binomial(degree, k)
            for k in range(j + 1)
        ))
        for j in range(degree + 1)
    ]


def one_size(N: int) -> dict[str, object]:
    A, T = grouped_polynomials(N)
    tail_intervals = {
        degree: isolating_intervals(T[degree]) for degree in range(3, 7)
    }
    lower_tail_interlacing = {
        str(degree): strictly_interlaces(
            tail_intervals[degree + 1], tail_intervals[degree]
        )
        for degree in range(3, 6)
    }
    assert all(lower_tail_interlacing.values())

    pencil = sp.Poly(T[3].as_expr() + Z * A[2].as_expr(), X)
    discriminant = sp.Poly(
        sp.discriminant(pencil.as_expr(), X), Z, domain=sp.QQ
    )
    bernstein = bernstein_coefficients(discriminant)
    assert all(value > 0 for value in bernstein)

    # The leading coefficients of T_3 and A_2 are positive.  Hence the one
    # root created by the degree jump satisfies
    # x ~ -LC(T_3)/(z LC(A_2)) and enters from negative infinity.
    assert T[3].LC() > 0 and A[2].LC() > 0
    minimum_index = min(
        range(len(bernstein)),
        key=lambda index: float(bernstein[index] / bernstein[0]),
    )
    return {
        "N": N,
        "H_degree": A[2].degree(),
        "T3_degree": T[3].degree(),
        "lower_tail_interlacing": lower_tail_interlacing,
        "discriminant_degree_in_Z": discriminant.degree(),
        "bernstein_coefficient_count": len(bernstein),
        "all_bernstein_coefficients_strictly_positive": True,
        "minimum_normalized_bernstein_index": minimum_index,
        "minimum_normalized_bernstein_value_decimal": str(
            sp.N(bernstein[minimum_index] / bernstein[0], 20)
        ),
        "discriminant_power_coefficients_sha256": rational_vector_digest(
            [discriminant.nth(k) for k in range(discriminant.degree() + 1)]
        ),
        "discriminant_bernstein_coefficients_sha256": rational_vector_digest(
            bernstein
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sizes", default="4,7,10,13,16")
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "diagonal_lower_tail_homotopy_20260804.json",
    )
    args = parser.parse_args()
    sizes = [int(value) for value in args.sizes.split(",")]
    records = []
    for N in sizes:
        record = one_size(N)
        records.append(record)
        print(
            f"N={N}: lower tail interlaces and all "
            f"{record['bernstein_coefficient_count']} Bernstein coefficients are positive",
            flush=True,
        )
    report = {
        "status": "PASS_FINITE_EXACT_DIAGONAL_LOWER_TAIL_HOMOTOPY",
        "pencil": "P_N(X,Z)=T_3(X)+Z A_2(X), P_N(X,1)=H_N(X)",
        "sizes": sizes,
        "records": records,
        "finite_argument": (
            "T_3 has simple real roots; one root enters from negative infinity "
            "for Z>0; strict Bernstein positivity proves Disc_X(P_N)>0 on "
            "[0,1], so all roots remain real through P_N(X,1)=H_N."
        ),
        "mobius_identity": (
            "(1+t)^(2n-2) Disc_X R_N(X,t/(1+t))="
            "Disc_X(T_3(X)+t H_N(X)); Bernstein positivity on [0,1] "
            "equals power-coefficient positivity on the right"
        ),
        "scope": (
            "This rigorously proves the diagonal source real-rooted at the "
            "listed finite sizes.  An all-order proof of the lower-tail "
            "interlacing and Bernstein positivity remains required."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
