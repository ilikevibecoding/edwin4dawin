#!/usr/bin/env python3
"""Exact four-pair Newton-tail certificate on the smallest t=1 boundary.

For |F|=1 with its component attached to the sole nonempty root, pair W-degree
blocks (1,2), (3,4), (5,6), (7,8), leaving degree 9.  Exact forward
differences from n=27 test the entire extra-empty-root tail.
"""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import analyze_rank8_delta2_isolated_block_symbolic_transition_agent as transition
import prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent as low
import prove_rank8_forest16_f5_f6_ratio_agent as forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_isolated_transition_m1_pairing_tail_agent_20260823.json"
TERMS_FILE = HERE / "rank8_delta2_new_leaf_upper_corner_sparse_terms_agent_20260823.json"
EXPECTED_TRANSITION_SOURCE = "5E6A248F81643A40B034607A7A4A557AA276EA8C9FA70E2898B5B4EA1B3D646F"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def evaluate(polynomial, values):
    answer = 0
    for monomial, coefficient in polynomial.items():
        term = coefficient
        for value, exponent in zip(values, monomial):
            if exponent:
                term *= value**exponent
        answer += term
    return answer


def vector_record(values):
    return {
        "negative": sum(value < 0 for value in values),
        "zero": sum(value == 0 for value in values),
        "positive": sum(value > 0 for value in values),
        "minimum": str(min(values)),
        "values": [str(value) for value in values],
    }


def main() -> None:
    assert sha256(HERE / "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py") == EXPECTED_TRANSITION_SOURCE
    term_payload = json.loads(TERMS_FILE.read_text(encoding="utf-8"))
    base_terms = tuple((tuple(row[0]), int(row[1])) for row in term_payload["terms"])
    parent, _ = transition.substitute(base_terms, d_defect=False, f_shift=False)
    f_shifted, _ = transition.substitute(base_terms, d_defect=False, f_shift=True)
    child, _ = transition.substitute(base_terms, d_defect=True, f_shift=True)
    f_effect = transition.difference(parent, f_shifted)
    d_effect = transition.difference(f_shifted, child)
    groups = {
        degree: {monomial: coefficient for monomial, coefficient in d_effect.items() if sum(monomial[9:]) == degree}
        for degree in range(1, 10)
    }

    sequences = {"F": []}
    sequences.update({str(degree): [] for degree in range(1, 10)})
    direct_total = []
    fjet = (1, 1, 0, 0, 0, 0, 0)
    for extra in range(53):
        empty = 24 + extra
        block = (1, 2, 0, 0, 0, 0, 0)
        djet = low.empty_extension(block, empty)
        wjet = tuple(math.comb(23 + extra, rank) for rank in range(7))
        values = (
            djet[3], djet[4], djet[5], djet[6],
            fjet[2], fjet[3], fjet[4], fjet[5], fjet[6],
            wjet[1], wjet[2], wjet[3], wjet[4],
        )
        sequences["F"].append(evaluate(f_effect, values))
        for degree in range(1, 10):
            sequences[str(degree)].append(evaluate(groups[degree], values))
        child_djet = tuple(djet[index] - (wjet[index - 2] if index >= 2 else 0) for index in range(7))
        child_fjet = low.empty_extension(fjet, 1)
        direct_total.append(
            low.evaluate_terms(base_terms, djet, fjet)
            - low.evaluate_terms(base_terms, child_djet, child_fjet)
        )
        forest.gate()
    assert all(
        direct_total[index] == sequences["F"][index] + sum(sequences[str(degree)][index] for degree in range(1, 10))
        for index in range(53)
    )

    controls = {name: low.forward_differences(values) for name, values in sequences.items()}
    total_controls = low.forward_differences(direct_total)
    pairs = {}
    all_nonnegative = True
    for odd in (1, 3, 5, 7):
        even = odd + 1
        pair = tuple(controls[str(odd)][rank] + controls[str(even)][rank] for rank in range(53))
        ratio_rows = []
        for rank in range(53):
            odd_value = controls[str(odd)][rank]
            even_value = controls[str(even)][rank]
            if odd_value > 0 and even_value < 0:
                ratio_rows.append((Fraction(odd_value, -even_value), rank))
        minimum_ratio, minimum_rank = min(ratio_rows) if ratio_rows else (None, None)
        pairs[f"degrees_{odd}_{even}"] = {
            "controls": vector_record(pair),
            "minimum_odd_over_negative_even_ratio": (
                {"numerator": str(minimum_ratio.numerator), "denominator": str(minimum_ratio.denominator), "rank": minimum_rank}
                if minimum_ratio is not None else None
            ),
        }
        all_nonnegative &= all(value >= 0 for value in pair)
    degree9_nonnegative = all(value >= 0 for value in controls["9"])
    f_nonnegative = all(value >= 0 for value in controls["F"])
    total_nonnegative = all(value >= 0 for value in total_controls)
    assert total_nonnegative

    payload = {
        "schema": "rank8-delta2-isolated-transition-m1-pairing-tail-v1",
        "status": (
            "PASS_EXACT_FOUR_PAIR_NEWTON_TAIL_ON_M1_BOUNDARY"
            if all_nonnegative and degree9_nonnegative and f_nonnegative else
            "OPEN_EXACT_PAIRING_OBSTRUCTION_ON_M1_BOUNDARY"
        ),
        "scope": "Delta2 upper/upper numerator, |F|=1 sole nonempty block, isolated component adjoined to that block, all source n>=27 via exact forward differences.",
        "pairing": pairs,
        "unpaired_degree_9_controls": vector_record(controls["9"]),
        "F_multiplication_controls": vector_record(controls["F"]),
        "total_parent_minus_child_controls": vector_record(total_controls),
        "all_four_pairs_nonnegative": all_nonnegative,
        "degree9_nonnegative": degree9_nonnegative,
        "F_piece_nonnegative": f_nonnegative,
        "input_sha256": {
            TERMS_FILE.name: sha256(TERMS_FILE),
            "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py": sha256(HERE / "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py"),
            "prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py": sha256(HERE / "prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py"),
        },
        "resources": {"abort_private_bytes": forest.ABORT_BYTES},
        "proof_boundary": "A PASS proves only this one literal transition family. It motivates but does not prove a uniform block-pairing inequality and gives no |F|>=16 or Delta2 gate credit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    for name, row in pairs.items():
        print(name, row["controls"]["negative"], row["controls"]["zero"], row["controls"]["positive"])
    print("D9", controls["9"][0] >= 0, "F", f_nonnegative, "TOTAL", total_nonnegative)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
