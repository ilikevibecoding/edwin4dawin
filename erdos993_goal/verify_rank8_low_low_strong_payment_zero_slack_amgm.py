#!/usr/bin/env python3
"""Exact AM-GM certificates for zero-slack low/low strong-payment coefficients.

The three Bernstein coefficients are certified separately.  Positive sources
may be reused between different coefficients, but never within one coefficient.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json"
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


def build_coefficients() -> dict[str, sp.Expr]:
    h, t, ta, tb = sp.symbols("h t ta tb", nonnegative=True)
    left_ratios, left = factor(ta, [2 * h] + [h] * 7)
    _, right = factor(tb, [2 * h, h - t, h + t] + [h] * 5)
    tail = [sp.Integer(0)] * 3 + left[3:]
    c = {rank: convolution(left, right, rank) for rank in (7, 8, 9)}
    v = {rank: convolution(tail, right, rank) for rank in (7, 8, 9)}
    margin = sp.expand(c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8])
    derivative = sp.expand(
        2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
        - h * (v[7] * c[8] + c[7] * v[8])
    )
    strong = sp.expand(left_ratios[2] * margin + h * derivative)
    poly = sp.Poly(strong, t)
    assert poly.degree() == 2
    p0, p1 = (sp.expand(poly.coeff_monomial(t**degree)) for degree in (0, 1))
    return {
        "base": p0,
        "middle_times_2": sp.expand(2 * p0 + h * p1),
        "far": sp.expand(strong.subs(t, h)),
    }


def candidate_rows(
    positive: dict[tuple[int, ...], int],
    negative: dict[tuple[int, ...], int],
) -> dict[tuple[int, ...], list[tuple[tuple[int, ...], tuple[int, ...], int]]]:
    rows = {}
    for target, demand in negative.items():
        options = []
        for low in positive:
            high = tuple(2 * target[i] - low[i] for i in range(len(NAMES)))
            if min(high) < 0 or low >= high or high not in positive:
                continue
            four_product = 4 * positive[low] * positive[high]
            if four_product >= demand * demand:
                options.append((low, high, four_product - demand * demand))
        rows[target] = sorted(options, key=lambda row: (row[2], row[0], row[1]))
    return rows


def disjoint_matching(candidate_map):
    """Exact deterministic backtracking, smallest remaining domain first."""
    targets = tuple(candidate_map)

    def search(remaining, used, selected):
        if not remaining:
            return dict(selected)
        available = {
            target: [row for row in candidate_map[target]
                     if row[0] not in used and row[1] not in used]
            for target in remaining
        }
        target = min(remaining, key=lambda item: (len(available[item]), item))
        if not available[target]:
            return None
        next_remaining = tuple(item for item in remaining if item != target)
        for row in available[target]:
            selected[target] = row
            result = search(next_remaining, used | {row[0], row[1]}, selected)
            if result is not None:
                return result
            del selected[target]
        return None

    result = search(targets, set(), {})
    assert result is not None
    return result


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual_inputs == EXPECTED
    variables = sp.symbols("h ta tb", nonnegative=True)
    expressions = build_coefficients()
    expected_counts = {
        "base": (148, 6),
        "middle_times_2": (148, 6),
        "far": (147, 10),
    }

    rows_out = []
    for label, expression in expressions.items():
        terms = {
            tuple(map(int, monomial)): int(coefficient)
            for monomial, coefficient in sp.Poly(expression, *variables).terms()
        }
        positive = {key: value for key, value in terms.items() if value > 0}
        negative = {key: -value for key, value in terms.items() if value < 0}
        assert (len(terms), len(negative)) == expected_counts[label]
        candidates = candidate_rows(positive, negative)
        assert all(candidates.values())
        selected = disjoint_matching(candidates)

        used = set()
        allocations = []
        for target in sorted(negative):
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
        assert len(used) == 2 * len(negative)
        rows_out.append({
            "bernstein_coefficient": label,
            "terms": len(terms),
            "positive_terms": len(positive),
            "negative_terms": len(negative),
            "candidate_count_minimum": min(map(len, candidates.values())),
            "candidate_count_maximum": max(map(len, candidates.values())),
            "disjoint_positive_sources": len(used),
            "allocations": allocations,
        })

    payload = {
        "schema": "rank8-low-low-strong-payment-zero-slack-amgm-v1",
        "status": "PASS_EXACT_ZERO_SLACK_STRONG_PAYMENT_ALL_BERNSTEIN_AMGM",
        "theorem": (
            "All three Bernstein coefficients of C*M(0,y)+h*d_x(y) are "
            "nonnegative on the terminal zero-slack face."
        ),
        "variables": list(NAMES),
        "middle_clearing_factor": 2,
        "rows": rows_out,
        "proof_rule": (
            "Within each coefficient, disjoint midpoint source pairs obey "
            "4*A*B>=d^2 and therefore pay every negative monomial by AM-GM."
        ),
        "immutable_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves the strong-payment auxiliary only on the zero-slack "
            "terminal face.  It does not prove its slack lift, the full "
            "low/low cone, Q8, or Problem 993."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    for row in rows_out:
        print(row["bernstein_coefficient"], "TERMS", row["terms"],
              "NEGATIVE", row["negative_terms"],
              "SOURCES", row["disjoint_positive_sources"],
              "CANDIDATES", row["candidate_count_minimum"],
              row["candidate_count_maximum"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
