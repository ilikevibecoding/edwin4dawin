#!/usr/bin/env python3
"""Verify the one-downlink expansion of the terminal full-square reserve.

The global pointed full-square candidate is

    R_T >= (v-(r+1)u/r)^2.

In the common terminal-mixture coordinates its cleared margin is

    (k D + 2 m N - m^2 D - Q) / D,

where k=r+1 and m=ku/r.  This script verifies the exact residual-
forest expansion after deleting one uniformly chosen member of the
underlying independent (r-1)-set.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUTPUT = Path(
    "terminal_full_square_downlink_certificate_20260729.json"
)


def main() -> None:
    r, u = sp.symbols("r u", positive=True)
    k = r + 1
    m = k * u / r

    h1, h2, h3, h4 = sp.symbols(
        "h1 h2 h3 h4", nonnegative=True
    )
    j1, j2, j3 = sp.symbols(
        "j1 j2 j3", nonnegative=True
    )

    # Local contributions whose averages under the natural down-link
    # law are D, N, and Q.
    d = (2 * h2 + r * j1) / h1
    n = (6 * h3 + 2 * k * j2) / h1
    q = (24 * h4 + 6 * (k + 1) * j3) / h1

    local_margin = sp.factor(k * d + 2 * m * n - m**2 * d - q)
    cleared = sp.factor(h1 * local_margin)
    expected = sp.factor(
        2 * (k - m**2) * h2
        + 12 * m * h3
        - 24 * h4
        + r * (k - m**2) * j1
        + 4 * m * k * j2
        - 6 * (k + 1) * j3
    )
    assert sp.factor(cleared - expected) == 0

    # The same expression as a linear functional of the residual
    # independence polynomials.
    h_part = sp.factor(
        2 * (k - m**2) * h2 + 12 * m * h3 - 24 * h4
    )
    j_part = sp.factor(
        r * (k - m**2) * j1
        + 4 * m * k * j2
        - 6 * (k + 1) * j3
    )
    assert sp.factor(expected - h_part - j_part) == 0

    report = {
        "status": "PASS_SYMBOLIC",
        "claim_name": "one-downlink PFSR expansion",
        "definitions": {
            "k": "r+1",
            "m": "(r+1)u/r",
            "H": "F-N[K]",
            "J": (
                "H with the terminal-neighbor set deleted, "
                "or the empty link contribution"
            ),
            "d_K": "(2i2(H)+r i1(J))/i1(H)",
            "n_K": "(6i3(H)+2(r+1)i2(J))/i1(H)",
            "q_K": (
                "(24i4(H)+6(r+2)i3(J))/i1(H)"
            ),
        },
        "global_margin": (
            "R_T-zeta^2="
            "E_mu[k d_K+2m n_K-m^2 d_K-q_K]/D"
        ),
        "cleared_local_integrand": (
            "2(k-m^2)i2(H)+12m i3(H)-24i4(H)"
            "+r(k-m^2)i1(J)+4mk i2(J)"
            "-6(k+1)i3(J)"
        ),
        "identities": {
            "downlink_substitution": True,
            "H_J_split": True,
        },
        "scope": (
            "The expansion is exact.  Its averaged nonnegativity "
            "under the live negative-cross hypotheses is unproved."
        ),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
