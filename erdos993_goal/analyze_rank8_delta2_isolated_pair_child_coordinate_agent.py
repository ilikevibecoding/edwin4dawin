#!/usr/bin/env python3
"""Rebase isolated-transition pairs in literal child-D coordinates.

The exact compatibility relation is d_i(parent)=y_i(child)+w_(i-2).
Substitute it into the four alternating W-degree pairs and test raw
coefficient signs in the nonnegative variables y,F,W.
"""

from __future__ import annotations

import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path

import analyze_rank8_delta2_isolated_block_symbolic_transition_agent as transition
import prove_rank8_forest16_f5_f6_ratio_agent as forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_isolated_pair_child_coordinate_agent_20260823.json"
TERMS_FILE = HERE / "rank8_delta2_new_leaf_upper_corner_sparse_terms_agent_20260823.json"
EXPECTED_TRANSITION_SOURCE = "5E6A248F81643A40B034607A7A4A557AA276EA8C9FA70E2898B5B4EA1B3D646F"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rebase_d_to_child_plus_w(polynomial):
    answer = defaultdict(int)
    for monomial, coefficient in polynomial.items():
        terms = {(0,) * 13: coefficient}
        for d_index in range(4):
            exponent = monomial[d_index]
            if not exponent:
                continue
            factor = {}
            for w_power in range(exponent + 1):
                row = [0] * 13
                row[d_index] = exponent - w_power
                row[9 + d_index] = w_power
                factor[tuple(row)] = math.comb(exponent, w_power)
            terms = transition.multiply_sparse(terms, factor)
        unchanged = list(monomial)
        for d_index in range(4):
            unchanged[d_index] = 0
        shifted = tuple(unchanged)
        for partial, partial_coefficient in terms.items():
            answer[transition.add_monomials(partial, shifted)] += partial_coefficient
        forest.gate()
    return {monomial: coefficient for monomial, coefficient in answer.items() if coefficient}


def record(polynomial):
    rows = [[list(monomial), str(polynomial[monomial])] for monomial in sorted(polynomial, reverse=True)]
    return {
        "terms": len(polynomial),
        "negative": sum(value < 0 for value in polynomial.values()),
        "positive": sum(value > 0 for value in polynomial.values()),
        "minimum_coefficient": str(min(polynomial.values())),
        "sha256": hashlib.sha256(json.dumps(rows, separators=(",", ":")).encode()).hexdigest().upper(),
        "first_negative": next((
            {"monomial": list(monomial), "coefficient": str(coefficient)}
            for monomial, coefficient in sorted(polynomial.items(), reverse=True)
            if coefficient < 0
        ), None),
    }


def main() -> None:
    assert sha256(HERE / "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py") == EXPECTED_TRANSITION_SOURCE
    term_payload = json.loads(TERMS_FILE.read_text(encoding="utf-8"))
    base_terms = tuple((tuple(row[0]), int(row[1])) for row in term_payload["terms"])
    f_shifted, _ = transition.substitute(base_terms, d_defect=False, f_shift=True)
    child, _ = transition.substitute(base_terms, d_defect=True, f_shift=True)
    d_effect = transition.difference(f_shifted, child)
    groups = {
        degree: {monomial: coefficient for monomial, coefficient in d_effect.items() if sum(monomial[9:]) == degree}
        for degree in range(1, 10)
    }
    records = {}
    all_nonnegative = True
    for odd in (1, 3, 5, 7):
        pair = transition.difference(groups[odd], {monomial: -coefficient for monomial, coefficient in groups[odd + 1].items()})
        rebased = rebase_d_to_child_plus_w(pair)
        row = record(rebased)
        records[f"degrees_{odd}_{odd + 1}"] = row
        all_nonnegative &= row["negative"] == 0
        print("PAIR", odd, odd + 1, row["terms"], row["negative"], row["positive"], flush=True)
    rebased9 = rebase_d_to_child_plus_w(groups[9])
    records["degree_9"] = record(rebased9)
    all_nonnegative &= records["degree_9"]["negative"] == 0

    payload = {
        "schema": "rank8-delta2-isolated-pair-child-coordinate-v1",
        "status": (
            "PASS_EXACT_D_DEFECT_FOUR_PAIR_COEFFICIENTWISE_IN_CHILD_COORDINATES"
            if all_nonnegative else
            "OPEN_EXACT_CHILD_COORDINATE_PAIR_COEFFICIENT_OBSTRUCTION"
        ),
        "substitution": "d3=y3+w1, d4=y4+w2, d5=y5+w3, d6=y6+w4, where y is the child D jet and x^2 W is the exact deleted reserve",
        "variables_after_substitution": ["y3", "y4", "y5", "y6", "f2", "f3", "f4", "f5", "f6", "w1", "w2", "w3", "w4"],
        "records": records,
        "all_D_defect_pairs_and_degree9_coefficientwise_nonnegative": all_nonnegative,
        "input_sha256": {
            TERMS_FILE.name: sha256(TERMS_FILE),
            "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py": sha256(HERE / "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py"),
        },
        "resources": {"abort_private_bytes": forest.ABORT_BYTES},
        "proof_boundary": "A PASS would control only the D-defect piece at a fixed extra-root parameter. The F-multiplication piece and Newton-control compatibility remain separate; no full transition or Delta2 theorem is claimed.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
