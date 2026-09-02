#!/usr/bin/env python3
"""Derive a compact bivariate kernel for the ISO nested leaf remainder.

For P(t), Q_r(P) is the diagonal coefficient of

  K(P)=zw P(z)P(w)+(z-w)/2 (P'(z)P(w)-P(z)P'(w)).

This script polarizes K through two pendant-leaf additions and factors the
result in terms of the four vertex-deletion minors E,U,V,W and derivatives.
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


def scale_t(a):
    az, aw, daz, daw = a
    return z * az, w * aw, az + z * daz, aw + w * daw


def kernel(a):
    az, aw, daz, daw = a
    return sp.expand(z * w * az * aw + (z - w) * (daz * aw - az * daw) / 2)


def leaf_kernel(a, c):
    return sp.expand(kernel(add(a, scale_t(c))) - kernel(a) - z * w * kernel(c))


def main() -> None:
    E, U, V, W = (symbols(name) for name in "EUVW")
    nested = sp.factor(
        leaf_kernel(add(E, scale_t(U)), add(V, scale_t(W)))
        - leaf_kernel(E, V)
        - z * w * leaf_kernel(U, W)
    )

    # Natural oriented two-terminal determinants, plus their derivatives.
    Ez, Ew, dEz, dEw = E
    Uz, Uw, dUz, dUw = U
    Vz, Vw, dVz, dVw = V
    Wz, Ww, dWz, dWw = W
    delta_zw = sp.expand(Uz * Vw - Ez * Ww)
    delta_wz = sp.expand(Uw * Vz - Ew * Wz)
    dz_delta_zw = sp.expand(dUz * Vw - dEz * Ww)
    dw_delta_zw = sp.expand(Uz * dVw - Ez * dWw)
    dz_delta_wz = sp.expand(Uw * dVz - Ew * dWz)
    dw_delta_wz = sp.expand(dUw * Vz - dEw * Wz)

    # Ask SymPy for a factorization after collecting the raw expression in
    # the determinant generators.  The raw formula is retained regardless.
    collected = sp.collect(
        sp.expand(nested),
        [delta_zw, delta_wz, dz_delta_zw, dw_delta_zw, dz_delta_wz, dw_delta_wz],
        exact=False,
    )

    report = {
        "marker": "DERIVED_EXACT_ISO_NESTED_BIVARIATE_KERNEL",
        "kernel_Q": "zw P(z)P(w)+(z-w)(P'(z)P(w)-P(z)P'(w))/2",
        "nested_expanded": str(sp.expand(nested)),
        "nested_factored": str(nested),
        "nested_collected": str(collected),
        "operation_count": int(sp.count_ops(nested)),
        "delta_zw": str(delta_zw),
        "delta_wz": str(delta_wz),
    }
    Path("iso_nested_bivariate_kernel_symbolic_root_20260829.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print("nested kernel:")
    print(nested)
    print(f"operation count: {report['operation_count']}")
    print(report["marker"])


if __name__ == "__main__":
    main()
