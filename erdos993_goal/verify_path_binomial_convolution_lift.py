#!/usr/bin/env python3
"""Verify the positive pure-count two-layer convolution identity."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


def main() -> None:
    z, w = sp.symbols("z w")
    zeta = z * (1 + z)
    omega = w * (1 + w)
    multiplier = sp.expand(
        (1 + z) * (1 + w) * (zeta + omega) ** 2
        - z * w
    )
    polynomial = sp.Poly(multiplier, z, w)
    terms = polynomial.terms()
    negative = [
        (monomial, coefficient)
        for monomial, coefficient in terms
        if coefficient < 0
    ]
    assert not negative
    report = {
        "status": (
            "PASS_PATH_BINOMIAL_CONVOLUTION_TWO_LAYER_LIFT"
        ),
        "atom_identity": (
            "binom(u+A,C-u)=[z^C](1+z)^A"
            "(z(1+z))^u"
        ),
        "convolution_identity": (
            "sum_u binom(d,u) binom(u+A,C-u) "
            "binom(d-u+B,D-(d-u)) = "
            "[z^C w^D](1+z)^A(1+w)^B"
            "(z(1+z)+w(1+w))^d"
        ),
        "lift": (
            "S_(d+2)(A+1,B+1,C+1,D+1)"
            "-S_d(A,B,C,D)>=0 for A,B,C,D,d>=0"
        ),
        "positive_multiplier": str(multiplier),
        "multiplier_term_count": len(terms),
        "smallest_coefficient": min(
            int(coefficient) for _, coefficient in terms
        ),
        "negative_coefficient_count": len(negative),
        "proof_summary": (
            "Rewrite the old coefficient at targets C+1,D+1 "
            "by multiplying its integrand by zw. The new integrand "
            "is obtained by multiplying by "
            "(1+z)(1+w)(z(1+z)+w(1+w))^2. Their difference is the "
            "displayed 21-term polynomial, whose coefficients are "
            "strictly positive."
        ),
    }
    Path(
        "path_binomial_convolution_two_layer_lift_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
