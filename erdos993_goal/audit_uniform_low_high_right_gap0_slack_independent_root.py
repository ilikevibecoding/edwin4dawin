#!/usr/bin/env python3
"""Independent audit of the all-rank right first-gap-slack theorem."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
PRODUCER_SOURCE = (
    "prove_uniform_low_high_right_gap0_slack_root.py",
    "9397CA8F529612EE998D21FEC7156EBCB2FAAB03A25D8FC0D5BF0BDE6731EF1A",
)
PRODUCER_REPORT = (
    "uniform_low_high_right_gap0_slack_exact_root_20260827.json",
    "FA4227FB18F67D672FF4E1545BD9DC35B311D9E19971E748C14188A78C5F4DA8",
)
ZERO_AUDIT = (
    "uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_audit_root_20260826.json",
    "507C9BC153F158A1D956676808FA09EA9C9B3DC3A4ECC2E9D4894A2A243AD8F2",
)
OUTPUT = HERE / "uniform_low_high_right_gap0_slack_independent_audit_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def form(row):
    return sp.expand(row[1] ** 2 - row[0] * row[2] - row[0] * row[1])


def cross(first, second):
    return sp.expand(
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def coefficient_row(rank: int, terminal: int, slack: int = 0):
    ratios = [terminal + rank + 1 + slack]
    ratios.extend(terminal + rank - index for index in range(1, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree: int):
    return sum(
        math.comb(degree, index) * first[index] * second[degree - index]
        for index in range(degree + 1)
    )


def direct(rank: int, x: int, y: int, slack: int) -> int:
    left_ratios, left = coefficient_row(rank, x)
    _, right = coefficient_row(rank, y, slack)
    left_tail = [0, 0, 0, *left[3:]]
    whole = [convolution(left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    tail = [convolution(left_tail, right, degree) for degree in (rank - 1, rank, rank + 1)]
    return int(left_ratios[2] * form(whole) + cross(whole, tail))


def main() -> int:
    assert sha256(HERE / PRODUCER_SOURCE[0]) == PRODUCER_SOURCE[1]
    assert sha256(HERE / PRODUCER_REPORT[0]) == PRODUCER_REPORT[1]
    assert sha256(HERE / ZERO_AUDIT[0]) == ZERO_AUDIT[1]
    producer = json.loads((HERE / PRODUCER_REPORT[0]).read_text(encoding="utf-8"))
    zero_audit = json.loads((HERE / ZERO_AUDIT[0]).read_text(encoding="utf-8"))
    assert producer["status"] == "PASS_EXACT_ALL_RANK_RIGHT_GAP0_SLACK_STRONG_BOUNDARY"
    assert producer["source_sha256"] == PRODUCER_SOURCE[1]
    assert zero_audit["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_TWO_PARAMETER_ZERO_SLACK_STRONG_BOUNDARY_AUDIT"

    r, a, b = sp.symbols("r a b", real=True)
    U, V, W = sp.symbols("U V W", positive=True)
    left_parameter, right_parameter = a + r, b + r
    total_weight = (left_parameter + 1) * (right_parameter + 1) * U
    left_weight = (left_parameter + 1) * V
    right_weight = (right_parameter + 1) * W
    total_ratio = left_parameter + right_parameter - r + 1
    c = (
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
    removed = (
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
    tail = tuple(sp.cancel(c[index] - removed[index]) for index in range(3))
    left_previous = (left_parameter + 1) * V / left_parameter
    left_only = (
        left_previous,
        left_previous * (a + 1),
        left_previous * a * (a + 1),
    )
    whole_direction = tuple(sp.cancel(c[index] - left_only[index]) for index in range(3))
    tail_direction = tuple(sp.cancel(tail[index] - left_only[index]) for index in range(3))
    h0 = (left_parameter - 2) * form(c) + cross(c, tail)
    h1 = (
        (left_parameter - 2) * cross(c, whole_direction)
        + cross(c, tail_direction) + cross(whole_direction, tail)
    )
    h2 = (
        (left_parameter - 2) * form(whole_direction)
        + cross(whole_direction, tail_direction)
    )
    scale = (left_parameter * right_parameter) ** 2
    base = sp.Poly(sp.cancel(h0 * scale), U, V, W)
    expected_monomials = {(1, 1, 0), (1, 0, 1), (0, 1, 1), (0, 0, 2)}
    assert {monomial for monomial, _ in base.terms()} == expected_monomials
    first_payment = (
        base.coeff_monomial(U * V) * U * V
        + base.coeff_monomial(V * W) * V * W
    )
    second_payment = (
        base.coeff_monomial(U * W) * U * W
        + base.coeff_monomial(W ** 2) * W ** 2
    )
    assert sp.cancel(base.as_expr() - first_payment - second_payment) == 0
    independent_linear = sp.Poly(sp.cancel(h1 * scale), U, V, W).as_expr()
    independent_square = sp.Poly(sp.cancel(h2 * scale), U, V, W).as_expr()
    assert sp.cancel(
        independent_linear - ((right_parameter + 2) * first_payment + 2 * second_payment)
    ) == 0
    assert sp.cancel(
        independent_square - ((right_parameter + 1) * first_payment + second_payment)
    ) == 0

    direct_checks = []
    for rank, x_value, y_value, slack in (
        (8, 0, 17, 2),
        (10, 4, 0, 99),
        (12, 31, 7, 1),
        (17, 2, 53, 41),
        (23, 19, 3, 8),
    ):
        value = direct(rank, x_value, y_value, slack)
        assert value > 0
        direct_checks.append({
            "rank": rank,
            "x": x_value,
            "y": y_value,
            "first_gap_slack": slack,
            "strong_auxiliary": value,
        })

    payload = {
        "schema": "uniform-low-high-right-gap0-slack-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_RANK_RIGHT_GAP0_SLACK_AUDIT",
        "producer_source_sha256": PRODUCER_SOURCE[1],
        "producer_report_sha256": PRODUCER_REPORT[1],
        "zero_slack_independent_audit_sha256": ZERO_AUDIT[1],
        "verified_payment_lift": {
            "linear": "H1=(y+r+2)*P1+2*P2 after the common positive scale",
            "quadratic": "H2=(y+r+1)*P1+P2 after the common positive scale",
            "sign": "P1>=0 and P2>0 from the pinned independent zero-slack audit",
        },
        "independent_direct_checks": direct_checks,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This independently certifies only arbitrary right first-gap slack "
            "over the translated zero-slack face."
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
