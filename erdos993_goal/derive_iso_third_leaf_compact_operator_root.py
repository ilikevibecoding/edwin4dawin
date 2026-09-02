#!/usr/bin/env python3
"""Compress the support-resolved third-leaf ISO recurrence kernel.

This derives exact identities for the four-minor nested kernel N.  They turn
the 42-term ordinary third-leaf expansion into one nested term, one nested
polarization, and a derivative-free quadratic defect.  Positivity of that
compact expression on forest-realizable minors remains open.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from derive_iso_nested_compact_operator_root import (
    add,
    leaf_kernel,
    scale_x,
    symbols,
    w,
    z,
)


def tuple_add(left, right):
    return tuple(add(a, b) for a, b in zip(left, right))


def tuple_x(value):
    return tuple(scale_x(a) for a in value)


def nested(value):
    E, U, V, W = value
    return sp.expand(
        leaf_kernel(add(E, scale_x(U)), add(V, scale_x(W)))
        - leaf_kernel(E, V)
        - z * w * leaf_kernel(U, W)
    )


def nested_polar(left, right):
    return sp.expand(
        (nested(tuple_add(left, right)) - nested(left) - nested(right)) / 2
    )


def defect_form(value):
    E, U, V, W = value
    Ez, Ew, _, _ = E
    Uz, Uw, _, _ = U
    Vz, Vw, _, _ = V
    Wz, Ww, _, _ = W
    return sp.expand(
        z**2 * Ew * Wz
        + w**2 * Ez * Ww
        + z * w * (Uw * Vz + Uz * Vw)
    )


def main() -> None:
    C = tuple(symbols(f"C{name}") for name in "EUVW")
    H = tuple(symbols(f"H{name}") for name in "EUVW")
    d = (z - w) ** 2 / 2

    # Common multiplication by x on every one of the four minors.
    shift_gap = sp.expand(nested(tuple_x(C)) - z * w * nested(C))
    assert sp.expand(shift_gap + d * defect_form(C)) == 0

    # Multiplication by 1+x (adjoining an isolated vertex).
    one_plus_x_C = tuple_add(C, tuple_x(C))
    isolate_gap = sp.expand(
        nested(one_plus_x_C) - nested(C) - z * w * nested(C)
    )
    assert sp.expand(isolate_gap - (z + w) * nested(C) + d * defect_form(C)) == 0

    # Ordinary leaf z--s after resolving the support s.  Here C is the tuple
    # on B-{z,s}, H is the tuple on B-N[s], A=C+xH, and B=A+xC.
    A = tuple_add(C, tuple_x(H))
    full = tuple_add(A, tuple_x(C))
    ordinary = sp.expand(nested(full) - nested(A) - z * w * nested(C))
    compact = sp.expand(
        (z + w) * nested(C)
        + 2 * z * w * nested_polar(H, C)
        - d * (defect_form(tuple_add(C, H)) - defect_form(H))
    )
    assert sp.expand(ordinary - compact) == 0

    report = {
        "marker": "DERIVED_EXACT_ISO_THIRD_LEAF_COMPACT_OPERATOR",
        "common_shift": "N(XT)-zwN(T)=-(z-w)^2 R(T)/2",
        "isolate": (
            "N((1+X)T)-N(T)-zwN(T)=(z+w)N(T)-(z-w)^2R(T)/2"
        ),
        "ordinary_support_resolved": (
            "For A=C+XH and Full=A+XC: N(Full)-N(A)-zwN(C)="
            "(z+w)N(C)+2zw B_N(H,C)-(z-w)^2[R(C+H)-R(H)]/2"
        ),
        "R": "z^2 E(w)W(z)+w^2 E(z)W(w)+zw[U(w)V(z)+U(z)V(w)]",
        "ordinary_expanded_term_count": len(sp.Add.make_args(ordinary)),
        "scope": (
            "Exact algebraic compression only. The sign of the displayed "
            "diagonal coefficients for arbitrary forest-realizable C,H is "
            "the remaining third-leaf recurrence obligation."
        ),
    }
    Path("iso_third_leaf_compact_operator_symbolic_root_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
