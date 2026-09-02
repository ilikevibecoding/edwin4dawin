#!/usr/bin/env python3
"""Independent exact audit of the R=7, c=1 group-payment obstruction.

This does not import or execute the producer probe.  It constructs a literal
tree realizing the task-supplied cell (split=0, s=4, x=(2,)), enumerates all
independent sets in the induced edge decomposition, and checks whether summing
over every nondistinguished base set repairs the proposed payment inequality.
It also exhausts all nonisomorphic trees through order ten as a bounded check
of the analytic minimum-order argument.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from fractions import Fraction
import hashlib
import itertools
import json
import math
from pathlib import Path

import networkx as nx


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "probe_uniform_edge_local_group_payment_root.py"
PRODUCER_REPORT = ROOT / "uniform_edge_local_group_payment_probe_root_20260828.json"
OUTPUT = ROOT / "uniform_edge_local_group_payment_obstruction_realizability_independent_audit_20260828.json"

# These are the hashes observed before the two named paths were regenerated
# during this independent audit.  The regenerated files no longer contain the
# assigned R=7,c=1 minimum, so the cell itself is reconstructed below.
ASSIGNED_SOURCE_SHA256 = "F5383141AB1BF7C6BD600775522D06C548FA17438B91E3C989E33874EF6F6372"
ASSIGNED_REPORT_SHA256 = "03F38E70ECEF9E951BB916F1A2A031EC3BB20A19BA1712703DF0AD05F218D0A5"

RANK = 7
GROUPS = 1
SPLIT = 0
BASE_SIZE = 4
COMPATIBLE_COUNTS = (2,)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent_sets(graph: nx.Graph, vertices=None):
    nodes = tuple(sorted(graph.nodes() if vertices is None else vertices))
    for mask in range(1 << len(nodes)):
        chosen = frozenset(nodes[i] for i in range(len(nodes)) if mask & (1 << i))
        if all(not (u in chosen and v in chosen) for u, v in graph.edges()):
            yield chosen


def polynomial(graph: nx.Graph, vertices=None) -> list[int]:
    counts = Counter(len(chosen) for chosen in independent_sets(graph, vertices))
    maximum = max(counts, default=0)
    return [counts[index] for index in range(maximum + 1)]


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if 0 <= k <= n else 0


def e_weight(size: int, hit_left: int, hit_right: int) -> int:
    """Exact E-weight after removing the constant 2*a_(R-1)."""
    deficit = RANK - size
    unhit_left = SPLIT - hit_left
    unhit_right = GROUPS - SPLIT - hit_right
    unhit = unhit_left + unhit_right
    if deficit == 1:
        return unhit
    if deficit >= 2:
        return (
            choose(unhit, deficit)
            + choose(unhit_left, deficit - 1)
            + choose(unhit_right, deficit - 1)
        )
    return 0


def witness_tree() -> nx.Graph:
    graph = nx.Graph()
    graph.add_edges_from(
        [
            ("u", "v"),
            ("v", "w"),
            ("w", "r1"),
            ("w", "r2"),
            ("r1", "t"),
            ("t", "s1"),
            ("t", "s2"),
            ("t", "s3"),
            ("t", "s4"),
        ]
    )
    return graph


def leaf_degree_two_decomposition(graph: nx.Graph, leaf, middle) -> dict:
    assert graph.has_edge(leaf, middle)
    assert graph.degree(leaf) == 1
    assert graph.degree(middle) == 2
    other = next(vertex for vertex in graph.neighbors(middle) if vertex != leaf)
    boundary = {other}
    h_nodes = set(graph) - {leaf, middle} - boundary
    roots = set(graph.neighbors(other)) & h_nodes
    nondistinguished = h_nodes - roots
    h_graph = graph.subgraph(h_nodes).copy()
    components = list(nx.connected_components(h_graph))
    assert all(len(component & roots) == 1 for component in components)
    return {
        "leaf": leaf,
        "middle": middle,
        "boundary": other,
        "h_nodes": h_nodes,
        "roots": roots,
        "nondistinguished": nondistinguished,
        "h_graph": h_graph,
    }


def compatible_roots(graph: nx.Graph, roots: set, base: frozenset) -> set:
    return {
        root
        for root in roots
        if all(not graph.has_edge(root, vertex) for vertex in base)
    }


def fixed_cell_direct() -> dict:
    rows = []
    denominator = 0
    payment = 0
    for selected in range(COMPATIBLE_COUNTS[0] + 1):
        multiplicity = choose(COMPATIBLE_COUNTS[0], selected)
        size = BASE_SIZE + selected
        hit_right = int(selected > 0)
        ew = e_weight(size, 0, hit_right)
        denominator_add = multiplicity if size == RANK - 1 else 0
        z_add = multiplicity * selected if size == RANK - 1 else 0
        payment_add = 2 * z_add + RANK * multiplicity * ew
        denominator += denominator_add
        payment += payment_add
        rows.append(
            {
                "selected_roots": selected,
                "multiplicity": multiplicity,
                "state_size": size,
                "denominator_contribution": denominator_add,
                "Z_contribution": z_add,
                "E_contribution": multiplicity * ew,
                "payment_contribution": payment_add,
            }
        )
    required = Fraction(RANK + 2 * GROUPS - 4, 1) + Fraction(
        GROUPS * (GROUPS - 1), RANK - 1
    )
    return {
        "rows": rows,
        "denominator": denominator,
        "payment": payment,
        "ratio": str(Fraction(payment, denominator)),
        "required": str(required),
        "slack": str(Fraction(payment, denominator) - required),
    }


def aggregate_over_bases(graph: nx.Graph, decomposition: dict) -> dict:
    roots = decomposition["roots"]
    nondistinguished = decomposition["nondistinguished"]
    h_graph = decomposition["h_graph"]
    base_rows = []
    totals = Counter()
    state_keys = set()

    for base in independent_sets(graph, nondistinguished):
        compatible = compatible_roots(graph, roots, base)
        row = Counter()
        for root_set in independent_sets(graph, compatible):
            state = frozenset(base | root_set)
            assert state not in state_keys
            state_keys.add(state)
            size = len(state)
            hit_right = int(bool(root_set))
            ew = e_weight(size, 0, hit_right)
            if size == RANK - 1:
                row["a6"] += 1
                row["Z"] += len(root_set)
            row["E"] += ew
        row["payment"] = 2 * row["Z"] + RANK * row["E"]
        totals.update(row)
        base_rows.append(
            {
                "base": sorted(base),
                "base_size": len(base),
                "compatible_roots": sorted(compatible),
                "compatible_count": len(compatible),
                "a6": row["a6"],
                "Z": row["Z"],
                "E": row["E"],
                "payment": row["payment"],
            }
        )

    direct_states = set(independent_sets(h_graph))
    assert state_keys == direct_states
    assert totals["payment"] == 2 * totals["Z"] + RANK * totals["E"]
    return {
        "base_count": len(base_rows),
        "base_rows": base_rows,
        "totals": {
            "a6": totals["a6"],
            "Z": totals["Z"],
            "E": totals["E"],
            "payment": totals["payment"],
            "required_payment": 5 * totals["a6"],
            "slack": totals["payment"] - 5 * totals["a6"],
        },
    }


def census_cell(graph: nx.Graph) -> list[dict]:
    hits = []
    for leaf, middle in graph.edges():
        for oriented_leaf, oriented_middle in ((leaf, middle), (middle, leaf)):
            if graph.degree(oriented_leaf) != 1 or graph.degree(oriented_middle) != 2:
                continue
            decomposition = leaf_degree_two_decomposition(
                graph, oriented_leaf, oriented_middle
            )
            for base in independent_sets(graph, decomposition["nondistinguished"]):
                if len(base) != BASE_SIZE:
                    continue
                compatible = compatible_roots(
                    graph, decomposition["roots"], base
                )
                if len(compatible) == COMPATIBLE_COUNTS[0]:
                    hits.append(
                        {
                            "leaf": oriented_leaf,
                            "middle": oriented_middle,
                            "boundary": decomposition["boundary"],
                            "base": sorted(base),
                            "compatible_roots": sorted(compatible),
                        }
                    )
    return hits


def nonisomorphic_census() -> dict:
    rows = []
    first_order = None
    first_graph6 = None
    first_hit = None
    for order in range(2, 11):
        tree_count = 0
        hit_tree_count = 0
        hit_cell_count = 0
        for graph in nx.nonisomorphic_trees(order):
            tree_count += 1
            hits = census_cell(graph)
            if hits:
                hit_tree_count += 1
                hit_cell_count += len(hits)
                graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
                if first_order is None:
                    first_order = order
                    first_graph6 = graph6
                    first_hit = hits[0]
        rows.append(
            {
                "order": order,
                "nonisomorphic_trees": tree_count,
                "trees_realizing_cell": hit_tree_count,
                "oriented_edge_base_cells": hit_cell_count,
            }
        )
    return {
        "orders": rows,
        "first_order": first_order,
        "first_graph6": first_graph6,
        "first_hit": first_hit,
    }


def main() -> None:
    graph = witness_tree()
    assert nx.is_tree(graph)
    decomposition = leaf_degree_two_decomposition(graph, "u", "v")
    assert decomposition["boundary"] == "w"
    assert decomposition["roots"] == {"r1", "r2"}
    assert decomposition["nondistinguished"] == {"t", "s1", "s2", "s3", "s4"}

    base = frozenset({"s1", "s2", "s3", "s4"})
    assert compatible_roots(graph, decomposition["roots"], base) == {"r1", "r2"}

    fixed_cell = fixed_cell_direct()
    assert fixed_cell["denominator"] == 1
    assert fixed_cell["payment"] == 4
    assert fixed_cell["required"] == "5"
    assert fixed_cell["slack"] == "-1"

    aggregate = aggregate_over_bases(graph, decomposition)
    assert aggregate["totals"] == {
        "a6": 1,
        "Z": 2,
        "E": 0,
        "payment": 4,
        "required_payment": 5,
        "slack": -1,
    }

    h_poly = polynomial(decomposition["h_graph"])
    j_graph = graph.subgraph(decomposition["nondistinguished"]).copy()
    j_poly = polynomial(j_graph)
    t_poly = polynomial(graph)
    assert h_poly == [1, 7, 16, 20, 15, 6, 1]
    assert j_poly == [1, 5, 6, 4, 1]
    assert t_poly == [1, 10, 36, 63, 65, 41, 14, 2]

    a6 = h_poly[6]
    i7 = t_poly[7]
    order = len(graph)
    h_order = len(decomposition["h_nodes"])
    edge_local_lhs = (order - 2) * (order - 3) * a6
    edge_local_rhs = RANK * h_order * i7
    assert (edge_local_lhs, edge_local_rhs) == (56, 98)

    census = nonisomorphic_census()
    assert census["first_order"] == 10

    current_source_sha = sha256(SOURCE)
    current_report_sha = sha256(PRODUCER_REPORT)
    report = {
        "schema": "uniform-edge-local-group-payment-obstruction-realizability-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_REALIZABLE_AND_AGGREGATE_GROUP_PAYMENT_COUNTEREXAMPLE_AUDIT",
        "audit_source_sha256": sha256(Path(__file__)),
        "assigned_snapshot": {
            "source_sha256_observed_before_regeneration": ASSIGNED_SOURCE_SHA256,
            "report_sha256_observed_before_regeneration": ASSIGNED_REPORT_SHA256,
            "cell": {
                "rank": RANK,
                "groups": GROUPS,
                "split": SPLIT,
                "base_size": BASE_SIZE,
                "compatible_counts": list(COMPATIBLE_COUNTS),
                "ratio": "4",
                "required": "5",
            },
        },
        "path_drift": {
            "detected": current_source_sha != ASSIGNED_SOURCE_SHA256
            or current_report_sha != ASSIGNED_REPORT_SHA256,
            "current_source_sha256": current_source_sha,
            "current_report_sha256": current_report_sha,
            "interpretation": (
                "The named producer paths were regenerated during the audit. "
                "This auditor reconstructs the assigned old cell independently."
            ),
        },
        "witness": {
            "order": order,
            "vertices": sorted(graph.nodes()),
            "edges": sorted(tuple(sorted(edge)) for edge in graph.edges()),
            "oriented_edge": ["u", "v"],
            "endpoint_degrees": [graph.degree("u"), graph.degree("v")],
            "boundary": "w",
            "H_vertices": sorted(decomposition["h_nodes"]),
            "distinguished_group": sorted(decomposition["roots"]),
            "nondistinguished_vertices": sorted(decomposition["nondistinguished"]),
            "fixed_base": sorted(base),
            "compatible_roots": sorted(
                compatible_roots(graph, decomposition["roots"], base)
            ),
            "H_independence_polynomial": h_poly,
            "J_independence_polynomial": j_poly,
            "T_independence_polynomial": t_poly,
            "graph6": nx.to_graph6_bytes(
                nx.convert_node_labels_to_integers(graph, ordering="sorted"),
                header=False,
            ).decode().strip(),
        },
        "fixed_cell_reconstruction": fixed_cell,
        "all_base_sets_aggregation": aggregate,
        "edge_local_scope_check": {
            "a6": a6,
            "i7_T": i7,
            "H_order": h_order,
            "lhs_(n-2)(n-3)a6": edge_local_lhs,
            "rhs_7|H|i7": edge_local_rhs,
            "margin": edge_local_rhs - edge_local_lhs,
            "conclusion": (
                "The group-payment bound fails, but the actual edge-local "
                "inequality for this witness has positive margin 42."
            ),
        },
        "minimality": {
            "analytic": (
                "The cell needs four selected nondistinguished vertices and two "
                "selected compatible distinguished roots, hence six selected H "
                "vertices. If H had only those six vertices, it would be edgeless; "
                "the four nondistinguished vertices could not connect to the boundary "
                "through a distinguished root in the tree. At least one additional "
                "unselected connector is necessary, so |H|>=7 and |T|=|H|+3>=10. "
                "The displayed witness attains equality."
            ),
            "bounded_nonisomorphic_tree_census": census,
        },
        "scope": (
            "Exact counterexample to the proposed R=7,c=1 fixed-base and "
            "all-base-aggregated group-payment inequality only. It is not a "
            "counterexample to the final edge-local inequality, the averaged "
            "token-sliding candidate, a forest coefficient theorem, or Erdos 993."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("a6,Z,E,payment,required", 1, 2, 0, 4, 5)
    print("first_realizable_order", census["first_order"])
    print("edge_local_margin", edge_local_rhs - edge_local_lhs)
    print("current_producer_source_sha256", current_source_sha)
    print("current_producer_report_sha256", current_report_sha)
    print("audit_source_sha256", sha256(Path(__file__)))
    print("audit_report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
