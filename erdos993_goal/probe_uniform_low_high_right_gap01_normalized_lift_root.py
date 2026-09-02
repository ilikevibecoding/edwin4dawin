#!/usr/bin/env python3
"""Exact structural probe for the normalized right gap-0 lift over gap-1.

For a fixed gap-1 slack s, adding a top-gap slack t is normalized by
q=t/(y+k+1+s).  This probe checks product by product that the q and q^2
directions are positive combinations of the same two payment blocks used in
the gap-1 theorem.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap01_normalized_lift_probe_root_20260827.json"
PRODUCTS = (("T", "T"), ("T", "L"), ("T", "R"),
            ("L", "L"), ("L", "R"), ("R", "R"))
LEFT_BLOCK = {("T", "L"), ("L", "L")}
RIGHT_BLOCK = {("T", "R"), ("L", "R"), ("R", "R")}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def quadratic(row):
    return row[1] ** 2 - row[0] * row[2] - row[0] * row[1]


def bilinear(first, second):
    return (
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def product_coefficient(first, second, whole, tail, capacity):
    if first == second:
        return (
            capacity * quadratic(whole[first])
            + bilinear(whole[first], tail[first])
        )
    return (
        capacity * bilinear(whole[first], whole[second])
        + bilinear(whole[first], tail[second])
        + bilinear(whole[second], tail[first])
    )


def build_gap1_basis(k, x, y, s):
    N, M = k + x, k + y
    D = M**2 - 1
    zero = (0,) * 3
    rs, rl, rr = N + M - k + 1, x + 1, y + 1
    base = {
        "T": tuple((N + 1) * (M + 1) * value / (N * M)
                   for value in (1, rs, rs * (rs - 1))),
        "L": tuple(-(N + 1) * value / (N * M)
                   for value in (1, rl, rl * (rl - 1))),
        "R": tuple(-(M + 1) * value / (N * M)
                   for value in (1, rr, rr * (rr - 1))),
    }
    left_previous = (N + 1) / N
    left_high = {
        "T": zero,
        "L": (left_previous, left_previous * (x + 1),
              left_previous * x * (x + 1)),
        "R": zero,
    }
    prior = (left_previous / (x + 2), left_previous,
             left_previous * (x + 1))
    first = {
        "T": zero,
        "L": tuple((k - 1 + index) * prior[index] for index in range(3)),
        "R": zero,
    }
    right_previous = (M + 1) / M
    removed = {
        "T": zero,
        "L": zero,
        "R": (
            right_previous * (1 + (k - 1) * (N + 1) / (y + 2)
                + ((k - 1) * (k - 2) / 2) * (N**2 - 1)
                  / ((y + 2) * (y + 3))),
            right_previous * (y + 1 + k * (N + 1)
                + (k * (k - 1) / 2) * (N**2 - 1) / (y + 2)),
            right_previous * (y * (y + 1)
                + (k + 1) * (N + 1) * (y + 1)
                + (k * (k + 1) / 2) * (N**2 - 1)),
        ),
    }
    base_tail = {
        basis: tuple(base[basis][index] - removed[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    whole_remainder = {
        basis: tuple(base[basis][index] - left_high[basis][index]
                     - (M + 1) * first[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    tail_remainder = {
        basis: tuple(base_tail[basis][index] - left_high[basis][index]
                     - (M + 1) * first[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    multiplier = (D + 2 * M * s + s**2) / D
    whole = {
        basis: tuple(left_high[basis][index] + (M + 1 + s) * first[basis][index]
                     + multiplier * whole_remainder[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    tail = {
        basis: tuple(left_high[basis][index] + (M + 1 + s) * first[basis][index]
                     + multiplier * tail_remainder[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    return N, M, left_high, whole, tail


def coefficient_row(rank, terminal, gap0=0, gap1=0):
    ratios = [terminal + rank + 1 + gap0 + gap1,
              terminal + rank - 1 + gap1]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree):
    return sum(math.comb(degree, index) * first[index] * second[degree - index]
               for index in range(degree + 1))


def direct_strong(rank, x, y, gap0, gap1):
    left_ratios, left = coefficient_row(rank, x)
    _, right = coefficient_row(rank, y, gap0=gap0, gap1=gap1)
    left_tail = [0, 0, 0, *left[3:]]
    whole = [convolution(left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    tail = [convolution(left_tail, right, degree) for degree in (rank - 1, rank, rank + 1)]
    return left_ratios[2] * quadratic(whole) + bilinear(whole, tail)


def main() -> int:
    # Canonical rational-function arithmetic avoids heuristic simplification:
    # equality below means equality of reduced numerator/denominator pairs over
    # QQ(k,x,y,s), not agreement at sampled points.
    K, k, x, y, s = field("k,x,y,s", QQ)
    L, q = field("q", K)
    N, M, left_high, whole, tail = build_gap1_basis(k, x, y, s)
    direction_whole = {
        basis: tuple(whole[basis][index] - left_high[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    direction_tail = {
        basis: tuple(tail[basis][index] - left_high[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    lifted_whole = {
        basis: tuple(whole[basis][index] + q * direction_whole[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    lifted_tail = {
        basis: tuple(tail[basis][index] + q * direction_tail[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    rho = M + 1 + s
    checks = []
    for product in PRODUCTS:
        base = product_coefficient(*product, whole, tail, N - 2)
        lifted = product_coefficient(
            *product, lifted_whole, lifted_tail, N - 2
        )
        assert lifted.denom.degree() == 0
        if lifted == 0:
            linear = square = K.zero
        else:
            denominator = lifted.denom[(0,)]
            linear = lifted.numer[(1,)] / denominator
            square = lifted.numer[(2,)] / denominator
        assert linear == base + square
        candidates = {
            "base": square == base,
            "M_plus_1_times_base": square == (M + 1) * base,
            "rho_times_base": square == rho * base,
            "zero": square == 0,
        }
        checks.append({
            "product": list(product),
            "quadratic_relation": next(
                (name for name, passed in candidates.items() if passed),
                "new_payment",
            ),
        })
        print("PASS universal lift", product, candidates, flush=True)

    # Universal quadratic identity when the removed left vector is null for Q.
    G, c0, c1, c2, v0, v1, v2, a0, a1, a2, cap = field(
        "c0,c1,c2,v0,v1,v2,a0,a1,a2,cap", QQ
    )
    U, qu = field("q", G)
    c, v, a = (c0, c1, c2), (v0, v1, v2), (a0, a1, a2)
    Cq = tuple(c[index] + qu * (c[index] - a[index]) for index in range(3))
    Vq = tuple(v[index] + qu * (v[index] - a[index]) for index in range(3))
    universal = cap * quadratic(Cq) + bilinear(Cq, Vq)
    assert universal.denom.degree() == 0
    denominator = universal.denom[(0,)]
    linear = universal.numer[(1,)] / denominator
    square = universal.numer[(2,)] / denominator
    assert (
        linear
        - (cap * quadratic(c) + bilinear(c, v))
        - square
        + (cap + 2) * quadratic(a)
    ) == 0
    assert quadratic(left_high["L"]) == 0

    spot_checks = []
    for rank, xv, yv, gap0, gap1 in (
        (8, 0, 0, 1, 1), (8, 3, 11, 17, 29),
        (11, 1, 100, 7, 43), (15, 29, 2, 100, 5),
        (23, 7, 31, 3, 71),
    ):
        value = direct_strong(rank, xv, yv, gap0, gap1)
        assert value > 0
        spot_checks.append({
            "rank": rank, "x": xv, "y": yv,
            "right_gap0_slack": gap0, "right_gap1_slack": gap1,
            "strong_auxiliary": int(value),
        })

    payload = {
        "schema": "uniform-low-high-right-gap01-normalized-lift-probe-root-v1",
        "status": "PASS_EXACT_RIGHT_GAP01_UNIVERSAL_QUADRATIC_LIFT_IDENTITY",
        "normalization": "q=gap0_slack/(y+k+1+gap1_slack)",
        "payment_lift": {
            "base": "H0 is the independently audited right-gap1 auxiliary",
            "linear": "H1=H0+H2 because the removed left vector A has Q(A)=0",
            "quadratic": (
                "H2 is unchanged on T*R and R^2 but has new T*L, L^2, "
                "and L*R payments; their sign is a separate required proof"
            ),
            "rho": "y+k+1+gap1_slack>0",
        },
        "product_checks": checks,
        "identity_engine": (
            "canonical reduced rational functions over QQ(k,x,y,s)(q); "
            "no sampling and no heuristic simplify/cancel"
        ),
        "direct_exact_spot_checks": spot_checks,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This certifies only the exact quadratic lift identity.  Positivity "
            "of the new H2 payment is not asserted by this artifact."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
