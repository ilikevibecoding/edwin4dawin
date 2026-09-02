#!/usr/bin/env python3
"""Verify exact forms of the terminal pointed full-square reserve."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUTPUT = Path("terminal_full_square_reserve_certificate_20260729.json")


def main() -> None:
    r = sp.symbols("r", positive=True, integer=True)
    k = r + 1
    a, ap, app, bm, b = sp.symbols(
        "a ap app bm b", positive=True
    )
    u = r * b / bm
    v = k * ap / a
    x = u / r
    q_t = 1 + v - (k + 1) * app / ap
    reserve_t = k - v + v * q_t
    zeta = v - k * x
    upper = bm * ap - a * b
    reserve_numerator = (
        a * a + k * ap * ap - (k + 1) * a * app
    )

    margin = reserve_t - zeta**2
    cleared = sp.factor(a**2 * bm**2 * margin / k)
    coefficient_form = (
        bm**2 * reserve_numerator - k * upper**2
    )
    linearized_form = a * (
        bm**2 * (a - (k + 1) * app)
        + 2 * k * bm * b * ap
        - k * a * b**2
    )
    assert sp.factor(cleared - coefficient_form) == 0
    assert sp.factor(coefficient_form - linearized_form) == 0

    d, n, q = sp.symbols("D N Q", positive=True)
    m = k * u / r
    common_substitutions = {
        v: n / d,
        (k + 1) * app / ap: q / n,
    }
    common_margin = (
        k + n**2 / d**2 - q / d - (n / d - m) ** 2
    )
    common_linear = (k * d + 2 * m * n - m**2 * d - q) / d
    assert sp.factor(common_margin - common_linear) == 0

    report = {
        "status": "PASS_SYMBOLIC",
        "claim_name": "terminal pointed full-square reserve (PFSR)",
        "normalized_candidate": (
            "R_T >= (v-(r+1)u/r)^2 on the negative-cross branch"
        ),
        "coefficient_candidate": (
            "(b_minus)^2{a^2+(r+1)a_plus^2"
            "-(r+2)a a_plus_plus}"
            ">=(r+1){b_minus a_plus-a b}^2"
        ),
        "linearized_cleared_margin": (
            "a[(b_minus)^2{a-(r+2)a_plus_plus}"
            "+2(r+1)b_minus b a_plus-(r+1)a b^2]"
        ),
        "common_moment_margin": (
            "{(r+1)D+2mN-m^2D-Q}/D, "
            "m=(r+1)u/r"
        ),
        "identities": {
            "coefficient_clearing": True,
            "quadratic_cancellation": True,
            "common_moment_linearization": True,
        },
        "scope": (
            "The identities are proved.  Nonnegativity is a "
            "forest-specific conjectural sublemma, not a theorem."
        ),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
