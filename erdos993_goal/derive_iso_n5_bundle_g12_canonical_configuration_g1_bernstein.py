#!/usr/bin/env python3
"""Exact reusable rank-five g1/g2 configuration reduction.

The source reconstructs the rank-five whole-bundle functional directly,
specializes it to each canonical deepest-support geometry, and checks the row
factorizations on every ordered marked forest in the graph atlas.  It is a
configuration theorem only: no sign is inferred from the finite census.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp


MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G12_CANONICAL_CONFIGURATION_G1_BERNSTEIN"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def nested(rows, rank):
    e, u, v, w = rows
    r = rank
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def binomial_polynomial(variable, rank):
    if rank < 0:
        return sp.Integer(0)
    numerator = sp.sympify(sp.prod(variable - offset for offset in range(rank)))
    return sp.expand(numerator / sp.Integer(factorial(rank)))


def isolate_multiply(rows, amount, maximum=6):
    return tuple(
        tuple(
            sp.expand(sum(binomial_polynomial(amount, j) * at(row, k - j) for j in range(k + 1)))
            for k in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(crows, drows):
    return tuple(
        tuple(sp.expand(at(crow, k) + at(drow, k - 1)) for k in range(len(crow)))
        for crow, drow in zip(crows, drows)
    )


def raw_coefficients():
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")

    def gamma(amount):
        tm = add_xd(isolate_multiply(crows, amount), drows)
        t0 = add_xd(crows, drows)
        lower = sum(nested(isolate_multiply(crows, t, 5), 4) for t in range(amount))
        return sp.expand(nested(tm, 5) - nested(t0, 5) - lower)

    g1 = gamma(1)
    g2 = sp.expand(gamma(2) - 2 * gamma(1))
    assert len(sp.Poly(g1, *sorted(g1.free_symbols, key=str)).terms()) == 54
    assert len(sp.Poly(g2, *sorted(g2.free_symbols, key=str)).terms()) == 70
    return crows, drows, g1, g2


def choose(order, rank):
    if rank < 0:
        return sp.Integer(0)
    return binomial_polynomial(order, rank)


def forest_independent_row(prefix, order):
    """Inclusion-exclusion through independent six-sets in a forest."""
    e, wedges, r3, q35, r4, q46, r5 = sp.symbols(
        " ".join(prefix + suffix for suffix in ("e", "W", "R3", "Q35", "R4", "Q46", "R5"))
    )
    row = (
        sp.Integer(1),
        order,
        choose(order, 2) - e,
        choose(order, 3) - e * (order - 2) + wedges,
        choose(order, 4) - e * choose(order - 2, 2) + wedges * (order - 4) + choose(e, 2) - r3,
        choose(order, 5) - e * choose(order - 2, 3) + choose(e, 2) * (order - 4)
        + wedges * choose(order - 4, 2) - r3 * (order - 4) - q35 + r4,
        choose(order, 6) - e * choose(order - 2, 4) + choose(e, 2) * choose(order - 4, 2)
        + wedges * choose(order - 4, 3) - choose(e, 3)
        - r3 * (choose(order - 4, 2) - 1) - q35 * (order - 6)
        + r4 * (order - 5) + q46 - r5,
    )
    return tuple(sp.expand(value) for value in row), {
        "edges": e,
        "wedges": wedges,
        "connected_3_edges": r3,
        "three_edges_two_components_five_vertices": q35,
        "connected_4_edges": r4,
        "four_edges_two_components_six_vertices": q46,
        "connected_5_edges": r5,
    }


def expression_summary(expression):
    factored = sp.factor(expression)
    polynomial = sp.Poly(sp.expand(expression), *sorted(expression.free_symbols, key=str))
    encoded = str(factored).encode()
    return {
        "terms": len(polynomial.terms()),
        "total_degree": polynomial.total_degree(),
        "negative_scalar_coefficients": sum(
            int(value.is_negative is True) for value in polynomial.coeffs()
        ),
        "factored_expression_sha256": hashlib.sha256(encoded).hexdigest().upper(),
    }


def convolve(left, right, maximum=6):
    return tuple(
        sp.expand(sum(at(left, j) * at(right, k - j) for j in range(k + 1)))
        for k in range(maximum + 1)
    )


def substitute_rows(expression, generic_c, generic_d, crows, drows):
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update({symbol: value for symbol, value in zip(generic, actual)})
    return sp.factor(expression.subs(rules))


def symbolic_modes(generic_c, generic_d, g1, g2):
    n = sp.symbols("n", integer=True, positive=True)
    ordinary_rows = []
    ordinary_invariants = {}
    for prefix, order in zip(
        ("CE", "CU", "CV", "CW", "DE", "DU", "DV", "DW"),
        (n, n - 1, n - 1, n - 2, n - 1, n - 2, n - 2, n - 3),
    ):
        row, invariants = forest_independent_row(prefix, order)
        ordinary_rows.append(row)
        ordinary_invariants[prefix] = invariants

    c_ordinary = tuple(ordinary_rows[:4])
    d_ordinary = tuple(ordinary_rows[4:])

    # Endpoint p=u.  The p=v case follows by exchanging the two marked rows.
    d_endpoint = (c_ordinary[1], c_ordinary[1], c_ordinary[3], c_ordinary[3])
    d_k0 = c_ordinary

    factor_names = ("X", "U", "Y", "Z", "R0", "Rv", "Rp", "Rvp")
    factors = {
        name: tuple(sp.symbols(f"{name}0:7")) for name in factor_names
    }
    c_internal = (
        convolve(factors["X"], factors["R0"]),
        convolve(factors["U"], factors["R0"]),
        convolve(factors["X"], factors["Rv"]),
        convolve(factors["U"], factors["Rv"]),
    )
    d_internal_ordinary = (
        convolve(factors["Y"], factors["Rp"]),
        convolve(factors["Z"], factors["Rp"]),
        convolve(factors["Y"], factors["Rvp"]),
        convolve(factors["Z"], factors["Rvp"]),
    )
    d_internal_endpoint = (
        convolve(factors["Y"], factors["Rv"]),
        convolve(factors["Z"], factors["Rv"]),
        convolve(factors["Y"], factors["Rv"]),
        convolve(factors["Z"], factors["Rv"]),
    )

    modes = {
        "singleton_ordinary": (c_ordinary, d_ordinary),
        "singleton_endpoint_p_equals_u": (c_ordinary, d_endpoint),
        "no_parent_k0": (c_ordinary, d_k0),
        "internal_spine_broom_ordinary": (c_internal, d_internal_ordinary),
        "internal_spine_broom_endpoint": (c_internal, d_internal_endpoint),
    }
    summaries = {}
    expressions = {}
    for mode, (crows, drows) in modes.items():
        expressions[mode] = {}
        summaries[mode] = {}
        if mode.startswith("internal_spine"):
            # Expanding the eight factor rows destroys the useful product
            # structure and creates a very large polynomial.  The exact row
            # substitution is the reusable normal form; literal inversion is
            # checked below on every atlas cell.
            summaries[mode] = {
                "g1": {"normal_form": "54-term raw g1 evaluated on the displayed product rows"},
                "g2": {"normal_form": "70-term raw g2 evaluated on the displayed product rows"},
                "expansion_policy": "factor-preserving; no destructive full expansion",
            }
            continue
        for index, expression in ((1, g1), (2, g2)):
            reduced = substitute_rows(expression, generic_c, generic_d, crows, drows)
            expressions[mode][index] = reduced
            summaries[mode][f"g{index}"] = expression_summary(reduced)
    return summaries, expressions, ordinary_invariants


def independence_row(graph, maximum=6):
    vertices = tuple(graph)
    edges = {frozenset(edge) for edge in graph.edges()}
    return tuple(sum(
        all(frozenset(pair) not in edges for pair in itertools.combinations(chosen, 2))
        for chosen in itertools.combinations(vertices, rank)
    ) for rank in range(maximum + 1))


def four_rows(graph, u, v):
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(x for x in removed if x in reduced)
        rows.append(independence_row(reduced))
    return tuple(rows)


def rooted_data(graph, u, v):
    parent, depth, children, root_of = {}, {}, {x: [] for x in graph}, {}
    for component in nx.connected_components(graph):
        component = set(component)
        if v in component:
            root = v
        elif u in component:
            root = u
        else:
            nonleaves = sorted(x for x in component if graph.degree(x) > 1)
            root = nonleaves[0] if nonleaves else min(component)
        parent[root], depth[root], root_of[root] = None, 0, root
        stack = [root]
        while stack:
            x = stack.pop()
            for y in sorted(graph.neighbors(x), reverse=True):
                if y == parent[x]:
                    continue
                assert y not in parent
                parent[y], depth[y], root_of[y] = x, depth[x] + 1, root
                children[x].append(y)
                stack.append(y)
    return parent, depth, children, root_of


def deepest_cell(graph, u, v):
    parent, depth, children, root_of = rooted_data(graph, u, v)
    eligible = []
    for support in graph:
        if support in (u, v):
            continue
        bundle = [
            child for child in children[support]
            if child not in (u, v) and graph.degree(child) == 1
        ]
        if bundle:
            eligible.append((depth[support], -support, support, bundle))
    if not eligible:
        return None
    _depth, _tie, support, bundle = max(eligible)
    nonbundle = [child for child in children[support] if child not in bundle]
    assert len(nonbundle) <= 1
    p = parent[support]
    if not nonbundle:
        mode = "no_parent_k0" if p is None else (
            "singleton_endpoint_p_equals_u" if p in (u, v) else "singleton_ordinary"
        )
    else:
        assert p is not None
        mode = "internal_spine_broom_endpoint" if p == v else "internal_spine_broom_ordinary"
    return {
        "support": support,
        "bundle": bundle,
        "parent": p,
        "children": children,
        "nonbundle": nonbundle,
        "mode": mode,
    }


def descendants(children, start):
    result, stack = set(), [start]
    while stack:
        x = stack.pop()
        if x in result:
            continue
        result.add(x)
        stack.extend(children[x])
    return result


def configuration_rows(base, u, v, cell):
    support = cell["support"]
    cgraph = base.copy()
    cgraph.remove_node(support)
    dgraph = base.copy()
    dgraph.remove_nodes_from([support, *list(base.neighbors(support))])
    direct = (four_rows(cgraph, u, v), four_rows(dgraph, u, v))
    mode = cell["mode"]
    if mode == "no_parent_k0":
        structural = (four_rows(cgraph, u, v),) * 2
    elif mode.startswith("singleton"):
        g = cgraph
        p = cell["parent"]
        d = g.copy(); d.remove_node(p)
        structural = (four_rows(g, u, v), four_rows(d, u, v))
    else:
        child = cell["nonbundle"][0]
        aside = descendants(cell["children"], child)
        agraph = base.subgraph(aside).copy()
        fgraph = base.subgraph(set(base) - aside - {support}).copy()
        p = cell["parent"]
        x = independence_row(agraph)
        au = agraph.copy(); au.remove_node(u)
        uu = independence_row(au)
        aa = agraph.copy(); aa.remove_node(child)
        y = independence_row(aa)
        az = agraph.copy(); az.remove_nodes_from([child, u])
        z = independence_row(az)
        r0 = independence_row(fgraph)
        frv = fgraph.copy(); frv.remove_node(v)
        rv = independence_row(frv)
        if p == v:
            rp = rv
            rvp = rv
        else:
            frp = fgraph.copy(); frp.remove_node(p)
            rp = independence_row(frp)
            frvp = fgraph.copy(); frvp.remove_nodes_from([v, p])
            rvp = independence_row(frvp)
        crows = (convolve(x, r0), convolve(uu, r0), convolve(x, rv), convolve(uu, rv))
        drows = (convolve(y, rp), convolve(z, rp), convolve(y, rvp), convolve(z, rvp))
        structural = (crows, drows)
    assert direct == structural
    return direct


def evaluate_expression(expression, generic_c, generic_d, crows, drows):
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update({symbol: value for symbol, value in zip(generic, actual)})
    return int(expression.subs(rules))


def numeric_nested(rows, rank):
    e, u, v, w = rows
    r = rank
    return (
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def numeric_isolates(rows, amount, maximum):
    return tuple(tuple(
        sum(comb(amount, j) * at(row, k - j) for j in range(k + 1))
        for k in range(maximum + 1)
    ) for row in rows)


def numeric_add_xd(crows, drows):
    return tuple(tuple(
        at(crow, k) + at(drow, k - 1) for k in range(len(crow))
    ) for crow, drow in zip(crows, drows))


def numeric_g1_g2(crows, drows):
    t0 = numeric_add_xd(crows, drows)

    def gamma(amount):
        tm = numeric_add_xd(numeric_isolates(crows, amount, 6), drows)
        lower = sum(
            numeric_nested(numeric_isolates(crows, t, 5), 4)
            for t in range(amount)
        )
        return numeric_nested(tm, 5) - numeric_nested(t0, 5) - lower

    gamma1 = gamma(1)
    return int(gamma1), int(gamma(2) - 2 * gamma1)


def finite_census(generic_c, generic_d, g1, g2):
    counts, minima = {}, {}
    cells = 0
    for graph0 in nx.graph_atlas_g():
        if len(graph0) < 2 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        for u in graph:
            for v in graph:
                if u == v:
                    continue
                cell = deepest_cell(graph, u, v)
                if cell is None:
                    continue
                base = graph.copy()
                base.remove_nodes_from(cell["bundle"])
                crows, drows = configuration_rows(base, u, v, cell)
                value1, value2 = numeric_g1_g2(crows, drows)
                values = {"g1": value1, "g2": value2}
                mode = cell["mode"]
                counts[mode] = counts.get(mode, 0) + 1
                cells += 1
                for name, value in values.items():
                    key = f"{mode}:{name}"
                    record = {
                        "value": value,
                        "order": len(graph),
                        "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                        "marks": [u, v],
                        "support": cell["support"],
                    }
                    if key not in minima or value < minima[key]["value"]:
                        minima[key] = record
                    assert value >= 0  # finite audit only
    assert cells == 1924
    assert counts == {
        "no_parent_k0": 392,
        "singleton_endpoint_p_equals_u": 645,
        "singleton_ordinary": 490,
        "internal_spine_broom_endpoint": 290,
        "internal_spine_broom_ordinary": 107,
    }
    return {
        "atlas_orders": [2, 7],
        "ordered_canonical_nonterminal_cells": cells,
        "mode_counts": counts,
        "negative_g1_g2": 0,
        "minima": minima,
        "role": "exact row/configuration replay only; finite evidence is not a sign theorem",
    }


def main():
    generic_c, generic_d, g1, g2 = raw_coefficients()
    summaries, _expressions, invariants = symbolic_modes(generic_c, generic_d, g1, g2)
    census = finite_census(generic_c, generic_d, g1, g2)
    raw_hashes = {
        "g1": hashlib.sha256(str(sp.factor(g1)).encode()).hexdigest().upper(),
        "g2": hashlib.sha256(str(sp.factor(g2)).encode()).hexdigest().upper(),
    }
    report = {
        "marker": MARKER,
        "identity": {
            "Gamma_M": "N5((1+x)^M C+xD)-N5(C+xD)-sum_(t=0)^(M-1)N4((1+x)^t C)",
            "g1": "Gamma_1",
            "g2": "Gamma_2-2 Gamma_1",
        },
        "raw_coefficient_forms": {
            "g1_terms": 54,
            "g2_terms": 70,
            "factored_expression_sha256": raw_hashes,
        },
        "forest_inclusion_exclusion": {
            "invariants": list(next(iter(invariants.values())).keys()),
            "general_formula": (
                "i_k(F)=sum_(A subset E(F), |V(A)|<=k) (-1)^|A| "
                "binom(|F|-|V(A)|,k-|V(A)|)"
            ),
            "i6": (
                "C(n,6)-eC(n-2,4)+C(e,2)C(n-4,2)+W C(n-4,3)-C(e,3)"
                "-R3(C(n-4,2)-1)-Q35(n-6)+R4(n-5)+Q46-R5"
            ),
            "i6_exact_combinatorial_meaning": (
                "R3/R4/R5 are connected edge-subsets of the displayed size; "
                "Q35 counts three-edge two-component subsets on five vertices; "
                "Q46 counts four-edge two-component subsets on six vertices."
            ),
        },
        "canonical_row_reductions": {
            "singleton_ordinary": "C=rows(G); D=rows(G-p), p distinct from u,v",
            "singleton_endpoint": "for p=u, D=(C_U,C_U,C_W,C_W); p=v by u-v symmetry",
            "no_parent_k0": "D=C",
            "internal_ordinary": "C=(XR0,UR0,XRv,URv); D=(YRp,ZRp,YRvp,ZRvp)",
            "internal_endpoint": "C as ordinary; D=(YRv,ZRv,YRv,ZRv)",
            "broom_factors": (
                "X=I(A), U=I(A-u), Y=I(A-a), Z=I(A-{a,u}); "
                "A is the one-ended broom B_(ell,k), ell>=1,k>=0"
            ),
        },
        "mode_expression_summaries": summaries,
        "finite_replay": census,
        "status": {
            "configuration_reduction": "proved",
            "g1_sign": "not asserted by this artifact",
            "g2_sign": "not asserted by this artifact",
        },
        "scope": (
            "Exact rank-five g1/g2 configuration reduction for the five canonical deepest modes. "
            "It does not prove either sign, the rank-five bundle lemma, all N5, or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
