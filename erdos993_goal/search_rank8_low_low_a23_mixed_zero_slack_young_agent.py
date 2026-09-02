#!/usr/bin/env python3
"""Shared-source Young/AM-GM LP for the two zero-slack mixed faces.

For L+H=2T and rational r>0,

  (p*r/2) x^L + (p/(2*r)) x^H >= p x^T.

Choosing p across many midpoint pairs and rational ratios is a linear program.
The floating solver is discovery only: positive p values are rounded upward to
a rational grid and every demand/source inequality is then checked exactly with
fractions before any certificate is emitted.
"""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import numpy as np
from scipy.optimize import linprog
from scipy.sparse import coo_array

from diagnose_rank8_low_low_a23_mixed_faces_zero_slack_exact_root import build


ROOT = Path(__file__).resolve().parent
DIAGNOSTIC = ROOT / "diagnose_rank8_low_low_a23_mixed_faces_zero_slack_exact_root.py"
REPORT = ROOT / "rank8_low_low_a23_mixed_zero_slack_young_agent_20260822.json"
EXPECTED_DIAGNOSTIC = "1B53E43CC365C47EB4715C61A1958E48AB11D718350AFFE4CA135E5B7B37812B"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ratio_menu(low_capacity, high_capacity):
    ratios = {
        Fraction(2**power, 1) if power >= 0 else Fraction(1, 2 ** (-power))
        for power in range(-6, 7)
    }
    optimum = Fraction.from_float(
        math.sqrt(low_capacity / high_capacity)
    ).limit_denominator(10**6)
    if not optimum:
        optimum = Fraction(1, 10**6)
    for power in range(-3, 4):
        multiplier = (
            Fraction(2**power, 1)
            if power >= 0 else Fraction(1, 2 ** (-power))
        )
        ratios.add(optimum * multiplier)
    return sorted(ratio for ratio in ratios if ratio > 0)


