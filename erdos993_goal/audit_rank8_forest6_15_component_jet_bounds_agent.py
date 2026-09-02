#!/usr/bin/env python3
"""Independent geng/deletion replay of forest orders 6..15 component bounds."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx

import audit_rank8_forest16_f5_f6_ratio_agent as geng_audit


HERE = Path(__file__).resolve().parent
OUTPUT = (
    HERE / "rank8_forest6_15_component_jet_bounds_independent_audit_agent_20260823.json"
)
EXPECTED = {
    "prove_rank8_forest6_15_component_jet_bounds_agent.py":
        "D0E0E18E2E2D3BB6BEEF080BB360FC61EA8129EE415E447DAEF5A448A80519E5",
    "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json":
        "5416988DAB946AF2A9F0A24B41096AC4D0B6D8D508780D3098AA673E7BAF61A1",
    "audit_rank8_forest16_f5_f6_ratio_agent.py":
        "865ACB219273FB3E8C891B02F1A8DC1B44FCCDFD261DF3BE962523C652AA1A98",
    "nauty2_8_9/geng.exe":
        "53D8544CF73604C087730CFABA4FB1881A20D6B329B1F9B5B965546417D22DA4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def sparse_hash(rows) -> str:
    digest = hashlib.sha256()
    for label, values in rows:
        digest.update(str(label).encode())
        digest.update(b":")
        for value in sorted(values):
            digest.update(",".join(str(item) for item in value).encode())
            digest.update(b";")
        digest.update(b"\n")
    return digest.hexdigest().upper()


def type_count_table(tree_counts: list[int]):
    table = [[0] * 16 for _ in range(16)]
    table[0][0] = 1
    for component_order in range(1, 16):
        for _ in range(tree_counts[component_order]):
            for total in range(component_order, 16):
                for components in range(1, 16):
                    table[total][components] += table[total - component_order][components - 1]
    return table


def minimum_prefix(values) -> list[int]:
    return [min(value[index] for value in values) for index in range(5)]


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_FOREST6_15_COMPONENT_JET_BOUNDS"
    peak = geng_audit.gate()
    tree_types = {}
    tree_counts = [0]
    for order in range(1, 16):
        codes = geng_audit.geng_codes(order)
        jets = set()
        for code in reversed(codes):
            graph = nx.from_graph6_bytes(code)
            assert nx.is_tree(graph)
            jets.add(geng_audit.deletion_jet(graph))
        tree_types[order] = jets
        tree_counts.append(len(codes))
        peak = max(peak, geng_audit.gate())

    unit = (1, 0, 0, 0, 0, 0, 0)
    forests = {(0, 0): {unit}}
    for total in range(1, 16):
        for component_order in reversed(range(1, total + 1)):
            remainder = total - component_order
            for components in reversed(range(remainder + 1)):
                old = forests.get((remainder, components))
                if not old:
                    continue
                target = forests.setdefault((total, components + 1), set())
                for left in reversed(sorted(old)):
                    for right in reversed(sorted(tree_types[component_order])):
                        target.add(geng_audit.convolution(left, right))
        peak = max(peak, geng_audit.gate())

    fingerprint = sparse_hash(
        ((order, components), forests[(order, components)])
        for order in range(6, 16)
        for components in range(1, order + 1)
    )
    assert fingerprint == primary["enumeration"]["component_jet_sparse_sha256"]
    type_counts = type_count_table(tree_counts)

    rows = []
    for expected in primary["component_rows"]:
        order = expected["order"]
        components = expected["components"]
        values = forests[(order, components)]
        positive = [value for value in values if value[6] > 0]
        zero = [value for value in values if value[6] == 0]
        row = {
            "order": order,
            "components": components,
            "unlabeled_forest_types": type_counts[order][components],
            "distinct_coefficient_jets": len(values),
            "all_minimum_f0_to_f4": minimum_prefix(values),
            "f6_positive": {
                "jet_count": len(positive),
                "minimum_f0_to_f4": minimum_prefix(positive) if positive else None,
                "maximum_f5_over_f6": None,
                "maximizing_jet_f0_to_f6": None,
            },
            "f6_zero": {
                "jet_count": len(zero),
                "minimum_f0_to_f4": minimum_prefix(zero) if zero else None,
                "maximum_f5": max((value[5] for value in zero), default=None),
            },
        }
        if positive:
            maximum = max(positive, key=lambda value: Fraction(value[5], value[6]))
            row["f6_positive"]["maximum_f5_over_f6"] = f"{maximum[5]}/{maximum[6]}"
            row["f6_positive"]["maximizing_jet_f0_to_f6"] = list(maximum)
        assert row == expected
        rows.append(row)
    assert len(rows) == 105

    payload = {
        "schema": "rank8-forest6-15-component-jet-bounds-independent-audit-v1",
        "status": "PASS_INDEPENDENT_GENG_DELETION_FOREST6_15_COMPONENT_JET_BOUNDS",
        "hashes": hashes,
        "component_rows": len(rows),
        "component_jet_sparse_sha256": fingerprint,
        "resources": {
            "abort_private_bytes": geng_audit.ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("COMPONENT_ROWS", len(rows), "PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
