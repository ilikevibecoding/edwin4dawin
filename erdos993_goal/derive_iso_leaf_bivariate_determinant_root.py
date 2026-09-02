#!/usr/bin/env python3
"""Derive the bivariate ISO leaf remainder after resolving its support.

This is an exact symbolic exploration.  It writes A=C+xH at the support
vertex and expresses the first leaf polarization of the ISO kernel in the
four evaluations C(z),C(w),H(z),H(w) and their derivatives.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


z, w = sp.symbols("z w")
Cz, Cw, Hz, Hw, dCz, dCw, dHz, dHw = sp.symbols(
    "Cz Cw Hz Hw dCz dCw dHz dHw"
)


def add(a, b):
    return tuple(x + y for x, y in zip(a, b))


def scale_x(a):
    az, aw, daz, daw = a
    return z * az, w * aw, az + z * daz, aw + w * daw


def kernel(a):
    az, aw, daz, daw = a
    return sp.expand(z * w * az * aw + (z - w) * (daz * aw - az * daw) / 2)


def main() -> None:
    C = (Cz, Cw, dCz, dCw)
    H = (Hz, Hw, dHz, dHw)
    A = add(C, scale_x(H))
    P = add(A, scale_x(C))
    leaf = sp.expand(kernel(P) - kernel(A) - z * w * kernel(C))

    delta = sp.expand(Cz * Hw - Hz * Cw)
    dz_delta = sp.expand(dCz * Hw - dHz * Cw)
    dw_delta = sp.expand(Cz * dHw - Hz * dCw)
    report = {
        "marker": "DERIVED_EXACT_ISO_LEAF_BIVARIATE_SUPPORT_DETERMINANT",
        "expanded": str(leaf),
        "factored": str(sp.factor(leaf)),
        "collected": str(sp.collect(leaf, [delta, dz_delta, dw_delta], exact=False)),
        "delta": str(delta),
        "dz_delta": str(dz_delta),
        "dw_delta": str(dw_delta),
        "operation_count": int(sp.count_ops(leaf)),
    }
    Path("iso_leaf_bivariate_determinant_symbolic_root_20260829.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(report["factored"])
    print(report["marker"])


if __name__ == "__main__":
    main()
