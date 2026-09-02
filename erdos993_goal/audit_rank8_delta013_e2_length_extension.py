#!/usr/bin/env python3
"""Independent coverage, identity, and scoped-symbolic audit for e=2 extensions."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23_independent import DELTA


HERE = Path(__file__).resolve().parent
MAX_RANK = 8
RANKS = (0, 1, 2, 3)
EXPECTED = {
    "probe_rank8_delta013_e2_length_extension.py":
        "C8BA8039C99D8273194DF3672E3E23EE4DB592F19AC57D3571EC47075D0DC38C",
    "rank8_delta013_e2_length_extension_scout_exact_20260820.json":
        "49D5B53516C07B7DE085D5586158F3674B523F01B4167E8BA972AA61118F16C4",
    "certify_rank8_delta013_e2_thin_bridge_extension_all_order.py":
        "F31EFBF365D25BF85713D0C9D5CBA37F44385CA463B24BE00245BDE039E69C9B",
    "rank8_delta013_e2_thin_bridge_extension_all_order_exact_20260820.json":
        "4308C23DC1EC19647B1B22F2D0FA21D1B3C243A72B0CF52F563F3550340DC4F5",
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left, right):
    return [left[k] + right[k] for k in range(MAX_RANK + 1)]


def subtract(left, right):
    return [left[k] - right[k] for k in range(MAX_RANK + 1)]


def multiply(left, right):
    out = [0] * (MAX_RANK + 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right[: MAX_RANK + 1 - i]):
            out[i + j] += x * y
    return out


def shift(poly, amount=1):
    return [0] * amount + poly[: MAX_RANK + 1 - amount]


def forest_poly(adjacency, removed=frozenset()):
    removed = frozenset(removed)
    seen = set(removed)

    def visit(vertex, parent):
        seen.add(vertex)
        absent = [1] + [0] * MAX_RANK
        present = [1] + [0] * MAX_RANK
        for neighbor in adjacency[vertex]:
            if neighbor == parent or neighbor in removed:
                continue
            child_absent, child_present = visit(neighbor, vertex)
            absent = multiply(absent, add(child_absent, child_present))
            present = multiply(present, child_absent)
        return absent, shift(present)

    result = [1] + [0] * MAX_RANK
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        absent, present = visit(vertex, -1)
        result = multiply(result, add(absent, present))
    return result


def attach(adjacency, descriptor_map, start, length, prefix):
    previous = start
    for distance in range(1, length + 1):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        descriptor_map[(*prefix, distance)] = vertex
        previous = vertex


def build_graph(lengths):
    left_a, left_b, bridge, right_a, right_b = lengths
    adjacency = [[]]
    descriptor_map = {("branch", 0): 0}
    previous = 0
    for distance in range(1, bridge + 1):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        if distance < bridge:
            descriptor_map[("bridge", distance)] = vertex
        else:
            descriptor_map[("branch", 1)] = vertex
        previous = vertex
    right = previous
    attach(adjacency, descriptor_map, 0, left_a, ("arm", 0, 0))
    attach(adjacency, descriptor_map, 0, left_b, ("arm", 0, 1))
    attach(adjacency, descriptor_map, right, right_a, ("arm", 1, 0))
    attach(adjacency, descriptor_map, right, right_b, ("arm", 1, 1))
    assert len(adjacency) == 1 + sum(lengths)
    assert len(descriptor_map) == len(adjacency)
    return adjacency, descriptor_map


def inserted_descriptor(lengths, index):
    if index == 0:
        return ("arm", 0, 0, lengths[0] + 1)
    if index == 1:
        return ("arm", 0, 1, lengths[1] + 1)
    if index == 2:
        return ("bridge", lengths[2])
    if index == 3:
        return ("arm", 1, 0, lengths[3] + 1)
    return ("arm", 1, 1, lengths[4] + 1)


def endpoint_descriptor(lengths, index):
    assert index != 2
    side, arm, length_index = {
        0: (0, 0, 0),
        1: (0, 1, 1),
        3: (1, 0, 3),
        4: (1, 1, 4),
    }[index]
    return ("arm", side, arm, lengths[length_index])


def canonical_lengths(order):
    total = order - 1
    out = set()
    for a in range(1, total):
        for b in range(1, total - a):
            for bridge in range(1, total - a - b):
                for cc in range(1, total - a - b - bridge):
                    d = total - a - b - bridge - cc
                    if d < 1:
                        continue
                    left = tuple(sorted((a, b)))
                    right = tuple(sorted((cc, d)))
                    if right < left:
                        left, right = right, left
                    out.add((left[0], left[1], bridge, right[0], right[1]))
    return out


def evaluate(rank, core, deleted):
    return DELTA[rank](core, deleted)


def check_extension_identities(lengths):
    checks = 0
    old_adjacency, old_map = build_graph(lengths)
    old_core = forest_poly(old_adjacency)
    for index in range(5):
        extended = list(lengths)
        extended[index] += 1
        new_adjacency, new_map = build_graph(tuple(extended))
        new_core = forest_poly(new_adjacency)
        assert set(old_map).issubset(new_map)
        inserted = new_map[inserted_descriptor(lengths, index)]
        if index != 2:
            endpoint = old_map[endpoint_descriptor(lengths, index)]
            assert subtract(new_core, old_core) == shift(
                forest_poly(old_adjacency, {endpoint})
            )
            assert forest_poly(new_adjacency, {inserted}) == old_core
            checks += 2
            for descriptor, root in old_map.items():
                old_h = forest_poly(old_adjacency, {root})
                new_h = forest_poly(new_adjacency, {new_map[descriptor]})
                if root == endpoint:
                    expected = shift(old_h)
                else:
                    expected = shift(forest_poly(old_adjacency, {root, endpoint}))
                assert subtract(new_h, old_h) == expected
                checks += 1
        else:
            bridge = lengths[2]
            left_descriptor = ("branch", 0) if bridge == 1 else ("bridge", bridge - 1)
            u = old_map[left_descriptor]
            v = old_map[("branch", 1)]
            closed = {u, v, *old_adjacency[u], *old_adjacency[v]}
            expected_core = add(
                shift(forest_poly(old_adjacency, {u, v})),
                shift(forest_poly(old_adjacency, closed), 2),
            )
            assert subtract(new_core, old_core) == expected_core
            # Deleting the inserted subdivision vertex gives T-e.
            assert subtract(forest_poly(new_adjacency, {inserted}), old_core) == shift(
                forest_poly(old_adjacency, closed), 2
            )
            checks += 2
            for descriptor, root in old_map.items():
                old_h = forest_poly(old_adjacency, {root})
                new_h = forest_poly(new_adjacency, {new_map[descriptor]})
                if root in (u, v):
                    expected = shift(forest_poly(old_adjacency, {u, v}))
                else:
                    neighbors_u = {x for x in old_adjacency[u] if x != root}
                    neighbors_v = {x for x in old_adjacency[v] if x != root}
                    closed_forest = {root, u, v, *neighbors_u, *neighbors_v}
                    expected = add(
                        shift(forest_poly(old_adjacency, {root, u, v})),
                        shift(forest_poly(old_adjacency, closed_forest), 2),
                    )
                assert subtract(new_h, old_h) == expected
                checks += 1
    return checks


def audit_scout():
    report = json.loads(
        (HERE / "rank8_delta013_e2_length_extension_scout_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert report["status"] == "PASS_EXACT_SCOUT_RANK8_DELTA013_E2_LENGTH_EXTENSION_ORDERS_23_29"
    expected_counts = {23: 920, 24: 1115, 25: 1335, 26: 1591, 27: 1877, 28: 2205, 29: 2569}
    inserted_minima = {}
    witness_checks = 0
    for row in report["orders"]:
        order = row["source_order"]
        lengths_set = canonical_lengths(order)
        assert len(lengths_set) == expected_counts[order] == row["canonical_cores"]
        assert row["old_root_comparisons"] == 5 * order * len(lengths_set)
        assert row["inserted_roots"] == 5 * len(lengths_set)
        assert all(int(value) > 0 for value in row["minimum_increments"].values())
        assert all(int(value) > 0 for value in row["minimum_inserted_root_values"].values())

        # Independently reconstruct each stored old-root minimum witness.
        for rank in RANKS:
            witness = row["minimum_witnesses"][str(rank)]
            lengths = tuple(witness["lengths"])
            descriptor = tuple(witness["root_descriptor"])
            old_adjacency, old_map = build_graph(lengths)
            extended = list(lengths)
            extended[witness["extended_index"]] += 1
            new_adjacency, new_map = build_graph(tuple(extended))
            old_value = evaluate(
                rank,
                forest_poly(old_adjacency),
                forest_poly(old_adjacency, {old_map[descriptor]}),
            )
            new_value = evaluate(
                rank,
                forest_poly(new_adjacency),
                forest_poly(new_adjacency, {new_map[descriptor]}),
            )
            assert (old_value, new_value, new_value - old_value) == (
                witness["old"], witness["new"], witness["increment"]
            )
            assert witness["increment"] == row["minimum_increments"][str(rank)]
            witness_checks += 1

        # Inserted-root cases are cheap enough to rescan independently.
        minima = {rank: None for rank in RANKS}
        for lengths in lengths_set:
            for index in range(5):
                extended = list(lengths)
                extended[index] += 1
                adjacency, descriptor_map = build_graph(tuple(extended))
                core = forest_poly(adjacency)
                root = descriptor_map[inserted_descriptor(lengths, index)]
                deleted = forest_poly(adjacency, {root})
                for rank in RANKS:
                    value = evaluate(rank, core, deleted)
                    minima[rank] = value if minima[rank] is None else min(minima[rank], value)
        assert {str(rank): value for rank, value in minima.items()} == row["minimum_inserted_root_values"]
        inserted_minima[str(order)] = {str(rank): value for rank, value in minima.items()}
    assert report["global_minimum_increments"] == report["orders"][0]["minimum_increments"]
    return {
        "orders": 7,
        "canonical_counts": expected_counts,
        "old_root_witnesses_rebuilt": witness_checks,
        "inserted_root_minima_rebuilt": inserted_minima,
    }


def thin_origin_value(lengths, extension_index, descriptor, rank):
    old_adjacency, old_map = build_graph(lengths)
    extended = list(lengths)
    extended[extension_index] += 1
    new_adjacency, new_map = build_graph(tuple(extended))
    old_value = evaluate(
        rank,
        forest_poly(old_adjacency),
        forest_poly(old_adjacency, {old_map[descriptor]}),
    )
    new_value = evaluate(
        rank,
        forest_poly(new_adjacency),
        forest_poly(new_adjacency, {new_map[descriptor]}),
    )
    return new_value - old_value


def audit_thin():
    report = json.loads(
        (HERE / "rank8_delta013_e2_thin_bridge_extension_all_order_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert report["status"] == "PASS_EXACT_RANK8_DELTA013_E2_THIN_BRIDGE_EXTENSION_ALL_ORDER"
    rows = {row["cell"]: row for row in report["cells"]}
    expected_cells = {
        "existing_branch_root_increment",
        "existing_pendant_leaf_root_increment",
        "inserted_bridge_root_value",
        "existing_internal_bridge_root_increment_both_long_x_offset_ge_1",
        "existing_internal_bridge_root_increment_both_long_y_offset_ge_1",
    }
    for short in range(7):
        expected_cells.add(f"existing_internal_bridge_root_increment_x_long_y_short_{short}")
        expected_cells.add(f"existing_internal_bridge_root_increment_x_short_{short}_y_long")
    assert set(rows) == expected_cells
    assert "8977E684CE2C2830B8002FF0C294D83B2D9352A384AC9FFBC719679F06737447" in report["warning"]
    constants_rebuilt = 0
    for row in rows.values():
        for rank in RANKS:
            rank_row = row["ranks"][str(rank)]
            assert rank_row["negative"] == 0 and rank_row["zero"] == 0
            assert Fraction(rank_row["minimum_coefficient"]) > 0
            assert Fraction(rank_row["constant_coefficient"]) > 0

    lengths = (1, 1, 18, 1, 1)
    for rank in RANKS:
        expected = thin_origin_value(lengths, 2, ("branch", 0), rank)
        assert expected == int(rows["existing_branch_root_increment"]["ranks"][str(rank)]["constant_coefficient"])
        expected = thin_origin_value(lengths, 2, ("arm", 0, 0, 1), rank)
        assert expected == int(rows["existing_pendant_leaf_root_increment"]["ranks"][str(rank)]["constant_coefficient"])
        extended = (1, 1, 19, 1, 1)
        adjacency, descriptor_map = build_graph(extended)
        inserted = descriptor_map[("bridge", 18)]
        expected = evaluate(rank, forest_poly(adjacency), forest_poly(adjacency, {inserted}))
        assert expected == int(rows["inserted_bridge_root_value"]["ranks"][str(rank)]["constant_coefficient"])
        # Both-long superset cells have origins (x,y)=(8,7),(7,8).
        expected = thin_origin_value((1, 1, 17, 1, 1), 2, ("bridge", 9), rank)
        assert expected == int(rows["existing_internal_bridge_root_increment_both_long_x_offset_ge_1"]["ranks"][str(rank)]["constant_coefficient"])
        expected = thin_origin_value((1, 1, 17, 1, 1), 2, ("bridge", 8), rank)
        assert expected == int(rows["existing_internal_bridge_root_increment_both_long_y_offset_ge_1"]["ranks"][str(rank)]["constant_coefficient"])
        constants_rebuilt += 5
        # One-long cells have exact boundary x+y=16 and source bridge g=18.
        for short in range(7):
            expected = thin_origin_value(
                (1, 1, 18, 1, 1), 2, ("bridge", 17 - short), rank
            )
            assert expected == int(rows[f"existing_internal_bridge_root_increment_x_long_y_short_{short}"]["ranks"][str(rank)]["constant_coefficient"])
            expected = thin_origin_value(
                (1, 1, 18, 1, 1), 2, ("bridge", short + 1), rank
            )
            assert expected == int(rows[f"existing_internal_bridge_root_increment_x_short_{short}_y_long"]["ranks"][str(rank)]["constant_coefficient"])
            constants_rebuilt += 2
    return {"cells": 19, "rank_cells": 76, "constants_rebuilt": constants_rebuilt}


def main():
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED
    identity_checks = sum(
        check_extension_identities(lengths)
        for lengths in ((1, 2, 3, 4, 5), (2, 2, 1, 3, 4), (3, 4, 5, 2, 6))
    )
    scout = audit_scout()
    thin = audit_thin()
    payload = {
        "schema": "rank8-delta013-e2-length-extension-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_LENGTH_EXTENSION",
        "immutable_input_hashes": hashes,
        "exact_extension_identities": {
            "pendant_core": "I(T+leaf)-I(T)=x I(T-u)",
            "pendant_old_root": "delete q first; append-leaf increment is x I(T-{q,u}), with q=u giving x I(T-u)",
            "pendant_inserted_root": "(T+leaf)-new_leaf = T",
            "bridge_core": "I(T_e_subdiv)-I(T)=x I(T-{u,v})+x^2 I(T-(N[u] union N[v]))",
            "bridge_old_root": "the same identity in T-q, with endpoint-deletion leaf-extension branches",
            "bridge_inserted_root": "T_e_subdiv-new_vertex=T-e",
            "generic_polynomial_identity_checks": identity_checks,
        },
        "finite_scout": scout,
        "thin_all_order_theorem": thin,
        "finite_induction_target": (
            "Together with the independently audited positive n=23 base, the finite "
            "extension scout propagates positivity to every e=2 double claw at "
            "orders 24..30; this remains a finite theorem, not all-order monotonicity."
        ),
        "scope_guard": (
            "The general all-order extension theorem is not claimed.  Only the thin "
            "bridge family has a symbolic all-order certificate."
        ),
    }
    output = HERE / "rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("identity_checks", identity_checks)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
