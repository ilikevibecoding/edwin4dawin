#!/usr/bin/env python3
"""Verify the upper-unit cross reduction for live negative-cross NCL.

The candidate upper-unit bound is

    zeta = v-(r+1)u/r <= 1.

It is substantially weaker than the refuted zero-cross/drift bounds.
This script proves its exact coefficient, moment, down-link, and NCL
square-absorption identities.  It does not prove the candidate bound
or the remaining linear reserve cascade.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUTPUT = Path(
    "terminal_upper_unit_absorption_certificate_20260729.json"
)


def main() -> None:
    r = sp.symbols("r", positive=True, integer=True)
    k = r + 1
    a, ap, bm, b = sp.symbols(
        "a ap bm b", positive=True
    )
    u = r * b / bm
    v = k * ap / a
    m = k * u / r
    zeta = v - m
    upper = bm * ap - a * b

    upper_unit_coefficient_margin = a * bm - k * upper
    assert sp.factor(
        a * bm * (1 - zeta)
        - upper_unit_coefficient_margin
    ) == 0

    # Common terminal-mixture moments.
    d, n, w2, pi, z = sp.symbols(
        "D N W2 pi Z", positive=True
    )
    reserve_f = r + u**2 - w2
    component_b = pi * (u + 1) - z
    common_relations = {
        d: u + r * pi,
        n: w2 + k * z,
    }
    upper_unit_moment_rhs = (
        reserve_f
        + u
        - r
        + u**2 / r
        - pi
        + k * component_b
    )
    assert sp.factor(
        (d * (1 + m) - n).subs(common_relations)
        - upper_unit_moment_rhs
    ) == 0

    # One-downlink form.
    h1, h2, h3 = sp.symbols(
        "h1 h2 h3", positive=True
    )
    j1, j2 = sp.symbols("j1 j2", nonnegative=True)
    d_local = (2 * h2 + r * j1) / h1
    n_local = (6 * h3 + 2 * k * j2) / h1
    local_cleared = sp.factor(
        h1 * ((1 + m) * d_local - n_local)
    )
    local_expected = (
        2 * (1 + m) * h2
        - 6 * h3
        + r * (1 + m) * j1
        - 2 * k * j2
    )
    assert sp.factor(local_cleared - local_expected) == 0

    # Absorb the NCL square with its existing favorable linear term.
    big_d = sp.symbols("D", positive=True)
    theta = r / (big_d + r)
    linear_coefficient = r + 2 + r**2 / u
    theta_upper = r / (u + r)
    assert sp.factor(
        linear_coefficient
        - 2 * k * theta_upper
        - (
            ((r + 2) * u + r**3 / u)
            / (u + r)
        )
    ) == 0
    # D>=u gives theta<=r/(u+r), so the displayed positive
    # difference proves linear_coefficient > 2k theta.

    rt, rf, s, delta = sp.symbols(
        "R_T R_F s delta", nonnegative=True
    )
    coupling = r * v - k * s * (r + 2)
    rank_base = (
        k
        * (r + 2)
        * (u - r)
        * (1 / r + s / u)
    )
    ncl = (
        2 * k * rt
        - coupling * rf / u
        + rank_base
        + zeta * linear_coefficient
        - 2 * k * (s * delta + theta * zeta**2)
    )
    unit_paid_linear = (
        2 * k * rt
        - coupling * rf / u
        + rank_base
        - 2 * k * s * delta
    )
    assert sp.factor(
        ncl
        - unit_paid_linear
        - zeta
        * (linear_coefficient - 2 * k * theta * zeta)
    ) == 0

    report = {
        "status": "PASS_SYMBOLIC",
        "candidate_status": (
            "REFUTED_BY_FINITE_TREE_M100_INTERVAL_CERTIFICATE"
        ),
        "candidate": (
            "0<zeta=v-(r+1)u/r<=1 on the live "
            "negative-cross branch"
        ),
        "coefficient_form": (
            "a*b_minus-(r+1)"
            "*(b_minus*a_plus-a*b)>=0"
        ),
        "moment_form": (
            "D(1-zeta)=R_F+u-r+u^2/r-pi+(r+1)M_B, "
            "M_B=pi(u+1)-Z"
        ),
        "downlink_form": (
            "D(1-zeta)=E_mu[(1+m)d_K-n_K], "
            "m=(r+1)u/r"
        ),
        "cleared_downlink_integrand": (
            "2(1+m)i2(H)-6i3(H)"
            "+r(1+m)i1(J)-2(r+1)i2(J)"
        ),
        "square_absorption": (
            "r+2+r^2/u > 2(r+1)theta; hence, if "
            "0<=zeta<=1, the NCL term "
            "zeta(r+2+r^2/u)-2(r+1)theta*zeta^2 "
            "is nonnegative"
        ),
        "remaining_linear_target": (
            "2(r+1)R_T-(C/u)R_F"
            "+(r+1)(r+2)(u-r)(1/r+s/u)"
            "-2(r+1)s*delta >= 0"
        ),
        "identities": {
            "coefficient_equivalence": True,
            "reserve_component_B_moment_identity": True,
            "one_downlink_identity": True,
            "linear_dominates_square_coefficient": True,
            "NCL_unit_absorption_split": True,
        },
        "scope": (
            "All reductions are proved.  The upper-unit candidate "
            "is false for a finite tree.  The identities remain "
            "valid diagnostics, not a proof route."
        ),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
