#!/usr/bin/env python3
"""Replay the residual-moment forms of terminal drift and compensation."""

from __future__ import annotations

import sympy as sp


def main() -> int:
    r = sp.symbols("r", positive=True)
    k = r + 1
    bm, b, bp, cm, c = sp.symbols(
        "bm b bp cm c", positive=True
    )
    u, pi, z, w2 = sp.symbols("u pi Z W2", positive=True)

    substitutions = {
        b: bm * u / r,
        cm: bm * pi,
        c: bm * z / r,
        bp: bm * w2 / (r * k),
    }
    a = b + cm
    ap = bp + c
    v_coeff = k * ap / a
    v_moment = (w2 + k * z) / (u + r * pi)
    assert sp.simplify(v_coeff.subs(substitutions) - v_moment) == 0

    drift_cleared = sp.factor(
        ((u + 1) - v_moment) * (u + r * pi)
    )
    assert sp.expand(
        drift_cleared
        - ((u + 1) * (u + r * pi) - w2 - k * z)
    ) == 0

    vt, vf = sp.symbols("VT VF", nonnegative=True)
    qt, qf = sp.symbols("QT QF", nonnegative=True)
    ct, cf = sp.symbols("CT CF", nonnegative=True)
    v = sp.symbols("v", positive=True)
    sigma_t = 2 + (2 * qt - vt) / v
    sigma_f = 2 + (2 * qf - vf) / u
    h = 2 * k * sigma_t - r * sigma_f
    form_edges = (
        (2 * r + 4) * v
        + 4 * k * qt
        - 2 * k * vt
        - 2 * r * v * qf / u
        + r * v * vf / u
    )
    assert sp.simplify(v * h - form_edges) == 0

    form_components = (
        4 * (r + 2) * v
        - 4 * k * ct
        - 2 * k * vt
        + r * v * (2 * cf + vf) / u
    )
    assert sp.simplify(
        form_edges.subs({qt: v - ct, qf: u - cf})
        - form_components
    ) == 0

    print("PASS: terminal drift/compensation moment identities")
    print("v =", v_moment)
    print("drift reserve =", drift_cleared)
    print("compensation =", form_components)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
