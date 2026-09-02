#!/usr/bin/env python3
"""Independent exact audit of the all-rank left first-gap-slack theorem.

No producer code is imported.  The audit re-derives the EGF triples, the
quadratic slack coefficients, both four-product payments, all sparse shifted
coefficient dictionaries, and separate direct ratio-row evaluations.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
PRODUCER_SOURCE = (
    "prove_uniform_low_high_left_gap0_slack_root.py",
    "66096D1C7BFEC978D9BD2F77117C6B57C0DDBEDB459FF845D9FFCE738BCECA6A",
)
PRODUCER_REPORT = (
    "uniform_low_high_left_gap0_slack_exact_root_20260827.json",
    "B176B7C457214574448A2D9E2DD724F906CAC7A70FE0A4F154B66093687FD601",
)
OUTPUT = HERE / "uniform_low_high_left_gap0_slack_independent_audit_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def quadratic(row):
    return sp.expand(row[1] ** 2 - row[0] * row[2] - row[0] * row[1])


def bilinear(first, second):
    return sp.expand(
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def positive_rows(expression, variables):
    rows = []
    for monomial, coefficient in sp.Poly(sp.expand(expression), *variables).terms():
        assert coefficient.is_Integer and coefficient > 0
        rows.append({"monomial": list(monomial), "coefficient": int(coefficient)})
    assert rows
    return rows


def rational_rows(expression, expected_denominator, rank_symbol, shift_symbol, variables):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    assert sp.expand(denominator - expected_denominator) == 0
    return {
        "positive_denominator": str(sp.factor(expected_denominator)),
        "shift_k_equals_t_plus_8_sparse_coefficients": positive_rows(
            numerator.subs(rank_symbol, shift_symbol + 8), variables
        ),
    }


def direct_coefficients(rank: int, terminal: int, slack: int = 0):
    ratios = [terminal + rank + 1 + slack]
    ratios.extend(terminal + rank - index for index in range(1, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def conv(first, second, degree: int):
    return sum(
        math.comb(degree, index) * first[index] * second[degree - index]
        for index in range(degree + 1)
    )


def direct_value(rank: int, left_terminal: int, right_terminal: int, slack: int):
    left_ratios, left = direct_coefficients(rank, left_terminal, slack)
    _, right = direct_coefficients(rank, right_terminal)
    truncated_left = [0, 0, 0, *left[3:]]
    whole = [conv(left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    tail = [conv(truncated_left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    return int(left_ratios[2] * quadratic(whole) + bilinear(whole, tail))


def main() -> int:
    source_path = HERE / PRODUCER_SOURCE[0]
    report_path = HERE / PRODUCER_REPORT[0]
    assert sha256(source_path) == PRODUCER_SOURCE[1]
    assert sha256(report_path) == PRODUCER_REPORT[1]
    producer = json.loads(report_path.read_text(encoding="utf-8"))
    assert producer["status"] == "PASS_EXACT_ALL_RANK_LEFT_GAP0_SLACK_STRONG_BOUNDARY"
    assert producer["source_sha256"] == PRODUCER_SOURCE[1]

    r, a, b = sp.symbols("r a b", real=True)
    z = sp.Symbol("z", nonnegative=True)
    U, V, W = sp.symbols("U V W", positive=True)
    left_parameter, right_parameter = a + r, b + r
    total_weight = (left_parameter + 1) * (right_parameter + 1) * U
    left_weight = (left_parameter + 1) * V
    right_weight = (right_parameter + 1) * W
    total_ratio = left_parameter + right_parameter - r + 1
    whole = (
        (total_weight - left_weight - right_weight) / (left_parameter * right_parameter),
        (
            total_weight * total_ratio
            - left_weight * (a + 1) - right_weight * (b + 1)
        ) / (left_parameter * right_parameter),
        (
            total_weight * total_ratio * (total_ratio - 1)
            - left_weight * a * (a + 1)
            - right_weight * b * (b + 1)
        ) / (left_parameter * right_parameter),
    )
    right_previous = (right_parameter + 1) * W / right_parameter
    right_only = (
        right_previous,
        right_previous * (b + 1),
        right_previous * b * (b + 1),
    )
    removed_head = (
        right_previous * (
            1 + (r - 1) * (left_parameter + 1) / (b + 2)
            + ((r - 1) * (r - 2) / 2) * (left_parameter ** 2 - 1)
            / ((b + 2) * (b + 3))
        ),
        right_previous * (
            b + 1 + r * (left_parameter + 1)
            + (r * (r - 1) / 2) * (left_parameter ** 2 - 1) / (b + 2)
        ),
        right_previous * (
            b * (b + 1) + (r + 1) * (left_parameter + 1) * (b + 1)
            + (r * (r + 1) / 2) * (left_parameter ** 2 - 1)
        ),
    )
    surviving_tail = tuple(sp.cancel(whole[index] - removed_head[index]) for index in range(3))
    positive_degree_direction = tuple(
        sp.cancel(whole[index] - right_only[index]) for index in range(3)
    )
    linear = (
        (left_parameter - 2) * bilinear(whole, positive_degree_direction)
        + bilinear(whole, surviving_tail)
        + bilinear(positive_degree_direction, surviving_tail)
    )
    square = (
        (left_parameter - 2) * quadratic(positive_degree_direction)
        + bilinear(positive_degree_direction, surviving_tail)
    )

    ratio_lower = (
        1 + (r - 1) * left_parameter / right_parameter
        + ((r - 1) * (r - 2) / 2) * (left_parameter / right_parameter) ** 2
        + ((r - 1) * (r - 2) * (r - 3) / 6)
        * (left_parameter / right_parameter) ** 3
    )
    expected_denominators = {
        1: {
            "alpha": 1,
            "beta": (b + 2) * (b + 3),
            "payment_one": 3 * right_parameter * (b + 2) * (b + 3),
            "payment_two": (b + 2) * (b + 3),
        },
        2: {
            "alpha": 1,
            "beta": 2 * (b + 2) * (b + 3),
            "payment_one": 6 * right_parameter * (b + 2) * (b + 3),
            "payment_two": 2 * (b + 2) * (b + 3),
        },
    }
    replayed = []
    for degree, coefficient in ((1, linear), (2, square)):
        product = sp.Poly(
            sp.cancel(coefficient * (left_parameter * right_parameter) ** 2),
            U, V, W,
        )
        assert {monomial for monomial, _ in product.terms()} == {
            (1, 1, 0), (1, 0, 1), (0, 1, 1), (0, 0, 2)
        }
        alpha = sp.cancel(product.coeff_monomial(U * V))
        beta = sp.cancel(product.coeff_monomial(U * W))
        gamma = sp.cancel(-product.coeff_monomial(V * W))
        delta = sp.cancel(-product.coeff_monomial(W ** 2))
        denominators = expected_denominators[degree]
        independent = {
            "q_degree": degree,
            "alpha_positive": rational_rows(
                alpha, denominators["alpha"], r, z, (z, a, b)
            ),
            "beta_positive": rational_rows(
                beta, denominators["beta"], r, z, (z, a, b)
            ),
            "payment_one": {
                "bound": producer["positive_coefficient_certificates"][degree - 1]["payment_one"]["bound"],
                **rational_rows(
                    sp.cancel(alpha * ratio_lower - gamma),
                    denominators["payment_one"], r, z, (z, a, b),
                ),
            },
            "payment_two": {
                "bound": "T/R >= 1",
                **rational_rows(
                    sp.cancel(beta - delta),
                    denominators["payment_two"], r, z, (z, a, b),
                ),
            },
        }
        expected = producer["positive_coefficient_certificates"][degree - 1]
        row_key = "shift_k_equals_t_plus_8_sparse_coefficients"
        assert independent["alpha_positive"][row_key] == expected["alpha_positive"][row_key]
        assert independent["beta_positive"][row_key] == expected["beta_positive"][row_key]
        assert independent["payment_one"][row_key] == expected["payment_one"][row_key]
        assert independent["payment_two"][row_key] == expected["payment_two"][row_key]
        replayed.append({
            "q_degree": degree,
            "alpha_terms": len(independent["alpha_positive"]["shift_k_equals_t_plus_8_sparse_coefficients"]),
            "beta_terms": len(independent["beta_positive"]["shift_k_equals_t_plus_8_sparse_coefficients"]),
            "payment_one_terms": len(independent["payment_one"]["shift_k_equals_t_plus_8_sparse_coefficients"]),
            "payment_two_terms": len(independent["payment_two"]["shift_k_equals_t_plus_8_sparse_coefficients"]),
        })

    direct_checks = []
    for rank, left_terminal, right_terminal, slack in (
        (8, 0, 17, 2),
        (10, 4, 0, 99),
        (12, 31, 7, 1),
        (17, 2, 53, 41),
        (23, 19, 3, 8),
    ):
        value = direct_value(rank, left_terminal, right_terminal, slack)
        assert value > 0
        direct_checks.append({
            "rank": rank,
            "x": left_terminal,
            "y": right_terminal,
            "first_gap_slack": slack,
            "strong_auxiliary": value,
        })

    payload = {
        "schema": "uniform-low-high-left-gap0-slack-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_RANK_LEFT_GAP0_SLACK_AUDIT",
        "producer_source_sha256": PRODUCER_SOURCE[1],
        "producer_report_sha256": PRODUCER_REPORT[1],
        "replayed_sparse_certificates": replayed,
        "independent_direct_checks": direct_checks,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "The audit certifies only arbitrary left first-gap slack over the "
            "translated zero-slack face, not the other gap coordinates."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
