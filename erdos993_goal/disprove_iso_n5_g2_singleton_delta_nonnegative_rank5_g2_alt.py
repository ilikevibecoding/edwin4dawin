#!/usr/bin/env python3
"""Exact infinite-family disproof of the singleton auxiliary Delta>=0.

This does *not* disprove singleton g2.  It only shows that the attempted
root-deletion proof `g2(C,D)=g2(D,D)+Delta` cannot finish by proving the
increment Delta nonnegative: Delta is negative on a canonical infinite
family even though the complete singleton coefficient stays positive.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    configuration_rows, deepest_cell, four_rows, numeric_g1_g2,
)
from derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt import raw_g2


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_singleton_delta_nonnegative_disproof_rank5_g2_alt_20260830.json"
MARKER = "DISPROVED_ISO_N5_G2_SINGLETON_DELTA_NONNEGATIVE_RANK5_G2_ALT"
DEPENDENCIES = {
    "derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt.py":
        "D4FD797FE25F095BCCE8326B022F0735BB24612F8EF7AE8BCE72930F0F887C94",
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def row(poly, variable):
    expanded = sp.expand(poly)
    return tuple(expanded.coeff(variable, rank) for rank in range(7))


def shift(rows):
    return tuple((sp.Integer(0), *values[:-1]) for values in rows)


def symbolic_family():
    r = sp.symbols("r", integer=True, nonnegative=True)
    x = sp.symbols("x")
    isolates = sum(sp.binomial(r, rank) * x**rank for rank in range(7))
    star = isolates + x
    edge = 1 + 2*x
    isolated_vertex = 1 + x
    crows = (
        row(star * edge**2, x),
        row(star * isolated_vertex * edge, x),
        row(star * isolated_vertex * edge, x),
        row(star * isolated_vertex**2, x),
    )
    drows = (
        row(isolates * edge**2, x),
        row(isolates * isolated_vertex * edge, x),
        row(isolates * isolated_vertex * edge, x),
        row(isolates * isolated_vertex**2, x),
    )
    erows = (
        row(edge**2, x),
        row(isolated_vertex * edge, x),
        row(isolated_vertex * edge, x),
        row(isolated_vertex**2, x),
    )
    zero = tuple((sp.Integer(0),) * 7 for _ in range(4))
    singleton = sp.factor(raw_g2(crows, drows))
    base = sp.factor(raw_g2(drows, drows))
    q = sp.factor(raw_g2(shift(erows), zero))
    delta = sp.factor(singleton - base)
    linear = sp.factor(delta - q)
    expected_delta = (
        562*r + 443*sp.binomial(r, 2) + 2*sp.binomial(r, 3)
        - 77*sp.binomial(r, 4) - 14*sp.binomial(r, 5) + 524
    )
    expected_linear = expected_delta - 236
    assert sp.expand_func(delta - expected_delta).expand() == 0
    assert sp.expand_func(linear - expected_linear).expand() == 0
    assert q == 236
    polynomial = 14*r**5 + 245*r**4 - 1860*r**3 - 22925*r**2 - 42914*r - 62880
    assert sp.expand(sp.expand_func(delta) + polynomial / 120) == 0
    y = sp.symbols("y", integer=True, nonnegative=True)
    shifted = sp.expand(polynomial.subs(r, y + 11))
    assert shifted == (
        14*y**5 + 1015*y**4 + 25860*y**3 + 279905*y**2
        + 1106806*y + 57240
    )
    return r, crows, drows, erows, singleton, base, q, linear, delta, shifted


def canonical_witness(r_symbol, crows, drows, erows):
    r = 11
    parent = 0
    graph = nx.star_graph(r)
    u, u_mate, v, v_mate = r + 1, r + 2, r + 3, r + 4
    graph.add_edges_from(((u, u_mate), (v, v_mate)))
    c_numeric = four_rows(graph, u, v)
    deleted = graph.copy(); deleted.remove_node(parent)
    d_numeric = four_rows(deleted, u, v)
    closed_deleted = graph.copy()
    closed_deleted.remove_nodes_from([parent, *list(graph.neighbors(parent))])
    e_numeric = four_rows(closed_deleted, u, v)
    rules = {r_symbol: r}
    assert c_numeric == tuple(tuple(int(value.subs(rules)) for value in row0) for row0 in crows)
    assert d_numeric == tuple(tuple(int(value.subs(rules)) for value in row0) for row0 in drows)
    assert e_numeric == tuple(tuple(int(value.subs(rules)) for value in row0) for row0 in erows)

    # Adjoin the actual deepest support and one bundle leaf.
    support, bundle_leaf = r + 5, r + 6
    original = graph.copy()
    original.add_edges_from(((parent, support), (support, bundle_leaf)))
    cell = deepest_cell(original, u, v)
    assert cell is not None
    assert cell["mode"] == "singleton_ordinary"
    assert cell["support"] == support and cell["parent"] == parent
    assert cell["bundle"] == [bundle_leaf]
    base_graph = original.copy(); base_graph.remove_node(bundle_leaf)
    assert configuration_rows(base_graph, u, v, cell) == (c_numeric, d_numeric)

    singleton = numeric_g1_g2(c_numeric, d_numeric)[1]
    base = numeric_g1_g2(d_numeric, d_numeric)[1]
    q = int(raw_g2(shift(e_numeric), tuple((0,) * 7 for _ in range(4))))
    delta = singleton - base
    linear = delta - q
    assert (singleton, base, q, linear, delta) == (826399, 826876, 236, -713, -477)
    assert singleton > 0
    return {
        "r_star_leaves": r,
        "configuration_order": len(graph),
        "original_order_with_support_and_bundle_leaf": len(original),
        "graph6_original": nx.to_graph6_bytes(original, header=False).decode().strip(),
        "marks_u_v": [u, v],
        "parent": parent,
        "support": support,
        "bundle": [bundle_leaf],
        "canonical_mode": cell["mode"],
        "singleton_g2": singleton,
        "no_parent_base_g2": base,
        "Q": q,
        "L": linear,
        "Delta": delta,
    }


def main():
    actual_dependencies = {name: sha256(HERE / name) for name in DEPENDENCIES}
    assert actual_dependencies == DEPENDENCIES
    r, crows, drows, erows, singleton, base, q, linear, delta, shifted = symbolic_family()
    witness = canonical_witness(r, crows, drows, erows)
    report = {
        "marker": MARKER,
        "claim_disproved": "Delta(D,E)>=0 and L(D,E)>=0 in singleton_ordinary root deletion",
        "family": (
            "G_r is the disjoint union of K_{1,r}, centered at ordinary p, "
            "and two K2 components whose endpoints are the marks u,v."
        ),
        "exact_formulas": {
            "Q": str(q),
            "L": str(linear),
            "Delta": str(delta),
            "singleton_g2": str(singleton),
            "no_parent_base_g2": str(base),
            "negative_delta_numerator_shift_r_equals_11_plus_y": str(shifted),
        },
        "infinite_range": "Delta<0 for every integer r>=11; the shifted numerator has only positive coefficients",
        "first_family_witness": witness,
        "scope": (
            "This refutes only the auxiliary nonnegative-increment route. "
            "The complete singleton g2 value in the displayed witness is positive; "
            "no counterexample to g2, all N5, or Erdos Problem 993 is asserted."
        ),
        "dependencies_sha256": actual_dependencies,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "first_r": witness["r_star_leaves"],
        "Delta": witness["Delta"],
        "singleton_g2": witness["singleton_g2"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
