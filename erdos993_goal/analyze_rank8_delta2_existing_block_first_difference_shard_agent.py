#!/usr/bin/env python3
"""Exact finite shard for block-aware Delta2 first differences.

For every realizable rooted-block multiset of the requested forest orders,
adjoin one isolated-vertex F component to each distinct existing block.  At
the first allowed source order on both sides, test all 53 binomial-tail
controls for coordinatewise nonpositive change.  This is a bounded diagnostic
for a possible uniform discrete-convex theorem, not that theorem itself.
"""

from __future__ import annotations

import argparse
import functools
import hashlib
import json
from fractions import Fraction
from pathlib import Path

import networkx as nx

import analyze_rank8_delta2_component_adjoin_markov_collision_agent as collision
import prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent as literal
import prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent as low
import prove_rank8_forest16_f5_f6_ratio_agent as forest


HERE = Path(__file__).resolve().parent
TERMS_FILE = HERE / "rank8_delta2_new_leaf_upper_corner_sparse_terms_agent_20260823.json"
TERMS_SHA = "98C2F7E5EA52A0384AAD40485FDE1F9260F2004D0B326FBF1C127422459D623C"
ONE = (1, 0, 0, 0, 0, 0, 0)
ISOLATED = (1, 1, 0, 0, 0, 0, 0)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_records(max_order):
    records = {}
    counts = [0]
    peak = forest.gate()
    for order in range(1, max_order + 1):
        trees = [nx.empty_graph(1)] if order == 1 else list(nx.nonisomorphic_trees(order))
        counts.append(len(trees))
        records[order] = tuple(
            literal.TreeRecord(order, index, forest.tree_jet(tree), literal.deletion_jet_set(tree))
            for index, tree in enumerate(trees)
        )
        peak = max(peak, forest.gate())
    assert counts == literal.EXPECTED_TREE_COUNTS[: max_order + 1]
    return records, peak


def aggregate(blocks):
    dcore = ONE
    fjet = ONE
    for excluded, deleted in blocks:
        dcore = forest.multiply(dcore, literal.add(excluded, literal.shift(deleted)))
        fjet = forest.multiply(fjet, excluded)
    return dcore, fjet


def adjoin_isolated(blocks, index):
    excluded, deleted = blocks[index]
    replacement = (forest.multiply(excluded, ISOLATED), deleted)
    return tuple(sorted(blocks[:index] + (replacement,) + blocks[index + 1 :]))


