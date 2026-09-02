#!/usr/bin/env python3
"""Finite diagnostic for possible q2 mediators in terminal anchor ordering."""

from __future__ import annotations

from fractions import Fraction

import networkx as nx

from probe_terminal_support_q3_envelope_recurrence_independent_agent import (
    derivative,
    recurrence_components,
    rows,
)


def ratio_at(graph: nx.Graph, rank: int) -> Fraction | None:
    independent, residual, denominator = rows(graph)
    index = rank - 1
    if index >= len(denominator) or denominator[index] == 0:
        return None
    return Fraction(
        residual[index] if index < len(residual) else 0,
        denominator[index],
    )


def main() -> None:
    failures = {"a0_le_q2Q": None, "a1_ge_q2Q": None, "a1_ge_q2F": None}
    checks = 0
    for order in range(2, 12):
        for base in nx.nonisomorphic_trees(order):
            base = nx.convert_node_labels_to_integers(base)
            code = nx.to_graph6_bytes(base, header=False).decode().strip()
            for w in base:
                forest = base.subgraph(set(base) - {w}).copy()
                q2f = ratio_at(forest, 2)
                for leaves in range(1, 8):
                    isolates = nx.disjoint_union(base, nx.empty_graph(leaves))
                    q2q = ratio_at(isolates, 2)
                    a0_block, a1_block = recurrence_components(base, w, leaves)
                    anchors = []
                    for independent, residual in (a0_block, a1_block):
                        den = derivative(independent)
                        anchors.append(
                            None
                            if len(den) <= 2 or den[2] == 0
                            else Fraction(
                                residual[2] if len(residual) > 2 else 0, den[2]
                            )
                        )
                    a0, a1 = anchors
                    if a0 is None or a1 is None:
                        continue
                    item = {
                        "order": order,
                        "w": w,
                        "leaves": leaves,
                        "graph6": code,
                        "a0": str(a0),
                        "a1": str(a1),
                        "q2Q": str(q2q),
                        "q2F": str(q2f),
                    }
                    if q2q is not None and a0 > q2q and failures["a0_le_q2Q"] is None:
                        failures["a0_le_q2Q"] = item
                    if q2q is not None and a1 < q2q and failures["a1_ge_q2Q"] is None:
                        failures["a1_ge_q2Q"] = item
                    if q2f is not None and a1 < q2f and failures["a1_ge_q2F"] is None:
                        failures["a1_ge_q2F"] = item
                    checks += 1
    print("checks", checks)
    for name, witness in failures.items():
        print(name, "PASS" if witness is None else "FAIL", witness)


if __name__ == "__main__":
    main()
