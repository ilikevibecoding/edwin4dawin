#!/usr/bin/env python3
"""Exact replay for the all-order active-box Gegenbauer theorem.

For integers j,h >= 0, put

    W_{j,h}(z) = [x^h] (1-x)
      / (1-(2+3z)x+(1+z)x^2)^(j+1).

The all-order proof writes, for -8/9 < z < 0,

    y = sqrt(1+z),  u = (2+3z)/(2y),
    W_{j,h}(z) = y^h C_h^(j+1)(u) - y^(h-1) C_(h-1)^(j+1)(u).

Consecutive Gegenbauer zeros strictly interlace.  Evaluating the displayed
combination at the zeros of C_h and at u=1 gives h distinct roots in
(-8/9,0), which exhaust its degree.  Thus W is PF-infinity and its
coefficients divided by binom(h,l) are log-concave.

This script independently replays the algebraic identities, exact Sturm
root counts, normalized Newton minors, and the terminal coefficient odds on
a finite range.  The Gegenbauer/interlacing argument above is the all-order
proof; the finite replay guards its transcription.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_poly

from probe_group_selector_gamma_root_pattern import root_count, sturm_chain


HERE = Path(__file__).resolve().parent
REPORT = HERE / "active_box_gegenbauer_ulc_exact_20260810.json"

x, z, y = sp.symbols("x z y")


def direct_w(j: int, h: int) -> sp.Poly:
    denominator = 1 - (2 + 3 * z) * x + (1 + z) * x**2
    coefficient = sp.series(
        (1 - x) * denominator ** (-j - 1), x, 0, h + 1
    ).removeO().coeff(x, h)
    return sp.Poly(sp.expand(coefficient), z)


def active_weight(j: int, h: int, ell: int) -> sp.Integer:
    """Return [z^ell]W using the positive active-box coefficient formula."""
    if not 0 <= ell <= h:
        return sp.Integer(0)
    coefficient = (
        sp.binomial(j + ell, j)
        * sp.expand((1 + x) ** (2 * j + h) * (3 + 2 * x) ** ell).coeff(
            x, h - ell
        )
    )
    return sp.Integer(coefficient)


def active_generating_identity(j: int) -> bool:
    """Check the rational row identity before coefficient extraction."""
    activity = x * (3 - x) / (1 - x) ** 2
    left = (1 - x) ** (-2 * j - 1) * (1 - z * activity) ** (-j - 1)
    denominator = 1 - (2 + 3 * z) * x + (1 + z) * x**2
    right = (1 - x) / denominator ** (j + 1)
    return sp.factor(left - right) == 0


def gegenbauer_identity(j: int, h: int, polynomial: sp.Poly) -> bool:
    """Check the identity after z=y^2-1, avoiding algebraic square roots."""
    lam = j + 1
    u = (3 * y**2 - 1) / (2 * y)
    current = sp.gegenbauer(h, lam, u)
    previous = sp.Integer(0) if h == 0 else sp.gegenbauer(h - 1, lam, u)
    right = y**h * current
    if h:
        right -= y ** (h - 1) * previous
    left = polynomial.as_expr().subs(z, y**2 - 1)
    return sp.cancel(left - sp.expand_func(right)) == 0


def one_case(j: int, h: int) -> dict[str, object]:
    polynomial = direct_w(j, h)
    coefficients = [sp.Integer(polynomial.nth(ell)) for ell in range(h + 1)]
    active = [active_weight(j, h, ell) for ell in range(h + 1)]
    assert coefficients == active
    assert polynomial.degree() == h
    assert all(value > 0 for value in coefficients)
    assert gegenbauer_identity(j, h, polynomial)

    normalized_newton = 0
    for ell in range(1, h):
        minor = (
            coefficients[ell] ** 2
            * sp.binomial(h, ell - 1)
            * sp.binomial(h, ell + 1)
            - coefficients[ell - 1]
            * coefficients[ell + 1]
            * sp.binomial(h, ell) ** 2
        )
        assert minor > 0
        normalized_newton += 1

    terminal_odds = None
    if h:
        left = sp.Rational(h * coefficients[h], coefficients[h - 1])
        right = sp.Rational(9 * (j + h), 5 * h + 6 * j - 2)
        assert left == right
        terminal_odds = str(left)

    exact_roots = 0
    if h:
        flint_polynomial = fmpq_poly([int(value) for value in coefficients])
        chain = sturm_chain([int(value) for value in coefficients])
        exact_roots = root_count(chain, fmpq(-8, 9), fmpq(0))
        assert exact_roots == h == flint_polynomial.degree()

    return {
        "j": j,
        "h": h,
        "degree": polynomial.degree(),
        "positive_coefficients": len(coefficients),
        "normalized_newton_minors": normalized_newton,
        "exact_roots_in_open_minus_eight_ninths_zero": exact_roots,
        "terminal_normalized_odds": terminal_odds,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-j", type=int, default=6)
    parser.add_argument("--max-h", type=int, default=12)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    if args.max_j < 0 or args.max_h < 0:
        raise ValueError("bounds must be nonnegative")

    row_identities = 0
    for j in range(args.max_j + 1):
        assert active_generating_identity(j)
        row_identities += 1

    records = [
        one_case(j, h)
        for j in range(args.max_j + 1)
        for h in range(args.max_h + 1)
    ]
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_ACTIVE_BOX_GEGENBAUER_ULC_THEOREM_REPLAY",
        "all_order_theorem": [
            "the active-weight row generating function equals the displayed quadratic-denominator power",
            "the quadratic denominator is the Gegenbauer generating function after z maps from (-8/9,0) to u in (-1,1)",
            "strict consecutive Gegenbauer interlacing plus the sign at u=1 gives h distinct roots in (-8/9,0)",
            "degree h exhausts those roots, so W is PF-infinity and Newton gives normalized coefficient log-concavity",
        ],
        "finite_replay_scope": {
            "j": [0, args.max_j],
            "h": [0, args.max_h],
            "cases": len(records),
            "active_weight_row_generating_identities": row_identities,
            "active_weight_coefficient_identities": sum(
                record["positive_coefficients"] for record in records
            ),
            "gegenbauer_coefficient_identities": len(records),
            "degree_and_positive_coefficient_checks": 2 * len(records),
            "normalized_newton_minors": sum(
                record["normalized_newton_minors"] for record in records
            ),
            "exact_sturm_roots_in_open_minus_eight_ninths_zero": sum(
                record["exact_roots_in_open_minus_eight_ninths_zero"]
                for record in records
            ),
            "terminal_odds_identities": sum(record["h"] > 0 for record in records),
        },
        "terminal_odds_formula": (
            "h*w_h/w_(h-1)=9*(j+h)/(5*h+6*j-2)"
        ),
        "source_sha256": source_hash,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(
        json.dumps(
            {
                "status": report["status"],
                **report["finite_replay_scope"],
                "source_sha256": source_hash,
                "report_sha256": report_hash,
                "report": str(args.output),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
