#!/usr/bin/env python3
"""Independent geng/deletion replay of the order-18/19 component catalog."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx

import audit_rank8_forest16_17_component_jet_bounds_agent as independent


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_forest18_19_component_jet_bounds_independent_audit_agent_20260823.json"
EXPECTED_TREE_COUNTS = [0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741, 19320, 48629, 123867, 317955]
EXPECTED = {
    "prove_rank8_forest18_19_component_jet_bounds_agent.py":
        "B20A97792E16E11A5FA8EC23DC72910B1E9779879423884234248FCAF9E2714E",
    "rank8_forest18_19_component_jet_bounds_exact_agent_20260823.json":
        "BB1F773A515E38A5E493286725858941143BFB255EDD1F3DC69748F3985F6E62",
    "audit_rank8_forest16_17_component_jet_bounds_agent.py":
        "E249DEE976743CA8D31757C91DA6445DCBF11008A01BA9227EC4543C6B6FA7D8",
    "nauty2_8_9/geng.exe":
        "53D8544CF73604C087730CFABA4FB1881A20D6B329B1F9B5B965546417D22DA4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads((HERE / "rank8_forest18_19_component_jet_bounds_exact_agent_20260823.json").read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_FOREST18_19_COMPONENT_JET_BOUNDS"
    peak = independent.gate()
    tree_types = {}
    tree_counts = [0]
    geng_stream = hashlib.sha256()
    for order in range(1, 20):
        codes = independent.geng_codes(order)
        jets = set()
        for code in reversed(codes):
            graph = nx.from_graph6_bytes(code)
            assert nx.is_tree(graph)
            jets.add(independent.deletion_jet(graph))
            geng_stream.update(f"order={order};".encode())
            geng_stream.update(code)
            geng_stream.update(b"\n")
        tree_types[order] = jets
        tree_counts.append(len(codes))
        peak = max(peak, independent.gate())
    assert tree_counts == EXPECTED_TREE_COUNTS
    tree_fingerprint = independent.sparse_hash(sorted(tree_types.items()))
    assert tree_fingerprint == primary["enumeration"]["tree_jet_sparse_sha256"]

    unit = (1, 0, 0, 0, 0, 0, 0)
    forests = {(0, 0): {unit}}
    for total in range(1, 20):
        for component_order in reversed(range(1, total + 1)):
            remainder = total - component_order
            for components in reversed(range(remainder + 1)):
                old_values = forests.get((remainder, components))
                if not old_values:
                    continue
                target = forests.setdefault((total, components + 1), set())
                for old in reversed(sorted(old_values)):
                    for component in reversed(sorted(tree_types[component_order])):
                        target.add(independent.multiply(old, component))
        peak = max(peak, independent.gate())

    replay_rows = []
    summaries = {}
    fingerprints = {}
    for order in (18, 19):
        counts = independent.forest_type_counts(tree_counts, order)
        primary_rows = [row for row in primary["component_rows"] if row["order"] == order]
        for expected_row in primary_rows:
            components = expected_row["components"]
            values = forests[(order, components)]
            minima = [min(value[index] for value in values) for index in range(5)]
            maximum = max(values, key=lambda value: Fraction(value[5], value[6]))
            row = {
                "order": order,
                "components": components,
                "unlabeled_forest_types": counts[components],
                "distinct_coefficient_jets": len(values),
                "minimum_f0_to_f4": minima,
                "maximum_f5_over_f6": f"{maximum[5]}/{maximum[6]}",
                "maximum_jet_f0_to_f6": list(maximum),
            }
            assert row == expected_row
            replay_rows.append(row)
        global_max = max(
            (value for components in range(1, order + 1) for value in forests[(order, components)]),
            key=lambda value: Fraction(value[5], value[6]),
        )
        summary = {
            "unlabeled_forest_types": sum(counts.values()),
            "distinct_coefficient_jets": sum(row["distinct_coefficient_jets"] for row in replay_rows if row["order"] == order),
            "global_maximum_f5_over_f6": f"{global_max[5]}/{global_max[6]}",
            "global_maximum_jet_f0_to_f6": list(global_max),
        }
        assert summary == primary["order_summaries"][str(order)]
        summaries[str(order)] = summary
        fingerprint = independent.sparse_hash((components, forests[(order, components)]) for components in range(1, order + 1))
        assert fingerprint == primary["enumeration"]["forest_jet_sparse_sha256"][str(order)]
        fingerprints[str(order)] = fingerprint

    payload = {
        "schema": "rank8-forest18-19-component-jet-bounds-independent-audit-v1",
        "status": "PASS_INDEPENDENT_GENG_DELETION_REPLAY_FOREST18_19_COMPONENT_JET_BOUNDS",
        "hashes": hashes,
        "counts": {"free_trees_through_19": sum(tree_counts), "order_summaries": summaries, "component_rows_replayed": len(replay_rows)},
        "tree_jet_sparse_sha256": tree_fingerprint,
        "forest_jet_sparse_sha256": fingerprints,
        "geng_reverse_stream_sha256": geng_stream.hexdigest().upper(),
        "resources": {"abort_private_bytes": independent.ABORT_BYTES, "peak_private_bytes": peak, "peak_private_MiB": peak / 1024**2},
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SUMMARIES", summaries)
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
