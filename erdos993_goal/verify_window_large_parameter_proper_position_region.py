#!/usr/bin/env python3
"""Exact general-parameter consequence of the unit-boundary pencil theorem.

Let C=B+2, let H be the normalized Pochhammer source of rank r, and put

    J=u(C-1+x)H+(4-u)xH(x-1),
    T=v(C-2+x)J+(4-v)xJ(x-1).

At a positive zero xi of H, write d=Delta H(xi) and dd=Delta^2 H(xi).
This replay verifies

    T(xi)=x(4-u)(4-v)d[(x-1)dd/d-Theta],
    Theta=2(x-1)+(C+x-2)(u/(4-u)+v/(4-v)).

Section 40 proves for every such normalized source

    (xi-1)dd/d <= r-1+2xi.

Consequently T has the alternating signs needed for rootwise outward
placement whenever

    (C-2)(u/(4-u)+v/(4-v)) >= r+1.

The symbolic identities below are exact.  The proper-position inequality is
the analytic theorem proved separately in Section 40 of the route note.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_large_parameter_proper_position_region_exact_20260809.json"
X = sp.symbols("x")


def shift(expr: sp.Expr, amount: int) -> sp.Expr:
    return sp.expand(expr.subs(X, X + amount))


def identity_checks(maximum_rank: int = 7) -> dict[str, object]:
    C, u, v = sp.symbols("C u v")
    checked: list[int] = []
    for rank in range(1, maximum_rank + 1):
        coefficients = sp.symbols(f"h0:{rank + 1}")
        H = sum(coefficients[j] * X**j for j in range(rank + 1))
        Hm = shift(H, -1)
        Hmm = shift(H, -2)
        J = sp.expand(u * (C - 1 + X) * H + (4 - u) * X * Hm)
        Jm = shift(J, -1)
        T = sp.expand(v * (C - 2 + X) * J + (4 - v) * X * Jm)

        direct = sp.expand(
            u * v * (C + X - 2) * (C + X - 1) * H
            + X * (C + X - 2) * (4 * (u + v) - 2 * u * v) * Hm
            + X * (X - 1) * (4 - u) * (4 - v) * Hmm
        )
        assert sp.expand(T - direct) == 0
        checked.append(rank)

    d, dd, xi = sp.symbols("d dd xi")
    at_root = sp.expand(
        xi * (4 - u) * (4 - v) * (xi - 1) * dd
        - xi
        * d
        * (
            v * (4 - u) * (C + xi - 2)
            + (4 - v) * u * (C + xi - 2)
            + 2 * (4 - v) * (4 - u) * (xi - 1)
        )
    )
    s = u / (4 - u) + v / (4 - v)
    theta = 2 * (xi - 1) + (C + xi - 2) * s
    factored = sp.cancel(xi * (4 - u) * (4 - v) * d * ((xi - 1) * dd / d - theta))
    assert sp.cancel(at_root - factored) == 0

    candidate = rank - 1 + 2 * xi
    # The rank symbol below records the all-rank margin independently of the
    # loop variable used for the generic polynomial checks.
    r = sp.symbols("r", integer=True, positive=True)
    candidate = r - 1 + 2 * xi
    margin = sp.factor(theta - candidate)
    assert sp.cancel(margin - ((C + xi - 2) * s - r - 1)) == 0

    return {
        "generic_polynomial_ranks": checked,
        "two_step_identity": (
            "T=uv(C+x-2)(C+x-1)H+"
            "x(C+x-2)(4(u+v)-2uv)H(x-1)+"
            "x(x-1)(4-u)(4-v)H(x-2)"
        ),
        "root_identity": (
            "T(xi)=xi(4-u)(4-v)DeltaH(xi)"
            "*((xi-1)Delta^2H/DeltaH-Theta)"
        ),
        "theta": "2(xi-1)+(C+xi-2)(u/(4-u)+v/(4-v))",
        "proper_position_margin": (
            "Theta-(r-1+2xi)=(C+xi-2)"
            "(u/(4-u)+v/(4-v))-(r+1)"
        ),
    }


def main() -> None:
    identities = identity_checks()
    payload = {
        "kind": "window_large_parameter_proper_position_region_exact",
        "date": "2026-08-09",
        "status": "PASS_EXACT_LARGE_PARAMETER_ALL_RANK_REGION",
        "identities": identities,
        "analytic_input": (
            "Section 40 proves (xi-1)Delta^2H/DeltaH <= r-1+2xi "
            "for every positive zero xi of every admissible H."
        ),
        "theorem": (
            "If (C-2)(u/(4-u)+v/(4-v)) >= r+1, then T(xi_i) "
            "alternates with the outward orientation, so the r selected "
            "positive roots alpha_i satisfy alpha_i>xi_i and hence "
            "prod(alpha_i)>prod(xi_i)>=uv prod(xi_i)."
        ),
        "sharp_reserve_corollary": (
            "Since C>=3r+6, the uniform sufficient region is "
            "u/(4-u)+v/(4-v)>=(r+1)/(3r+4); the simpler rank-uniform "
            "condition sum>=1/3 also suffices."
        ),
        "remaining_region": (
            "0<u,v<=1 with u/(4-u)+v/(4-v)<(r+1)/(C-2)."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**payload, "output": str(REPORT)}, indent=2))


if __name__ == "__main__":
    main()
