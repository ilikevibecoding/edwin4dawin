#!/usr/bin/env python3
"""Independent finite replay of the adjacent-endpoint P4 certificate.

The derivation uses closed binomial moment rows.  This verifier instead
constructs K2 + t K1 as a NetworkX graph, obtains its rows from the
independent-set jet enumerator, and feeds those rows through the generic
recursive phase evaluator.
"""

from __future__ import annotations

import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_adjacent_endpoint_isolate_p4 import terminal_gap
from stress_sibling_theta_core_recursive_phase_split import (
    recursive_blocks_fast,
)


def graph(t: int) -> nx.Graph:
    result = nx.Graph()
    result.add_nodes_from(range(t + 2))
    result.add_edge(0, 1)
    return result


def direct_gap(q: int, t: int) -> int:
    return sum(
        recursive_blocks_fast(
            graph(t),
            root=0,
            support=1,
            q=q,
            subtract_lower=True,
        ).values()
    )


def main() -> None:
    checks = 0
    failures: list[dict] = []
    minimum: tuple[int, dict] | None = None

    for q in range(4, 13):
        for t in range(0, 17):
            graph_value = direct_gap(q, t)
            formula_value = int(terminal_gap(q, t))
            checks += 1
            if graph_value != formula_value:
                failures.append(
                    {
                        "kind": "terminal_gap",
                        "q": q,
                        "t": t,
                        "graph": graph_value,
                        "formula": formula_value,
                    }
                )

            graph_defect = (
                direct_gap(q, t + 1)
                - direct_gap(q, t)
                - direct_gap(q - 1, t)
            )
            formula_defect = int(
                sp.expand(
                    terminal_gap(q, t + 1)
                    - terminal_gap(q, t)
                    - terminal_gap(q - 1, t)
                )
            )
            checks += 1
            if graph_defect != formula_defect:
                failures.append(
                    {
                        "kind": "strong_isolate_defect",
                        "q": q,
                        "t": t,
                        "graph": graph_defect,
                        "formula": formula_defect,
                    }
                )
            if minimum is None or graph_defect < minimum[0]:
                minimum = (
                    graph_defect,
                    {"q": q, "t": t},
                )

    report = {
        "status": (
            "PASS_ADJACENT_ENDPOINT_ISOLATE_P4_REPLAY"
            if not failures
            else "FAIL"
        ),
        "method": (
            "NetworkX graph construction plus generic independent-set "
            "jet evaluator, compared with closed moment formulas"
        ),
        "checks": checks,
        "q_range": [4, 12],
        "t_range": [0, 16],
        "minimum_strong_isolate_defect": {
            "value": minimum[0],
            **minimum[1],
        },
        "failures": failures,
    }
    Path(
        "adjacent_endpoint_isolate_p4_replay_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
