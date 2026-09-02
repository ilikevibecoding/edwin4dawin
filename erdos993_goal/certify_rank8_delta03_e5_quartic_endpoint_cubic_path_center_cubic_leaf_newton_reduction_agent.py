#!/usr/bin/env python3
"""Exact transfer/Newton reduction for the e=5 center-cubic leaf root orbit."""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_newton_reduction_exact_agent_20260823.json"
EXPECTED = {
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json": "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_agent.py": "0FCEA510998EA4ABBB45D09261D7954FD7ADE2C942B1CAD061CC4C86B7376B8E",
    "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_exact_agent_20260823.json": "51E4E7647988CF358152A52444CD25638E342E20421977269F00C279C77F228E",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def convolve(*factors: Counter[tuple[int, int]]) -> Counter[tuple[int, int]]:
    total = Counter({(0, 0): 1})
    for factor in factors:
        out = Counter()
        for (left_order, left_long), left_count in total.items():
            for (right_order, right_long), right_count in factor.items():
                out[(left_order + right_order, left_long + right_long)] += left_count * right_count
        total = out
    return total


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    universal = json.loads(
        (ROOT / "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_exact_agent_20260823.json").read_text(encoding="utf-8")
    )
    assert universal["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_LEAF_TRANSFER_NEWTON_REDUCTION"
    assert universal["graded_path_transfer"]["literal_pair_checks"] == 4_536
    assert universal["degree_bounds"] == {
        "0": {"terms": 15, "degree_bound": 28},
        "1": {"terms": 18, "degree_bound": 28},
        "2": {"terms": 22, "degree_bound": 27},
        "3": {"terms": 26, "degree_bound": 26},
    }
    assert universal["integer_newton_matrix_determinant"] == 1

    branch_vertices = ("Q", "C0", "C1")
    endpoints = {
        "root_incident_pendant": ("C0",),
        "quartic_center_spine": ("Q", "C0"),
        "quartic_pendant_0": ("Q",),
        "quartic_pendant_1": ("Q",),
        "quartic_pendant_2": ("Q",),
        "center_endpoint_spine": ("C0", "C1"),
        "endpoint_pendant_0": ("C1",),
        "endpoint_pendant_1": ("C1",),
    }
    endpoint_guards = []
    for root_selected in (0, 1):
        for bits in itertools.product((0, 1), repeat=3):
            selected = {vertex for vertex, bit in zip(branch_vertices, bits) if bit}
            cap = 8 - root_selected - len(selected)
            effective = {}
            for label, edge_endpoints in endpoints.items():
                base = 8 if label == "root_incident_pendant" or label.endswith("spine") else 7
                loss = sum(vertex in selected for vertex in edge_endpoints)
                if label == "root_incident_pendant":
                    loss += root_selected
                order = base - loss
                assert order >= cap - 1
                effective[label] = order
            endpoint_guards.append(
                {
                    "root_selected": bool(root_selected),
                    "selected_branch_vertices": sorted(selected),
                    "rank_cap": cap,
                    "effective_long_path_orders": effective,
                }
            )
    assert len(endpoint_guards) == 16

    pendant = tuple((value, value == 7) for value in range(1, 8))
    incident = tuple((value, value == 8) for value in range(1, 9))
    spine = tuple((value, value == 8) for value in range(1, 9))
    quartic_triples = tuple(itertools.combinations_with_replacement(pendant, 3))
    endpoint_pairs = tuple(itertools.combinations_with_replacement(pendant, 2))
    triple_distribution = Counter(
        (sum(item[0] for item in row), sum(int(item[1]) for item in row))
        for row in quartic_triples
    )
    pair_distribution = Counter(
        (sum(item[0] for item in row), sum(int(item[1]) for item in row))
        for row in endpoint_pairs
    )
    incident_distribution = Counter((value, int(long)) for value, long in incident)
    spine_distribution = Counter((value, int(long)) for value, long in spine)
    distribution = convolve(
        incident_distribution,
        spine_distribution,
        triple_distribution,
        spine_distribution,
        pair_distribution,
    )
    counts = Counter()
    order_distribution = Counter()
    for (stored_order, long_count), multiplicity in distribution.items():
        order = 1 + stored_order
        if long_count == 0:
            counts["all_short"] += multiplicity
            order_distribution[order] += multiplicity
            if order == 27:
                counts["all_short_order27"] += multiplicity
            if order >= 28:
                counts["all_short_n28_plus"] += multiplicity
        elif long_count == 8:
            counts["all_long"] += multiplicity
        else:
            counts["mixed"] += multiplicity
    counts["coordinate_patterns"] = sum(distribution.values())
    counts["non_all_short_rays"] = counts["mixed"] + counts["all_long"]
    counts["n28_plus_records"] = counts["all_short_n28_plus"] + counts["non_all_short_rays"]
    assert len(quartic_triples) == 84 and len(endpoint_pairs) == 28
    assert counts == Counter(
        {
            "coordinate_patterns": 1_204_224,
            "mixed": 800_855,
            "non_all_short_rays": 800_856,
            "n28_plus_records": 1_085_160,
            "all_short": 403_368,
            "all_short_n28_plus": 284_304,
            "all_short_order27": 23_834,
            "all_long": 1,
        }
    )
    partition = json.loads(
        (ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json").read_text(encoding="utf-8")
    )
    orbit = next(
        row
        for row in partition["root_location_partitions"]
        if row["root_location_orbit"] == "quartic_endpoint_cubic_path:center_cubic_leaf"
    )
    assert orbit["stabilizer_order"] == 12 and orbit["coordinate_count"] == 8
    assert orbit["coordinate_patterns"] == counts["coordinate_patterns"]
    assert orbit["all_short_literal_patterns"] == counts["all_short"]
    assert orbit["all_short_patterns_order27"] == counts["all_short_order27"]
    assert orbit["all_short_patterns_n28_plus"] == counts["all_short_n28_plus"]
    assert orbit["mixed_long_short_patterns"] == counts["mixed"]
    assert orbit["all_long_patterns"] == 1
    assert {int(key): value for key, value in orbit["all_short_order_distribution"].items()} == dict(sorted(order_distribution.items()))
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-center-cubic-leaf-newton-reduction-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF_TRANSFER_NEWTON_REDUCTION",
        "root_orbit": "quartic_endpoint_cubic_path:center_cubic_leaf",
        "quotient_formula": "root incident pendant 8 * quartic-center spine 8 * quartic pendant triple C(9,3)=84 * center-endpoint spine 8 * endpoint pendant pair C(8,2)=28, total 1,204,224 keys",
        "canonical_coordinate_order": "root incident arm; quartic-center spine; quartic pendant low,middle,high; center-endpoint spine; endpoint pendant low,high",
        "order_formula": "n=1+sum(the eight stored edge lengths)",
        "quotient_counts": dict(counts),
        "all_short_order_distribution": {str(key): value for key, value in sorted(order_distribution.items())},
        "graded_path_transfer": {
            "universal_rows": universal["graded_path_transfer"]["rows"],
            "literal_pair_checks": 4_536,
            "endpoint_state_guards": endpoint_guards,
            "conclusion": "all long offsets enter core and root-deleted coefficients only through total S",
        },
        "degree_bounds": universal["degree_bounds"],
        "newton_gate": universal["newton_gate"],
        "integer_newton_matrix_determinant": 1,
        "order27_requirement": {
            "status": "OPEN_AT_REDUCTION_CREATION",
            "full_canonical_subdivisions_expected": 70_854,
            "all_short_order27_keys": counts["all_short_order27"],
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Reduction only; no full census or sign claim is made by this script.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("COUNTS", json.dumps(payload["quotient_counts"], sort_keys=True))
    print("TRANSFER_LITERAL_CHECKS", 4_536)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
