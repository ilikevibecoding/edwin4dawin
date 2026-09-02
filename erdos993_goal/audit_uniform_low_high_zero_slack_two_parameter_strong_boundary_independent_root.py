#!/usr/bin/env python3
"""Independent audit of the all-rank two-parameter zero-slack theorem.

No producer code is imported.  This audit re-derives the EGF coefficient
triple, verifies the four-product identity, checks the first payment by an
independent coefficient dictionary, checks the second by completing the
quadratic square, and replays fixed exact ratio rows at several ranks.
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
    "prove_uniform_low_high_zero_slack_two_parameter_strong_boundary_root.py",
    "3AF989ED0E4D38215E6702117C659827161E784C8382FA5A614F518438A19415",
)
PRODUCER_REPORT = (
    "uniform_low_high_zero_slack_two_parameter_strong_boundary_exact_root_20260826.json",
    "DC71A44F38291A444927B1B98351B8A30640379EF190AC2CBC21CDBE87D0DEB8",
)
OUTPUT = (
    HERE
    / "uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_audit_root_20260826.json"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def sparse_rows(expression, variables) -> list[dict]:
    result = []
    for monomial, coefficient in sp.Poly(sp.expand(expression), *variables).terms():
        integer = int(coefficient)
        assert integer > 0
        result.append({"monomial": list(monomial), "coefficient": integer})
    assert result
    return result


def ratio_coefficients(rank: int, terminal: int) -> list[int]:
    ratios = [terminal + rank + 1, terminal + rank - 1]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return coefficients


def convolution(left, right, degree: int) -> int:
    return sum(
        math.comb(degree, index) * left[index] * right[degree - index]
        for index in range(degree + 1)
    )


def direct_strong(rank: int, left_terminal: int, right_terminal: int) -> int:
    left = ratio_coefficients(rank, left_terminal)
    right = ratio_coefficients(rank, right_terminal)
    tail = [0, 0, 0, *left[3:]]
    c = {
        degree: convolution(left, right, degree)
        for degree in (rank - 1, rank, rank + 1)
    }
    v = {
        degree: convolution(tail, right, degree)
        for degree in (rank - 1, rank, rank + 1)
    }
    margin = c[rank] ** 2 - c[rank - 1] * c[rank + 1] - c[rank - 1] * c[rank]
    derivative = (
        2 * c[rank] * v[rank]
        - c[rank - 1] * v[rank + 1]
        - v[rank - 1] * c[rank + 1]
        - c[rank - 1] * v[rank]
        - v[rank - 1] * c[rank]
    )
    return (left_terminal + rank - 2) * margin + derivative


def main() -> int:
    source_path = HERE / PRODUCER_SOURCE[0]
    report_path = HERE / PRODUCER_REPORT[0]
    assert sha256(source_path) == PRODUCER_SOURCE[1]
    assert sha256(report_path) == PRODUCER_REPORT[1]
    report = json.loads(report_path.read_text(encoding="utf-8"))
    assert report["source_sha256"] == PRODUCER_SOURCE[1]
    assert report["status"] == "PASS_EXACT_ALL_RANK_TWO_PARAMETER_ZERO_SLACK_STRONG_BOUNDARY"

    q, a, b = sp.symbols("q a b", real=True)
    s = sp.Symbol("s", nonnegative=True)
    total_product, left_product, right_product = sp.symbols("U V W", real=True)
    left_parameter = a + q
    right_parameter = b + q

    # Re-derive c_(q-1),c_q,c_(q+1) from r![z^r] of
    # (((N+1)(1+z)^N-1)/N)*(((M+1)(1+z)^M-1)/M).
    ws = (left_parameter + 1) * (right_parameter + 1) * total_product
    wl = (left_parameter + 1) * left_product
    wr = (right_parameter + 1) * right_product
    rs, rl, rr = (
        left_parameter + right_parameter - q + 1,
        a + 1,
        b + 1,
    )
    c_prev = (ws - wl - wr) / (left_parameter * right_parameter)
    c_here = (ws * rs - wl * rl - wr * rr) / (left_parameter * right_parameter)
    c_next = (
        ws * rs * (rs - 1) - wl * rl * (rl - 1) - wr * rr * (rr - 1)
    ) / (left_parameter * right_parameter)

    right_prev = (right_parameter + 1) * right_product / right_parameter
    head_prev = right_prev * (
        1 + (q - 1) * (left_parameter + 1) / (b + 2)
        + ((q - 1) * (q - 2) / 2) * (left_parameter ** 2 - 1)
        / ((b + 2) * (b + 3))
    )
    head_here = right_prev * (
        b + 1 + q * (left_parameter + 1)
        + (q * (q - 1) / 2) * (left_parameter ** 2 - 1) / (b + 2)
    )
    head_next = right_prev * (
        b * (b + 1) + (q + 1) * (left_parameter + 1) * (b + 1)
        + (q * (q + 1) / 2) * (left_parameter ** 2 - 1)
    )
    margin = c_here ** 2 - c_prev * c_next - c_prev * c_here
    head_form = (
        2 * c_here * head_here - c_prev * head_next - head_prev * c_next
        - c_prev * head_here - head_prev * c_here
    )
    strong = sp.cancel(left_parameter * margin - head_form)
    scaled = sp.cancel(strong * (left_parameter * right_parameter) ** 2)
    p = sp.Poly(scaled, total_product, left_product, right_product)
    common = (
        left_parameter * (left_parameter + 1) * (right_parameter + 1)
        / (2 * (b + 2) * (b + 3))
    )
    alpha = sp.cancel(p.coeff_monomial(total_product * left_product) / common)
    beta = sp.cancel(p.coeff_monomial(total_product * right_product) / common)
    gamma = sp.cancel(-p.coeff_monomial(left_product * right_product) / common)
    delta = sp.cancel(-p.coeff_monomial(right_product ** 2) / common)
    assert sp.factor(sp.together(
        scaled / common - (
            total_product * left_product * alpha
            + total_product * right_product * beta
            - left_product * right_product * gamma
            - right_product ** 2 * delta
        )
    )) == 0

    # Payment one coefficient replay after q=s+8.
    z = left_parameter / right_parameter
    cubic_binomial_lower = (
        1 + (q - 1) * z + ((q - 1) * (q - 2) / 2) * z ** 2
        + ((q - 1) * (q - 2) * (q - 3) / 6) * z ** 3
    )
    payment_one = sp.cancel(alpha * cubic_binomial_lower - gamma)
    numerator_one, denominator_one = sp.fraction(payment_one)
    assert sp.expand(denominator_one - 3 * right_parameter) == 0
    payment_one_rows = sparse_rows(
        numerator_one.subs(q, s + 8), (s, a, b)
    )
    expected_one = report["pairwise_payment_certificate"]["payment_one"][
        "shift_k_equals_t_plus_8_sparse_coefficients"
    ]
    assert payment_one_rows == expected_one

    # Payment two by a completed-square certificate, independent of merely
    # checking sample values of the quadratic W(b).
    W_quadratic = sp.cancel(
        (beta - delta) / (left_parameter * (right_parameter + 1))
    )
    poly_b = sp.Poly(W_quadratic, b)
    leading = poly_b.LC()
    linear = poly_b.coeff_monomial(b)
    constant = poly_b.coeff_monomial(1)
    reserve = sp.expand(4 * leading * constant - linear ** 2)
    discriminant_core = sp.cancel(reserve / 4)
    assert sp.expand(
        4 * leading * W_quadratic - (2 * leading * b + linear) ** 2
        - reserve
    ) == 0
    reserve_rows = sparse_rows(
        discriminant_core.subs(q, s + 8), (s, a)
    )
    expected_reserve = report["pairwise_payment_certificate"]["payment_two"][
        "discriminant_core_shift_k_equals_t_plus_8_sparse_coefficients"
    ]
    assert reserve_rows == expected_reserve
    assert sp.expand(leading - 2 * (left_parameter - 2)) == 0

    # Fixed exact rows use direct ratio multiplication and convolution rather
    # than the symbolic product reduction.
    spot_checks = []
    for rank, left_terminal, right_terminal in (
        (8, 0, 0), (8, 3, 11), (9, 1, 100),
        (13, 0, 47), (13, 29, 2), (20, 7, 31),
    ):
        value = direct_strong(rank, left_terminal, right_terminal)
        assert value > 0
        spot_checks.append({
            "rank": rank,
            "left_terminal": left_terminal,
            "right_terminal": right_terminal,
            "strong_auxiliary": value,
        })

    payload = {
        "schema": "uniform-low-high-zero-slack-two-parameter-strong-boundary-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_RANK_TWO_PARAMETER_ZERO_SLACK_STRONG_BOUNDARY_AUDIT",
        "producer": {
            "source": PRODUCER_SOURCE[0],
            "source_sha256": PRODUCER_SOURCE[1],
            "report": PRODUCER_REPORT[0],
            "report_sha256": PRODUCER_REPORT[1],
        },
        "independent_checks": {
            "egf_four_product_identity": True,
            "payment_one_sparse_coefficient_match": True,
            "payment_one_positive_coefficients": len(payment_one_rows),
            "payment_two_completed_square_identity": True,
            "payment_two_reserve_positive_coefficients": len(reserve_rows),
            "direct_exact_ratio_spot_checks": spot_checks,
        },
        "scope": report["scope"],
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
