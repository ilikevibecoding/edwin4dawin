#!/usr/bin/env python3
"""Derive the exact common-factor product rule for the four-minor kernel.

If a disjoint unmarked forest component with independence polynomial P is
adjoined to every one of E,U,V,W, all four rows acquire the common factor P.
The compact nested operator then has a two-term product rule.  This script
derives that rule symbolically; it does not assert a coefficient sign.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_nested_compact_operator_root import add, leaf_kernel, symbols, w, z


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_common_factor_product_rule_symbolic_root_20260829.json"


def multiply(left, right):
    lz, lw, dlz, dlw = left
    rz, rw, drz, drw = right
    return (
        lz * rz,
        lw * rw,
        dlz * rz + lz * drz,
        dlw * rw + lw * drw,
    )


def tuple_multiply(factor, value):
    return tuple(multiply(factor, row) for row in value)


def nested(value):
    E, U, V, W = value

    def scale_x(row):
        rz, rw, drz, drw = row
        return z * rz, w * rw, rz + z * drz, rw + w * drw

    return sp.expand(
        leaf_kernel(add(E, scale_x(U)), add(V, scale_x(W)))
        - leaf_kernel(E, V)
        - z * w * leaf_kernel(U, W)
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


def wronskian_part(factor):
    Pz, Pw, dPz, dPw = factor
    return sp.expand((z - w) * (dPz * Pw - Pz * dPw) / 2)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    T = tuple(symbols(name) for name in "EUVW")
    P = symbols("P")
    Q = symbols("Q")

    Jp = wronskian_part(P)
    scaled = nested(tuple_multiply(P, T))
    claimed = sp.expand(P[0] * P[1] * nested(T) + Jp * defect_form(T))
    assert sp.expand(scaled - claimed) == 0

    scaled_r = defect_form(tuple_multiply(P, T))
    assert sp.expand(scaled_r - P[0] * P[1] * defect_form(T)) == 0

    product = multiply(P, Q)
    product_j = wronskian_part(product)
    product_claimed = sp.expand(
        Q[0] * Q[1] * wronskian_part(P)
        + P[0] * P[1] * wronskian_part(Q)
    )
    assert sp.expand(product_j - product_claimed) == 0

    report = {
        "marker": "DERIVED_EXACT_ISO_COMMON_FACTOR_PRODUCT_RULE",
        "definition": "J(P)=(z-w)[P'(z)P(w)-P(z)P'(w)]/2",
        "nested_product_rule": "N(P*T)=P(z)P(w)N(T)+J(P)R(T)",
        "defect_product_rule": "R(P*T)=P(z)P(w)R(T)",
        "wronskian_product_rule": (
            "J(PQ)=Q(z)Q(w)J(P)+P(z)P(w)J(Q)"
        ),
        "iterated_consequence": (
            "J(prod_i P_i)=sum_i J(P_i)*prod_(j!=i)P_j(z)P_j(w)"
        ),
        "scope": (
            "Exact symbolic identities only. J(P) is not coefficientwise of "
            "one sign for arbitrary forest independence polynomials, so the "
            "product rule is a reduction rather than a positivity proof."
        ),
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
