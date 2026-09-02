#!/usr/bin/env python3
"""Verify coefficient forms of two-sided and all-branch C12 compensation."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUTPUT = Path(
    "two_sided_compensation_scalar_certificate_20260729.json"
)


def main() -> None:
    r = sp.symbols("r", positive=True, integer=True)
    k = r + 1
    a, ap, bm, b, bp = sp.symbols(
        "a ap bm b bp", positive=True
    )
    gt, gf = sp.symbols("gt gf", real=True)
    d, upper, lc = sp.symbols(
        "d upper lc", nonnegative=True
    )

    v = k * ap / a
    q_t = gt / (a * ap)
    q_f = gf / (bm * b)
    h = 2 * k * q_t - r * q_f
    epsilon = k * d / (a * b)
    zeta = k * upper / (a * bm)
    s = b / a
    delta = k * lc / (bm * b)

    bcl_margin = v * h - 2 * k * (
        r * epsilon + zeta**2
    )
    clearing_factor = a**2 * bm**2 * b / k
    cleared_from_ratios = sp.factor(
        clearing_factor * bcl_margin
    )
    cleared_coefficients = (
        2 * k * bm**2 * b * gt
        - r * a * ap * bm * gf
        - 2 * k * r * a * bm**2 * d
        - 2 * k**2 * b * upper**2
    )
    gbcl_margin = v * h - 2 * k * (
        r * epsilon + zeta**2 + s * delta
    )
    generalized_cleared_from_ratios = sp.factor(
        clearing_factor * gbcl_margin
    )
    generalized_cleared_coefficients = (
        cleared_coefficients
        - 2 * k * a * bm * b * lc
    )
    theta = bm / (a + bm)
    negative_cross_margin = (
        v * h
        + k * s * (r + 2) * q_f
        - 2 * k * (s * delta + theta * zeta**2)
    )
    negative_cross_cleared_from_ratios = sp.factor(
        clearing_factor
        * (a + bm)
        * negative_cross_margin
    )
    negative_cross_cleared_coefficients = (
        (a + bm)
        * (
            2 * k * bm**2 * b * gt
            - r * a * ap * bm * gf
            + a * bm * b * (r + 2) * gf
            - 2 * k * a * bm * b * lc
        )
        - 2 * k**2 * bm * b * upper**2
    )

    identities = {
        "epsilon_conversion": sp.factor(
            epsilon - k * d / (a * b)
        )
        == 0,
        "zeta_conversion": sp.factor(
            zeta - k * upper / (a * bm)
        )
        == 0,
        "delta_conversion": sp.factor(
            delta - k * lc / (bm * b)
        )
        == 0,
        "coefficient_clearing": sp.factor(
            cleared_from_ratios - cleared_coefficients
        )
        == 0,
        "generalized_coefficient_clearing": sp.factor(
            generalized_cleared_from_ratios
            - generalized_cleared_coefficients
        )
        == 0,
        "negative_cross_coefficient_clearing": sp.factor(
            negative_cross_cleared_from_ratios
            - negative_cross_cleared_coefficients
        )
        == 0,
    }
    if not all(identities.values()):
        raise AssertionError(identities)

    report = {
        "status": "PASS_SYMBOLIC",
        "identities": identities,
        "clearing_factor": "a^2*(b_minus)^2*b/k",
        "coefficient_form": (
            "2k(b-)^2 b Gk(T)-r a a+ b- Gr(F) "
            ">= 2kr a(b-)^2 D + 2k^2 b U^2"
        ),
        "generalized_coefficient_form": (
            "2k(b-)^2 b Gk(T)-r a a+ b- Gr(F) "
            ">= 2kr a(b-)^2 D + 2k^2 b U^2 "
            "+ 2k a b- b L"
        ),
        "negative_cross_coefficient_form": (
            "(a+b-){2k(b-)^2 b Gk(T)-r a a+ b- Gr(F)"
            "+a b- b(r+2)Gr(F)-2k a b- b L}"
            " >= 2k^2 b- b U^2"
        ),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
