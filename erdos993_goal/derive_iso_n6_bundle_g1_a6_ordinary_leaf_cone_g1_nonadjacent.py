#!/usr/bin/env python3
"""Exact free-row cone test for ordinary-leaf monotonicity of A6=g1(C,0)."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import (
    add_leaf,
    substitute,
)
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_a6_ordinary_leaf_cone_exact_g1_nonadjacent_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_A6_ORDINARY_LEAF_CONE_G1_NONADJACENT"


def rows(prefix):
    return tuple(tuple(sp.symbols(f"{prefix}{family}0:8", nonnegative=True)) for family in "EUVW")


def main():
    raw = reconstruct(1)
    dvars = {symbol: 0 for symbol in raw.free_symbols if str(symbol).startswith("d")}
    a6 = sp.expand(raw.subs(dvars))
    hrows, krows = rows("H"), rows("K")
    arows = add_leaf(hrows, krows)
    crows = add_leaf(arows, hrows)
    zero = tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in "EUVW")
    delta = sp.expand(substitute(a6, crows, zero) - substitute(a6, arows, zero))
    structural = {row[0]: 1 for row_set in (hrows, krows) for row in row_set}
    delta = sp.expand(delta.subs(structural))
    polynomial = sp.Poly(delta, *sorted(delta.free_symbols, key=str))
    negatives = [value for value in polynomial.coeffs() if value < 0]

    # Coefficientwise induced-subgraph containment K<=H, relaxed independently
    # in each of the four marked rows.
    rrows = rows("R")
    containment = {
        hrows[family][rank]: krows[family][rank] + rrows[family][rank]
        for family in range(4) for rank in range(8)
    }
    contained = sp.expand(delta.subs(containment).subs({row[0]: 0 for row in rrows}))
    contained_polynomial = sp.Poly(contained, *sorted(contained.free_symbols, key=str))
    contained_negatives = [value for value in contained_polynomial.coeffs() if value < 0]
    report = {
        "marker": MARKER,
        "identity": "A=H+xK, C=A+xH; delta=A6(C)-A6(A)",
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": len(negatives),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "polynomial_sha256": hashlib.sha256(sp.srepr(delta).encode()).hexdigest().upper(),
        "coefficientwise_containment_cone": {
            "substitution": "H=K+R with K,R coefficientwise nonnegative",
            "terms": len(contained_polynomial.terms()),
            "negative_scalar_coefficients": len(contained_negatives),
            "minimum_scalar_coefficient": str(min(contained_polynomial.coeffs())),
            "polynomial_sha256": hashlib.sha256(sp.srepr(contained).encode()).hexdigest().upper(),
        },
        "status": (
            "exact free-row cone proves ordinary-leaf monotonicity of A6"
            if not negatives else "exact diagnostic; free-row cone insufficient"
        ),
        "scope_guard": (
            "Even a successful free-row cone would prove only an ordinary-leaf reduction "
            "for A6, not terminal marked paths, full g1, N6, or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
