#!/usr/bin/env python3
"""Find the smallest aggregate-state collision for component adjunction.

The 53 empty-root controls depend only on (F jet, nonempty-root D-core jet,
root count).  Existing-root component adjunction acts on one hidden block.
This exact search asks whether two hidden block factorizations can have the
same aggregate state but different one-vertex-component children.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path

import networkx as nx

import prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent as literal
import prove_rank8_delta2_new_leaf_m11_15_literal_tail_shard_agent as shard
import prove_rank8_forest16_f5_f6_ratio_agent as forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_component_adjoin_markov_collision_agent_20260823.json"
MAX_M = 10


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_records():
    records = {}
    counts = [0]
    for order in range(1, MAX_M + 1):
        trees = [nx.empty_graph(1)] if order == 1 else list(nx.nonisomorphic_trees(order))
        counts.append(len(trees))
        records[order] = tuple(
            literal.TreeRecord(order, index, forest.tree_jet(tree), literal.deletion_jet_set(tree))
            for index, tree in enumerate(trees)
        )
        forest.gate()
    assert counts == literal.EXPECTED_TREE_COUNTS[: MAX_M + 1]
    return records


def block_states(components):
    states = {()}
    for component in components:
        following = set()
        for blocks in states:
            distinct = tuple(dict.fromkeys(blocks))
            for deletion in component.deletion_jets:
                following.add(shard.canonical_blocks(blocks + ((component.jet, deletion),)))
                for block in distinct:
                    index = blocks.index(block)
                    merged = (
                        forest.multiply(block[0], component.jet),
                        forest.multiply(block[1], deletion),
                    )
                    following.add(
                        shard.canonical_blocks(blocks[:index] + (merged,) + blocks[index + 1 :])
                    )
        states = following
        forest.gate()
    return states


def aggregate(blocks):
    product = (1, 0, 0, 0, 0, 0, 0)
    for excluded, deleted in blocks:
        product = forest.multiply(product, literal.add(excluded, literal.shift(deleted)))
    return len(blocks), product


def isolated_existing_root_children(blocks):
    isolated = (1, 1, 0, 0, 0, 0, 0)
    deletion = (1, 0, 0, 0, 0, 0, 0)
    children = set()
    for block in tuple(dict.fromkeys(blocks)):
        index = blocks.index(block)
        merged = (
            forest.multiply(block[0], isolated),
            forest.multiply(block[1], deletion),
        )
        children.add(aggregate(shard.canonical_blocks(blocks[:index] + (merged,) + blocks[index + 1 :])))
    return children


def serialize_blocks(blocks):
    return [[list(excluded), list(deleted)] for excluded, deleted in blocks]


def main() -> None:
    records = build_records()
    scanned_forests = scanned_states = collisions = 0
    witness = None
    for m in range(1, MAX_M + 1):
        for component_count in range(1, m + 1):
            for components in literal.forest_types(records, m, component_count):
                scanned_forests += 1
                fjet = literal.product_jets(record.jet for record in components)
                grouped = defaultdict(list)
                for blocks in block_states(components):
                    grouped[aggregate(blocks)].append(blocks)
                    scanned_states += 1
                for parent, representations in grouped.items():
                    if len(representations) < 2:
                        continue
                    collisions += 1
                    baseline = isolated_existing_root_children(representations[0])
                    for other in representations[1:]:
                        children = isolated_existing_root_children(other)
                        if children != baseline:
                            witness = {
                                "forest_order": m,
                                "forest_components": component_count,
                                "component_tree_order_and_networkx_index": [
                                    [record.order, record.index] for record in components
                                ],
                                "F_jet_f0_to_f6": list(fjet),
                                "common_parent_nonempty_roots": parent[0],
                                "common_parent_D_core_jet_d0_to_d6": list(parent[1]),
                                "hidden_blocks_A": serialize_blocks(representations[0]),
                                "hidden_blocks_B": serialize_blocks(other),
                                "isolated_component_existing_root_children_A": [
                                    [roots, list(jet)] for roots, jet in sorted(baseline)
                                ],
                                "isolated_component_existing_root_children_B": [
                                    [roots, list(jet)] for roots, jet in sorted(children)
                                ],
                            }
                            break
                    if witness:
                        break
                if witness:
                    break
            if witness:
                break
        if witness:
            break
        print("M", m, "NO_MARKOV_COLLISION", flush=True)

    payload = {
        "schema": "rank8-delta2-component-adjoin-markov-collision-v1",
        "status": (
            "PASS_EXACT_AGGREGATE_53_CONTROL_STATE_NOT_MARKOV_COMPLETE"
            if witness
            else "NO_COLLISION_THROUGH_M10_NO_COMPLETENESS_CLAIM"
        ),
        "transition_tested": "adjoin a one-vertex F component to an existing nonempty root block",
        "witness": witness,
        "counts_before_first_witness": {
            "forest_types": scanned_forests,
            "hidden_block_states": scanned_states,
            "aggregate_collisions": collisions,
        },
        "input_sha256": {
            "prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py": sha256(
                HERE / "prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py"
            ),
            "prove_rank8_delta2_new_leaf_m11_15_literal_tail_shard_agent.py": sha256(
                HERE / "prove_rank8_delta2_new_leaf_m11_15_literal_tail_shard_agent.py"
            ),
            "prove_rank8_forest16_f5_f6_ratio_agent.py": sha256(
                HERE / "prove_rank8_forest16_f5_f6_ratio_agent.py"
            ),
        },
        "resources": {"abort_private_bytes": forest.ABORT_BYTES},
        "proof_boundary": "A witness proves only that the aggregate 53-control state (F jet, D-core jet, root count) is not sufficient to determine existing-root component adjunction. It is not a negative gate value and does not refute a richer block-aware induction or any theorem.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FORESTS", scanned_forests, "STATES", scanned_states, "COLLISIONS", collisions)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
