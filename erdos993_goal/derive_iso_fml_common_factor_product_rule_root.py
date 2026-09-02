#!/usr/bin/env python3
"""Derive exact common-factor product rules for the FML gaps.

An unmarked component disjoint from both marks multiplies every one of the
four minors E,U,V,W by the same independence polynomial P.  The four-minor
kernel N is not homogeneous under this operation: a Wronskian correction
J(P)R appears.  This script proves that the *ordinary third-leaf gap* is
nevertheless closed under the same two-dimensional (N,R) module.

These are symbolic identities only.  No coefficient sign is asserted.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_common_factor_product_rule_root import (
    defect_form,
    multiply,
    nested,
    tuple_multiply,
    wronskian_part,
)
from derive_iso_nested_compact_operator_root import add, symbols, w, z


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_fml_common_factor_product_rule_symbolic_root_20260829.json"


def tuple_add(left, right):
    return tuple(add(a, b) for a, b in zip(left, right))


def polar(form, left, right):
    return sp.expand(
        (form(tuple_add(left, right)) - form(left) - form(right)) / 2
    )


def ordinary_n_gap(C, H):
    delta = (z - w) ** 2 / 2
    return sp.expand(
        (z + w) * nested(C)
        + 2 * z * w * polar(nested, H, C)
        - delta * (defect_form(tuple_add(C, H)) - defect_form(H))
    )


def ordinary_r_gap(C, H):
    return sp.expand(
        (z + w) * defect_form(C)
        + 2 * z * w * polar(defect_form, H, C)
    )


def isolate_n_gap(T):
    delta = (z - w) ** 2 / 2
    return sp.expand((z + w) * nested(T) - delta * defect_form(T))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    C = tuple(symbols(f"C{name}") for name in "EUVW")
    H = tuple(symbols(f"H{name}") for name in "EUVW")
    T = tuple(symbols(f"T{name}") for name in "EUVW")
    P = symbols("P")

    Pz, Pw, _, _ = P
    Jp = wronskian_part(P)

    scaled_C = tuple_multiply(P, C)
    scaled_H = tuple_multiply(P, H)
    ordinary_scaled = ordinary_n_gap(scaled_C, scaled_H)
    ordinary_claimed = sp.expand(
        Pz * Pw * ordinary_n_gap(C, H) + Jp * ordinary_r_gap(C, H)
    )
    assert sp.expand(ordinary_scaled - ordinary_claimed) == 0

    scaled_T = tuple_multiply(P, T)
    isolate_scaled = isolate_n_gap(scaled_T)
    isolate_claimed = sp.expand(
        Pz * Pw * isolate_n_gap(T) + (z + w) * Jp * defect_form(T)
    )
    assert sp.expand(isolate_scaled - isolate_claimed) == 0

    # R itself and its ordinary leaf gap transform without a Wronskian
    # correction.  This is the triangular-module closure behind the rule.
    ordinary_r_scaled = ordinary_r_gap(scaled_C, scaled_H)
    assert sp.expand(ordinary_r_scaled - Pz * Pw * ordinary_r_gap(C, H)) == 0

    report = {
        "marker": "DERIVED_EXACT_ISO_FML_COMMON_FACTOR_PRODUCT_RULE",
        "definition": "J(P)=(z-w)[P'(z)P(w)-P(z)P'(w)]/2",
        "ordinary_N_rule": (
            "G_N(P*C,P*H)=P(z)P(w)G_N(C,H)+J(P)G_R(C,H)"
        ),
        "ordinary_R_rule": "G_R(P*C,P*H)=P(z)P(w)G_R(C,H)",
        "isolate_N_rule": (
            "L_N(P*T)=P(z)P(w)L_N(T)+(z+w)J(P)R(T)"
        ),
        "interpretation": (
            "Common unmarked components act by an exact upper-triangular "
            "two-form module on the FML gaps."
        ),
        "scope": (
            "Exact symbolic identities only. Positivity of the J(P)-weighted "
            "correction at the required diagonal ranks remains open."
        ),
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
