#!/usr/bin/env python3
"""Exact generating kernel for the complete defect-three seed sequence.

The Chebyshev/Borel identity sums in N to a single truncated exponential.
For derivative order r>=2 the truncation disappears, leaving an ordinary
Sheffer kernel.  The script certifies the univariate generating function and
the closed two-block directional-derivative kernel used at the endpoint.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("defect3_exponential_generating_kernel_certificate_20260802.json")


def main() -> None:
    t, u, x, y, w = sp.symbols("t u x y w")
    psi_t = t / (1 - t) ** 2
    psi_u = u / (1 - u) ** 2
    c_t = (1 - t) ** 2 / t**2
    c_u = (1 - u) ** 2 / u**2
    closed_t = c_t * (sp.exp(x * psi_t) - 1 - x * psi_t)
    closed_u = c_u * (sp.exp(y * psi_u) - 1 - y * psi_u)
    defect1_closed_t = (sp.exp(x * psi_t) - 1) / t

    # Coefficientwise verification using the binomial expansion of
    # (1-t)^(-2k+2), avoiding a large symbolic exponential series.
    seed_checks = []
    for N in range(2, 32):
        coefficient = sp.expand(
            sum(
                sp.binomial(N + k - 3, N - k) * x**k / sp.factorial(k)
                for k in range(2, N + 1)
            )
        )
        expected = hypergeometric_form(N, 3).subs(X, x)
        assert sp.expand(coefficient - expected) == 0
        seed_checks.append(N)

    defect1_seed_checks = []
    for N in range(1, 32):
        coefficient = sp.expand(
            sum(
                sp.binomial(N + k - 1, N - k) * x**k / sp.factorial(k)
                for k in range(1, N + 1)
            )
        )
        expected = hypergeometric_form(N, 1).subs(X, x)
        assert sp.expand(coefficient - expected) == 0
        defect1_seed_checks.append(N)

    derivative_checks = []
    for r in range(2, 11):
        derivative_closed = sp.diff(closed_t, x, r)
        expected_closed = t ** (r - 2) / (1 - t) ** (2 * r - 2) * sp.exp(x * psi_t)
        assert sp.factor(derivative_closed / expected_closed) == 1
        for N in range(max(3, r), 26):
            actual = sp.diff(hypergeometric_form(N, 3).subs(X, x), x, r)
            coefficient = sp.expand(
                sum(
                    sp.binomial(N + r + k - 3, N - r - k)
                    * x**k
                    / sp.factorial(k)
                    for k in range(N - r + 1)
                )
            )
            assert sp.expand(coefficient - actual) == 0
            derivative_checks.append({"r": r, "N": N})

    defect1_derivative_checks = []
    for r in range(1, 11):
        derivative_closed = sp.diff(defect1_closed_t, x, r)
        expected_closed = t ** (r - 1) / (1 - t) ** (2 * r) * sp.exp(x * psi_t)
        assert sp.factor(derivative_closed / expected_closed) == 1
        for N in range(max(2, r), 26):
            actual = sp.diff(hypergeometric_form(N, 1).subs(X, x), x, r)
            coefficient = sp.expand(
                sum(
                    sp.binomial(N + r + k - 1, N - r - k)
                    * x**k
                    / sp.factorial(k)
                    for k in range(N - r + 1)
                )
            )
            assert sp.expand(coefficient - actual) == 0
            defect1_derivative_checks.append({"r": r, "N": N})

    # For d>=3, differentiate the shifted product in w.  The polynomial x,y
    # subtraction terms contribute only through the three displayed edge
    # corrections; the polynomial-polynomial product has degree two in w.
    block_checks = []
    a, b = sp.symbols("a b")
    shifted_product = (
        sp.exp(a * (x + w)) - 1 - a * (x + w)
    ) * (
        sp.exp(b * (y + w)) - 1 - b * (y + w)
    )
    for d in range(3, 11):
        actual = sp.diff(shifted_product, w, d).subs(w, 0)
        expected = (
            (a + b) ** d * sp.exp(a * x) * sp.exp(b * y)
            - sp.exp(a * x) * (a**d * (1 + b * y) + d * b * a ** (d - 1))
            - sp.exp(b * y) * (b**d * (1 + a * x) + d * a * b ** (d - 1))
        )
        assert sp.expand(actual - expected) == 0
        block_checks.append(d)

    defect1_block_checks = []
    defect1_shifted = (sp.exp(a * (x + w)) - 1) * (sp.exp(b * (y + w)) - 1)
    for d in range(1, 11):
        actual = sp.diff(defect1_shifted, w, d).subs(w, 0)
        expected = (
            (a + b) ** d * sp.exp(a * x) * sp.exp(b * y)
            - a**d * sp.exp(a * x)
            - b**d * sp.exp(b * y)
        )
        assert sp.expand(actual - expected) == 0
        defect1_block_checks.append(d)

    def k1(order: int) -> sp.Expr:
        return (
            (a + b) ** order * sp.exp(a * x) * sp.exp(b * y)
            - a**order * sp.exp(a * x)
            - b**order * sp.exp(b * y)
        ) / (t * u)

    group_factor_checks = []
    for smoothing in range(1, 22, 2):
        left = (
            k1(smoothing + 4)
            - 2 * t * u * k1(smoothing + 2)
            + t**2 * u**2 * k1(smoothing)
        )
        right = (
            sp.exp(a * x)
            * sp.exp(b * y)
            * (a + b) ** smoothing
            * ((a + b) ** 2 - t * u) ** 2
            - sp.exp(a * x) * a**smoothing * (a**2 - t * u) ** 2
            - sp.exp(b * y) * b**smoothing * (b**2 - t * u) ** 2
        ) / (t * u)
        assert sp.expand(left - right) == 0
        group_factor_checks.append(smoothing)

    report = {
        "kind": "defect3_exponential_generating_kernel_certificate",
        "date": "2026-08-02",
        "status": "PASS_EXACT_DEFECT1_AND_DEFECT3_EXPONENTIAL_KERNELS",
        "seed_generating_function": (
            "sum_{N>=2} g_N(x)t^(N-2)=(1-t)^2/t^2*"
            "(exp(x t/(1-t)^2)-1-x t/(1-t)^2)"
        ),
        "derivative_kernel": (
            "sum g_N^(r)(x)t^(N-2)=t^(r-2)/(1-t)^(2r-2)*"
            "exp(x t/(1-t)^2), r>=2"
        ),
        "defect1_seed_generating_function": (
            "sum_{N>=1} g_(N,1)(x)t^(N-1)=(exp(x t/(1-t)^2)-1)/t"
        ),
        "defect1_derivative_kernel": (
            "sum g_(N,1)^(r)(x)t^(N-1)=t^(r-1)/(1-t)^(2r)*"
            "exp(x t/(1-t)^2), r>=1"
        ),
        "seed_range_N": [2, 31],
        "seed_checks": len(seed_checks),
        "defect1_seed_range_N": [1, 31],
        "defect1_seed_checks": len(defect1_seed_checks),
        "derivative_orders": [2, 10],
        "derivative_coefficient_checks": len(derivative_checks),
        "defect1_derivative_orders": [1, 10],
        "defect1_derivative_coefficient_checks": len(defect1_derivative_checks),
        "two_block_orders": [3, 10],
        "two_block_kernel_checks": len(block_checks),
        "defect1_two_block_orders": [1, 10],
        "defect1_two_block_kernel_checks": len(defect1_block_checks),
        "group_Q_squared_factor_checks": len(group_factor_checks),
        "consequence": (
            "Every endpoint directional derivative is a diagonal coefficient "
            "of one positive exponential term plus two explicit edge corrections."
        ),
        "warning": (
            "The coefficient representation is exact; stability of the required "
            "diagonal coefficient pencil remains to be proved."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
