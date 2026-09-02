#!/usr/bin/env python3
"""Certify the actual N=7 spectral-selector obstruction with Arb balls.

For p=7!g_7, q=7!g_6, r=7!g_5, write

  H=q^2-pr=7 X^2 Q(X),

where Q is a squarefree monic degree-ten polynomial without real roots.
Every scalar factor b with H=b conjugate(b) is obtained by choosing one
root from each of Q's five conjugate pairs and putting

  b(X)=sqrt(7) X product(X-z_j).

For each of the 32 choices this program uses certified complex root balls
to find a rigorously negative coefficient of the principal-minor selector.
Unlike the earlier mpmath probe, this is a finite interval certificate.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import sympy as sp
from flint import acb, arb, ctx, fmpz_poly

from verify_defect1_phi_spectral_determinant import scaled_seed
from verify_umbral_hypergeometric_finite_free_structure import X


HERE = Path(__file__).resolve().parent
REPORT = HERE / "actual_spectral_selector_n7_arb_certificate_20260804.json"
BITS = 384


def to_fmpz_poly(poly: sp.Poly) -> fmpz_poly:
    coefficients = [int(value) for value in reversed(poly.all_coeffs())]
    return fmpz_poly(coefficients)


def midpoint(value: arb) -> float:
    return float(value)


def subset_data(weights: list[arb], atoms: list[acb]):
    n = len(weights)
    sizes = [0] * (1 << n)
    avals = [arb(0) for _ in range(1 << n)]
    cvals = [acb(0) for _ in range(1 << n)]
    bvals = [arb(0) for _ in range(1 << n)]
    for mask in range(1, 1 << n):
        bit = mask & -mask
        index = bit.bit_length() - 1
        previous = mask ^ bit
        sizes[mask] = sizes[previous] + 1
        avals[mask] = avals[previous] + weights[index]
        cvals[mask] = cvals[previous] + atoms[index]
        modulus_squared = (
            cvals[mask].real**2 + cvals[mask].imag**2
        )
        bvals[mask] = avals[mask] ** 2 - modulus_squared
    return sizes, avals, bvals


def selector_witness(data, d: int):
    sizes, avals, bvals = data
    by_size = [[] for _ in range(len(sizes).bit_length())]
    for mask, size in enumerate(sizes):
        by_size[size].append(mask)
    f0 = arb(math.factorial(d))
    f1 = arb(math.factorial(d - 2))
    f2 = arb(math.factorial(d - 4))
    certified_negative = 0
    indeterminate = 0
    best = None
    checks = 0
    n = len(weights_global)
    for left_size in range(max(0, d - n), min(n, d) + 1):
        right_size = d - left_size
        for left in by_size[left_size]:
            for right in by_size[right_size]:
                value = (
                    f0
                    - 2 * f1 * avals[left] * avals[right]
                    + f2 * bvals[left] * bvals[right]
                )
                checks += 1
                if value < 0:
                    certified_negative += 1
                    if best is None or midpoint(value) < midpoint(best[0]):
                        best = (value, left, right, left_size, right_size)
                elif not (value > 0) and 0 in value:
                    indeterminate += 1
    if best is None:
        raise AssertionError("no certified negative selector coefficient")
    value, left, right, left_size, right_size = best
    return {
        "coefficient_checks": checks,
        "certified_negative_coefficients": certified_negative,
        "indeterminate_sign_coefficients": indeterminate,
        "witness": {
            "left_mask": left,
            "right_mask": right,
            "left_size": left_size,
            "right_size": right_size,
            "value_ball": str(value),
            "normalized_value_ball": str(value / math.factorial(d)),
            "strictly_negative": bool(value < 0),
        },
    }


# Set in main and read only by selector_witness; keeping the rank explicit
# avoids inferring it from an interval data tuple.
weights_global: list[arb] = []


def main() -> None:
    global weights_global
    ctx.prec = BITS
    N = d = 7
    p_sp = scaled_seed(N, N)
    q_sp = scaled_seed(N - 1, N)
    r_sp = scaled_seed(N - 2, N)
    H_sp = sp.Poly(
        sp.expand(q_sp.as_expr() ** 2 - p_sp.as_expr() * r_sp.as_expr()),
        X,
        domain=sp.ZZ,
    )
    Q_expr = sp.cancel(H_sp.as_expr() / (7 * X**2))
    Q_sp = sp.Poly(Q_expr, X, domain=sp.ZZ)
    assert sp.expand(H_sp.as_expr() - 7 * X**2 * Q_sp.as_expr()) == 0
    assert Q_sp.degree() == 10 and Q_sp.LC() == 1
    assert sp.gcd(Q_sp, Q_sp.diff()).degree() == 0

    p = to_fmpz_poly(p_sp)
    q = to_fmpz_poly(q_sp)
    Q = to_fmpz_poly(Q_sp)
    p_derivative = p.derivative()

    p_roots_with_multiplicity = p.complex_roots()
    q_roots_with_multiplicity = Q.complex_roots()
    assert len(p_roots_with_multiplicity) == N
    assert all(multiplicity == 1 for _, multiplicity in p_roots_with_multiplicity)
    assert len(q_roots_with_multiplicity) == 10
    assert all(multiplicity == 1 for _, multiplicity in q_roots_with_multiplicity)

    p_roots = sorted(
        [root for root, _ in p_roots_with_multiplicity],
        key=lambda root: float(root.real),
    )
    assert all(0 in root.imag for root in p_roots)
    upper_roots = sorted(
        [root for root, _ in q_roots_with_multiplicity if root.imag > 0],
        key=lambda root: (float(root.real), float(root.imag)),
    )
    lower_roots = [
        root for root, _ in q_roots_with_multiplicity if root.imag < 0
    ]
    assert len(upper_roots) == len(lower_roots) == 5

    weights = []
    for root in p_roots:
        value = q(root) / p_derivative(root)
        assert 0 in value.imag
        weights.append(value.real)
    weights_global = weights
    weight_sum = sum(weights, arb(0))
    assert 7 in weight_sum

    records = []
    sqrt7 = arb(7).sqrt()
    for choice in range(32):
        selected = [
            root.conjugate() if choice & (1 << index) else root
            for index, root in enumerate(upper_roots)
        ]
        atoms = []
        for root in p_roots:
            bvalue = acb(sqrt7) * root
            for zero in selected:
                bvalue *= root - zero
            atoms.append(bvalue / p_derivative(root))
        record = selector_witness(subset_data(weights, atoms), d)
        record["choice"] = choice
        records.append(record)
        print(
            f"choice={choice:2d}: certified negative "
            f"{record['witness']['normalized_value_ball']}",
            flush=True,
        )

    assert len(records) == 32
    assert all(record["witness"]["strictly_negative"] for record in records)
    report = {
        "status": "PASS_CERTIFIED_OBSTRUCTION_ALL_32_FACTORS",
        "N": N,
        "d": d,
        "arb_precision_bits": BITS,
        "exact_factorization": str(sp.factor(H_sp.as_expr())),
        "p_root_balls": [str(root) for root in p_roots],
        "Q_upper_root_balls": [str(root) for root in upper_roots],
        "weight_sum_ball": str(weight_sum),
        "factor_choices": 32,
        "choices_with_certified_negative_coefficient": 32,
        "records": records,
        "scope": (
            "Certified Arb root balls and outward-rounded interval arithmetic "
            "prove that every scalar spectral factor has at least one negative "
            "principal-minor selector coefficient at N=d=7.  This rules out "
            "coefficientwise selector positivity, not stability of G_(7,7)."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(REPORT)


if __name__ == "__main__":
    main()
