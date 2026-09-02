#!/usr/bin/env python3
"""Exact AM-GM certificate for the zero-slack far tail-curvature target.

This proves only the far Bernstein coefficient of q_x(y) on the terminal
zero-slack face.  The full low/low cone still requires the other auxiliaries
and the lift away from this face.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json"
NAMES = ("h", "ta", "tb")
EXPECTED = {
    "probe_rank8_low_low_auxiliaries_zero_slack.py":
        "7DAACEC508476911BFFD474FEDCD53A3A7A69CBAA46BC98851565AA0937DDA59",
    "rank8_low_low_auxiliaries_zero_slack_exact_20260820.json":
        "1B65DE54AA8F236B3E7731E09844D19EC75D58C6B8AD2EF3DEF0BC64DA738A23",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def factor(terminal: sp.Expr, gaps: list[sp.Expr]) -> tuple[list[sp.Expr], list[sp.Expr]]:
    ratios = [sp.Integer(0)] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = sp.expand(ratios[index + 1] + gaps[index])
    coefficients = [sp.Integer(1)]
    for ratio in ratios:
        coefficients.append(sp.expand(coefficients[-1] * ratio))
    return ratios, coefficients


def convolution(left: list[sp.Expr], right: list[sp.Expr], rank: int) -> sp.Expr:
    return sp.expand(sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    ))


def build_terms() -> dict[tuple[int, ...], int]:
    h, t, ta, tb = sp.symbols("h t ta tb", nonnegative=True)
    _, left = factor(ta, [2 * h] + [h] * 7)
    _, right = factor(tb, [2 * h, h - t, h + t] + [h] * 5)
    tail = [sp.Integer(0)] * 3 + left[3:]
    v7, v8, v9 = (convolution(tail, right, rank) for rank in (7, 8, 9))
    curvature = sp.expand(v8**2 - v7 * v9 - h * v7 * v8)
    far = sp.Poly(sp.expand(curvature.subs(t, h)), h, ta, tb)
    return {
        tuple(map(int, monomial)): int(coefficient)
        for monomial, coefficient in far.terms()
    }


def candidates(
    positive: dict[tuple[int, ...], int],
    target: tuple[int, ...],
    demand: int,
) -> list[tuple[tuple[int, ...], tuple[int, ...], int]]:
    rows = []
    for low in positive:
        high = tuple(2 * target[i] - low[i] for i in range(len(NAMES)))
        if min(high) < 0 or low >= high or high not in positive:
            continue
        four_product = 4 * positive[low] * positive[high]
        if four_product >= demand * demand:
            rows.append((low, high, four_product - demand * demand))
    return sorted(rows, key=lambda row: (row[2], row[0], row[1]))


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual_inputs == EXPECTED

    terms = build_terms()
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    expected_negative = {(2, 12, 2): 217, (1, 12, 3): 7}
    assert len(terms) == 125
    assert negative == expected_negative

    candidate_rows = {
        target: candidates(positive, target, demand)
        for target, demand in negative.items()
    }
    assert all(candidate_rows.values())

    # Only two targets occur, so exhaustively choose the lexicographically
    # first exact pair of source pairs with no reused positive monomial.
    targets = tuple(sorted(negative))
    selected = None
    for first in candidate_rows[targets[0]]:
        for second in candidate_rows[targets[1]]:
            sources = first[:2] + second[:2]
            if len(set(sources)) == 4:
                selected = {targets[0]: first, targets[1]: second}
                break
        if selected is not None:
            break
    assert selected is not None

    used: set[tuple[int, ...]] = set()
    allocations = []
    for target in targets:
        low, high, slack = selected[target]
        assert low not in used and high not in used and low != high
        used.update((low, high))
        assert tuple(low[i] + high[i] for i in range(len(NAMES))) == tuple(
            2 * target[i] for i in range(len(NAMES))
        )
        four_product = 4 * positive[low] * positive[high]
        demand_squared = negative[target] ** 2
        assert four_product - demand_squared == slack >= 0
        allocations.append({
            "negative_monomial": list(target),
            "demand": negative[target],
            "source_low": {"monomial": list(low), "capacity": positive[low]},
            "source_high": {"monomial": list(high), "capacity": positive[high]},
            "four_product": four_product,
            "demand_squared": demand_squared,
            "slack": slack,
        })

    payload = {
        "schema": "rank8-low-low-tail-curvature-far-zero-slack-amgm-v1",
        "status": "PASS_EXACT_ZERO_SLACK_TAIL_CURVATURE_FAR_AMGM",
        "theorem": (
            "The far Bernstein coefficient q_x(h/D) is nonnegative on the "
            "terminal zero-slack face, equivalently at t=h in the exact "
            "zero-slack parameterization used by the reduction."
        ),
        "variables": list(NAMES),
        "terms": len(terms),
        "positive_terms": len(positive),
        "negative_terms": len(negative),
        "candidate_counts": {
            ",".join(map(str, target)): len(candidate_rows[target])
            for target in targets
        },
        "disjoint_positive_sources": len(used),
        "allocations": allocations,
        "proof_rule": (
            "For source exponents u+v=2w, A*m_u+B*m_v is at least "
            "2*sqrt(A*B)*m_w on nonnegative variables; 4*A*B>=d^2 "
            "therefore pays -d*m_w.  The four sources are disjoint."
        ),
        "immutable_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves one far coefficient only on the zero-slack face. "
            "It does not prove the other low/low auxiliaries, their slack "
            "lifts, the full low/low cone, Q8, or Problem 993."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TERMS", len(terms), "NEGATIVE", len(negative), "SOURCES", len(used))
    print("CANDIDATES", payload["candidate_counts"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
