#!/usr/bin/env python3
"""Exact shared-capacity midpoint AM-GM search on the two mixed faces.

For an integer variable y assigned to a midpoint pair (L,H) with L+H=2T,
use a common rational fraction of the two full positive source capacities.
The exact lower payment is the fraction times floor(2*sqrt(A*B)).  The
resulting fixed-denominator feasibility problem is an integer linear program.
The solver proposes allocations; every inequality is replayed with Python
integers before a certificate is written.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import coo_array

from diagnose_rank8_low_low_a23_mixed_faces_zero_slack_exact_root import build


ROOT = Path(__file__).resolve().parent
DIAGNOSTIC = ROOT / "diagnose_rank8_low_low_a23_mixed_faces_zero_slack_exact_root.py"
REPORT = ROOT / "rank8_low_low_a23_mixed_zero_slack_shared_capacity_agent_20260822.json"
EXPECTED_DIAGNOSTIC = "1B53E43CC365C47EB4715C61A1958E48AB11D718350AFFE4CA135E5B7B37812B"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def solve_row(polynomial):
    terms = {
        tuple(map(int, monomial)): int(coefficient)
        for monomial, coefficient in polynomial.terms()
    }
    positive = {key: value for key, value in terms.items() if value > 0}
    negative = {key: -value for key, value in terms.items() if value < 0}
    if not negative:
        return {
            "terms": len(terms),
            "negative_terms": 0,
            "status": "COEFFICIENTWISE_NONNEGATIVE",
            "allocations": [],
        }
    edges = []
    candidates_per_target = {target: 0 for target in negative}
    for target in negative:
        for low in positive:
            high = tuple(2 * target[i] - low[i] for i in range(len(target)))
            if min(high) < 0 or low >= high or high not in positive:
                continue
            guaranteed_payment = min(
                math.isqrt(4 * positive[low] * positive[high]),
                negative[target],
            )
            assert guaranteed_payment > 0
            edges.append((target, low, high, guaranteed_payment))
            candidates_per_target[target] += 1
    assert edges and min(candidates_per_target.values()) > 0

    targets = sorted(negative)
    sources = sorted({
        source for _, low, high, _ in edges for source in (low, high)
    })
    target_index = {key: index for index, key in enumerate(targets)}
    source_index = {
        key: len(targets) + index for index, key in enumerate(sources)
    }
    matrix_rows = []
    matrix_columns = []
    matrix_values = []
    for column, (target, low, high, guaranteed_payment) in enumerate(edges):
        for row, value in (
            (target_index[target], guaranteed_payment),
            (source_index[low], 1),
            (source_index[high], 1),
        ):
            matrix_rows.append(row)
            matrix_columns.append(column)
            matrix_values.append(float(value))
    matrix = coo_array(
        (matrix_values, (matrix_rows, matrix_columns)),
        shape=(len(targets) + len(sources), len(edges)),
    ).tocsc()
    result = None
    denominator = None
    total_demand = sum(negative.values())
    for trial_denominator in (256, 1024, 4096):
        lower = np.array(
            [float(trial_denominator * negative[target]) for target in targets]
            + [-np.inf] * len(sources),
        )
        upper = np.array(
            [np.inf] * len(targets)
            + [float(trial_denominator)] * len(sources),
        )
        trial = milp(
            c=np.ones(len(edges)),
            integrality=np.ones(len(edges)),
            bounds=Bounds(
                np.zeros(len(edges)),
                np.full(len(edges), float(trial_denominator)),
            ),
            constraints=LinearConstraint(matrix, lower, upper),
            options={"time_limit": 300, "mip_rel_gap": 0.0},
        )
        if trial.success:
            result = trial
            denominator = trial_denominator
            break
    assert result is not None, trial.message
    proposed = [int(round(value)) for value in result.x]
    assert max(abs(float(integer) - value) for integer, value in zip(proposed, result.x)) < 1e-5

    target_paid_numerator = {target: 0 for target in targets}
    source_fraction_numerator = {source: 0 for source in sources}
    allocations = []
    for amount, (target, low, high, guaranteed_payment) in zip(proposed, edges):
        if not amount:
            continue
        target_paid_numerator[target] += guaranteed_payment * amount
        source_fraction_numerator[low] += amount
        source_fraction_numerator[high] += amount
        allocations.append({
            "target": list(target),
            "guaranteed_full_fraction_payment": guaranteed_payment,
            "source_fraction": [amount, denominator],
            "demand_contribution": [guaranteed_payment * amount, denominator],
            "source_low": list(low),
            "source_high": list(high),
            "source_low_capacity": positive[low],
            "source_high_capacity": positive[high],
        })
    assert all(
        target_paid_numerator[target] >= denominator * negative[target]
        for target in targets
    )
    assert all(
        source_fraction_numerator[source] <= denominator for source in sources
    )
    assert all(
        tuple(low + high for low, high in zip(row["source_low"], row["source_high"]))
        == tuple(2 * value for value in row["target"])
        for row in allocations
    )
    return {
        "terms": len(terms),
        "negative_terms": len(negative),
        "status": "PASS_EXACT_SHARED_CAPACITY_MIDPOINT_AMGM",
        "candidate_edges": len(edges),
        "candidate_minimum": min(candidates_per_target.values()),
        "candidate_maximum": max(candidates_per_target.values()),
        "positive_sources_used": sum(
            value > 0 for value in source_fraction_numerator.values()
        ),
        "allocations_used": len(allocations),
        "fraction_denominator": denominator,
        "total_demand": total_demand,
        "total_paid": [sum(target_paid_numerator.values()), denominator],
        "maximum_source_fraction": [
            max(source_fraction_numerator.values()), denominator,
        ],
        "allocations": allocations,
        "target_audit": [
            {
                "monomial": list(target),
                "demand": negative[target],
                "paid": [target_paid_numerator[target], denominator],
            }
            for target in targets
        ],
        "source_audit": [
            {
                "monomial": list(source),
                "capacity": positive[source],
                "fraction_used": [source_fraction_numerator[source], denominator],
            }
            for source in sources if source_fraction_numerator[source]
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
                row.get("allocations_used", 0),
                flush=True,
            )
        faces[",".join(map(str, face))] = rows
    assert all(
        row["status"] in (
            "COEFFICIENTWISE_NONNEGATIVE",
            "PASS_EXACT_SHARED_CAPACITY_MIDPOINT_AMGM",
        )
        for rows in faces.values() for row in rows.values()
    )
    payload = {
        "schema": "rank8-low-low-a23-mixed-zero-slack-shared-capacity-agent-v1",
        "status": "PASS_EXACT_MIXED_ZERO_SLACK_SHARED_CAPACITY_AMGM",
        "faces": faces,
        "identity": (
            "For each allocation y at L+H=2T: "
            "(y/2)x^L+(y/2)x^H >= y x^T."
        ),
        "immutable_inputs": {DIAGNOSTIC.name: EXPECTED_DIAGNOSTIC},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is an exact certificate only after setting the ten ordinary "
            "gap slacks to zero. Lifting the mixed faces to arbitrary slacks "
            "remains required."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
