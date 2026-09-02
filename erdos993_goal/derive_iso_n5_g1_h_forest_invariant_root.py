#!/usr/bin/env python3
"""Derive the exact forest-motif form of the H(A) block in rank-five g1.

This is an algebraic reduction only.  It substitutes the exact forest
inclusion-exclusion row through independent six-sets into H and records every
motif layer without asserting a sign.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    forest_independent_row,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_h_forest_invariant_root_20260829.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_H_FOREST_INVARIANT_ROOT"


def main() -> None:
    n = sp.Symbol("n", integer=True, nonnegative=True)
    row, invariants = forest_independent_row("A", n)
    a = row
    h = sp.expand(
        2 * a[1] * a[4] - 5 * a[1] * a[5] - 6 * a[1] * a[6]
        + 6 * a[2] * a[3] - 8 * a[2] * a[5]
        + 5 * a[3] ** 2 + 6 * a[3] * a[4]
    )
    variables = [n, *invariants.values()]
    polynomial = sp.Poly(h, *variables)
    layers = {}
    for name, variable in invariants.items():
        derivative = sp.factor(sp.diff(h, variable))
        layers[name] = {
            "degree": int(sp.degree(h, variable)),
            "derivative": str(derivative),
            "second_derivative": str(sp.factor(sp.diff(h, variable, 2))),
        }
    zero_motifs = {variable: 0 for variable in invariants.values()}
    edgeless = sp.factor(h.subs(zero_motifs))
    report = {
        "marker": MARKER,
        "H_definition": (
            "2a1a4-5a1a5-6a1a6+6a2a3-8a2a5+5a3^2+6a3a4"
        ),
        "forest_invariant_expression": str(sp.factor(h)),
        "expanded_term_count": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(
            int(value.is_negative is True) for value in polynomial.coeffs()
        ),
        "edgeless_expression": str(edgeless),
        "motif_layers": layers,
        "invariant_symbols": {name: str(symbol) for name, symbol in invariants.items()},
        "scope": "Exact forest inclusion-exclusion substitution only; no sign theorem.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
