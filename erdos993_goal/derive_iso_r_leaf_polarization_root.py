#!/usr/bin/env python3
"""Derive exact leaf identities for the derivative-free ISO R form."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_nested_compact_operator_root import add, scale_x, symbols, w, z
from derive_iso_third_leaf_compact_operator_root import defect_form


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_r_leaf_polarization_symbolic_root_20260829.json"


def tuple_add(left, right):
    return tuple(add(a, b) for a, b in zip(left, right))


def tuple_x(value):
    return tuple(scale_x(a) for a in value)


def polar(left, right):
    return sp.expand(
        (defect_form(tuple_add(left, right)) - defect_form(left) - defect_form(right))
        / 2
    )


def main() -> None:
    C = tuple(symbols(f"C{name}") for name in "EUVW")
    H = tuple(symbols(f"H{name}") for name in "EUVW")

    common_shift = sp.expand(defect_form(tuple_x(C)) - z * w * defect_form(C))
    assert common_shift == 0

    isolate = sp.expand(
        defect_form(tuple_add(C, tuple_x(C)))
        - defect_form(C)
        - z * w * defect_form(C)
        - (z + w) * defect_form(C)
    )
    assert isolate == 0

    A = tuple_add(C, tuple_x(H))
    full = tuple_add(A, tuple_x(C))
    ordinary = sp.expand(
        defect_form(full) - defect_form(A) - z * w * defect_form(C)
    )
    compact = sp.expand(
        (z + w) * defect_form(C) + 2 * z * w * polar(H, C)
    )
    assert sp.expand(ordinary - compact) == 0

    report = {
        "marker": "DERIVED_EXACT_ISO_R_LEAF_POLARIZATION",
        "common_shift": "R(XT)=zwR(T)",
        "isolate": "R((1+X)T)-R(T)-zwR(T)=(z+w)R(T)",
        "ordinary": (
            "For A=C+XH and Full=A+XC: R(Full)-R(A)-zwR(C)="
            "(z+w)R(C)+2zw B_R(H,C)"
        ),
        "scope": (
            "Exact symbolic identities only. Neither R(C) nor B_R(H,C) is "
            "claimed Schur-positive at all ranks."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
