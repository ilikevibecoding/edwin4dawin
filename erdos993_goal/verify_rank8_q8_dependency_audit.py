#!/usr/bin/env python3
"""Exact guardrails for the proposed rank-eight Q8/PGC route."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx


GRAPH6 = "Op_I?C@?_?g??@??_?_?@"
EXPECTED_POLYNOMIAL = (1, 16, 105, 368, 748, 891, 591, 187, 18, 1)


def independent_set_polynomial_bruteforce(graph: nx.Graph) -> tuple[int, ...]:
    n = graph.number_of_nodes()
    edges = [(int(u), int(v)) for u, v in graph.edges()]
    counts = [0] * (n + 1)
    for mask in range(1 << n):
        if all(not ((mask >> u) & 1 and (mask >> v) & 1) for u, v in edges):
            counts[mask.bit_count()] += 1
    while counts and counts[-1] == 0:
        counts.pop()
    return tuple(counts)


def main() -> None:
    graph = nx.from_graph6_bytes(GRAPH6.encode("ascii"))
    assert nx.is_tree(graph)
    polynomial = independent_set_polynomial_bruteforce(graph)
    assert polynomial == EXPECTED_POLYNOMIAL
    alpha = len(polynomial) - 1
    q8 = 16 * polynomial[8] ** 2 - polynomial[7] * polynomial[8] - 18 * polynomial[7] * polynomial[9]
    assert alpha == 9 and q8 == -1548

    # L(alpha)=floor((2 alpha+1)/3), and rank k is required when k<L.
    L = lambda a: (2 * a + 1) // 3
    assert L(12) == 8 and L(13) == 9
    assert not (8 < L(12)) and 8 < L(13)

    output = Path(__file__).with_name("rank8_q8_dependency_audit_exact_20260816.json")
    payload = {
        "status": "PASS_EXACT_RANK8_Q8_DEPENDENCY_AUDIT",
        "prefix_threshold": {
            "formula": "L(alpha)=floor((2*alpha+1)/3); rank 8 is required iff 8<L(alpha)",
            "first_required_alpha": 13,
        },
        "standalone_high_band": {
            "V8_theorem_range_for_B": "alpha(B)>=14",
            "component_separated_relation": "alpha(B)=alpha(G)-1",
            "consequence": "the standalone Q8+V8 split applies directly only from alpha(G)>=15; alpha(G)=13,14 are coupled boundaries",
        },
        "unrestricted_Q8_counterexample": {
            "graph6": GRAPH6,
            "connected_tree": True,
            "order": graph.number_of_nodes(),
            "alpha": alpha,
            "independence_polynomial": list(polynomial),
            "Q8": q8,
            "role": "proves that terminal/core and component arguments may not discard Q8 terms outside the asserted alpha range",
        },
        "finite_order_guards": {
            "tree_alpha_at_most_13": "order at most 26 by bipartiteness",
            "B_alpha_12_boundary": "order at most 24",
            "B_alpha_13_boundary": "order at most 26",
        },
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
