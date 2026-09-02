#!/usr/bin/env python3
"""Independent fail-closed audit of the uniform subdivided-star q3 envelope."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from fractions import Fraction
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
PRODUCER = ROOT / "verify_uniform_subdivided_star_q3_envelope_root.py"
PRIMARY = ROOT / "uniform_subdivided_star_q3_envelope_exact_root_20260828.json"
NOTE = ROOT / "UNIFORM_SUBDIVIDED_STAR_Q3_ENVELOPE_THEOREM_2026-08-28.md"
OUTPUT = ROOT / "uniform_subdivided_star_q3_envelope_independent_audit_20260828.json"

PINNED = {
    PRODUCER.name: "522421228A6C261A95A444A18B679C2533AA9C277F1DA2560BE2F96336FE6360",
    PRIMARY.name: "8CCBCD62A4275BC484D9C983F6899946BFFDC478985C11A6A225537C62465930",
    NOTE.name: "D2605A0E0FEC58C9F4DEEFFC987E0C9C1D5454D75C90F8C3DC010D53962F2B69",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def exact_rows(arms: int) -> tuple[list[int], list[int]]:
    independent = [
        (2**rank * math.comb(arms, rank) if rank <= arms else 0)
        + (math.comb(arms, rank - 1) if 0 <= rank - 1 <= arms else 0)
        for rank in range(arms + 2)
    ]
    slides = [0] * (arms + 2)
    for rank in range(2, arms + 1):
        slides[rank] = (
            arms
            * math.comb(arms - 1, rank - 1)
            * (2 ** (rank - 1) + 1)
        )
    return independent, slides


def symbolic_audit(primary: dict[str, object]) -> dict[str, object]:
    d, rank, tail = sp.symbols("d r t", integer=True, positive=True)
    q2 = sp.cancel(3 * (d - 1) / (4 * d - 2))
    q3 = sp.cancel(5 * (d - 2) / (8 * d - 13))
    q2_q3_cross = sp.expand(
        3 * (d - 1) * (8 * d - 13)
        - 5 * (d - 2) * (4 * d - 2)
    )
    assert q2_q3_cross == 4 * d**2 - 13 * d + 19
    discriminant = sp.discriminant(q2_q3_cross, d)
    assert discriminant == -135

    # Derive q_r directly from the two binomial coefficient rows and then
    # substitute d=t+r-1.  This is independent of the producer execution.
    qr = sp.cancel(
        (2 ** (rank - 1) + 1) * tail / (2**rank * tail + rank)
    )
    cross = sp.expand(
        5 * (tail + rank - 3) * (2**rank * tail + rank)
        - (8 * (tail + rank - 1) - 13)
        * (2 ** (rank - 1) + 1)
        * tail
    )
    expected = sp.expand(
        (2**rank - 8) * tail**2
        + (2 ** (rank - 1) * (2 * rank - 9) - 3 * rank + 21) * tail
        + 5 * rank * (rank - 3)
    )
    assert sp.expand(cross - expected) == 0
    assert sp.expand(expected.subs(rank, 3)) == 0
    assert sp.expand(expected.subs(rank, 4)) == 8 * tail**2 + tail + 20
    lower = 2 ** (rank - 1) - 3 * rank + 21
    assert lower.subs(rank, 5) == 22
    assert sp.simplify(lower.subs(rank, rank + 1) - lower) == 2 ** (rank - 1) - 3

    reported = primary["symbolic_proof"]
    comparisons = {
        "q2": q2,
        "q3": q3,
        "q2_minus_q3_cross_numerator": q2_q3_cross,
        "q_r_for_3_le_r_le_d_with_t_d_minus_r_plus_1": qr,
        "q3_minus_qr_cross_numerator": expected,
        "rank4_specialization": 8 * tail**2 + tail + 20,
        "rank5plus_middle_coefficient_lower_bound": lower,
    }
    for field, expression in comparisons.items():
        parsed = sp.sympify(
            reported[field], locals={"d": d, "r": rank, "t": tail}
        )
        assert sp.cancel(parsed - expression) == 0, field
    assert reported["q2_cross_discriminant"] == str(discriminant)

    # Exhaustively replay the closed formulas on a large finite rectangle;
    # the preceding coefficient proof, not this loop, supplies all-rank scope.
    formula_checks = 0
    for arms in range(2, 201):
        independent, slides = exact_rows(arms)
        q3_cross_numerator = slides[3]
        q3_cross_denominator = 3 * independent[3]
        for current_rank in range(3, arms + 2):
            margin = (
                q3_cross_numerator * current_rank * independent[current_rank]
                - q3_cross_denominator * slides[current_rank]
            )
            assert margin >= 0
            formula_checks += 1

    return {
        "independent_generating_function_derivation": {
            "A": "(1+2*x)^d+x*(1+x)^d",
            "B": "d*x^2*((1+2*x)^(d-1)+(1+x)^(d-1))",
            "reason": (
                "Condition on the centre for A; for B split the unique edge "
                "between centre-arm and arm-leaf types."
            ),
        },
        "q2": str(q2),
        "q3": str(q3),
        "q2_q3_cross": str(q2_q3_cross),
        "q2_q3_cross_discriminant": int(discriminant),
        "q3_qr_cross": str(sp.collect(expected, tail)),
        "rank3_equality": True,
        "rank4_strict_positive_polynomial": str(8 * tail**2 + tail + 20),
        "rank5plus_all_three_coefficients_strictly_positive": True,
        "closed_formula_checks_d2_through_d200": formula_checks,
    }


def literal_counts(arms: int) -> tuple[list[int], list[int], int]:
    order = 2 * arms + 1
    edge_masks = []
    for index in range(arms):
        middle = 1 + index
        leaf = 1 + arms + index
        edge_masks.extend(((1 << 0) | (1 << middle), (1 << middle) | (1 << leaf)))

    independent = [0] * (arms + 2)
    one_edge = [0] * (arms + 3)
    checks = 0
    for size in range(arms + 2):
        for vertices in itertools.combinations(range(order), size):
            mask = sum(1 << vertex for vertex in vertices)
            induced = sum((mask & edge) == edge for edge in edge_masks)
            independent[size] += induced == 0
            if induced == 1:
                one_edge[size] += 1
            checks += 1
    slides = [
        one_edge[rank + 1] if rank + 1 < len(one_edge) else 0
        for rank in range(arms + 2)
    ]
    return independent, slides, checks


def literal_audit() -> dict[str, object]:
    trees = rank_checks = subset_checks = 0
    for arms in range(2, 11):
        literal_i, literal_s, checks = literal_counts(arms)
        formula_i, formula_s = exact_rows(arms)
        assert literal_i == formula_i
        # The theorem starts at token rank two; B_2 is the unused rank-one row.
        assert literal_s[2:] == formula_s[2:]
        q3_num, q3_den = literal_s[3], 3 * literal_i[3]
        for rank in range(3, arms + 2):
            assert q3_num * rank * literal_i[rank] >= q3_den * literal_s[rank]
            rank_checks += 1
        subset_checks += checks
        trees += 1

    # Explicitly revisit the first adjacent-ratio obstruction, d=18.
    independent, slides = exact_rows(18)
    obstruction = []
    for rank in (15, 16):
        adjacent_cross = (
            slides[rank] * (rank + 1) * independent[rank + 1]
            - slides[rank + 1] * rank * independent[rank]
        )
        obstruction.append(
            {
                "lower_rank": rank,
                "upper_rank": rank + 1,
                "adjacent_ratio_cross": adjacent_cross,
            }
        )
        assert adjacent_cross < 0
    q3_num, q3_den = slides[3], 3 * independent[3]
    envelope = []
    for rank in (15, 16, 17):
        margin = q3_num * rank * independent[rank] - q3_den * slides[rank]
        assert margin > 0
        envelope.append({"rank": rank, "q3_envelope_cross": margin})

    return {
        "literal_arm_counts": [2, 10],
        "literal_trees": trees,
        "literal_rank_checks": rank_checks,
        "literal_subset_checks": subset_checks,
        "d18_adjacent_failures_replayed": obstruction,
        "d18_q3_envelope_margins": envelope,
        "d18_q2": str(Fraction(slides[2], 2 * independent[2])),
        "d18_q3": str(Fraction(slides[3], 3 * independent[3])),
    }


def main() -> None:
    observed = {path.name: sha256(path) for path in (PRODUCER, PRIMARY, NOTE)}
    assert observed == PINNED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_ALL_RANK_UNIFORM_SUBDIVIDED_STAR_Q3_ENVELOPE_THEOREM"
    )
    assert primary["source_sha256"] == PINNED[PRODUCER.name]
    assert primary["generating_functions"] == {
        "A_zero_edge": "(1+2x)^d+x(1+x)^d",
        "B_one_edge": "d*x^2*((1+2x)^(d-1)+(1+x)^(d-1))",
    }
    note = NOTE.read_text(encoding="utf-8")
    assert "adjacent-rank monotonicity fails first" in note
    assert "does not prove" in note and "arbitrary trees" in note

    symbolic = symbolic_audit(primary)
    literal = literal_audit()
    payload = {
        "schema": "uniform-subdivided-star-q3-envelope-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_RANK_UNIFORM_SUBDIVIDED_STAR_Q3_ENVELOPE_AUDIT",
        "pinned_hashes": observed,
        "independence": "The producer was neither imported nor executed.",
        "theorem_verified": (
            "For S_d obtained by uniformly subdividing K_(1,d), d>=2, every "
            "supported q_r is at most q3, and q3<=q2."
        ),
        "symbolic_audit": symbolic,
        "literal_audit": literal,
        "scope_warning": (
            "This audits only the all-rank uniform subdivided-star family. It "
            "does not prove the q3 envelope for nonuniform depth-two stars at "
            "r>=6, arbitrary trees, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("literal", literal)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
