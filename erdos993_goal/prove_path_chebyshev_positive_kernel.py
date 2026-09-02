#!/usr/bin/env python3
"""Exact replay for the positive-kernel form of the path-slice size operator.

For s=2D (D may be an integer or a half-integer), center the palindromic
path-slice coefficient at i=D and use the frequency nu=i-D.  Increasing M
by one multiplies the nu-th centered Laurent coefficient by

    theta(nu^2) = ((A^2-nu^2)((A-1)^2-nu^2))
                  / (16((b^2-nu^2)(c^2-nu^2))),

where c=M-D-1, b=c+1/2, and A=2c+D+1.  This file proves the exact partial
fraction decomposition and the positivity of its hyperbolic-shift kernel.

This is a reduction, not a proof of root interlacing: a positive average of
hyperbolic shifts is not variation diminishing on arbitrary polynomials.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "path_chebyshev_positive_kernel_exact_20260809.json"


def path_coefficient(M: int, i: int) -> int:
    if i < 0 or i > M - 1:
        return 0
    return comb(2 * M - i - 1, i)


def size_ratio(M: int, i: int) -> Fraction:
    return Fraction(path_coefficient(M, i), path_coefficient(M - 1, i))


def centered_multiplier(M: int, s: int, i: int) -> Fraction:
    return size_ratio(M, i) * size_ratio(M, s - i)


def theta_formula(M: int, s: int, i: int) -> Fraction:
    # Work with doubled variables so that odd s is handled exactly too.
    # D=s/2, nu=i-D, c=M-D-1, b=c+1/2, A=2M-D-1.
    two_D = s
    two_nu = 2 * i - s
    two_c = 2 * M - s - 2
    two_b = two_c + 1
    two_A = 4 * M - s - 2

    def square_difference(two_left: int, two_right: int) -> int:
        return two_left * two_left - two_right * two_right

    numerator = square_difference(two_A, two_nu) * square_difference(
        two_A - 2, two_nu
    )
    denominator = 16 * square_difference(two_b, two_nu) * square_difference(
        two_c, two_nu
    )
    # Every square difference above is expressed with denominator 4; those
    # common powers cancel between numerator and denominator.
    return Fraction(numerator, denominator)


def symbolic_certificate() -> dict[str, str]:
    D, c, x = sp.symbols("D c x", positive=True)
    b = c + sp.Rational(1, 2)
    A = 2 * c + D + 1
    theta = sp.cancel(
        ((A**2 - x) * ((A - 1) ** 2 - x))
        / (16 * (b**2 - x) * (c**2 - x))
    )

    Rb = sp.factor(sp.limit((b**2 - x) * (theta - sp.Rational(1, 16)), x, b**2))
    Rc = sp.factor(sp.limit((c**2 - x) * (theta - sp.Rational(1, 16)), x, c**2))
    reconstruction = sp.factor(
        theta - sp.Rational(1, 16) - Rb / (b**2 - x) - Rc / (c**2 - x)
    )
    assert reconstruction == 0

    expected_Rb = -(
        (2 * D + 2 * c - 1)
        * (2 * D + 2 * c + 1)
        * (2 * D + 6 * c + 1)
        * (2 * D + 6 * c + 3)
    ) / (64 * (4 * c + 1))
    expected_Rc = (
        (D + c)
        * (D + 3 * c)
        * (D + c + 1)
        * (D + 3 * c + 1)
    ) / (4 * (4 * c + 1))
    assert sp.factor(Rb - expected_Rb) == 0
    assert sp.factor(Rc - expected_Rc) == 0
    # The displayed factorizations make the signs immediate for D,c>0.
    assert sp.factor(-Rb / expected_Rb) == -1
    assert sp.factor(Rc / expected_Rc) == 1

    # Since c<b, it is enough for positivity of
    #   w(u)=Rc/c exp(-cu)+Rb/b exp(-bu)
    # to prove Rc/c+Rb/b>0 at u=0.  After clearing its positive
    # denominator, the gap has only positive coefficients in D,c.
    gap = sp.factor(Rc / c + Rb / b)
    gap_numerator, gap_denominator = map(sp.factor, sp.fraction(gap))
    gap_poly = sp.Poly(sp.expand(gap_numerator), D, c)
    assert all(coefficient > 0 for coefficient in gap_poly.coeffs())
    denominator_poly = sp.Poly(sp.expand(gap_denominator), D, c)
    assert all(coefficient > 0 for coefficient in denominator_poly.coeffs())

    # The Laplace identity is
    # 1/(a^2-nu^2)=(1/a) int_0^infinity exp(-au)cosh(nu u)du.
    # Algebraically its elementary integral is a/(a^2-nu^2).
    a, nu = sp.symbols("a nu", positive=True)
    elementary_integral = sp.factor(
        sp.Rational(1, 2) * (1 / (a - nu) + 1 / (a + nu))
    )
    assert sp.factor(elementary_integral / a - 1 / (a**2 - nu**2)) == 0

    return {
        "theta": str(sp.factor(theta)),
        "Rb": str(Rb),
        "Rc": str(Rc),
        "kernel_gap": str(gap),
        "kernel_gap_positive_numerator": str(gap_numerator),
        "kernel_gap_positive_denominator": str(gap_denominator),
    }


def finite_transcription_checks(max_layer: int) -> dict[str, int]:
    checks = 0
    for s in range(2, max_layer + 1):
        for excess in (0, 1, 5, 17, 73):
            M = 2 * s + 5 + excess
            for i in range(s + 1):
                assert centered_multiplier(M, s, i) == theta_formula(M, s, i)
                checks += 1
    return {"max_layer": max_layer, "exact_frequency_checks": checks}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-layer", type=int, default=100)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    symbolic = symbolic_certificate()
    finite = finite_transcription_checks(args.max_layer)
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_PATH_CHEBYSHEV_POSITIVE_KERNEL_REPLAY",
        "all_order_results": [
            "the adjacent-size multiplier is a rational function of the centered frequency squared",
            "its two-resolvent partial fraction decomposition is exact",
            "although one residue is negative, the combined exponential kernel is strictly positive for u>=0",
            "the operator is a positive hyperbolic-shift average on centered Laurent polynomials",
        ],
        "symbolic_certificate": symbolic,
        "finite_transcription_scope": finite,
        "remaining_target": (
            "Prove that this positive shift kernel is variation diminishing on the special path-slice "
            "orbit (or add a sharp root-mesh estimate); positivity alone is false as a generic "
            "Chebyshev multiplier theorem."
        ),
        "source_sha256": source_hash,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(
        json.dumps(
            {
                "status": report["status"],
                **finite,
                "source_sha256": source_hash,
                "report_sha256": report_hash,
                "report": str(args.output),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