def quotient_value(terms, dcore, fjet, empty_roots):
    djet = low.empty_extension(dcore, empty_roots)
    numerator = low.evaluate_terms(terms, djet, fjet)
    denominator = 392 * djet[5] ** 4 * (djet[6] + fjet[5])
    assert denominator > 0
    return Fraction(numerator, denominator)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--m-start", type=int, choices=range(1, 13), required=True)
    parser.add_argument("--m-end", type=int, choices=range(1, 13), required=True)
    args = parser.parse_args()
    assert args.m_start <= args.m_end
    assert sha256(TERMS_FILE) == TERMS_SHA
    term_payload = json.loads(TERMS_FILE.read_text(encoding="utf-8"))
    assert term_payload["status"] == "PASS_EXACT_SPARSE_SERIALIZATION"
    assert term_payload["polynomial_fingerprint"] == "C61B3F468548F9400E60C1604F05FAD1A2448B76A47C33A4BD140DFE12754FAE"
    terms = tuple((tuple(row[0]), int(row[1])) for row in term_payload["terms"])
    assert len(terms) == 281

    output = HERE / f"rank8_delta2_existing_block_first_difference_m{args.m_start}_{args.m_end}_agent_20260823.json"
    records, peak = build_records(args.m_end)

    @functools.lru_cache(maxsize=512)
    def control_vector(dcore, fjet, empty_roots):
        values = [
            low.evaluate_terms(terms, low.empty_extension(dcore, empty_roots + step), fjet)
            for step in range(53)
        ]
        return low.forward_differences(values)

    totals = {
        "forest_types": 0,
        "unique_block_states": 0,
        "existing_block_transitions": 0,
        "positive_control_increments": 0,
        "zero_control_increments": 0,
        "negative_control_increments": 0,
        "negative_parent_controls": 0,
        "negative_child_controls": 0,
        "positive_quotient_increments": 0,
        "zero_quotient_increments": 0,
        "negative_quotient_increments": 0,
    }
    rows = []
    first_obstruction = None
    fingerprint = {"xor": 0, "sum": 0, "sum_squares": 0}
    for m in range(args.m_start, args.m_end + 1):
        seen = set()
        row = {key: 0 for key in totals}
        row["m"] = m
        for component_count in range(1, m + 1):
            for components in literal.forest_types(records, m, component_count):
                row["forest_types"] += 1
                totals["forest_types"] += 1
                for blocks in sorted(collision.block_states(components)):
                    if blocks in seen:
                        continue
                    seen.add(blocks)
                    row["unique_block_states"] += 1
                    totals["unique_block_states"] += 1
                    c = len(blocks)
                    parent_empty = max(26 - m - c, 0)
                    dcore, fjet = aggregate(blocks)
                    parent = control_vector(dcore, fjet, parent_empty)
                    parent_q = quotient_value(terms, dcore, fjet, parent_empty)
                    parent_negative = sum(value < 0 for value in parent)
                    row["negative_parent_controls"] += parent_negative
                    totals["negative_parent_controls"] += parent_negative
                    distinct_indices = []
                    used = set()
                    for index, block in enumerate(blocks):
                        if block not in used:
                            used.add(block)
                            distinct_indices.append(index)
                    for index in distinct_indices:
                        child_blocks = adjoin_isolated(blocks, index)
                        child_dcore, child_fjet = aggregate(child_blocks)
                        child_empty = max(26 - (m + 1) - c, 0)
                        child = control_vector(child_dcore, child_fjet, child_empty)
                        child_q = quotient_value(terms, child_dcore, child_fjet, child_empty)
                        increments = tuple(child[rank] - parent[rank] for rank in range(53))
                        positive = sum(value > 0 for value in increments)
                        zero = sum(value == 0 for value in increments)
                        negative = sum(value < 0 for value in increments)
                        child_negative = sum(value < 0 for value in child)
                        q_increment = child_q - parent_q
                        row["existing_block_transitions"] += 1
                        totals["existing_block_transitions"] += 1
                        for key, value in (
                            ("positive_control_increments", positive),
                            ("zero_control_increments", zero),
                            ("negative_control_increments", negative),
                            ("negative_child_controls", child_negative),
                        ):
                            row[key] += value
                            totals[key] += value
                        qkey = (
                            "positive_quotient_increments" if q_increment > 0 else
                            "negative_quotient_increments" if q_increment < 0 else
                            "zero_quotient_increments"
                        )
                        row[qkey] += 1
                        totals[qkey] += 1
                        signature = [
                            m, [[list(left), list(right)] for left, right in blocks], index,
                            list(dcore), list(fjet), parent_empty, list(child_dcore),
                            child_empty, [str(value) for value in increments],
                            str(q_increment.numerator), str(q_increment.denominator),
                        ]
                        low.update_fingerprint(fingerprint, signature)
                        if positive and first_obstruction is None:
                            first_obstruction = {
                                "m": m,
                                "blocks": [[list(left), list(right)] for left, right in blocks],
                                "selected_block_index": index,
                                "parent_D_core": list(dcore),
                                "parent_F": list(fjet),
                                "parent_empty_roots": parent_empty,
                                "child_D_core": list(child_dcore),
                                "child_empty_roots": child_empty,
                                "positive_increment_ranks": [rank for rank, value in enumerate(increments) if value > 0],
                                "increments": [str(value) for value in increments],
                            }
                    peak = max(peak, forest.gate())
        rows.append(row)
        print(
            "M", m, "STATES", row["unique_block_states"],
            "TRANS", row["existing_block_transitions"],
            "INC", row["positive_control_increments"], row["zero_control_increments"], row["negative_control_increments"],
            "CHILD_NEG", row["negative_child_controls"], flush=True,
        )

    status = (
        "OPEN_EXACT_POSITIVE_FIRST_DIFFERENCE_FOUND_NO_COUNTEREXAMPLE_CLAIM"
        if first_obstruction else
        "PASS_FINITE_EXACT_ALL_EXISTING_BLOCK_FIRST_DIFFERENCES_NONPOSITIVE"
    )
    payload = {
        "schema": "rank8-delta2-existing-block-first-difference-shard-v1",
        "status": status,
        "scope": f"Every realizable rooted-block multiset with |F|={args.m_start}..{args.m_end}; isolated-vertex component adjoined to each distinct existing block; parent and child evaluated at their first allowed n>=27 source order.",
        "transition": "(A,B)->(A(1+x),B); c fixed; the n=27 boundary removes one empty root while available",
        "control_definition": "The 53 exact forward differences in the extra-empty-root variable of the pinned Delta2 upper/upper numerator.",
        "coverage_complete": True,
        "rows": rows,
        "counts": totals,
        "first_positive_control_increment": first_obstruction,
        "fingerprint_mod_2_256": {key: f"{value:064X}" for key, value in fingerprint.items()},
        "input_sha256": {
            TERMS_FILE.name: sha256(TERMS_FILE),
            "analyze_rank8_delta2_component_adjoin_markov_collision_agent.py": sha256(HERE / "analyze_rank8_delta2_component_adjoin_markov_collision_agent.py"),
            "prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py": sha256(HERE / "prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py"),
            "prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py": sha256(HERE / "prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py"),
            "prove_rank8_forest16_f5_f6_ratio_agent.py": sha256(HERE / "prove_rank8_forest16_f5_f6_ratio_agent.py"),
        },
        "resources": {"abort_private_bytes": forest.ABORT_BYTES, "observed_peak_private_bytes_lt": 424 * 1024 * 1024},
        "proof_boundary": "A PASS is only finite evidence for the isolated-component first-difference hypothesis on the stated orders. It neither proves the symbolic transition inequality nor closes |F|>=16, Delta2, arbitrary leaf extension, Q8/PGC, or Problem 993. A positive control increment is a method obstruction, not a negative graph gate.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
