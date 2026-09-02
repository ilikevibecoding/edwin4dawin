#!/usr/bin/env python3
"""Verify exact moment and ISO-reserve forms of the NCL branch.

This is an algebraic verifier only.  It does not prove that the
resulting inequality holds for terminal forest pairs.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUTPUT = Path("terminal_negative_cross_moment_certificate_20260729.json")


def main() -> None:
    r = sp.symbols("r", positive=True, integer=True)
    k = r + 1
    u, v, s = sp.symbols("u v s", positive=True)
    qt_bar, qf_bar = sp.symbols("qT_bar qF_bar", nonnegative=True)
    vt, vf = sp.symbols("V_T V_F", nonnegative=True)
    ct, cf = sp.symbols("cT_bar cF_bar", nonnegative=True)
    delta, zeta = sp.symbols("delta zeta", nonnegative=True)

    theta = r * s / (u + r * s)
    sigma_t = 2 + (2 * qt_bar - vt) / v
    sigma_f = 2 + (2 * qf_bar - vf) / u
    h = 2 * k * sigma_t - r * sigma_f

    ncl = (
        v * h
        + k * s * (r + 2) * sigma_f
        - 2 * k * (s * delta + theta * zeta**2)
    )
    coupling = r * v - k * s * (r + 2)
    edge_form = (
        2 * (r + 2) * (v + k * s)
        + 4 * k * qt_bar
        - 2 * k * vt
        + coupling * (vf - 2 * qf_bar) / u
        - 2 * k * (s * delta + theta * zeta**2)
    )
    assert sp.factor(ncl - edge_form) == 0

    forest_form = (
        4 * (r + 2) * (v + k * s)
        - 4 * k * ct
        - 2 * k * vt
        + coupling * (vf + 2 * cf) / u
        - 2 * k * (s * delta + theta * zeta**2)
    )
    assert sp.factor(
        edge_form.subs(
            {
                qt_bar: v - ct,
                qf_bar: u - cf,
            }
        )
        - forest_form
    ) == 0

    reserve_t, reserve_f = sp.symbols("R_T R_F", real=True)
    reserve_substitutions = {
        qt_bar: (reserve_t - k - v + vt) / 2,
        qf_bar: (reserve_f - r - u + vf) / 2,
    }
    reserve_form = (
        2 * k * reserve_t
        - coupling * reserve_f / u
        - 2 * k**2
        + 2 * v
        + 2 * k * s * (r + 2)
        + coupling * (r + u) / u
        - 2 * k * (s * delta + theta * zeta**2)
    )
    assert sp.factor(
        edge_form.subs(reserve_substitutions) - reserve_form
    ) == 0

    # On the negative-cross branch, zeta=v-k*u/r>0.
    zeta_substitution = {v: k * u / r + zeta}
    shifted_reserve_form = (
        2 * k * reserve_t
        - coupling.subs(zeta_substitution) * reserve_f / u
        + k * (r + 2) * (u - r) * (1 / r + s / u)
        + zeta * (r + 2 + r**2 / u)
        - 2 * k * (s * delta + theta * zeta**2)
    )
    assert sp.factor(
        reserve_form.subs(zeta_substitution) - shifted_reserve_form
    ) == 0

    # The local log-concavity defect has an exact residual-moment form.
    delta_raw = (vf - 2 * qf_bar - u - u**2 / r) / u
    assert sp.factor(
        (1 - u / r - sigma_f) - delta_raw
    ) == 0

    a, bm, b = sp.symbols("a bm b", positive=True)
    upper, lc = sp.symbols("U L", nonnegative=True)
    coefficient_substitutions = {
        u: r * b / bm,
        s: b / a,
        zeta: k * upper / (a * bm),
        delta: k * lc / (bm * b),
    }
    shifted_base = (
        k
        * (r + 2)
        * (u - r)
        * (1 / r + s / u)
        + zeta * (r + 2 + r**2 / u)
        - 2 * k * s * delta
    )
    shifted_base_coefficient = sp.factor(
        sp.together(
            shifted_base.subs(coefficient_substitutions)
        )
    )

    report = {
        "status": "PASS_SYMBOLIC",
        "identities": {
            "NCL_edge_moment_form": True,
            "NCL_forest_component_form": True,
            "NCL_ISO_reserve_form": True,
            "NCL_negative_cross_shifted_form": True,
            "delta_residual_moment_form": True,
        },
        "definitions": {
            "theta": "r*s/(u+r*s)",
            "zeta_on_branch": "v-(r+1)u/r > 0",
            "coupling_C": "r*v-(r+1)*s*(r+2)",
            "R_T": "(r+1)+v+2*qT_bar-V_T",
            "R_F": "r+u+2*qF_bar-V_F",
        },
        "NCL_edge_moment_form": (
            "2(r+2)(v+(r+1)s)+4(r+1)qT_bar-2(r+1)V_T"
            "+C(V_F-2qF_bar)/u"
            "-2(r+1)(s*delta+theta*zeta^2)"
        ),
        "NCL_forest_component_form": (
            "4(r+2)(v+(r+1)s)-4(r+1)cT_bar-2(r+1)V_T"
            "+C(V_F+2cF_bar)/u"
            "-2(r+1)(s*delta+theta*zeta^2)"
        ),
        "NCL_shifted_ISO_form": (
            "2(r+1)R_T-C R_F/u"
            "+(r+1)(r+2)(u-r)(1/r+s/u)"
            "+zeta(r+2+r^2/u)"
            "-2(r+1)(s*delta+theta*zeta^2)"
        ),
        "delta_raw": (
            "(V_F-2qF_bar-u-u^2/r)/u; "
            "delta=max(0,delta_raw)"
        ),
        "shifted_base_coefficient_form": str(
            shifted_base_coefficient
        ),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
