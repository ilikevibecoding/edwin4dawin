#!/usr/bin/env python3
"""Forest-specific component factorization for the 33-term N4 form.

For W=B-{u,v}, the two marked neighbourhoods are transversals of the
components of W.  At most one component can meet both transversals (and none
can when uv is an edge).  This gives an exact componentwise product model for
the four nested independence complexes P,A,B,C and a fixed-rank DP/cone
starting point.  It is a structural reduction, not an N4 positivity proof.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import add, graph6, mul, poly_forest
from verify_iso_n4_simplicial_decomposition_root import decomposed_n4, direct_n4


def shift(row: list[int], amount: int = 1) -> list[int]:
    return [0] * amount + row


def zero_trim(row: list[int]) -> list[int]:
    while len(row) > 1 and row[-1] == 0:
        row.pop()
    return row


def polynomial_after_deleting(graph: nx.Graph, deleted: set[int]) -> list[int]:
    reduced = graph.copy()
    reduced.remove_nodes_from(deleted)
    return poly_forest(reduced)


def factorization(graph: nx.Graph, u: int, v: int) -> dict[str, object]:
    adjacent = graph.has_edge(u, v)
    w_graph = graph.copy()
    w_graph.remove_nodes_from((u, v))
    s_set = set(graph.neighbors(u)) & set(w_graph)
    t_set = set(graph.neighbors(v)) & set(w_graph)

    p_factor = [1]
    a_factor = [1]
    b_factor = [1]
    c_factor = [1]
    types = {"unmarked": 0, "u_only": 0, "v_only": 0, "double": 0}
    component_rows = []
    for component_vertices in nx.connected_components(w_graph):
        component = w_graph.subgraph(component_vertices).copy()
        s_here = sorted(s_set & component_vertices)
        t_here = sorted(t_set & component_vertices)
        assert len(s_here) <= 1 and len(t_here) <= 1
        if s_here and t_here:
            types["double"] += 1
            kind = "double"
        elif s_here:
            types["u_only"] += 1
            kind = "u_only"
        elif t_here:
            types["v_only"] += 1
            kind = "v_only"
        else:
            types["unmarked"] += 1
            kind = "unmarked"
        h = poly_forest(component)
        hs = polynomial_after_deleting(component, set(s_here))
        ht = polynomial_after_deleting(component, set(t_here))
        hst = polynomial_after_deleting(component, set(s_here + t_here))
        p_factor = mul(p_factor, h)
        a_factor = mul(a_factor, hs)
        b_factor = mul(b_factor, ht)
        c_factor = mul(c_factor, hst)
        component_rows.append(
            {
                "kind": kind,
                "order": len(component),
                "s": s_here,
                "t": t_here,
                "h": h,
                "h_minus_s": hs,
                "h_minus_t": ht,
                "h_minus_st": hst,
            }
        )

    assert types["double"] <= (0 if adjacent else 1)
    p = poly_forest(w_graph)
    a = polynomial_after_deleting(w_graph, s_set)
    b = polynomial_after_deleting(w_graph, t_set)
    c = [0] if adjacent else polynomial_after_deleting(w_graph, s_set | t_set)
    assert p_factor == p and a_factor == a and b_factor == b
    if adjacent:
        assert types["double"] == 0
    else:
        assert c_factor == c

    # Reconstruct the four actual minor rows from exact mark-incidence layers.
    expected_w = p
    expected_u = add(p, shift(b))
    expected_v = add(p, shift(a))
    expected_e = add(add(add(p, shift(a)), shift(b)), shift(c, 2))
    actual_rows = []
    for deleted in (set(), {u}, {v}, {u, v}):
        actual_rows.append(polynomial_after_deleting(graph, deleted))
    assert list(map(zero_trim, actual_rows)) == list(
        map(zero_trim, [expected_e, expected_u, expected_v, expected_w])
    )
    assert direct_n4(tuple(map(tuple, actual_rows))) == decomposed_n4(
        tuple(p), tuple(a), tuple(b), tuple(c)
    )
    return {
        "adjacent_marks": adjacent,
        "S": sorted(s_set),
        "T": sorted(t_set),
        "component_types": types,
        "P": p,
        "A": a,
        "B": b,
        "C": c,
        "N4": direct_n4(tuple(map(tuple, actual_rows))),
        "components": component_rows,
    }


def census(max_tree_order: int = 10) -> dict[str, object]:
    cells = adjacent = nonadjacent = double_cells = 0
    atlas_cells = 0
    type_profiles: set[tuple[int, int, int, int]] = set()
    minimum: dict | None = None
    graph_rows: list[tuple[str, nx.Graph]] = []
    for order in range(2, max_tree_order + 1):
        graph_rows.extend(("tree", graph) for graph in nx.nonisomorphic_trees(order))
    graph_rows.extend(
        ("atlas_forest", nx.convert_node_labels_to_integers(graph))
        for graph in nx.graph_atlas_g()
        if len(graph) >= 2 and nx.is_forest(graph)
    )
    for source, graph in graph_rows:
        order = len(graph)
        for u, v in itertools.permutations(graph, 2):
            row = factorization(graph, u, v)
            cells += 1
            atlas_cells += int(source == "atlas_forest")
            adjacent += int(row["adjacent_marks"])
            nonadjacent += int(not row["adjacent_marks"])
            double_cells += int(row["component_types"]["double"] == 1)
            profile = row["component_types"]
            type_profiles.add(
                (
                    profile["unmarked"],
                    profile["u_only"],
                    profile["v_only"],
                    profile["double"],
                )
            )
            witness = {
                "N4": row["N4"],
                "order": order,
                "source": source,
                "u": u,
                "v": v,
                "graph6": graph6(graph),
                "component_types": row["component_types"],
            }
            if minimum is None or witness["N4"] < minimum["N4"]:
                minimum = witness
    return {
        "tree_orders": [2, max_tree_order],
        "ordered_marked_cells": cells,
        "atlas_forest_cells": atlas_cells,
        "adjacent_cells": adjacent,
        "nonadjacent_cells": nonadjacent,
        "one_double_component_cells": double_cells,
        "distinct_component_type_profiles": len(type_profiles),
        "minimum_N4": minimum,
    }


def main() -> None:
    report = {
        "marker": "PASS_EXACT_ISO_N4_FOREST_COMPONENT_DP_FACTORIZATION",
        "theorem": {
            "W": "B-{u,v}",
            "transversals": "S=N_W(u), T=N_W(v), at most one vertex per W component",
            "incidence_constraint": (
                "at most one component meets both S,T; zero if uv is an edge"
            ),
            "nonadjacent_layers": (
                "P=I(W), A=I(W-S), B=I(W-T), C=I(W-S-T)"
            ),
            "adjacent_layers": "same P,A,B and C=0",
            "component_generators": [
                "unmarked: (h,h,h,h)",
                "u-only: (h,h-s,h,h-s)",
                "v-only: (h,h,h-t,h-t)",
                "at most one double: (h,h-s,h-t,h-{s,t})",
            ],
        },
        "fixed_rank_cone": (
            "Truncate each generator through degree five and combine its "
            "four rows by ordinary coefficient convolution.  The resulting "
            "Hadamard-product semigroup is exactly the forest-realizable "
            "input cone for the 33-term N4 form."
        ),
        "common_unmarked_action": (
            "The unmarked generator is the already-derived triangular action "
            "N(P*T)=P(z)P(w)N(T)+J(P)R(T)."
        ),
        "census": census(),
        "scope": (
            "Exact forest-specific structural reduction.  Positivity of N4 "
            "on the resulting product cone is still open."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    print(raw, end="")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
