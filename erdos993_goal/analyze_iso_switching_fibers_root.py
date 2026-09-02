#!/usr/bin/env python3
"""Exact symmetric-difference fiber audit for the forest ISO reserve.

For fixed k, group ordered pairs of independent sets by their common part C
and union U.  Let n0(C,U) count ordered (k+1,k+1) pairs in the fiber and
n2(C,U) count ordered (k,k+2) pairs.  The ISO reserve is exactly

    p_k^2 + sum_f [(k+1)n0(f) - (k+2)n2(f)].

This diagnostic measures the negative fibers that a cross-fiber payment must
cover and classifies them by their symmetric-difference component imbalances.
It proves only the displayed bookkeeping identity, not the needed payment.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

import networkx as nx


def independent_by_rank(G: nx.Graph) -> list[list[int]]:
    n = G.number_of_nodes()
    edges = [(1 << u) | (1 << v) for u, v in G.edges()]
    rows = [[] for _ in range(n + 1)]
    for mask in range(1 << n):
        if all(mask & edge != edge for edge in edges):
            rows[mask.bit_count()].append(mask)
    return rows


def component_imbalances(G: nx.Graph, a: int, b: int) -> tuple[int, ...]:
    diff = a ^ b
    vertices = [v for v in range(G.number_of_nodes()) if diff & (1 << v)]
    H = G.subgraph(vertices)
    values = []
    for comp in nx.connected_components(H):
        ca = sum(bool(a & (1 << v)) for v in comp)
        cb = sum(bool(b & (1 << v)) for v in comp)
        values.append(cb - ca)
    return tuple(sorted(values))


def has_subset_sum_one(values: tuple[int, ...]) -> bool:
    sums = {0}
    for value in values:
        sums |= {x + value for x in tuple(sums)}
    return 1 in sums


def audit(G: nx.Graph, name: str) -> dict:
    G = nx.convert_node_labels_to_integers(G)
    rows = independent_by_rank(G)
    record = {
        "name": name,
        "n": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "rank_rows": [],
    }
    for k in range(len(rows) - 2):
        if not rows[k] or not rows[k + 2]:
            continue
        f0: Counter[tuple[int, int]] = Counter()
        f2: Counter[tuple[int, int]] = Counter()
        rep2: dict[tuple[int, int], tuple[int, int]] = {}
        for x in rows[k + 1]:
            for y in rows[k + 1]:
                f0[(x & y, x | y)] += 1
        for a in rows[k]:
            for b in rows[k + 2]:
                key = (a & b, a | b)
                f2[key] += 1
                rep2.setdefault(key, (a, b))

        all_keys = f0.keys() | f2.keys()
        local_sum = 0
        negative_mass = 0
        positive_mass = 0
        negative_fibers = 0
        no_subset_sum_one_fibers = 0
        imbalance_types: Counter[tuple[int, ...]] = Counter()
        worst = None
        for key in all_keys:
            contribution = (k + 1) * f0[key] - (k + 2) * f2[key]
            local_sum += contribution
            if contribution < 0:
                negative_mass -= contribution
                negative_fibers += 1
                a, b = rep2[key]
                imbalances = component_imbalances(G, a, b)
                imbalance_types[imbalances] += 1
                if not has_subset_sum_one(imbalances):
                    no_subset_sum_one_fibers += 1
                if worst is None or contribution < worst["contribution"]:
                    worst = {
                        "contribution": contribution,
                        "n0": f0[key],
                        "n2": f2[key],
                        "intersection": key[0],
                        "union": key[1],
                        "imbalances": imbalances,
                        "has_subset_sum_one": has_subset_sum_one(imbalances),
                    }
            else:
                positive_mass += contribution

        pk = len(rows[k])
        pk1 = len(rows[k + 1])
        pk2 = len(rows[k + 2])
        iso = (k + 1) * pk1 * pk1 + pk * pk - (k + 2) * pk * pk2
        assert local_sum == (k + 1) * pk1 * pk1 - (k + 2) * pk * pk2
        assert iso == pk * pk + local_sum
        record["rank_rows"].append(
            {
                "k": k,
                "p": [pk, pk1, pk2],
                "iso": iso,
                "local_sum": local_sum,
                "negative_mass": negative_mass,
                "positive_mass": positive_mass,
                "negative_fibers": negative_fibers,
                "no_subset_sum_one_fibers": no_subset_sum_one_fibers,
                "negative_mass_over_pk_squared": [negative_mass, pk * pk],
                "imbalance_types": {str(key): value for key, value in imbalance_types.items()},
                "worst_fiber": worst,
            }
        )
    return record


def main() -> None:
    records = []
    total_rank_rows = 0
    total_negative_fibers = 0
    total_no_subset = 0
    maximum_ratio = (0, 1, None)
    for n in range(2, 11):
        for idx, G in enumerate(nx.generators.nonisomorphic_trees(n)):
            rec = audit(G, f"tree_{n}_{idx}")
            records.append(rec)
            for row in rec["rank_rows"]:
                total_rank_rows += 1
                total_negative_fibers += row["negative_fibers"]
                total_no_subset += row["no_subset_sum_one_fibers"]
                num, den = row["negative_mass_over_pk_squared"]
                if num * maximum_ratio[1] > maximum_ratio[0] * den:
                    maximum_ratio = (num, den, {"tree": rec["name"], "rank": row["k"]})

    report = {
        "marker": "AUDIT_EXACT_ISO_SYMMETRIC_DIFFERENCE_FIBERS",
        "scope_warning": "finite diagnostic and exact bookkeeping identity only",
        "trees": len(records),
        "rank_rows": total_rank_rows,
        "negative_fibers": total_negative_fibers,
        "negative_fibers_without_subset_sum_one": total_no_subset,
        "maximum_negative_mass_over_pk_squared": [maximum_ratio[0], maximum_ratio[1]],
        "maximum_ratio_location": maximum_ratio[2],
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "records": records,
    }
    Path("iso_switching_fibers_exact_root_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
