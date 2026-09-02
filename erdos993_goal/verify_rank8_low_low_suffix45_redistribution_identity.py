#!/usr/bin/env python3
"""Independent symbolic audit of the suffix-4/5 Bernstein reduction."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_suffix45_redistribution_identity_exact_20260822.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def bidegree(expression, x, y):
    polynomial = sp.Poly(sp.expand(expression), x, y)
    monomials = polynomial.monoms()
    return [
        max((monomial[0] for monomial in monomials), default=-1),
        max((monomial[1] for monomial in monomials), default=-1),
    ]


def main():
    x, y, u, w, h, capacity = sp.symbols("x y u w h capacity")

    # The two adjacent gap slacks are an exact redistribution of their total.
    a4, a5 = (1 - x) * u, x * u
    b4, b5 = (1 - y) * w, y * w
    assert sp.expand(a4 + a5 - u) == 0
    assert sp.expand(b4 + b5 - w) == 0
    assert sp.diff(a4 + a5, x) == 0
    assert sp.diff(b4 + b5, y) == 0

    # A factor row is affine in its own redistribution coordinate: among its
    # cumulative ratios, only ratio 5 sees the later part x*u or y*w after
    # ratio 4 has combined the two adjacent gaps back to their total.
    left = []
    right = []
    for index in range(10):
        l0, l1 = sp.symbols(f"l{index}_0 l{index}_1")
        r0, r1 = sp.symbols(f"r{index}_0 r{index}_1")
        left.append(l0 + l1 * x)
        right.append(r0 + r1 * y)
    convolution = {}
    for rank in (7, 8, 9):
        convolution[rank] = sp.expand(sum(
            math.comb(rank, index) * left[index] * right[rank - index]
            for index in range(rank + 1)
        ))
        assert bidegree(convolution[rank], x, y) == [1, 1]

    tail = []
    for index in range(10):
        v0, v1 = sp.symbols(f"v{index}_0 v{index}_1")
        tail.append(v0 + v1 * x)
    mixed = {}
    for rank in (7, 8, 9):
        mixed[rank] = sp.expand(sum(
            math.comb(rank, index) * tail[index] * right[rank - index]
            for index in range(rank + 1)
        ))
        assert bidegree(mixed[rank], x, y) == [1, 1]

    c = convolution
    v = mixed
    margin = sp.expand(c[8] ** 2 - c[7] * c[9] - h * c[7] * c[8])
    derivative = sp.expand(
        2 * c[8] * v[8] - v[7] * c[9] - c[7] * v[9]
        - h * (v[7] * c[8] + c[7] * v[8])
    )
    curvature = sp.expand(v[8] ** 2 - v[7] * v[9] - h * v[7] * v[8])
    strong = sp.expand(capacity * margin + h * derivative)
    degrees = {
        "margin": bidegree(margin, x, y),
        "derivative": bidegree(derivative, x, y),
        "curvature": bidegree(curvature, x, y),
        "strong": bidegree(strong, x, y),
    }
    assert all(degree == [2, 2] for degree in degrees.values())

    # Exact tensor degree-two power-to-Bernstein transform.  Each univariate
    # weight row returns twice the Bernstein coefficient, so the tensor output
    # is four times the true bivariate Bernstein coefficient.
    coefficients = {
        (i, j): sp.symbols(f"c{i}{j}")
        for i in range(3) for j in range(3)
    }
    polynomial = sp.expand(sum(
        coefficients[(i, j)] * x ** i * y ** j
        for i in range(3) for j in range(3)
    ))
    weights = {
        0: (2, 0, 0),
        1: (2, 1, 0),
        2: (2, 2, 2),
    }
    bernstein = {}
    for i in range(3):
        for j in range(3):
            bernstein[(i, j)] = sp.expand(sum(
                weights[i][p] * weights[j][q] * coefficients[(p, q)]
                for p in range(3) for q in range(3)
            ) / 4)
    basis_x = ((1 - x) ** 2, 2 * x * (1 - x), x ** 2)
    basis_y = ((1 - y) ** 2, 2 * y * (1 - y), y ** 2)
    reconstructed = sp.expand(sum(
        bernstein[(i, j)] * basis_x[i] * basis_y[j]
        for i in range(3) for j in range(3)
    ))
    assert sp.expand(reconstructed - polynomial) == 0
    assert all(weights[index][0] == 2 for index in range(3))

    payload = {
        "schema": "rank8-low-low-suffix45-redistribution-identity-v1",
        "status": "PASS_EXACT_SUFFIX45_REDISTRIBUTION_IDENTITY",
        "gap_substitution": {
            "left": ["a4=(1-x)U", "a5=xU", "0<=x<=1"],
            "right": ["b4=(1-y)W", "b5=yW", "0<=y<=1"],
        },
        "factor_row_degree": [1, 1],
        "auxiliary_bidegrees": degrees,
        "bernstein_degree": [2, 2],
        "integer_probe_scaling": 4,
        "payment_scaling_check": (
            "The degree-zero weight in every transform row is 2, so a "
            "redistribution-independent AM-GM payment is multiplied by "
            "2*2=4 in every tensor Bernstein row."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