def solve_row(polynomial):
    terms = {
        tuple(map(int, monomial)): int(coefficient)
        for monomial, coefficient in polynomial.terms()
    }
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    if not negative:
        return {
            "terms": len(terms), "negative_terms": 0,
            "status": "COEFFICIENTWISE_NONNEGATIVE", "allocations": [],
        }
    candidates = []
    per_target = {target: 0 for target in negative}
    for target in negative:
        for low in positive:
            high = tuple(2 * target[i] - low[i] for i in range(len(target)))
            if min(high) < 0 or low >= high or high not in positive:
                continue
            for ratio in ratio_menu(positive[low], positive[high]):
                candidates.append((target, low, high, ratio))
            per_target[target] += 1
    assert candidates and min(per_target.values()) > 0
    targets = sorted(negative)
    sources = sorted({
        source for _, low, high, _ in candidates for source in (low, high)
    })
    target_row = {target: index for index, target in enumerate(targets)}
    source_row = {
        source: len(targets) + index for index, source in enumerate(sources)
    }
    row_indices = []
    column_indices = []
    values = []
    for column, (target, low, high, ratio) in enumerate(candidates):
        entries = (
            (target_row[target], -1.0 / negative[target]),
            (source_row[low], float(ratio / (2 * positive[low]))),
            (source_row[high], float(1 / (2 * ratio * positive[high]))),
        )
        for row, value in entries:
            row_indices.append(row)
            column_indices.append(column)
            values.append(value)
    matrix = coo_array(
        (values, (row_indices, column_indices)),
        shape=(len(targets) + len(sources), len(candidates)),
    ).tocsc()
    solution = None
    safety_used = None
    for safety in (1e-4, 1e-5, 1e-6, 0.0):
        bounds = np.array(
            [-(1 + safety)] * len(targets)
            + [(1 - safety)] * len(sources),
        )
        trial = linprog(
            np.ones(len(candidates)),
            A_ub=matrix,
            b_ub=bounds,
            bounds=(0, None),
            method="highs",
            options={"time_limit": 300},
        )
        if trial.success:
            solution, safety_used = trial, safety
            break
    assert solution is not None, trial.message

    exact = None
    denominator_used = None
    for denominator in (10**6, 10**8, 10**10):
        trial_allocations = []
        for value, candidate in zip(solution.x, candidates):
            if value <= 1e-10:
                continue
            numerator = math.ceil(value * denominator - 1e-12)
            if numerator:
                trial_allocations.append((Fraction(numerator, denominator), candidate))
        target_paid = {target: Fraction(0) for target in targets}
        source_used = {source: Fraction(0) for source in sources}
        for payment, (target, low, high, ratio) in trial_allocations:
            target_paid[target] += payment
            source_used[low] += payment * ratio / 2
            source_used[high] += payment / (2 * ratio)
        if (
            all(target_paid[target] >= negative[target] for target in targets)
            and all(source_used[source] <= positive[source] for source in sources)
        ):
            exact = (trial_allocations, target_paid, source_used)
            denominator_used = denominator
            break
    assert exact is not None, "floating LP feasible but rational rounding did not seal"
    allocations, target_paid, source_used = exact
    encoded = [
        {
            "target": list(target),
            "payment": [payment.numerator, payment.denominator],
            "source_low": list(low),
            "source_high": list(high),
            "ratio_r": [ratio.numerator, ratio.denominator],
            "low_cost": [
                (payment * ratio / 2).numerator,
                (payment * ratio / 2).denominator,
            ],
            "high_cost": [
                (payment / (2 * ratio)).numerator,
                (payment / (2 * ratio)).denominator,
            ],
        }
        for payment, (target, low, high, ratio) in allocations
    ]
    return {
        "terms": len(terms),
        "negative_terms": len(negative),
        "status": "PASS_EXACT_SHARED_SOURCE_YOUNG_AMGM",
        "midpoint_pairs": sum(per_target.values()),
        "ratio_candidates": len(candidates),
        "candidate_pair_minimum": min(per_target.values()),
        "candidate_pair_maximum": max(per_target.values()),
        "floating_safety": safety_used,
        "rational_grid_denominator": denominator_used,
        "allocations_used": len(allocations),
        "allocations": encoded,
        "target_audit": [
            {
                "monomial": list(target), "demand": negative[target],
                "paid": [target_paid[target].numerator, target_paid[target].denominator],
            }
            for target in targets
        ],
        "source_audit": [
            {
                "monomial": list(source), "capacity": positive[source],
                "used": [source_used[source].numerator, source_used[source].denominator],
            }
            for source in sources if source_used[source]
        ],
    }


def main():
    assert sha256(DIAGNOSTIC) == EXPECTED_DIAGNOSTIC
    faces = {}
    for face in ((0, 1), (1, 0)):
        rows = {}
        for label, polynomial in build(face).items():
            row = solve_row(polynomial)
            rows[label] = row
            print(
                "ROW", face, label, row["negative_terms"], row["status"],
                row.get("allocations_used", 0), flush=True,
            )
        faces[",".join(map(str, face))] = rows
    assert all(
        row["status"] in (
            "COEFFICIENTWISE_NONNEGATIVE",
            "PASS_EXACT_SHARED_SOURCE_YOUNG_AMGM",
        )
        for rows in faces.values() for row in rows.values()
    )
    payload = {
        "schema": "rank8-low-low-a23-mixed-zero-slack-young-agent-v1",
        "status": "PASS_EXACT_MIXED_ZERO_SLACK_SHARED_SOURCE_YOUNG_AMGM",
        "identity": (
            "For L+H=2T and rational r>0: "
            "p*r*x^L/2 + p*x^H/(2*r) >= p*x^T."
        ),
        "faces": faces,
        "immutable_inputs": {DIAGNOSTIC.name: EXPECTED_DIAGNOSTIC},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Exact certificate on the ten-slack-zero restriction only; a "
            "factored lift to arbitrary mixed-face slacks remains required."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
