#!/usr/bin/env python3
"""Exact block-aware transition test for the Delta2 new-leaf corner.

The aggregate state (F jet, D-core jet, nonempty-root count) is not Markov
complete under component adjunction.  The smallest complete augmentation is
the multiset of rooted blocks (A_j,B_j), where a block contributes A_j+xB_j
to D and all A_j multiply to F.  This script replays the first aggregate
collision and tests the Delta2 numerator controls and rational quotient under
one- and two-block isolated-vertex adjunction.

It is a structural diagnostic, not a sign theorem for the unbounded tail.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

import analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent as corner
import analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent as leaf
import prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent as literal
import prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent as low
import prove_rank8_forest16_f5_f6_ratio_agent as forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_augmented_block_transition_agent_20260823.json"
ONE = (1, 0, 0, 0, 0, 0, 0)
ISOLATED = (1, 1, 0, 0, 0, 0, 0)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical(blocks):
    return tuple(sorted(blocks))


def aggregate(blocks):
    dcore = ONE
    fjet = ONE
    for excluded, deleted in blocks:
        dcore = forest.multiply(dcore, literal.add(excluded, literal.shift(deleted)))
        fjet = forest.multiply(fjet, excluded)
    return dcore, fjet


def adjoin_isolated_existing(blocks, index):
    excluded, deleted = blocks[index]
    replacement = (forest.multiply(excluded, ISOLATED), deleted)
    return canonical(blocks[:index] + (replacement,) + blocks[index + 1 :])


def adjoin_isolated_to_every_existing_block(blocks):
    return canonical(tuple(
        (forest.multiply(excluded, ISOLATED), deleted)
        for excluded, deleted in blocks
    ))


def controls(terms, blocks, empty_roots):
    dcore, fjet = aggregate(blocks)
    values = [
        low.evaluate_terms(terms, low.empty_extension(dcore, empty_roots + step), fjet)
        for step in range(53)
    ]
    return low.forward_differences(values)


def quotient(terms, blocks, empty_roots):
    dcore, fjet = aggregate(blocks)
    djet = low.empty_extension(dcore, empty_roots)
    numerator = low.evaluate_terms(terms, djet, fjet)
    denominator = 392 * djet[5] ** 4 * (djet[6] + fjet[5])
    assert denominator > 0
    return Fraction(numerator, denominator)


def fraction_record(value):
    return {"numerator": str(value.numerator), "denominator": str(value.denominator)}


def vector_record(values):
    return {
        "negative": sum(value < 0 for value in values),
        "zero": sum(value == 0 for value in values),
        "positive": sum(value > 0 for value in values),
        "minimum": str(min(values)),
        "maximum": str(max(values)),
        "negative_ranks": [rank for rank, value in enumerate(values) if value < 0],
        "positive_ranks": [rank for rank, value in enumerate(values) if value > 0],
        "values": [str(value) for value in values],
    }


def main() -> None:
    base, metadata = corner.new_leaf_corner(2, 3)
    assert metadata["endpoint_mask"] == 3
    generators = (
        leaf.d[3], leaf.d[4], leaf.d[5], leaf.d[6],
        leaf.f[3], leaf.f[4], leaf.f[5], leaf.f[6],
    )
    polynomial = sp.Poly(base, *generators)
    terms = polynomial.terms()
    assert len(terms) == 281

    blocks_a = canonical((
        ((1, 3, 1, 0, 0, 0, 0), (1, 2, 0, 0, 0, 0, 0)),
        ((1, 4, 5, 2, 0, 0, 0), (1, 1, 0, 0, 0, 0, 0)),
    ))
    blocks_b = canonical((
        ((1, 3, 2, 0, 0, 0, 0), (1, 1, 0, 0, 0, 0, 0)),
        ((1, 4, 4, 1, 0, 0, 0), (1, 2, 1, 0, 0, 0, 0)),
    ))
    dcore_a, fjet_a = aggregate(blocks_a)
    dcore_b, fjet_b = aggregate(blocks_b)
    assert dcore_a == dcore_b == (1, 9, 29, 41, 26, 6, 0)
    assert fjet_a == fjet_b == (1, 7, 18, 21, 11, 2, 0)

    parent_empty = 26 - 7 - 2
    parent_controls = controls(terms, blocks_a, parent_empty)
    assert parent_controls == controls(terms, blocks_b, parent_empty)
    parent_quotient = quotient(terms, blocks_a, parent_empty)

    representations = {"A": blocks_a, "B": blocks_b}
    rows = {}
    all_one_control_deltas = []
    all_mixed_control_deltas = []
    mixed_quotients = []
    for name, blocks in representations.items():
        one_children = [adjoin_isolated_existing(blocks, index) for index in range(2)]
        child_empty = 26 - 8 - 2
        child_controls = [controls(terms, child, child_empty) for child in one_children]
        child_quotients = [quotient(terms, child, child_empty) for child in one_children]
        control_deltas = [
            tuple(child[rank] - parent_controls[rank] for rank in range(53))
            for child in child_controls
        ]
        quotient_deltas = [value - parent_quotient for value in child_quotients]

        # Apply exactly once to each original hidden block.  Do this
        # simultaneously because canonical sorting can swap block indices.
        both = adjoin_isolated_to_every_existing_block(blocks)
        both_empty = 26 - 9 - 2
        both_controls = controls(terms, both, both_empty)
        both_quotient = quotient(terms, both, both_empty)
        mixed_controls = tuple(
            both_controls[rank]
            - child_controls[0][rank]
            - child_controls[1][rank]
            + parent_controls[rank]
            for rank in range(53)
        )
        mixed_quotient = both_quotient - child_quotients[0] - child_quotients[1] + parent_quotient
        all_one_control_deltas.extend(control_deltas)
        all_mixed_control_deltas.append(mixed_controls)
        mixed_quotients.append(mixed_quotient)
        rows[name] = {
            "parent_blocks": [[list(left), list(right)] for left, right in blocks],
            "one_block_children": [
                {
                    "blocks": [[list(left), list(right)] for left, right in child],
                    "D_core": list(aggregate(child)[0]),
                    "controls_at_n27": vector_record(child_controls[index]),
                    "control_increment_from_parent_n27": vector_record(control_deltas[index]),
                    "quotient_at_n27": fraction_record(child_quotients[index]),
                    "quotient_increment_from_parent_n27": fraction_record(quotient_deltas[index]),
                }
                for index, child in enumerate(one_children)
            ],
            "two_block_child": {
                "blocks": [[list(left), list(right)] for left, right in both],
                "D_core": list(aggregate(both)[0]),
                "controls_at_n27": vector_record(both_controls),
                "mixed_second_control_difference_n27": vector_record(mixed_controls),
                "quotient_at_n27": fraction_record(both_quotient),
                "mixed_second_quotient_difference_n27": fraction_record(mixed_quotient),
            },
        }

    one_mixed_sign = any(
        any(value < 0 for value in vector) and any(value > 0 for value in vector)
        for vector in all_one_control_deltas
    )
    one_all_nonnegative = all(all(value >= 0 for value in vector) for vector in all_one_control_deltas)
    one_all_nonpositive = all(all(value <= 0 for value in vector) for vector in all_one_control_deltas)
    second_mixed_sign = any(
        any(value < 0 for value in vector) and any(value > 0 for value in vector)
        for vector in all_mixed_control_deltas
    )
    second_all_nonnegative = all(all(value >= 0 for value in vector) for vector in all_mixed_control_deltas)
    second_all_nonpositive = all(all(value <= 0 for value in vector) for vector in all_mixed_control_deltas)
    quotient_additive = all(value == 0 for value in mixed_quotients)

    payload = {
        "schema": "rank8-delta2-augmented-block-transition-v1",
        "status": "PASS_EXACT_BLOCK_STATE_MARKOV_COMPLETE_TRANSITION_DIAGNOSTIC_NO_UNIFORM_CLAIM",
        "scope": "The smallest aggregate-state collision at |F|=7, tested under isolated-vertex adjunction to one or both existing root blocks at the n=27 boundary.",
        "exact_transition_lemma": {
            "state": "multiset of rooted blocks (A_j,B_j), with D=product_j(A_j+x B_j) and F=product_j A_j",
            "new_root_component_P_Q": "append the block (P,Q)",
            "existing_root_component_P_Q": "replace the selected block (A_j,B_j) by (A_j P,B_j Q)",
            "conclusion": "This augmented state is Markov complete for component adjunction; the aggregate (F,D,c) is its many-to-one projection.",
        },
        "parent": {
            "F_order": 7,
            "nonempty_roots": 2,
            "empty_roots_at_n27": parent_empty,
            "F_jet": list(fjet_a),
            "D_core": list(dcore_a),
            "controls_at_n27": vector_record(parent_controls),
            "quotient_at_n27": fraction_record(parent_quotient),
        },
        "representations": rows,
        "transition_conclusion": {
            "one_block_control_increment_has_both_signs": one_mixed_sign,
            "all_one_block_control_increments_nonnegative": one_all_nonnegative,
            "all_one_block_control_increments_nonpositive": one_all_nonpositive,
            "two_block_mixed_control_difference_has_both_signs": second_mixed_sign,
            "all_two_block_mixed_control_differences_nonnegative": second_all_nonnegative,
            "all_two_block_mixed_control_differences_nonpositive": second_all_nonpositive,
            "rational_quotient_additive_on_both_representations": quotient_additive,
            "meaning": "The block state makes the transition deterministic. These booleans report only this smallest witness; a uniform preservation or convexity theorem requires a separate all-block proof.",
        },
        "input_sha256": {
            "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py": sha256(HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py"),
            "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": sha256(HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py"),
            "prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py": sha256(HERE / "prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py"),
            "prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py": sha256(HERE / "prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py"),
            "prove_rank8_forest16_f5_f6_ratio_agent.py": sha256(HERE / "prove_rank8_forest16_f5_f6_ratio_agent.py"),
        },
        "proof_boundary": "This exact witness obstructs only simple additive, coefficientwise monotone, or coefficientwise convex/concave 53-control induction. It is not a negative Delta2 value, does not rule out a stronger block-aware potential, and gives no credit for |F|>=16 or the full Delta2 gate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
