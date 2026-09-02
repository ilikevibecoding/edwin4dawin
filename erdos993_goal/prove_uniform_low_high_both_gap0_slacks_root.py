#!/usr/bin/env python3
"""Exact all-rank theorem for simultaneous first-gap slacks in both rows."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_both_gap0_slacks_exact_root_20260827.json"
DEPENDENCIES = {
    "uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_audit_root_20260826.json":
        "507C9BC153F158A1D956676808FA09EA9C9B3DC3A4ECC2E9D4894A2A243AD8F2",
    "prove_uniform_low_high_left_gap0_slack_root.py":
        "66096D1C7BFEC978D9BD2F77117C6B57C0DDBEDB459FF845D9FFCE738BCECA6A",
    "uniform_low_high_left_gap0_slack_exact_root_20260827.json":
        "B176B7C457214574448A2D9E2DD724F906CAC7A70FE0A4F154B66093687FD601",
    "audit_uniform_low_high_left_gap0_slack_independent_root.py":
        "9F1C6C5529C517A9671024462E9D9AC478B8F20CAB048D2BB22D064829FC7F25",
    "uniform_low_high_left_gap0_slack_independent_audit_root_20260827.json":
        "4B7A2DD54ED055E6C05889E41FC1690D4897C1DDC2FB7BBA7293E1BB73C3F9ED",
    "prove_uniform_low_high_right_gap0_slack_root.py":
        "9397CA8F529612EE998D21FEC7156EBCB2FAAB03A25D8FC0D5BF0BDE6731EF1A",
    "uniform_low_high_right_gap0_slack_exact_root_20260827.json":
        "FA4227FB18F67D672FF4E1545BD9DC35B311D9E19971E748C14188A78C5F4DA8",
    "audit_uniform_low_high_right_gap0_slack_independent_root.py":
        "121D076F00E05CA37FEBE34532E6BF481B9E2316D7A37936D0909F8D158539D3",
    "uniform_low_high_right_gap0_slack_independent_audit_root_20260827.json":
        "57ACB1006AE195F36710BBD5BB411EF6937AAA157413C464FFE0439784D90F4B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def margin(row):
    return sp.expand(row[1] ** 2 - row[0] * row[2] - row[0] * row[1])


def polar(first, second):
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


def rational_certificate(expression, expected_denominator, rank, shift, variables):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    assert sp.expand(denominator - expected_denominator) == 0
    return {
        "positive_denominator": str(sp.factor(expected_denominator)),
        "shift_k_equals_t_plus_8_sparse_coefficients": positive_rows(
            numerator.subs(rank, shift + 8), variables
        ),
    }


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


def direct(rank: int, x: int, y: int, left_slack: int, right_slack: int):
    left_ratios, left = coefficient_row(rank, x, left_slack)
    _, right = coefficient_row(rank, y, right_slack)
    tail_left = [0, 0, 0, *left[3:]]
    c = [convolution(left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    v = [convolution(tail_left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    return int(left_ratios[2] * margin(c) + polar(c, v))


def main() -> int:
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected
    left_audit = json.loads(
        (HERE / "uniform_low_high_left_gap0_slack_independent_audit_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    right_audit = json.loads(
        (HERE / "uniform_low_high_right_gap0_slack_independent_audit_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    assert left_audit["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_LEFT_GAP0_SLACK_AUDIT"
    assert right_audit["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_RIGHT_GAP0_SLACK_AUDIT"

    k, x, y = sp.symbols("k x y", real=True)
    t = sp.Symbol("t", nonnegative=True)
    T, L, R = sp.symbols("T L R", positive=True)
    N, M = x + k, y + k
    ws = (N + 1) * (M + 1) * T
    wl = (N + 1) * L
    wr = (M + 1) * R
    rs, rl, rr = N + M - k + 1, x + 1, y + 1
    c = (
        (ws - wl - wr) / (N * M),
        (ws * rs - wl * rl - wr * rr) / (N * M),
        (
            ws * rs * (rs - 1)
            - wl * rl * (rl - 1)
            - wr * rr * (rr - 1)
        ) / (N * M),
    )
    left_prev = (N + 1) * L / N
    left = (left_prev, left_prev * (x + 1), left_prev * x * (x + 1))
    right_prev = (M + 1) * R / M
    right = (right_prev, right_prev * (y + 1), right_prev * y * (y + 1))
    head = (
        right_prev * (
            1 + (k - 1) * (N + 1) / (y + 2)
            + ((k - 1) * (k - 2) / 2) * (N ** 2 - 1)
            / ((y + 2) * (y + 3))
        ),
        right_prev * (
            y + 1 + k * (N + 1)
            + (k * (k - 1) / 2) * (N ** 2 - 1) / (y + 2)
        ),
        right_prev * (
            y * (y + 1) + (k + 1) * (N + 1) * (y + 1)
            + (k * (k + 1) / 2) * (N ** 2 - 1)
        ),
    )
    v = tuple(sp.cancel(c[index] - head[index]) for index in range(3))
    left_direction = tuple(sp.cancel(c[index] - right[index]) for index in range(3))
    right_direction = tuple(sp.cancel(c[index] - left[index]) for index in range(3))
    cross_direction = tuple(
        sp.cancel(c[index] - left[index] - right[index]) for index in range(3)
    )
    right_tail_direction = tuple(sp.cancel(v[index] - left[index]) for index in range(3))
    capacity = N - 2

    # For fixed right normalization q, write C=c+q*r, V=v+q*w,
    # D=l+q*e.  The left normalization p gives
    # H=A*M(C+pD)+B(C+pD,(1+p)V).  These are its four cross coefficients.
    cross_coefficients = {
        "p1_q1": (
            capacity * (polar(c, cross_direction) + polar(right_direction, left_direction))
            + polar(c, right_tail_direction) + polar(right_direction, v)
            + polar(left_direction, right_tail_direction) + polar(cross_direction, v)
        ),
        "p1_q2": (
            capacity * polar(right_direction, cross_direction)
            + polar(right_direction, right_tail_direction)
            + polar(cross_direction, right_tail_direction)
        ),
        "p2_q1": (
            capacity * polar(left_direction, cross_direction)
            + polar(left_direction, right_tail_direction)
            + polar(cross_direction, v)
        ),
        "p2_q2": (
            capacity * margin(cross_direction)
            + polar(cross_direction, right_tail_direction)
        ),
    }

    # Universal bivariate algebra check, independent of the EGF substitution.
    p_symbol, q_symbol, capacity_symbol = sp.symbols("p q A", real=True)
    ac = sp.symbols("c0:3")
    ar = sp.symbols("r0:3")
    al = sp.symbols("l0:3")
    ae = sp.symbols("e0:3")
    av = sp.symbols("v0:3")
    aw = sp.symbols("w0:3")
    Cq = tuple(ac[i] + q_symbol * ar[i] for i in range(3))
    Dq = tuple(al[i] + q_symbol * ae[i] for i in range(3))
    Vq = tuple(av[i] + q_symbol * aw[i] for i in range(3))
    universal = sp.Poly(
        sp.expand(
            capacity_symbol * margin(tuple(Cq[i] + p_symbol * Dq[i] for i in range(3)))
            + polar(
                tuple(Cq[i] + p_symbol * Dq[i] for i in range(3)),
                tuple((1 + p_symbol) * Vq[i] for i in range(3)),
            )
        ),
        p_symbol, q_symbol,
    )
    assert universal.degree(p_symbol) == 2 and universal.degree(q_symbol) == 2
    expected_cross_abstract = {
        (1, 1): (
            capacity_symbol * (polar(ac, ae) + polar(ar, al))
            + polar(ac, aw) + polar(ar, av) + polar(al, aw) + polar(ae, av)
        ),
        (1, 2): (
            capacity_symbol * polar(ar, ae) + polar(ar, aw) + polar(ae, aw)
        ),
        (2, 1): (
            capacity_symbol * polar(al, ae) + polar(al, aw) + polar(ae, av)
        ),
        (2, 2): capacity_symbol * margin(ae) + polar(ae, aw),
    }
    for powers, expected in expected_cross_abstract.items():
        assert sp.expand(
            universal.coeff_monomial(p_symbol ** powers[0] * q_symbol ** powers[1])
            - expected
        ) == 0

    ratio_lower = (
        1 + (k - 1) * N / M
        + ((k - 1) * (k - 2) / 2) * (N / M) ** 2
        + ((k - 1) * (k - 2) * (k - 3) / 6) * (N / M) ** 3
    )
    denominator = (y + 2) * (y + 3)
    expected_denominators = {
        "p1_q1": (1, denominator, 3 * M * denominator, denominator),
        "p1_q2": (1, denominator, 3 * M * denominator, denominator),
        "p2_q1": (1, denominator, 6 * M * denominator, denominator),
        "p2_q2": (1, 2 * denominator, 6 * M * denominator, 2 * denominator),
    }
    certificates = []
    for label, coefficient in cross_coefficients.items():
        polynomial = sp.Poly(sp.cancel(coefficient * (N * M) ** 2), T, L, R)
        assert {monomial for monomial, _ in polynomial.terms()} == {
            (1, 1, 0), (1, 0, 1), (0, 1, 1), (0, 0, 2)
        }
        alpha = sp.cancel(polynomial.coeff_monomial(T * L))
        beta = sp.cancel(polynomial.coeff_monomial(T * R))
        gamma = sp.cancel(-polynomial.coeff_monomial(L * R))
        delta = sp.cancel(-polynomial.coeff_monomial(R ** 2))
        d_alpha, d_beta, d_one, d_two = expected_denominators[label]
        record = {
            "coefficient": label,
            "alpha_positive": rational_certificate(alpha, d_alpha, k, t, (t, x, y)),
            "beta_positive": rational_certificate(beta, d_beta, k, t, (t, x, y)),
            "payment_one": {
                "bound": "T/R >= cubic binomial truncation of (1+(x+k)/(y+k))^(k-1)",
                **rational_certificate(
                    sp.cancel(alpha * ratio_lower - gamma), d_one, k, t, (t, x, y)
                ),
            },
            "payment_two": {
                "bound": "T/R >= 1",
                **rational_certificate(
                    sp.cancel(beta - delta), d_two, k, t, (t, x, y)
                ),
            },
        }
        certificates.append(record)
        print(
            label,
            len(record["alpha_positive"]["shift_k_equals_t_plus_8_sparse_coefficients"]),
            len(record["beta_positive"]["shift_k_equals_t_plus_8_sparse_coefficients"]),
            len(record["payment_one"]["shift_k_equals_t_plus_8_sparse_coefficients"]),
            len(record["payment_two"]["shift_k_equals_t_plus_8_sparse_coefficients"]),
            flush=True,
        )

    direct_checks = []
    for rank, x_value, y_value, left_slack, right_slack in (
        (8, 0, 0, 1, 1),
        (8, 3, 11, 17, 29),
        (11, 1, 100, 7, 43),
        (15, 29, 2, 100, 5),
        (23, 7, 31, 3, 71),
    ):
        value = direct(rank, x_value, y_value, left_slack, right_slack)
        assert value > 0
        direct_checks.append({
            "rank": rank,
            "x": x_value,
            "y": y_value,
            "left_first_gap_slack": left_slack,
            "right_first_gap_slack": right_slack,
            "strong_auxiliary": value,
        })

    payload = {
        "schema": "uniform-low-high-both-gap0-slacks-exact-root-v1",
        "status": "PASS_EXACT_ALL_RANK_SIMULTANEOUS_BOTH_GAP0_SLACKS_STRONG_BOUNDARY",
        "theorem": {
            "rank_range": "every integer k >= 8",
            "parameter_range": "every real x,y,s,t >= 0",
            "left_ratios": "(x+k+1+s,x+k-1,x+k-2,...,x)",
            "right_ratios": "(y+k+1+t,y+k-1,y+k-2,...,y)",
            "claim": "(x+k-2)M(c)+B(c,v)>0",
        },
        "normalization": "p=s/(x+k+1), q=t/(y+k+1)",
        "axis_certificates": {
            "zero": "p=q=0 from the pinned zero-slack audit",
            "left": left_audit["status"],
            "right": right_audit["status"],
        },
        "cross_positive_coefficient_certificates": certificates,
        "direct_exact_spot_checks": direct_checks,
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves the complete simultaneous first-gap slack quadrant. "
            "Gap coordinates with index >=1 remain outside the theorem."
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
