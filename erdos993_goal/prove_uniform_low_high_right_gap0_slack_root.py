#!/usr/bin/env python3
"""Exact all-rank theorem for arbitrary first-gap slack in the right row.

The new q and q^2 coefficients are exact positive multiples of the two
pairwise payments already certified on the complete zero-slack face.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap0_slack_exact_root_20260827.json"
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
    left_ratios, left = ratio_coefficients(rank, x)
    _, right = ratio_coefficients(rank, y, slack)
    tail = [0, 0, 0, *left[3:]]
    c = [convolution(left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    v = [convolution(tail, right, degree) for degree in (rank - 1, rank, rank + 1)]
    return int(left_ratios[2] * margin(c) + polar(c, v))


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
    left_prev = (N + 1) * L / N
    left = (
        left_prev,
        left_prev * (x + 1),
        left_prev * x * (x + 1),
    )
    c_direction = tuple(sp.cancel(c[index] - left[index]) for index in range(3))
    tail_direction = tuple(sp.cancel(tail[index] - left[index]) for index in range(3))
    h0 = (N - 2) * margin(c) + polar(c, tail)
    h1 = (
        (N - 2) * polar(c, c_direction)
        + polar(c, tail_direction) + polar(c_direction, tail)
    )
    h2 = (N - 2) * margin(c_direction) + polar(c_direction, tail_direction)

    abstract_c = sp.symbols("c0:3")
    abstract_d = sp.symbols("d0:3")
    abstract_v = sp.symbols("v0:3")
    abstract_w = sp.symbols("w0:3")
    assert sp.expand(
        margin(tuple(abstract_c[i] + q * abstract_d[i] for i in range(3)))
        - margin(abstract_c) - q * polar(abstract_c, abstract_d)
        - q ** 2 * margin(abstract_d)
    ) == 0
    assert sp.expand(
        polar(
            tuple(abstract_c[i] + q * abstract_d[i] for i in range(3)),
            tuple(abstract_v[i] + q * abstract_w[i] for i in range(3)),
        )
        - polar(abstract_c, abstract_v)
        - q * (polar(abstract_c, abstract_w) + polar(abstract_d, abstract_v))
        - q ** 2 * polar(abstract_d, abstract_w)
    ) == 0

    scale = (N * M) ** 2
    base_poly = sp.Poly(sp.cancel(h0 * scale), T, L, R)
    expected_monomials = {(1, 1, 0), (1, 0, 1), (0, 1, 1), (0, 0, 2)}
    assert {monomial for monomial, _ in base_poly.terms()} == expected_monomials
    payment_one = (
        base_poly.coeff_monomial(T * L) * T * L
        + base_poly.coeff_monomial(L * R) * L * R
    )
    payment_two = (
        base_poly.coeff_monomial(T * R) * T * R
        + base_poly.coeff_monomial(R ** 2) * R ** 2
    )
    assert sp.expand(base_poly.as_expr() - payment_one - payment_two) == 0
    scaled_h1 = sp.Poly(sp.cancel(h1 * scale), T, L, R).as_expr()
    scaled_h2 = sp.Poly(sp.cancel(h2 * scale), T, L, R).as_expr()
    assert sp.cancel(scaled_h1 - ((M + 2) * payment_one + 2 * payment_two)) == 0
    assert sp.cancel(scaled_h2 - ((M + 1) * payment_one + payment_two)) == 0

    spot_checks = []
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
            q: sp.Rational(slack, right_terminal + rank + 1),
            T: math.prod(left_terminal + right_terminal + rank + j for j in range(2, rank + 1)),
            L: math.prod(left_terminal + j for j in range(2, rank + 1)),
            R: math.prod(right_terminal + j for j in range(2, rank + 1)),
        }
        assembled = sp.cancel((h0 + q * h1 + q ** 2 * h2).subs(substitutions))
        direct = direct_strong(rank, left_terminal, right_terminal, slack)
        assert assembled.is_Integer and int(assembled) == direct and direct > 0
        spot_checks.append({
            "rank": rank,
            "x": left_terminal,
            "y": right_terminal,
            "first_gap_slack": slack,
            "strong_auxiliary": direct,
        })

    payload = {
        "schema": "uniform-low-high-right-gap0-slack-exact-root-v1",
        "status": "PASS_EXACT_ALL_RANK_RIGHT_GAP0_SLACK_STRONG_BOUNDARY",
        "theorem": {
            "rank_range": "every integer k >= 8",
            "parameter_range": "every real x,y,s >= 0",
            "left_ratios": "(x+k+1,x+k-1,x+k-2,...,x)",
            "right_ratios": "(y+k+1+s,y+k-1,y+k-2,...,y)",
            "claim": "(x+k-2)M(c)+B(c,v)>0",
        },
        "slack_normalization": "q=s/(y+k+1)>=0",
        "quadratic_identity": "H(q)=H0+q*H1+q^2*H2",
        "payment_lift": {
            "zero_slack": "scaled H0=P1+P2",
            "linear": "scaled H1=(y+k+2)*P1+2*P2",
            "quadratic": "scaled H2=(y+k+1)*P1+P2",
            "sign_input": "P1>=0 and P2>0 from the independently audited zero-slack theorem",
        },
        "direct_exact_spot_checks": spot_checks,
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves one full right positive gap-slack direction uniformly in rank. "
            "Other gap coordinates and simultaneous left/right slacks remain outside the theorem."
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
