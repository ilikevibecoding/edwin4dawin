#!/usr/bin/env python3
"""Compress the bivariate four-minor ISO kernel by multiplication identities.

For the quadratic ISO kernel K and X denoting multiplication by the
polynomial variable, the exact identity

    K(XP) = zw K(P) - (z-w)^2 P(z)P(w)/2

collapses the previously expanded 16-state nested remainder to two polar
terms and one derivative-free correction.  This is an algebraic reduction,
not a positivity proof.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


z, w = sp.symbols("z w")


def symbols(name: str):
    return sp.symbols(f"{name}z {name}w d{name}z d{name}w")


def add(a, b):
    return tuple(x + y for x, y in zip(a, b))


def scale_x(a):
    az, aw, daz, daw = a
    return z * az, w * aw, az + z * daz, aw + w * daw


def kernel(a):
    az, aw, daz, daw = a
    return sp.expand(z * w * az * aw + (z - w) * (daz * aw - az * daw) / 2)


def polar(a, b):
    return sp.expand((kernel(add(a, b)) - kernel(a) - kernel(b)) / 2)


def leaf_kernel(a, c):
    return sp.expand(kernel(add(a, scale_x(c))) - kernel(a) - z * w * kernel(c))


def main() -> None:
    E, U, V, W = (symbols(name) for name in "EUVW")
    nested = sp.expand(
        leaf_kernel(add(E, scale_x(U)), add(V, scale_x(W)))
        - leaf_kernel(E, V)
        - z * w * leaf_kernel(U, W)
    )

    Ez, Ew, dEz, dEw = E
    Uz, Uw, dUz, dUw = U
    Vz, Vw, dVz, dVw = V
    Wz, Ww, dWz, dWw = W
    defect = (z - w) ** 2 / 2
    correction = (
        Uz * Vw
        + Vz * Uw
        + w * Uz * Ww
        + z * Wz * Uw
        + w * Vz * Ww
        + z * Wz * Vw
    )
    compact = sp.expand(
        2 * polar(E, scale_x(scale_x(W)))
        + 2 * z * w * polar(U, V)
        - defect * correction
    )
    assert sp.expand(nested - compact) == 0

    P = symbols("P")
    multiplication_identity = sp.expand(
        kernel(scale_x(P))
        - z * w * kernel(P)
        + (z - w) ** 2 * P[0] * P[1] / 2
    )
    assert multiplication_identity == 0

    report = {
        "marker": "DERIVED_EXACT_ISO_NESTED_COMPACT_MULTIPLICATION_OPERATOR",
        "multiplication_identity": "K(XP)=zw K(P)-(z-w)^2 P(z)P(w)/2",
        "compact_identity": (
            "N=2B(E,X^2W)+2zwB(U,V)-(z-w)^2/2*"
            "[UzVw+VzUw+wUzWw+zWzUw+wVzWw+zWzVw]"
        ),
        "expanded_operation_count": int(sp.count_ops(nested)),
        "compact_operation_count": int(sp.count_ops(compact, visual=False)),
        "expanded_term_count": len(sp.Add.make_args(nested)),
        "compact_source_term_count": 3,
        "scope": (
            "Exact symbolic compression only. Coefficientwise positivity of "
            "the compact operator on forest-realizable E,U,V,W remains open."
        ),
    }
    Path("iso_nested_compact_operator_symbolic_root_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
