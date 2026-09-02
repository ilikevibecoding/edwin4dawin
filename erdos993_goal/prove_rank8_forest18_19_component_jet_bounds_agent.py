#!/usr/bin/env python3
"""Exact component-resolved rank-0..6 jet bounds at forest orders 18 and 19."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import networkx as nx

import prove_rank8_forest16_f5_f6_ratio_agent as base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_forest18_19_component_jet_bounds_exact_agent_20260823.json"
EXPECTED_TREE_COUNTS = [0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741, 19320, 48629, 123867, 317955]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def forest_type_counts(tree_counts: list[int], target: int):
    states = {(0, 0): 1}
    for order in range(1, target + 1):
        updated = {}
        for (old_n, old_c), count in states.items():
            for copies in range((target - old_n) // order + 1):
                key = (old_n + copies * order, old_c + copies)
                multiplicity = math.comb(tree_counts[order] + copies - 1, copies)
                updated[key] = updated.get(key, 0) + count * multiplicity
        states = updated
    return {components: states.get((target, components), 0) for components in range(1, target + 1)}


def main() -> None:
    peak = base.gate()
    tree_types = {1: {(1, 1, 0, 0, 0, 0, 0)}}
    tree_counts = [0, 1]
    graph6_stream = hashlib.sha256(b"order=1;@\n")
    for order in range(2, 20):
        jets = set()
        count = 0
        for tree in nx.nonisomorphic_trees(order):
            count += 1
            jets.add(base.tree_jet(tree))
            graph6_stream.update(f"order={order};".encode())
            graph6_stream.update(nx.to_graph6_bytes(tree, header=False).strip())
            graph6_stream.update(b"\n")
        tree_types[order] = jets
        tree_counts.append(count)
        peak = max(peak, base.gate())
    assert tree_counts == EXPECTED_TREE_COUNTS

    unit = (1, 0, 0, 0, 0, 0, 0)
    forests = {(0, 0): {unit}}
    for total in range(1, 20):
        for component_order in range(1, total + 1):
            remainder = total - component_order
            sources = [(components, values) for (order, components), values in forests.items() if order == remainder]
            for components, old_values in sources:
                target = forests.setdefault((total, components + 1), set())
                for component in tree_types[component_order]:
                    for old in old_values:
                        target.add(base.multiply(old, component))
        peak = max(peak, base.gate())

    rows = []
    summaries = {}
    fingerprints = {}
    for order in (18, 19):
        type_counts = forest_type_counts(tree_counts, order)
        order_rows = []
        for components in range(1, order + 1):
            values = forests[(order, components)]
            assert all(value[6] > 0 for value in values)
            minima = [min(value[index] for value in values) for index in range(5)]
            maximum = max(values, key=lambda value: Fraction(value[5], value[6]))
            row = {
                "order": order,
                "components": components,
                "unlabeled_forest_types": type_counts[components],
                "distinct_coefficient_jets": len(values),
                "minimum_f0_to_f4": minima,
                "maximum_f5_over_f6": f"{maximum[5]}/{maximum[6]}",
                "maximum_jet_f0_to_f6": list(maximum),
            }
            rows.append(row)
            order_rows.append(row)
        global_max = max(
            (value for components in range(1, order + 1) for value in forests[(order, components)]),
            key=lambda value: Fraction(value[5], value[6]),
        )
        summaries[str(order)] = {
            "unlabeled_forest_types": sum(type_counts.values()),
            "distinct_coefficient_jets": sum(row["distinct_coefficient_jets"] for row in order_rows),
            "global_maximum_f5_over_f6": f"{global_max[5]}/{global_max[6]}",
            "global_maximum_jet_f0_to_f6": list(global_max),
        }
        fingerprints[str(order)] = base.sparse_hash(
            (components, forests[(order, components)]) for components in range(1, order + 1)
        )

    prior = json.loads((HERE / "rank8_forest16_17_component_jet_bounds_exact_agent_20260823.json").read_text(encoding="utf-8"))
    assert base.sparse_hash((components, forests[(17, components)]) for components in range(1, 18)) == prior["enumeration"]["forest_jet_sparse_sha256"]["17"]
    payload = {
        "schema": "rank8-forest18-19-component-jet-bounds-v1",
        "status": "PASS_EXACT_FOREST18_19_COMPONENT_JET_BOUNDS",
        "theorem": "For each order 18 or 19 and component count, the displayed rank-0..4 minima and maximum i5/i6 ratio hold for every forest.",
        "enumeration": {
            "method": "NetworkX free trees, rooted included/excluded DP, and component-product jet sets",
            "tree_counts": {str(order): tree_counts[order] for order in range(1, 20)},
            "free_trees_total": sum(tree_counts),
            "graph6_stream_sha256": graph6_stream.hexdigest().upper(),
            "tree_jet_sparse_sha256": base.sparse_hash(sorted(tree_types.items())),
            "forest_jet_sparse_sha256": fingerprints,
        },
        "order_summaries": summaries,
        "component_rows": rows,
        "resources": {
            "abort_private_bytes": base.ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "input_sha256": {
            "prove_rank8_forest16_f5_f6_ratio_agent.py": sha256(HERE / "prove_rank8_forest16_f5_f6_ratio_agent.py"),
            "rank8_forest16_17_component_jet_bounds_exact_agent_20260823.json": sha256(HERE / "rank8_forest16_17_component_jet_bounds_exact_agent_20260823.json"),
        },
        "proof_boundary": "This finite catalog supplies only component-resolved coefficient bounds at orders 18 and 19; it proves no leaf gate or Problem 993 by itself.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SUMMARIES", summaries)
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
