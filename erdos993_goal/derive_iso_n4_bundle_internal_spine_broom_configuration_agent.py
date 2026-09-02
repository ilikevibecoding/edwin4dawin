#!/usr/bin/env python3
"""Exact rank-four g1/g2 configurations for the full internal-spine broom.

The protected child side A is the path a--...--u, with k>=0 additional
unmarked leaves adjacent to the marked endpoint u.  This file derives both
parent branches directly from the defining finite-difference forms:

  p != v: C=(X R0,Y R0,X Rv,Y Rv),
           D=(A0 Rp,B0 Rp,A0 Rpv,B0 Rpv);
  p == v: C=(X R0,Y R0,X Rv,Y Rv),
           D=(A0 Rv,B0 Rv,A0 Rv,B0 Rv).

Here X=I(A), Y=I(A-u), A0=I(A-a), B0=I(A-{a,u}).
The symbolic path tail is valid for ell>=6.  Lengths ell=1,...,5 are
substituted by exact truncated path rows.  No positivity is claimed here.
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
OUTPUT = HERE / "iso_n4_bundle_internal_spine_broom_configuration_exact_agent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def choose_polynomial(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def path_row(order, maximum=5):
    """I(P_order), with P_0 empty, P_-1=empty, P_-2 the zero row."""
    order = sp.sympify(order)
    if order.is_Integer:
        numeric = int(order)
        if numeric == -2:
            return (sp.Integer(0),) * (maximum + 1)
        if numeric <= 0:
            return (sp.Integer(1),) + (sp.Integer(0),) * maximum
        return tuple(
            sp.Integer(comb(numeric - rank + 1, rank))
            if numeric - rank + 1 >= rank
            else sp.Integer(0)
            for rank in range(maximum + 1)
        )
    return tuple(
        sp.expand(choose_polynomial(order - rank + 1, rank))
        for rank in range(maximum + 1)
    )


def binomial_row(number, maximum=5):
    return tuple(sp.expand(choose_polynomial(number, rank)) for rank in range(maximum + 1))


def convolve(left, right, maximum=5):
    return tuple(
        sp.expand(sum(at(left, shift) * at(right, rank - shift) for shift in range(rank + 1)))
        for rank in range(maximum + 1)
    )


def add(left, right, maximum=5):
    return tuple(sp.expand(at(left, rank) + at(right, rank)) for rank in range(maximum + 1))


def shift(row, amount=1, maximum=5):
    return tuple(at(row, rank - amount) for rank in range(maximum + 1))


def child_rows(length, collisions):
    leaves = binomial_row(collisions)
    p1 = path_row(length - 1)
    p2 = path_row(length - 2)
    p3 = path_row(length - 3)
    x = add(convolve(leaves, p1), shift(p2))
    y = convolve(leaves, p1)
    a0 = add(convolve(leaves, p2), shift(p3))
    b0 = convolve(leaves, p2)
    return x, y, a0, b0


def row_substitution(length, collisions, endpoint=False):
    r0 = tuple(sp.Symbol(f"r0_{rank}") for rank in range(6))
    rv = tuple(sp.Symbol(f"rv_{rank}") for rank in range(6))
    rp = tuple(sp.Symbol(f"rp_{rank}") for rank in range(6))
    rpv = tuple(sp.Symbol(f"rpv_{rank}") for rank in range(6))
    x, y, a0, b0 = child_rows(length, collisions)
    crows = (convolve(x, r0), convolve(y, r0), convolve(x, rv), convolve(y, rv))
    if endpoint:
        drows = (
            convolve(a0, rv), convolve(b0, rv),
            convolve(a0, rv), convolve(b0, rv),
        )
        rows = (r0, rv)
    else:
        drows = (
            convolve(a0, rp), convolve(b0, rp),
            convolve(a0, rpv), convolve(b0, rpv),
        )
        rows = (r0, rv, rp, rpv)
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
    return rules, rows, (x, y, a0, b0)


def invariant_substitution(rows, endpoint=False):
    m, edges, dv = sp.symbols("m F_edges F_degree_v", integer=True, nonnegative=True)
    wedges, xv = sp.symbols("F_wedges_E F_neighbor_excess_v", integer=True, nonnegative=True)
    re, rv3 = sp.symbols("F_connected3_E F_connected3_V", integer=True, nonnegative=True)
    q35, r4 = sp.symbols("F_three_edge_five F_connected4_E", integer=True, nonnegative=True)
    r0, rv = rows[:2]
    rules = {
        r0[0]: 1,
        r0[1]: m,
        r0[2]: i2(m, edges),
        r0[3]: i3(m, edges, wedges),
        r0[4]: i4(m, edges, wedges, re),
        r0[5]: i5(m, edges, wedges, re, q35, r4),
        rv[0]: 1,
        rv[1]: m - 1,
        rv[2]: i2(m - 1, edges - dv),
        rv[3]: i3(m - 1, edges - dv, wedges - c2(dv) - xv),
        rv[4]: i4(m - 1, edges - dv, wedges - c2(dv) - xv, rv3),
    }
    if endpoint:
        return rules, (re, rv3, q35, r4)

    dp, adjacent = sp.symbols("F_degree_p F_adjacent", integer=True, nonnegative=True)
    common = sp.Symbol("F_common_neighbor", integer=True, nonnegative=True)
    xp = sp.Symbol("F_neighbor_excess_p", integer=True, nonnegative=True)
    rp3 = sp.Symbol("F_connected3_P", integer=True, nonnegative=True)
    rp, rpv = rows[2:]
    wp = wedges - c2(dp) - xp
    wpv = (
        wedges - c2(dp) - c2(dv) - xp - xv
        + adjacent * (dp + dv - 2) + common
    )
    rules.update({
        rp[0]: 1,
        rp[1]: m - 1,
        rp[2]: i2(m - 1, edges - dp),
        rp[3]: i3(m - 1, edges - dp, wp),
        rp[4]: i4(m - 1, edges - dp, wp, rp3),
        rpv[0]: 1,
        rpv[1]: m - 2,
        rpv[2]: i2(m - 2, edges - dp - dv + adjacent),
        rpv[3]: i3(m - 2, edges - dp - dv + adjacent, wpv),
    })
    return rules, (re, rp3, rv3, q35, r4)


def expression_stats(expression):
    polynomial = sp.Poly(sp.expand(expression), *sorted(expression.free_symbols, key=str))
    return {
        "form": str(sp.factor(expression)),
        "term_count": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(
            coefficient.is_negative is True for _, coefficient in polynomial.terms()
        ),
    }


def derive_case(length, collisions, endpoint):
    rules, rows, children = row_substitution(length, collisions, endpoint=endpoint)
    invariants, motifs = invariant_substitution(rows, endpoint=endpoint)
    g1 = sp.factor(raw_g1().subs(rules).subs(invariants))
    g2 = sp.factor(independent_raw_g2().subs(rules).subs(invariants))
    motif1 = sp.factor(sum(sp.diff(g1, symbol) * symbol for symbol in motifs))
    motif2 = sp.factor(sum(sp.diff(g2, symbol) * symbol for symbol in motifs))
    return {
        "g1": expression_stats(g1),
        "g2": expression_stats(g2),
        "motif_g1": str(motif1),
        "motif_g2": str(motif2),
        "residual_g1": str(sp.factor(g1 - motif1)),
        "residual_g2": str(sp.factor(g2 - motif2)),
    }, (rules, rows, children, invariants)


def binomial_coefficients(values):
    values = list(values)
    result = []
    while values:
        result.append(values[0])
        values = [values[index + 1] - values[index] for index in range(len(values) - 1)]
    return result


def witness_check(raw_rules, rows, invariant_rules, collisions=3):
    # u-s-p-v, plus collision leaves at marked u.
    u, support, p, v = range(4)
    base = nx.path_graph((u, support, p, v))
    for leaf in range(4, 4 + collisions):
        base.add_edge(u, leaf)
    gamma = [aggregate_vector(base, (u, v), support, number)[4] for number in range(7)]
    coefficients = binomial_coefficients(gamma)

    f = nx.Graph([(p, v)])
    graphs = []
    for removed in ((), (v,), (p,), (p, v)):
        reduced = f.copy(); reduced.remove_nodes_from(removed); graphs.append(reduced)
    row_values = {}
    for symbols, graph in zip(rows, graphs):
        polynomial = independent_poly_bruteforce(graph)
        row_values.update({symbol: at(polynomial, rank) for rank, symbol in enumerate(symbols)})
    raw1 = raw_g1().subs(raw_rules)
    raw2 = independent_raw_g2().subs(raw_rules)
    exact = (int(raw1.subs(row_values)), int(raw2.subs(row_values)))
    assert exact == (coefficients[1], coefficients[2]), (exact, coefficients)

    invariant_values = {
        "m": 2, "F_edges": 1, "F_degree_p": 1, "F_degree_v": 1,
        "F_adjacent": 1, "F_common_neighbor": 0,
        "F_neighbor_excess_p": 0, "F_neighbor_excess_v": 0,
        "F_wedges_E": 0, "F_connected3_E": 0, "F_connected3_P": 0,
        "F_connected3_V": 0, "F_three_edge_five": 0, "F_connected4_E": 0,
    }
    configured = (raw1.subs(invariant_rules), raw2.subs(invariant_rules))
    substitutions = {
        symbol: invariant_values[str(symbol)]
        for expression in configured for symbol in expression.free_symbols
        if str(symbol) in invariant_values
    }
    assert tuple(int(expression.subs(substitutions)) for expression in configured) == exact
    return {
        "ell": 1, "collision_leaves_k": collisions,
        "Gamma_binomial_coefficients": coefficients,
        "g1": coefficients[1], "g2": coefficients[2],
    }


def main():
    ell, k = sp.symbols("ell k", integer=True, nonnegative=True)
    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_BROOM_CONFIGURATION_AGENT",
        "structural_rows": {
            "child": (
                "L=(1+x)^k; X=L I(P_(ell-1))+x I(P_(ell-2)); "
                "Y=L I(P_(ell-1)); A0=L I(P_(ell-2))+x I(P_(ell-3)); "
                "B0=L I(P_(ell-2))"
            ),
            "p_distinct_v": {
                "C": "(X R0,Y R0,X Rv,Y Rv)",
                "D": "(A0 Rp,B0 Rp,A0 Rpv,B0 Rpv)",
            },
            "p_equals_v": {
                "C": "(X R0,Y R0,X Rv,Y Rv)",
                "D": "(A0 Rv,B0 Rv,A0 Rv,B0 Rv)",
            },
            "boundary": "P_0=P_-1=empty and P_-2 is the zero row",
            "tail": "ell>=6, k>=0",
            "small": "ell=1,2,3,4,5 exact truncated path rows, k>=0",
        },
        "scope": (
            "Exact configuration reduction for the canonical one-ended broom "
            "child side, every ell>=1 and k>=0, separately for p!=v and p=v. "
            "No sign theorem is asserted."
        ),
    }
    tail_two, aux_two = derive_case(ell, k, endpoint=False)
    tail_end, aux_end = derive_case(ell, k, endpoint=True)
    report["p_distinct_v"] = {
        "tail": tail_two,
        "small": {str(length): derive_case(sp.Integer(length), k, endpoint=False)[0] for length in range(1, 6)},
    }
    report["p_equals_v"] = {
        "tail": tail_end,
        "small": {str(length): derive_case(sp.Integer(length), k, endpoint=True)[0] for length in range(1, 6)},
    }
    witness_rules, witness_rows, _ = row_substitution(
        sp.Integer(1), sp.Integer(3), endpoint=False
    )
    witness_invariants, _ = invariant_substitution(witness_rows, endpoint=False)
    report["collision_witness"] = witness_check(
        witness_rules, witness_rows, witness_invariants
    )
    report["source_sha256"] = sha256(Path(__file__))
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "p_distinct_tail_motifs": {
            "g1": tail_two["motif_g1"], "g2": tail_two["motif_g2"],
        },
        "p_equals_v_tail_motifs": {
            "g1": tail_end["motif_g1"], "g2": tail_end["motif_g2"],
        },
        "collision_witness": report["collision_witness"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
