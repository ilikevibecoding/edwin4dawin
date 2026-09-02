#!/usr/bin/env python3
"""Exact replay for GLOBAL_PROOF_CHAIN_WAVE3_AUDIT_2026-08-13.md."""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path


def mul(p: list[Fraction], q: list[Fraction]) -> list[Fraction]:
    out = [Fraction(0) for _ in range(len(p) + len(q) - 1)]
    for i, a in enumerate(p):
        for j, b in enumerate(q):
            out[i + j] += a * b
    return out


def add_shift(p: list[Fraction], q: list[Fraction]) -> list[Fraction]:
    n = max(len(p), len(q) + 1)
    return [
        (p[i] if i < len(p) else 0)
        + (q[i - 1] if 0 < i <= len(q) else 0)
        for i in range(n)
    ]


def coeff(p: list[Fraction], i: int) -> Fraction:
    return p[i] if 0 <= i < len(p) else Fraction(0)


def gsb_g(p: list[Fraction], k: int) -> Fraction:
    return (
        k * coeff(p, k) ** 2
        + coeff(p, k - 1) * coeff(p, k)
        - (k + 1) * coeff(p, k - 1) * coeff(p, k + 1)
    )


def gsb_h(p: list[Fraction], k: int) -> Fraction:
    assert k >= 1 and coeff(p, k - 1) > 0
    return Fraction(k) * gsb_g(p, k) / coeff(p, k - 1)


def serial_fraction(x: Fraction) -> str:
    return str(x.numerator) if x.denominator == 1 else f"{x.numerator}/{x.denominator}"


def serial_poly(p: list[Fraction]) -> list[str]:
    return [serial_fraction(x) for x in p]


def main() -> None:
    one = [Fraction(1)]
    A = one
    for _ in range(3):
        A = mul(A, [Fraction(1), Fraction(1, 3)])
    Q = mul([Fraction(1), Fraction(2)], [Fraction(1), Fraction(3)])
    P = add_shift(A, Q)

    assert A == [Fraction(1), Fraction(1), Fraction(1, 3), Fraction(1, 27)]
    assert Q == [Fraction(1), Fraction(5), Fraction(6)]
    assert P == [Fraction(1), Fraction(2), Fraction(16, 3), Fraction(163, 27)]

    base2 = gsb_h(P, 2) - gsb_h(Q, 1)
    base3 = gsb_h(P, 3) - gsb_h(Q, 2)
    assert base2 == Fraction(40, 3)
    assert base3 == Fraction(83837, 2160)

    P_plus = mul(P, [Fraction(1), Fraction(1)])
    Q_plus = mul(Q, [Fraction(1), Fraction(1)])
    lifted2 = gsb_h(P_plus, 2) - gsb_h(Q_plus, 1)
    assert lifted2 == Fraction(-50, 27)

    # R(x,y)=1+(x+y)+2xy: each homogeneous piece is stable, while
    # R(z,z)=1+2z+2z^2 vanishes at z=(-1+i)/2.
    # Verify the latter exactly by tracking real/imaginary rational parts.
    zr, zi = Fraction(-1, 2), Fraction(1, 2)
    z2r, z2i = zr * zr - zi * zi, 2 * zr * zi
    rr = 1 + 2 * zr + 2 * z2r
    ri = 2 * zi + 2 * z2i
    assert rr == 0 and ri == 0 and zi > 0

    # For a graph with n vertices and e edges, p0=1, p1=n,
    # p2=C(n,2)-e.  Hence G_1=2(n+e), the terminal PGC base.
    for n in range(1, 101):
        for e in range(0, n):  # every forest has 0 <= e <= n-1
            p = [Fraction(1), Fraction(n), Fraction(n * (n - 1) // 2 - e)]
            assert gsb_g(p, 1) == 2 * (n + e)

    # The prefix cutoff and the Levit--Mandrescu tail start coincide:
    # floor((2a+1)/3)=ceil((2a-1)/3).
    for alpha in range(0, 10001):
        left = (2 * alpha + 1) // 3
        right = -(-(2 * alpha - 1) // 3)
        assert left == right

    report = {
        "status": "PASS_EXACT_GLOBAL_PROOF_CHAIN_WAVE3_AUDIT_REPLAY",
        "scope_warning": (
            "The PF lifting counterexample refutes an abstract propagation shortcut; "
            "it is not a counterexample to PGC for forest independence polynomials."
        ),
        "pf_inputs": {
            "A": serial_poly(A),
            "Q": serial_poly(Q),
            "A_negative_roots": ["-3", "-3", "-3"],
            "Q_negative_roots": ["-1/2", "-1/3"],
        },
        "pendant_pair": {"P": serial_poly(P), "Q": serial_poly(Q)},
        "base_margins": {"k=2": serial_fraction(base2), "k=3": serial_fraction(base3)},
        "after_multiplication_by_1+x": {
            "P_plus": serial_poly(P_plus),
            "Q_plus": serial_poly(Q_plus),
            "k=2_margin": serial_fraction(lifted2),
        },
        "homogeneous_piece_counterexample": {
            "polynomial": "1+(x+y)+2xy",
            "upper_half_plane_diagonal_zero": "(-1+i)/2",
        },
        "checked_rank_one_identity": {"n_max": 100, "forest_edge_range": "0<=e<=n-1"},
        "checked_prefix_tail_cutoff": {"alpha_min": 0, "alpha_max": 10000},
    }
    out = Path(__file__).with_name("global_proof_chain_wave3_audit_exact_20260813.json")
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(out.name)


if __name__ == "__main__":
    main()
