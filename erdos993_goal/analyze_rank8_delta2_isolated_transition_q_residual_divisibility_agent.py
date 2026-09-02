#!/usr/bin/env python3
"""Test the isolated-block transition groups against accessible Q residuals.

This independently rebuilds the sparse transition split, groups its D-defect
piece by total W degree, performs exact multivariate divisibility tests against
the Q residuals visible in D,F,W, and evaluates every group on the smallest
literal rooted-block transition (|F|=1 at n=27).
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

import analyze_rank8_delta2_isolated_block_symbolic_transition_agent as transition
import prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent as low
import prove_rank8_forest16_f5_f6_ratio_agent as forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_isolated_transition_q_residual_divisibility_agent_20260823.json"
TERMS_FILE = HERE / "rank8_delta2_new_leaf_upper_corner_sparse_terms_agent_20260823.json"
EXPECTED_TRANSITION_SOURCE = "5E6A248F81643A40B034607A7A4A557AA276EA8C9FA70E2898B5B4EA1B3D646F"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def make_monomial(**powers):
    row = [0] * len(transition.VARIABLES)
    for name, exponent in powers.items():
        row[transition.VARIABLES.index(name)] = exponent
    return tuple(row)


def polynomial_from_terms(rows):
    return {monomial: coefficient for monomial, coefficient in rows if coefficient}


def q_residuals():
    def q(previous, middle, following, rank):
        return polynomial_from_terms((
            (make_monomial(**{middle: 2}), 2 * rank),
            (make_monomial(**{previous: 1, middle: 1}), -1),
            (make_monomial(**{previous: 1, following: 1}), -2 * (rank + 1)),
        ))

    rows = {
        "Q4_D": q("d3", "d4", "d5", 4),
        "Q5_D": q("d4", "d5", "d6", 5),
        "Q3_F": q("f2", "f3", "f4", 3),
        "Q4_F": q("f3", "f4", "f5", 4),
        "Q5_F": q("f4", "f5", "f6", 5),
        "Q2_W": q("w1", "w2", "w3", 2),
        "Q3_W": q("w2", "w3", "w4", 3),
    }
    # Q1(W)=2w1^2-w0*w1-4w0*w2 and w0=1.
    rows["Q1_W_w0_equals_1"] = polynomial_from_terms((
        (make_monomial(w1=2), 2),
        (make_monomial(w1=1), -1),
        (make_monomial(w2=1), -4),
    ))
    return rows


def evaluate(polynomial, values):
    answer = 0
    for monomial, coefficient in polynomial.items():
        term = coefficient
        for value, exponent in zip(values, monomial):
            if exponent:
                term *= value**exponent
        answer += term
    return answer


def poly_record(polynomial):
    rows = [[list(monomial), str(polynomial[monomial])] for monomial in sorted(polynomial, reverse=True)]
    return {
        "terms": len(polynomial),
        "negative": sum(value < 0 for value in polynomial.values()),
        "positive": sum(value > 0 for value in polynomial.values()),
        "sha256": hashlib.sha256(json.dumps(rows, separators=(",", ":")).encode()).hexdigest().upper(),
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
    total = transition.difference(parent, child)

    groups = {
        degree: {monomial: coefficient for monomial, coefficient in d_effect.items() if sum(monomial[9:]) == degree}
        for degree in sorted({sum(monomial[9:]) for monomial in d_effect})
    }
    generators = sp.symbols(" ".join(transition.VARIABLES))
    residuals = q_residuals()
    divisibility = {}
    for degree, group in groups.items():
        group_poly = sp.Poly.from_dict(group, *generators, domain=sp.ZZ)
        row = {}
        for name, residual in residuals.items():
            residual_poly = sp.Poly.from_dict(residual, *generators, domain=sp.ZZ)
            quotient, remainder = sp.div(group_poly, residual_poly)
            divides = remainder.is_zero
            row[name] = {
                "divides": divides,
                "quotient_terms": len(quotient.terms()) if divides else None,
                "quotient_negative": (
                    sum(coefficient < 0 for _, coefficient in quotient.terms()) if divides else None
                ),
                "quotient_positive": (
                    sum(coefficient > 0 for _, coefficient in quotient.terms()) if divides else None
                ),
                "remainder_terms": 0 if divides else len(remainder.terms()),
            }
            forest.gate()
        divisibility[str(degree)] = row

    # Smallest existing-block transition: F is one isolated vertex, attached
    # to one nonempty D root, with 24 empty D roots at n=27.  After adjoining
    # the new isolated component, W=(1+x)^23.
    block = (1, 2, 0, 0, 0, 0, 0)  # (1+x)+x*1
    djet = low.empty_extension(block, 24)
    fjet = (1, 1, 0, 0, 0, 0, 0)
    wjet = tuple(math.comb(23, rank) for rank in range(7))
    values = (
        djet[3], djet[4], djet[5], djet[6],
        fjet[2], fjet[3], fjet[4], fjet[5], fjet[6],
        wjet[1], wjet[2], wjet[3], wjet[4],
    )
    group_values = {str(degree): str(evaluate(group, values)) for degree, group in groups.items()}
    f_value = evaluate(f_effect, values)
    total_value = evaluate(total, values)
    assert f_value + sum(int(value) for value in group_values.values()) == total_value
    residual_values = {name: str(evaluate(residual, values)) for name, residual in residuals.items()}

    negative_groups = [degree for degree, value in group_values.items() if int(value) < 0]
    any_divisibility = any(
        result["divides"]
        for row in divisibility.values()
        for result in row.values()
    )
    output = {
        "schema": "rank8-delta2-isolated-transition-q-residual-divisibility-v1",
        "status": "OPEN_EXACT_SIMPLE_Q_RESIDUAL_DIVISIBILITY_FAILS_REALIZED_GROUP_SIGN_MIXED",
        "group_records": {str(degree): poly_record(group) for degree, group in groups.items()},
        "exact_divisibility_by_accessible_single_Q_residual": divisibility,
        "any_exact_single_residual_divisibility": any_divisibility,
        "smallest_literal_transition": {
            "F_order": 1,
            "source_order": 27,
            "D": list(djet),
            "F": list(fjet),
            "W": list(wjet),
            "F_multiplication_piece": str(f_value),
            "D_defect_piece_by_w_degree": group_values,
            "negative_w_degree_groups": negative_groups,
            "total_parent_minus_child_numerator": str(total_value),
            "accessible_Q_residual_values": residual_values,
        },
        "input_sha256": {
            TERMS_FILE.name: sha256(TERMS_FILE),
            "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py": sha256(HERE / "analyze_rank8_delta2_isolated_block_symbolic_transition_agent.py"),
            "prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py": sha256(HERE / "prove_rank8_delta2_new_leaf_m0_6_literal_empty_root_tail_agent.py"),
        },
        "resources": {"abort_private_bytes": forest.ABORT_BYTES},
        "proof_boundary": "Failure of single-residual divisibility or a negative internal W-degree contribution is only an obstruction to this grouping. The full realized transition remains positive here; no graph counterexample and no uniform theorem claim follows.",
    }
    OUTPUT.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(output["status"])
    print("DIVIDES_ANY", any_divisibility, "NEGATIVE_GROUPS", negative_groups, "TOTAL_SIGN", (total_value > 0) - (total_value < 0))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
