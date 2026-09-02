#!/usr/bin/env python3
"""Literal shard for the four-pair isolated-block transition certificate.

Enumerate every realizable hidden rooted-block state of the requested |F|
orders and every distinct existing block.  For each transition compute exact
Newton controls for paired W degrees (1+2),(3+4),(5+6),(7+8), degree 9, and
the F-multiplication piece.  Stop only after completing the shard; record the
first negative paired control as a method obstruction.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx

import analyze_rank8_delta2_component_adjoin_markov_collision_agent as collision
import analyze_rank8_delta2_isolated_block_symbolic_transition_agent as transition
import prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent as literal
import prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent as low
import prove_rank8_forest16_f5_f6_ratio_agent as forest


HERE = Path(__file__).resolve().parent
TERMS_FILE = HERE / "rank8_delta2_new_leaf_upper_corner_sparse_terms_agent_20260823.json"
EXPECTED_TRANSITION_SOURCE = "5E6A248F81643A40B034607A7A4A557AA276EA8C9FA70E2898B5B4EA1B3D646F"
ONE = (1, 0, 0, 0, 0, 0, 0)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_records(max_order):
    records = {}
    counts = [0]
    for order in range(1, max_order + 1):
        trees = [nx.empty_graph(1)] if order == 1 else list(nx.nonisomorphic_trees(order))
        counts.append(len(trees))
        records[order] = tuple(
            literal.TreeRecord(order, index, forest.tree_jet(tree), literal.deletion_jet_set(tree))
            for index, tree in enumerate(trees)
        )
        forest.gate()
    assert counts == literal.EXPECTED_TREE_COUNTS[: max_order + 1]
    return records


def multiply_blocks(blocks):
    dcore = ONE
    fjet = ONE
    for excluded, deleted in blocks:
        dcore = forest.multiply(dcore, literal.add(excluded, literal.shift(deleted)))
        fjet = forest.multiply(fjet, excluded)
    return dcore, fjet


def compile_polynomial(polynomial):
    return tuple(
        (coefficient, tuple((index, exponent) for index, exponent in enumerate(monomial) if exponent))
        for monomial, coefficient in polynomial.items()
    )


def evaluate(compiled, values):
    powers = {}
    answer = 0
    for coefficient, support in compiled:
        term = coefficient
        for index, exponent in support:
            key = (index, exponent)
            power = powers.get(key)
            if power is None:
                power = values[index] ** exponent
                powers[key] = power
            term *= power
        answer += term
    return answer


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--m-start", type=int, choices=range(1, 13), required=True)
    parser.add_argument("--m-end", type=int, choices=range(1, 13), required=True)
    args = parser.parse_args()
    assert args.m_start <= args.m_end
    assert sha256(HERE / "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py") == EXPECTED_TRANSITION_SOURCE
    term_payload = json.loads(TERMS_FILE.read_text(encoding="utf-8"))
    base_terms = tuple((tuple(row[0]), int(row[1])) for row in term_payload["terms"])
    parent_poly, _ = transition.substitute(base_terms, d_defect=False, f_shift=False)
    f_shifted_poly, _ = transition.substitute(base_terms, d_defect=False, f_shift=True)
    child_poly, _ = transition.substitute(base_terms, d_defect=True, f_shift=True)
    f_effect = transition.difference(parent_poly, f_shifted_poly)
    d_effect = transition.difference(f_shifted_poly, child_poly)
    groups = {
        degree: {monomial: coefficient for monomial, coefficient in d_effect.items() if sum(monomial[9:]) == degree}
        for degree in range(1, 10)
    }
    pieces = {"F": f_effect, "degree9": groups[9]}
    for odd in (1, 3, 5, 7):
        pieces[f"pair{odd}_{odd + 1}"] = transition.difference(groups[odd], {m: -c for m, c in groups[odd + 1].items()})
    compiled = {name: compile_polynomial(polynomial) for name, polynomial in pieces.items()}

    records = build_records(args.m_end)
    totals = {
        "forest_types": 0,
        "unique_block_states": 0,
        "transitions": 0,
        "piece_controls_tested": 0,
        "negative_piece_controls": 0,
        "negative_total_controls": 0,
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
                    empty = 26 - m - c
                    assert empty >= 2  # m<=12 and c<=m
                    dcore, fjet = multiply_blocks(blocks)
                    distinct_indices = []
                    used = set()
                    for index, block in enumerate(blocks):
                        if block not in used:
                            used.add(block)
                            distinct_indices.append(index)
                    for selected_index in distinct_indices:
                        selected_deleted = blocks[selected_index][1]
                        other_blocks = blocks[:selected_index] + blocks[selected_index + 1 :]
                        other_dcore, _ = multiply_blocks(other_blocks)
                        wcore = forest.multiply(selected_deleted, other_dcore)
                        sequences = {name: [] for name in pieces}
                        direct = []
                        for extra in range(53):
                            djet = low.empty_extension(dcore, empty + extra)
                            wjet = low.empty_extension(wcore, empty - 1 + extra)
                            values = (
                                djet[3], djet[4], djet[5], djet[6],
                                fjet[2], fjet[3], fjet[4], fjet[5], fjet[6],
                                wjet[1], wjet[2], wjet[3], wjet[4],
                            )
                            for name in pieces:
                                sequences[name].append(evaluate(compiled[name], values))
                            child_djet = tuple(
                                djet[index] - (wjet[index - 2] if index >= 2 else 0)
                                for index in range(7)
                            )
                            child_fjet = low.empty_extension(fjet, 1)
                            direct.append(
                                low.evaluate_terms(base_terms, djet, fjet)
                                - low.evaluate_terms(base_terms, child_djet, child_fjet)
                            )
                        assert all(
                            direct[index] == sum(sequences[name][index] for name in pieces)
                            for index in range(53)
                        )
                        controls = {name: low.forward_differences(sequence) for name, sequence in sequences.items()}
                        total_controls = low.forward_differences(direct)
                        negative_piece = sum(value < 0 for values in controls.values() for value in values)
                        negative_total = sum(value < 0 for value in total_controls)
                        row["transitions"] += 1
                        totals["transitions"] += 1
                        tested = len(pieces) * 53
                        row["piece_controls_tested"] += tested
                        totals["piece_controls_tested"] += tested
                        row["negative_piece_controls"] += negative_piece
                        totals["negative_piece_controls"] += negative_piece
                        row["negative_total_controls"] += negative_total
                        totals["negative_total_controls"] += negative_total
                        signature = [
                            m, [[list(left), list(right)] for left, right in blocks], selected_index,
                            {name: [str(value) for value in controls[name]] for name in sorted(controls)},
                            [str(value) for value in total_controls],
                        ]
                        low.update_fingerprint(fingerprint, signature)
                        if negative_piece and first_obstruction is None:
                            first_obstruction = {
                                "m": m,
                                "blocks": [[list(left), list(right)] for left, right in blocks],
                                "selected_block_index": selected_index,
                                "D_core": list(dcore),
                                "F": list(fjet),
                                "W_core": list(wcore),
                                "empty_roots_at_n27": empty,
                                "negative_piece_control_ranks": {
                                    name: [rank for rank, value in enumerate(values) if value < 0]
                                    for name, values in controls.items() if any(value < 0 for value in values)
                                },
                                "total_negative_ranks": [rank for rank, value in enumerate(total_controls) if value < 0],
                            }
                        forest.gate()
        rows.append(row)
        print(
            "M", m, "STATES", row["unique_block_states"], "TRANS", row["transitions"],
            "PAIR_NEG", row["negative_piece_controls"], "TOTAL_NEG", row["negative_total_controls"],
            flush=True,
        )

    output_path = HERE / f"rank8_delta2_isolated_transition_pairing_literal_m{args.m_start}_{args.m_end}_agent_20260823.json"
    status = (
        "OPEN_EXACT_FOUR_PAIR_LITERAL_OBSTRUCTION_NO_GATE_COUNTEREXAMPLE"
        if first_obstruction else
        "PASS_FINITE_EXACT_FOUR_PAIR_LITERAL_SHARD"
    )
    output = {
        "schema": "rank8-delta2-isolated-transition-pairing-literal-shard-v1",
        "status": status,
        "scope": f"All realizable hidden block states |F|={args.m_start}..{args.m_end}, all distinct existing blocks, isolated component adjunction, exact all-source n>=27 Newton controls.",
        "pieces": ["F multiplication", "W degrees 1+2", "3+4", "5+6", "7+8", "degree 9"],
        "coverage_complete": True,
        "rows": rows,
        "counts": totals,
        "first_piece_obstruction": first_obstruction,
        "fingerprint_mod_2_256": {key: f"{value:064X}" for key, value in fingerprint.items()},
        "input_sha256": {
            TERMS_FILE.name: sha256(TERMS_FILE),
            "analyze_rank8_delta2_component_adjoin_markov_collision_agent.py": sha256(HERE / "analyze_rank8_delta2_component_adjoin_markov_collision_agent.py"),
            "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py": sha256(HERE / "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py"),
            "prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py": sha256(HERE / "prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py"),
        },
        "resources": {"abort_private_bytes": forest.ABORT_BYTES},
        "proof_boundary": "A PASS is a finite literal pairing check, not the required symbolic inequality. A paired-piece failure only obstructs this telescoping certificate; it is not a negative total gate unless total_negative_ranks is nonempty. No top-level Delta2 or global credit follows.",
    }
    output_path.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(output_path))


if __name__ == "__main__":
    main()
