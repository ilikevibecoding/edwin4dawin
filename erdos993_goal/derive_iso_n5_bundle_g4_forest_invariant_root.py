#!/usr/bin/env python3
"""Reduce rank-five bundle coefficient g4 to exact forest invariants.

The C tuple is expanded through independent four-sets and the D tuple through
independent three-sets.  The output is an algebraic reduction only; it is the
next coefficient below the universally proved g5-g8 block.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n5_whole_bundle_binomial_symbolic_root_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g4_forest_invariant_root_20260829.json"


def c2(value):
    return value * (value - 1) / 2


def c3(value):
    return value * (value - 1) * (value - 2) / 6


def c4(value):
    return value * (value - 1) * (value - 2) * (value - 3) / 24


def i2(order, edges):
    return c2(order) - edges


def i3(order, edges, wedges):
    return c3(order) - edges * (order - 2) + wedges


def i4(order, edges, wedges, connected3):
    return c4(order) - edges * c2(order - 2) + wedges * (order - 4) + c2(edges) - connected3


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "DERIVED_EXACT_ISO_N5_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    raw = sp.sympify(dependency["binomial_coefficients"][4]["factor"])
    names = {str(symbol): symbol for symbol in raw.free_symbols}

    n, q = sp.symbols("n q", integer=True, nonnegative=True)
    e, du, dv, adjacent = sp.symbols("C_edges C_degree_u C_degree_v C_adjacent", integer=True, nonnegative=True)
    wedges, xu, xv, common = sp.symbols(
        "C_wedges C_neighbor_excess_u C_neighbor_excess_v C_common_neighbor",
        integer=True,
        nonnegative=True,
    )
    r3e, r3u, r3v, r3w = sp.symbols(
        "C_connected3_E C_connected3_U C_connected3_V C_connected3_W",
        integer=True,
        nonnegative=True,
    )
    de, ddu, ddv, dadj = sp.symbols(
        "D_edges D_degree_u D_degree_v D_adjacent", integer=True, nonnegative=True
    )
    dwedges, dxu, dxv, dcommon = sp.symbols(
        "D_wedges D_neighbor_excess_u D_neighbor_excess_v D_common_neighbor",
        integer=True,
        nonnegative=True,
    )
    eu, ev = sp.symbols("epsilon_u epsilon_v", integer=True, nonnegative=True)

    cwu = wedges - c2(du) - xu
    cwv = wedges - c2(dv) - xv
    cww = (
        wedges - c2(du) - c2(dv) - xu - xv
        + adjacent * (du + dv - 2) + common
    )
    dwu = dwedges - c2(ddu) - dxu
    dwv = dwedges - c2(ddv) - dxv
    dww = (
        dwedges - c2(ddu) - c2(ddv) - dxu - dxv
        + dadj * (ddu + ddv - 2) + dcommon
    )

    values = {
        "cE0": 1, "cU0": 1, "cV0": 1, "cW0": 1,
        "dE0": 1, "dU0": 1, "dV0": 1, "dW0": 1,
        "cE1": n, "cU1": n - 1, "cV1": n - 1, "cW1": n - 2,
        "dE1": q, "dU1": q - eu, "dV1": q - ev, "dW1": q - eu - ev,
        "cE2": i2(n, e),
        "cU2": i2(n - 1, e - du),
        "cV2": i2(n - 1, e - dv),
        "cW2": i2(n - 2, e - du - dv + adjacent),
        "cE3": i3(n, e, wedges),
        "cU3": i3(n - 1, e - du, cwu),
        "cV3": i3(n - 1, e - dv, cwv),
        "cW3": i3(n - 2, e - du - dv + adjacent, cww),
        "cE4": i4(n, e, wedges, r3e),
        "cU4": i4(n - 1, e - du, cwu, r3u),
        "cV4": i4(n - 1, e - dv, cwv, r3v),
        "cW4": i4(n - 2, e - du - dv + adjacent, cww, r3w),
        "dE2": i2(q, de),
        "dU2": i2(q - eu, de - ddu),
        "dV2": i2(q - ev, de - ddv),
        "dW2": i2(q - eu - ev, de - ddu - ddv + dadj),
        "dE3": i3(q, de, dwedges),
        "dU3": i3(q - eu, de - ddu, dwu),
        "dV3": i3(q - ev, de - ddv, dwv),
        "dW3": i3(q - eu - ev, de - ddu - ddv + dadj, dww),
    }
    invariant = sp.factor(raw.subs({names[key]: value for key, value in values.items() if key in names}))
    polynomial = sp.Poly(invariant, *sorted(invariant.free_symbols, key=str))

    motif_symbols = (r3e, r3u, r3v, r3w)
    motif = sp.factor(sum(sp.diff(invariant, symbol) * symbol for symbol in motif_symbols))
    residual = sp.factor(invariant - motif)
    report = {
        "marker": "DERIVED_EXACT_ISO_N5_BUNDLE_G4_FOREST_INVARIANT_ROOT",
        "identity": "g4=[binom(M,4)] Gamma_M at rank five",
        "raw_form": str(sp.factor(raw)),
        "forest_invariant_form": str(invariant),
        "expanded_term_count": len(polynomial.terms()),
        "negative_scalar_coefficient_count": sum(
            1 for coefficient in polynomial.coeffs() if coefficient.is_negative is True
        ),
        "connected3_motif_part": str(motif),
        "residual_without_connected3": str(residual),
        "invariants": {
            "C": (
                "n, edges, marked degrees/adjacency, wedges, marked-neighbor "
                "excess/common-neighbor counts, and four connected-3 deletion counts"
            ),
            "D": (
                "q, mark-survival indicators, edges, marked degrees/adjacency, "
                "wedges, marked-neighbor excess/common-neighbor counts"
            ),
        },
        "scope": (
            "Exact rank-five g4 forest-invariant reduction only. No sign theorem "
            "or rank-five Bundle Payment Lemma is asserted."
        ),
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "expanded_term_count": report["expanded_term_count"],
        "negative_scalar_coefficient_count": report["negative_scalar_coefficient_count"],
        "connected3_motif_part": report["connected3_motif_part"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
