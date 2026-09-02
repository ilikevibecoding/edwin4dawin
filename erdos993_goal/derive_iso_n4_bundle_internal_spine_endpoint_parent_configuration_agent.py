#!/usr/bin/env python3
"""Exact g1/g2 configurations for internal-spine endpoint parent p=v."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent import (
    c2,
    i2,
    i3,
    i4,
    independent_raw_g2,
)
from derive_iso_n4_bundle_g1_deepest_configuration_agent import i5, raw_g1
from derive_iso_n4_bundle_internal_spine_path_configuration_agent import (
    convolve,
    expression_stats,
    path_row,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_bundle_internal_spine_endpoint_parent_configuration_exact_agent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def row_substitution(length):
    r0 = tuple(sp.Symbol(f"r0_{rank}") for rank in range(6))
    rv = tuple(sp.Symbol(f"rv_{rank}") for rank in range(6))
    x, y, z = path_row(length), path_row(length - 1), path_row(length - 2)
    crows = (convolve(x, r0), convolve(y, r0), convolve(x, rv), convolve(y, rv))
    drows = (convolve(y, rv), convolve(z, rv), convolve(y, rv), convolve(z, rv))
    rules = {
        **{
            sp.Symbol(f"c{name}{rank}"): row[rank]
            for name, row in zip("EUVW", crows)
            for rank in range(6)
        },
        **{
            sp.Symbol(f"d{name}{rank}"): row[rank]
            for name, row in zip("EUVW", drows)
            for rank in range(6)
        },
    }
    return rules, (r0, rv)


def invariant_substitution(rows):
    r0, rv = rows
    m, e, degree = sp.symbols(
        "m F_edges F_degree_v", integer=True, nonnegative=True
    )
    excess, wedges = sp.symbols(
        "F_neighbor_excess_v F_wedges_E", integer=True, nonnegative=True
    )
    re, rv3 = sp.symbols(
        "F_connected3_E F_connected3_V", integer=True, nonnegative=True
    )
    q35, r4 = sp.symbols(
        "F_three_edge_five F_connected4_E", integer=True, nonnegative=True
    )
    ev = e - degree
    wv = wedges - c2(degree) - excess
    rules = {
        r0[0]: 1,
        r0[1]: m,
        r0[2]: i2(m, e),
        r0[3]: i3(m, e, wedges),
        r0[4]: i4(m, e, wedges, re),
        r0[5]: i5(m, e, wedges, re, q35, r4),
        rv[0]: 1,
        rv[1]: m - 1,
        rv[2]: i2(m - 1, ev),
        rv[3]: i3(m - 1, ev, wv),
        rv[4]: i4(m - 1, ev, wv, rv3),
    }
    return rules, (re, rv3, q35, r4)


def main():
    ell = sp.Symbol("ell", integer=True, positive=True)
    tail_rules, rows = row_substitution(ell)
    invariants, motifs = invariant_substitution(rows)
    tail1 = sp.factor(raw_g1().subs(tail_rules).subs(invariants))
    tail2 = sp.factor(independent_raw_g2().subs(tail_rules).subs(invariants))
    tail_motif1 = sp.factor(sum(sp.diff(tail1, symbol) * symbol for symbol in motifs))
    tail_motif2 = sp.factor(sum(sp.diff(tail2, symbol) * symbol for symbol in motifs))

    small = {}
    for value in range(1, 6):
        rules, _ = row_substitution(sp.Integer(value))
        g1 = sp.factor(raw_g1().subs(rules).subs(invariants))
        g2 = sp.factor(independent_raw_g2().subs(rules).subs(invariants))
        motif1 = sp.factor(sum(sp.diff(g1, symbol) * symbol for symbol in motifs))
        motif2 = sp.factor(sum(sp.diff(g2, symbol) * symbol for symbol in motifs))
        small[str(value)] = {
            "g1": expression_stats(g1),
            "g2": expression_stats(g2),
            "motif_g1": str(motif1),
            "motif_g2": str(motif2),
            "residual_g1": str(sp.factor(g1 - motif1)),
            "residual_g2": str(sp.factor(g2 - motif2)),
        }

    # The shortest path u-s-v is the already known empty k=2 boundary.
    shortest = small["1"]
    names = {
        str(symbol): symbol
        for symbol in (sp.sympify(shortest["g1"]["form"]).free_symbols
                       | sp.sympify(shortest["g2"]["form"]).free_symbols)
    }
    empty_values = {symbol: 0 for symbol in names.values()}
    empty_values[names["m"]] = 1
    assert int(sp.sympify(shortest["g1"]["form"]).subs(empty_values)) == 2
    assert int(sp.sympify(shortest["g2"]["form"]).subs(empty_values)) == 24

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_ENDPOINT_PARENT_CONFIGURATION_AGENT",
        "structural_rows": {
            "C": "(X R0,Y R0,X Rv,Y Rv)",
            "D": "(Y Rv,Z Rv,Y Rv,Z Rv)",
            "path": "X=I(P_ell),Y=I(P_(ell-1)),Z=I(P_(ell-2))",
            "tail": "ell>=6",
            "small": "ell=1,2,3,4,5 exact truncated rows",
        },
        "g1_tail": expression_stats(tail1),
        "g2_tail": expression_stats(tail2),
        "motifs_tail": {"g1": str(tail_motif1), "g2": str(tail_motif2)},
        "residuals_tail": {
            "g1": str(sp.factor(tail1 - tail_motif1)),
            "g2": str(sp.factor(tail2 - tail_motif2)),
        },
        "small_lengths": small,
        "shortest_boundary": {"ell": 1, "m": 1, "g1": 2, "g2": 24},
        "scope": (
            "Exact configuration reduction for the canonical internal-spine "
            "endpoint-parent p=v branch for every ell>=1. No sign theorem is asserted."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "g1_tail": {key: report["g1_tail"][key] for key in ("term_count", "negative_scalar_coefficients")},
        "g2_tail": {key: report["g2_tail"][key] for key in ("term_count", "negative_scalar_coefficients")},
        "motifs_tail": report["motifs_tail"],
        "shortest_boundary": report["shortest_boundary"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
