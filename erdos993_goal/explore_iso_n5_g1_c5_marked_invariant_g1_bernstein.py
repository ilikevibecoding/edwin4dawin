#!/usr/bin/env python3
"""Explore the exact marked-motif expansion of the rank-five C5 block.

This is a fail-closed algebraic probe.  It partitions every forest motif by
whether its vertex set contains neither mark, u only, v only, or both marks,
then substitutes the four induced-minor rows into

    C5 = [z^4 w^4]R - [z^3 w^5]R.

No sign theorem is asserted by this source.
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
OUTPUT = HERE / "iso_n5_g1_c5_marked_invariant_probe_g1_bernstein_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_C5_MARKED_INVARIANT_G1_BERNSTEIN"


def main() -> None:
    n = sp.Symbol("n", integer=True, nonnegative=True)
    rows = []
    invariant_rows = []
    for prefix, order in zip(("E", "U", "V", "W"), (n, n - 1, n - 1, n - 2)):
        row, invariants = forest_independent_row(prefix, order)
        rows.append(row)
        invariant_rows.append(invariants)

    categories = {}
    rules = {}
    for invariant_name in invariant_rows[0]:
        values = sp.symbols(
            " ".join(f"{invariant_name}_{category}" for category in ("00", "10", "01", "11"))
        )
        categories[invariant_name] = values
        e00, e10, e01, e11 = values
        rules[invariant_rows[0][invariant_name]] = e00 + e10 + e01 + e11
        rules[invariant_rows[1][invariant_name]] = e00 + e01
        rules[invariant_rows[2][invariant_name]] = e00 + e10
        rules[invariant_rows[3][invariant_name]] = e00

    e, u, v, w = tuple(
        tuple(sp.expand(value.xreplace(rules)) for value in row)
        for row in rows
    )
    c5 = sp.expand(
        2 * e[4] * w[2] - e[5] * w[1] - e[3] * w[3]
        + 2 * u[3] * v[3] - u[4] * v[2] - u[2] * v[4]
    )
    marked = c5
    high_names = (
        "connected_3_edges",
        "three_edges_two_components_five_vertices",
        "connected_4_edges",
        "four_edges_two_components_six_vertices",
        "connected_5_edges",
    )
    high_symbols = [symbol for name in high_names for symbol in categories[name]]
    high_derivatives = {
        str(symbol): str(sp.factor(sp.diff(marked, symbol)))
        for symbol in high_symbols
        if sp.diff(marked, symbol) != 0
    }
    low = sp.expand(marked.xreplace({symbol: sp.Integer(0) for symbol in high_symbols}))
    report = {
        "marker": MARKER,
        "definition": "C5=2E4W2-E5W1-E3W3+2U3V3-U4V2-U2V4",
        "category_order": ["00", "10", "01", "11"],
        "high_motif_derivatives": high_derivatives,
        "low_residual": str(sp.factor(low)),
        "low_residual_term_count": len(sp.Poly(sp.expand(low), *sorted(low.free_symbols, key=str)).terms()),
        "scope": "Exact marked-motif algebra only; no sign theorem.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "high_motif_derivatives": high_derivatives,
        "low_residual_term_count": report["low_residual_term_count"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
