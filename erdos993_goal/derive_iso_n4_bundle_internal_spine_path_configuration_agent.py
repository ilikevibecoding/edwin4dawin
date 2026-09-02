#!/usr/bin/env python3
"""Derive exact g1/g2 forms for a canonical internal protected-spine bundle.

Root the marked component at v.  For a deepest support s on the u-v connector,
the child side below s is a bare path P_L ending at u, and the parent p lies
in the other forest F with v.  After deleting s,

  C=(X R0, Y R0, X Rv, Y Rv),
  D=(Y Rp, Z Rp, Y Rvp, Z Rvp),

where X=I(P_L), Y=I(P_(L-1)), Z=I(P_(L-2)).  The displayed polynomial path
formula is used for L>=2; L=1 has Z=1 and is frozen separately.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent import (
    c2,
    i2,
    i3,
    i4,
    independent_poly_bruteforce,
    independent_raw_g2,
)
from derive_iso_leaf_bundle_telescope_agent import aggregate_vector
from derive_iso_n4_bundle_g1_deepest_configuration_agent import i5, raw_g1


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_bundle_internal_spine_path_configuration_exact_agent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def choose_polynomial(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def path_row(order, maximum=5):
    """I_k(P_order)=C(order-k+1,k), with exact small-order truncation."""
    order = sp.sympify(order)
    if order.is_Integer:
        numeric_order = int(order)
        # P_{-1}=P_0 is the empty-graph boundary used when ell=1.
        if numeric_order <= 0:
            return (sp.Integer(1),) + (sp.Integer(0),) * maximum
        return tuple(
            sp.Integer(comb(numeric_order - rank + 1, rank))
            if numeric_order - rank + 1 >= rank
            else sp.Integer(0)
            for rank in range(maximum + 1)
        )
    return tuple(
        sp.expand(choose_polynomial(order - rank + 1, rank))
        for rank in range(maximum + 1)
    )


def convolve(left, right, maximum=5):
    return tuple(
        sp.expand(sum(at(left, shift) * at(right, rank - shift) for shift in range(rank + 1)))
        for rank in range(maximum + 1)
    )


def row_substitution(length):
    r0 = tuple(sp.Symbol(f"r0_{rank}") for rank in range(6))
    rv = tuple(sp.Symbol(f"rv_{rank}") for rank in range(6))
    rp = tuple(sp.Symbol(f"rp_{rank}") for rank in range(6))
    rpv = tuple(sp.Symbol(f"rpv_{rank}") for rank in range(6))
    x = path_row(length)
    y = path_row(length - 1)
    z = path_row(length - 2)
    crows = (convolve(x, r0), convolve(y, r0), convolve(x, rv), convolve(y, rv))
    drows = (convolve(y, rp), convolve(z, rp), convolve(y, rpv), convolve(z, rpv))
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
    return rules, (r0, rv, rp, rpv)


def invariant_substitution(rows):
    r0, rv, rp, rpv = rows
    m, e, dp, dv, adjacent = sp.symbols(
        "m F_edges F_degree_p F_degree_v F_adjacent",
        integer=True,
        nonnegative=True,
    )
    common = sp.Symbol("F_common_neighbor", integer=True, nonnegative=True)
    xp, xv, wedges = sp.symbols(
        "F_neighbor_excess_p F_neighbor_excess_v F_wedges_E",
        integer=True,
        nonnegative=True,
    )
    re, rp3, rv3 = sp.symbols(
        "F_connected3_E F_connected3_P F_connected3_V",
        integer=True,
        nonnegative=True,
    )
    q35, r4 = sp.symbols(
        "F_three_edge_five F_connected4_E", integer=True, nonnegative=True
    )
    ep, ev = e - dp, e - dv
    epv = e - dp - dv + adjacent
    wp = wedges - c2(dp) - xp
    wv = wedges - c2(dv) - xv
    wpv = (
        wedges - c2(dp) - c2(dv) - xp - xv
        + adjacent * (dp + dv - 2) + common
    )
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
        rp[0]: 1,
        rp[1]: m - 1,
        rp[2]: i2(m - 1, ep),
        rp[3]: i3(m - 1, ep, wp),
        rp[4]: i4(m - 1, ep, wp, rp3),
        rpv[0]: 1,
        rpv[1]: m - 2,
        rpv[2]: i2(m - 2, epv),
        rpv[3]: i3(m - 2, epv, wpv),
    }
    motifs = (re, rp3, rv3, q35, r4)
    return rules, motifs


def expression_stats(expression):
    polynomial = sp.Poly(sp.expand(expression), *sorted(expression.free_symbols, key=str))
    return {
        "form": str(sp.factor(expression)),
        "term_count": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(
            int(coefficient.is_negative is True) for _, coefficient in polynomial.terms()
        ),
    }


def binomial_coefficients(values):
    values = list(values)
    result = []
    while values:
        result.append(values[0])
        values = [values[index + 1] - values[index] for index in range(len(values) - 1)]
    return result


def witness_check(g1_immediate, g2_immediate, rows, invariant_rules):
    # Path u-s-b-v, rooted at v.  Here L=1, F is the edge p=b--v.
    u, support, p, v = range(4)
    base = nx.path_graph((u, support, p, v))
    gamma = [sum(aggregate_vector(base, (u, v), support, number)[4:5]) for number in range(7)]
    coefficients = binomial_coefficients(gamma)
    assert coefficients == [0, 16, 78, 174, 158, 50, 0]

    f = nx.Graph([(p, v)])
    fp = f.copy(); fp.remove_node(p)
    fv = f.copy(); fv.remove_node(v)
    fpv = f.copy(); fpv.remove_nodes_from((p, v))
    row_values = {}
    for symbols, graph in zip(rows, (f, fv, fp, fpv)):
        polynomial = independent_poly_bruteforce(graph)
        row_values.update({symbol: at(polynomial, rank) for rank, symbol in enumerate(symbols)})
    raw_values = (int(g1_immediate.subs(row_values)), int(g2_immediate.subs(row_values)))
    assert raw_values == (coefficients[1], coefficients[2]), {
        "raw_values": raw_values,
        "coefficients": coefficients,
        "row_values": {str(key): value for key, value in row_values.items()},
    }

    invariant_data = {
        "m": 2,
        "F_edges": 1,
        "F_degree_p": 1,
        "F_degree_v": 1,
        "F_adjacent": 1,
        "F_common_neighbor": 0,
        "F_neighbor_excess_p": 0,
        "F_neighbor_excess_v": 0,
        "F_wedges_E": 0,
        "F_connected3_E": 0,
        "F_connected3_P": 0,
        "F_connected3_V": 0,
        "F_three_edge_five": 0,
        "F_connected4_E": 0,
    }
    invariant_g1 = g1_immediate.subs(invariant_rules)
    invariant_g2 = g2_immediate.subs(invariant_rules)
    inv_values = {
        symbol: invariant_data[str(symbol)]
        for symbol in invariant_g1.free_symbols | invariant_g2.free_symbols
    }
    assert int(invariant_g1.subs(inv_values)) == coefficients[1]
    assert int(invariant_g2.subs(inv_values)) == coefficients[2]
    return {"Gamma_binomial_coefficients": coefficients, "g1": 16, "g2": 78}


def main():
    length = sp.Symbol("ell", integer=True, positive=True)
    general_rules, rows = row_substitution(length)
    small_rules = {
        value: row_substitution(sp.Integer(value))[0]
        for value in range(1, 6)
    }
    invariant_rules, motifs = invariant_substitution(rows)

    raw1_general = sp.factor(raw_g1().subs(general_rules))
    raw2_general = sp.factor(independent_raw_g2().subs(general_rules))
    g1_general = sp.factor(raw1_general.subs(invariant_rules))
    g2_general = sp.factor(raw2_general.subs(invariant_rules))
    small = {}
    raw_small = {}
    for value, rules in small_rules.items():
        raw1 = sp.factor(raw_g1().subs(rules))
        raw2 = sp.factor(independent_raw_g2().subs(rules))
        g1 = sp.factor(raw1.subs(invariant_rules))
        g2 = sp.factor(raw2.subs(invariant_rules))
        motif_g1 = sp.factor(sum(sp.diff(g1, symbol) * symbol for symbol in motifs))
        motif_g2 = sp.factor(sum(sp.diff(g2, symbol) * symbol for symbol in motifs))
        raw_small[value] = (raw1, raw2)
        small[str(value)] = {
            "g1": expression_stats(g1),
            "g2": expression_stats(g2),
            "motif_g1": str(motif_g1),
            "motif_g2": str(motif_g2),
            "residual_g1": str(sp.factor(g1 - motif_g1)),
            "residual_g2": str(sp.factor(g2 - motif_g2)),
        }

    motif1 = sp.factor(sum(sp.diff(g1_general, symbol) * symbol for symbol in motifs))
    motif2 = sp.factor(sum(sp.diff(g2_general, symbol) * symbol for symbol in motifs))
    residual1 = sp.factor(g1_general - motif1)
    residual2 = sp.factor(g2_general - motif2)
    witness = witness_check(raw_small[1][0], raw_small[1][1], rows, invariant_rules)

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_PATH_CONFIGURATION_AGENT",
        "structural_rows": {
            "C": "(X R0,Y R0,X Rv,Y Rv)",
            "D": "(Y Rp,Z Rp,Y Rvp,Z Rvp)",
            "path": "X=I(P_ell),Y=I(P_(ell-1)),Z=I(P_(ell-2))",
            "coefficient_formula": "I_k(P_t)=C(t-k+1,k)",
            "polynomial_tail_range": "ell>=6, p distinct from v",
            "small_exact_branches": "ell=1,2,3,4,5 use truncated path rows",
            "immediate_boundary": "ell=1 has X=1+x and Y=Z=1 exactly",
        },
        "g1_general": expression_stats(g1_general),
        "g2_general": expression_stats(g2_general),
        "small_lengths": small,
        "high_motif_parts_general": {"g1": str(motif1), "g2": str(motif2)},
        "residuals_general": {"g1": str(residual1), "g2": str(residual2)},
        "concrete_path_witness": witness,
        "scope": (
            "Exact configuration reduction for canonical internal-spine support "
            "with p distinct from v for every ell>=1. The polynomial tail is "
            "ell>=6 and ell=1..5 are exact branches. No sign theorem or p=v "
            "endpoint theorem is asserted."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "g1_general": {key: report["g1_general"][key] for key in ("term_count", "negative_scalar_coefficients")},
        "g2_general": {key: report["g2_general"][key] for key in ("term_count", "negative_scalar_coefficients")},
        "high_motif_parts_general": report["high_motif_parts_general"],
        "concrete_path_witness": witness,
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
