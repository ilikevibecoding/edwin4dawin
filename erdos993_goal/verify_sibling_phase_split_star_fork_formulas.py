#!/usr/bin/env python3
"""Verify the closed star-fork moment formulas against explicit graphs.

The large-family stress test uses polynomial formulas instead of building
the graph.  This script constructs small members vertex-by-vertex and
requires exact agreement for every recursive phase block.
"""

from __future__ import annotations

import json
from pathlib import Path

import networkx as nx

from stress_sibling_phase_split_star_fork import (
    core_blocks,
    family_states,
)
from stress_sibling_theta_core_recursive_phase_split import (
    recursive_blocks_fast,
)


def star_fork(m: int, t: int) -> tuple[nx.Graph, int, int]:
    """Return the old tree, its root, and the first fork support."""
    graph = nx.Graph()
    root = 0
    next_vertex = 1

    # Two leaf-neighbors of the root, one of them distinguished.
    for _ in range(2):
        graph.add_edge(root, next_vertex)
        next_vertex += 1

    inward = next_vertex
    next_vertex += 1
    graph.add_edge(root, inward)

    first_support = -1
    for fork_index in range(t):
        support = next_vertex
        next_vertex += 1
        if fork_index == 0:
            first_support = support
        graph.add_edge(inward, support)
        for _ in range(m):
            graph.add_edge(support, next_vertex)
            next_vertex += 1

    return graph, root, first_support


def formula_delta(m: int, t: int, q: int) -> dict[str, int]:
    old, new, lower = family_states(m, t)
    old_blocks = core_blocks(q, *old)
    new_blocks = core_blocks(q, *new)
    lower_blocks = core_blocks(q - 1, *lower)
    return {
        name: new_blocks[name] - old_blocks[name] - lower_blocks[name]
        for name in old_blocks
    }


def main() -> None:
    checks = 0
    failures: list[dict] = []
    for m in range(1, 5):
        for t in range(2, 5):
            graph, root, support = star_fork(m, t)
            for q in range(4, graph.number_of_nodes() + 2):
                expected = recursive_blocks_fast(graph, root, support, q)
                observed = formula_delta(m, t, q)
                checks += 1
                if observed != expected:
                    failures.append(
                        {
                            "m": m,
                            "t": t,
                            "rank_q": q,
                            "observed": observed,
                            "expected": expected,
                        }
                    )

    report = {
        "status": (
            "PASS_EXACT_STAR_FORK_FORMULA_REPLAY"
            if not failures
            else "FAIL_EXACT_STAR_FORK_FORMULA_REPLAY"
        ),
        "checks": checks,
        "failure_count": len(failures),
        "failures": failures[:20],
    }
    Path(
        "sibling_phase_split_star_fork_formula_replay_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
