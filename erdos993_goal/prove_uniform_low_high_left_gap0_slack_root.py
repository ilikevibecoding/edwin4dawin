#!/usr/bin/env python3
"""Exact all-rank theorem for the first positive gap-slack direction.

Starting from the translated minimal-gap rows at rank k>=8, add any real
slack s>=0 to the first gap of the left row:

    (x+k+1+s, x+k-1, x+k-2, ..., x),
    (y+k+1,   y+k-1, y+k-2, ..., y).

The script proves the complete low/high strong auxiliary remains strictly
positive.  It depends only on the already independently audited zero-slack
theorem and new exact sparse positive-coefficient payments for the linear and
quadratic powers of q=s/(x+k+1).
"""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_left_gap0_slack_exact_root_20260827.json"
DEPENDENCIES = {
    "prove_uniform_low_high_zero_slack_two_parameter_strong_boundary_root.py":
        "3AF989ED0E4D38215E6702117C659827161E784C8382FA5A614F518438A19415",
    "uniform_low_high_zero_slack_two_parameter_strong_boundary_exact_root_20260826.json":
        "DC71A44F38291A444927B1B98351B8A30640379EF190AC2CBC21CDBE87D0DEB8",
    "audit_uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_root.py":
        "8B9494C7E28D2A750869E722F139512D8CD6C03FFF563B2D4B5F809DA32D6150",
    "uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_audit_root_20260826.json":
        "507C9BC153F158A1D956676808FA09EA9C9B3DC3A4ECC2E9D4894A2A243AD8F2",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def margin(row):
    return sp.expand(row[1] ** 2 - row[0] * row[2] - row[0] * row[1])


def polar(left, right):
    return sp.expand(
        2 * left[1] * right[1]
        - left[0] * right[2] - left[2] * right[0]
        - left[0] * right[1] - left[1] * right[0]
    )


def sparse_strictly_positive(expression, variables) -> list[dict]:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    rows = []
    for monomial, coefficient in polynomial.terms():
        assert coefficient.is_Integer
        value = int(coefficient)
        assert value > 0
        rows.append({"monomial": list(monomial), "coefficient": value})
    assert rows
    return rows


def rational_positive_certificate(
    expression, expected_denominator, k, shifted_rank, variables
) -> dict:
    numerator, denominator = sp.fraction(sp.cancel(expression))
    assert sp.expand(denominator - expected_denominator) == 0
    rows = sparse_strictly_positive(
        numerator.subs(k, shifted_rank + 8), variables
    )
    return {
        "positive_denominator": str(sp.factor(expected_denominator)),
        "shift_k_equals_t_plus_8_sparse_coefficients": rows,
    }


def ratio_coefficients(rank: int, terminal: int, first_gap_slack: int = 0):
    ratios = [terminal + rank + 1 + first_gap_slack]
    ratios.extend(terminal + rank - index for index in range(1, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(left, right, degree: int) -> int:
    return sum(
        math.comb(degree, index) * left[index] * right[degree - index]
        for index in range(degree + 1)
    )


def direct_strong(rank: int, x: int, y: int, slack: int) -> int:
    left_ratios, left = ratio_coefficients(rank, x, slack)
    _, right = ratio_coefficients(rank, y)
    tail = [0, 0, 0, *left[3:]]
    c = [convolution(left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    v = [convolution(tail, right, degree) for degree in (rank - 1, rank, rank + 1)]
    return left_ratios[2] * margin(c) + polar(c, v)


def main() -> int:
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected
    zero_report = json.loads(
        (HERE / "uniform_low_high_zero_slack_two_parameter_strong_boundary_exact_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    zero_audit = json.loads(
        (HERE / "uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_audit_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    assert zero_report["status"] == "PASS_EXACT_ALL_RANK_TWO_PARAMETER_ZERO_SLACK_STRONG_BOUNDARY"
    assert zero_audit["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_TWO_PARAMETER_ZERO_SLACK_STRONG_BOUNDARY_AUDIT"

    k, x, y, q = sp.symbols("k x y q", real=True)
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
    right_prev = (M + 1) * R / M
    right = (
        right_prev,
        right_prev * (y + 1),
        right_prev * y * (y + 1),
    )
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
    tail = tuple(sp.cancel(c[index] - head[index]) for index in range(3))
    direction = tuple(sp.cancel(c[index] - right[index]) for index in range(3))

    h0 = (N - 2) * margin(c) + polar(c, tail)
    h1 = (N - 2) * polar(c, direction) + polar(c, tail) + polar(direction, tail)
    h2 = (N - 2) * margin(direction) + polar(direction, tail)
    # Verify the quadratic expansion once in the universal polynomial ring.
    # Substitution of the rational c,d,v formulas then preserves the identity
    # without forcing a prohibitively large rational simplification.
    abstract_c = sp.symbols("c0:3")
    abstract_d = sp.symbols("d0:3")
    abstract_v = sp.symbols("v0:3")
    assert sp.expand(
        margin(tuple(abstract_c[i] + q * abstract_d[i] for i in range(3)))
        - margin(abstract_c) - q * polar(abstract_c, abstract_d)
        - q ** 2 * margin(abstract_d)
    ) == 0
    assert sp.expand(
        polar(
            tuple(abstract_c[i] + q * abstract_d[i] for i in range(3)),
            tuple((1 + q) * abstract_v[i] for i in range(3)),
        )
        - polar(abstract_c, abstract_v)
        - q * (polar(abstract_c, abstract_v) + polar(abstract_d, abstract_v))
        - q ** 2 * polar(abstract_d, abstract_v)
    ) == 0

    lower = (
        1 + (k - 1) * N / M
        + ((k - 1) * (k - 2) / 2) * (N / M) ** 2
        + ((k - 1) * (k - 2) * (k - 3) / 6) * (N / M) ** 3
    )
    coefficient_certificates = []
    expected_denominators = {
        1: {
            "alpha": 1,
            "beta": (y + 2) * (y + 3),
            "payment_one": 3 * M * (y + 2) * (y + 3),
            "payment_two": (y + 2) * (y + 3),
        },
        2: {
            "alpha": 1,
            "beta": 2 * (y + 2) * (y + 3),
            "payment_one": 6 * M * (y + 2) * (y + 3),
            "payment_two": 2 * (y + 2) * (y + 3),
        },
    }
    for degree, coefficient in ((1, h1), (2, h2)):
        scaled = sp.cancel(coefficient * (N * M) ** 2)
        product_poly = sp.Poly(scaled, T, L, R)
        assert {monomial for monomial, _ in product_poly.terms()} == {
            (1, 1, 0), (1, 0, 1), (0, 1, 1), (0, 0, 2)
        }
        alpha = sp.cancel(product_poly.coeff_monomial(T * L))
        beta = sp.cancel(product_poly.coeff_monomial(T * R))
        gamma = sp.cancel(-product_poly.coeff_monomial(L * R))
        delta = sp.cancel(-product_poly.coeff_monomial(R ** 2))
        denominators = expected_denominators[degree]
        alpha_certificate = rational_positive_certificate(
            alpha, denominators["alpha"], k, t, (t, x, y)
        )
        beta_certificate = rational_positive_certificate(
            beta, denominators["beta"], k, t, (t, x, y)
        )
        payment_one_certificate = rational_positive_certificate(
            sp.cancel(alpha * lower - gamma), denominators["payment_one"],
            k, t, (t, x, y),
        )
        payment_two_certificate = rational_positive_certificate(
            sp.cancel(beta - delta), denominators["payment_two"],
            k, t, (t, x, y),
        )
        coefficient_certificates.append({
            "q_degree": degree,
            "positive_scale_removed": "((x+k)(y+k))^2",
            "four_product_form": "T*L*alpha+T*R*beta-L*R*gamma-R^2*delta",
            "alpha_positive": alpha_certificate,
            "beta_positive": beta_certificate,
            "payment_one": {
                "bound": "T/R >= cubic binomial truncation of (1+(x+k)/(y+k))^(k-1)",
                **payment_one_certificate,
            },
            "payment_two": {
                "bound": "T/R >= 1",
                **payment_two_certificate,
            },
        })
        print(
            "Q_DEGREE", degree,
            "PAYMENT_ONE_TERMS", len(payment_one_certificate["shift_k_equals_t_plus_8_sparse_coefficients"]),
            "PAYMENT_TWO_TERMS", len(payment_two_certificate["shift_k_equals_t_plus_8_sparse_coefficients"]),
            flush=True,
        )

    symbolic_substitutions = []
    for rank, left_terminal, right_terminal, slack in (
        (8, 0, 0, 1),
        (8, 3, 11, 17),
        (9, 1, 100, 7),
        (13, 29, 2, 100),
        (20, 7, 31, 3),
    ):
        substitutions = {
            k: rank,
            x: left_terminal,
            y: right_terminal,
            q: sp.Rational(slack, left_terminal + rank + 1),
            T: math.prod(left_terminal + right_terminal + rank + j for j in range(2, rank + 1)),
            L: math.prod(left_terminal + j for j in range(2, rank + 1)),
            R: math.prod(right_terminal + j for j in range(2, rank + 1)),
        }
        assembled_value = sp.cancel((h0 + q * h1 + q ** 2 * h2).subs(substitutions))
        direct_value = int(direct_strong(rank, left_terminal, right_terminal, slack))
        assert assembled_value.is_Integer
        assert int(assembled_value) == direct_value
        assert direct_value > 0
        symbolic_substitutions.append({
            "rank": rank,
            "x": left_terminal,
            "y": right_terminal,
            "first_gap_slack": slack,
            "strong_auxiliary": direct_value,
        })

    payload = {
        "schema": "uniform-low-high-left-gap0-slack-exact-root-v1",
        "status": "PASS_EXACT_ALL_RANK_LEFT_GAP0_SLACK_STRONG_BOUNDARY",
        "theorem": {
            "rank_range": "every integer k >= 8",
            "parameter_range": "every real x,y,s >= 0",
            "left_ratios": "(x+k+1+s,x+k-1,x+k-2,...,x)",
            "right_ratios": "(y+k+1,y+k-1,y+k-2,...,y)",
            "claim": "(x+k-2)M(c)+B(c,v)>0",
        },
        "slack_normalization": "q=s/(x+k+1)>=0",
        "quadratic_identity": "H(q)=H0+q*H1+q^2*H2",
        "zero_coefficient_dependency": {
            "claim": "H0>0",
            "producer_status": zero_report["status"],
            "independent_audit_status": zero_audit["status"],
        },
        "positive_coefficient_certificates": coefficient_certificates,
        "direct_exact_spot_checks": symbolic_substitutions,
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves one full positive gap-slack direction uniformly in rank. "
            "Other gap coordinates and simultaneous slacks remain outside the theorem."
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
