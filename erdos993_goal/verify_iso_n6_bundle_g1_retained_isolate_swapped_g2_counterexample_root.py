#!/usr/bin/env python3
"""Independently reconstruct a negative swapped-G2 retained-isolate response.

The witness refutes the standalone swapped-superforest nonnegativity lemma.  It
does not refute the full retained-isolate increment, which remains positive in
this witness after the frozen G2 payment is included.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from search_iso_n6_bundle_g1_random_g1_nonadjacent import evaluator as g1_evaluator
from search_iso_n6_bundle_g1_random_g1_nonadjacent import rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_swapped_g2_counterexample_exact_root_20260831.json"
MARKER = "COUNTEREXAMPLE_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_SWAPPED_G2_SIGN_ROOT"
GRAPH6 = "hH??GO?C??C?C?O????????????????C???G?????G???????????G??A????????_??????????????????_??????????C????G??????????????????G??????????@???????"
ORDER = 41
U = 28
V = 5
ELL = 10
MASK = 1376159547944
PINS = {
    "probe_iso_n6_bundle_g1_leaf_three_targets_random_root.py":
        "756AB34294D6B884750C98F85AA33B14F97C85C2AE6D4E1C2B28CE1C432647F1",
    "iso_n6_bundle_g1_leaf_three_targets_random_probe_root_20260831.json":
        "FD4C36D8EE1B21A1F2E68EBAC9B513AAA03B8A5B2836F14C822B06BF7E53A312",
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
    "search_iso_n6_bundle_g1_random_g1_nonadjacent.py":
        "E1AE43CA1C972E07EE2946A4BC42F00FA48B00A122B23FFFFA1F6354D65986EC",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def g2_evaluator():
    expression = reconstruct(2)
    variables = tuple(sorted(expression.free_symbols, key=str))
    evaluate = sp.lambdify(variables, expression, "math")

    def value(crows, drows):
        data = {}
        for prefix, four in (("c", crows), ("d", drows)):
            for family, sequence in zip("EUVW", four):
                for rank in range(8):
                    data[f"{prefix}{family}{rank}"] = sequence[rank]
        return int(evaluate(*(data[str(variable)] for variable in variables)))

    return value


def rows_hash(*rowsets) -> str:
    payload = json.dumps(rowsets, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest().upper()


def main() -> None:
    for name, expected in PINS.items():
        actual = sha256(HERE / name)
        require(actual == expected, f"dependency hash mismatch for {name}: {actual}")

    graph = nx.from_graph6_bytes(GRAPH6.encode())
    graph = nx.convert_node_labels_to_integers(graph)
    require(len(graph) == ORDER, "order mismatch")
    require(nx.is_forest(graph), "witness graph is not a forest")
    require(nx.to_graph6_bytes(graph, header=False).decode().strip() == GRAPH6,
            "graph6 round-trip mismatch")
    require(ELL not in (U, V), "isolated vertex is marked")
    require(graph.degree(ELL) == 0, "ell is not isolated")
    require(((MASK >> ELL) & 1) == 0, "probe mask unexpectedly retained ell")

    retained = {node for node in graph if MASK & (1 << node)}
    base = graph.copy()
    base.remove_node(ELL)
    bgraph = base.subgraph(retained).copy()
    retained_graph = graph.subgraph(retained | {ELL}).copy()

    crows = rows(graph, U, V)
    arows = rows(base, U, V)
    brows = rows(bgraph, U, V)
    retained_drows = rows(retained_graph, U, V)
    zero = tuple(tuple(0 for _ in range(8)) for _ in "EUVW")
    g1 = g1_evaluator()
    g2 = g2_evaluator()

    delta_deleted = g1(crows, brows) - g1(arows, brows)
    delta_retained = g1(crows, retained_drows) - g1(arows, brows)
    response_direct = delta_retained - delta_deleted
    response_swapped = g2(brows, crows) - g2(brows, zero)
    frozen_payment = g2(arows, brows)

    require(delta_deleted == frozen_payment, "isolated-deleted G2 identity failed")
    require(response_direct == response_swapped, "swapped-G2 response identity failed")
    require(response_direct == -158221416, "negative response value mismatch")
    require(delta_deleted == 15446966506, "frozen payment value mismatch")
    require(delta_retained == 15288745090, "full retained increment value mismatch")
    require(delta_retained > 0 and delta_deleted > 0, "full leaf increment is not positive")

    report = {
        "marker": MARKER,
        "witness": {
            "order": ORDER,
            "graph6": GRAPH6,
            "marks": [U, V],
            "isolated_unmarked_vertex": ELL,
            "retained_mask_decimal": str(MASK),
            "retained_vertices": sorted(retained),
            "forest_edges": sorted([sorted(edge) for edge in graph.edges()]),
            "rows_sha256": rows_hash(crows, arows, brows, retained_drows),
        },
        "exact_values": {
            "frozen_G2_payment_delta_deleted": delta_deleted,
            "swapped_superforest_response": response_direct,
            "full_delta_retained": delta_retained,
            "payment_plus_response": delta_deleted + response_direct,
        },
        "conclusion": (
            "The standalone lemma g2_6(J,C)-g2_6(J,0)>=0 is false even for the "
            "required retained-isolate shape C=(1+x)A with J an actual induced minor "
            "of A.  The full retained-isolate increment remains positive because the "
            "frozen G2_6(A,J) payment dominates the negative response."
        ),
        "proof_route_effect": (
            "Retained-isolate, and any other leaf mode using this response, must keep "
            "the response coupled to its base payment; separate swapped-superforest "
            "nonnegativity cannot be a universal leaf lemma."
        ),
        "scope_guard": (
            "This is not a counterexample to rank-six g1, the full leaf-deletion "
            "inequality, forest independence-sequence unimodality, or Erdos Problem 993."
        ),
        "dependencies_sha256": PINS,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
