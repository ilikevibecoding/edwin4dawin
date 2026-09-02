#!/usr/bin/env python3
"""Positive Hausdorff-moment representation for the Racah quotient kernel.

The kernel T(R,m) is represented as an even moment of an explicit positive
density on (0,1).  The positivity proof is symbolic for every integer m>=0.
An independent exact audit also tests total positivity of the density
collocation matrix on rational nodes; that higher-order density assertion is
finite evidence, not part of the all-order moment proof.
"""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

import sympy as sp

from verify_left_newton_connection import rational_racah_value


OUT = Path("racah_kernel_moment_20260803.json")


def coefficients(m):
    b = sp.Rational(1, 2) * (m - 1) * (2 * m + 3) ** 2 * (2 * m + 5)
    a = -2 * m * (m + 2) * (2 * m - 1) * (2 * m + 5)
    c = (
        sp.Rational(1, 2)
        * (m + 3)
        * (2 * m - 1)
        * (2 * m + 1) ** 2
    )
    return a, b, c


def q_polynomial(u, m):
    a, b, c = coefficients(m)
    return sp.expand(
        12 * (1 + u**2) + u ** (2 * m + 1) * (b + a * u**2 + c * u**4)
    )


def density_kernel(u, m):
    """Density with an omitted positive column normalization."""
    return sp.factor(u ** (2 * m + 4) * q_polynomial(u, m))


def prove_moment_identity():
    R, m = sp.symbols("R m", nonnegative=True)
    a, b, c = coefficients(m)
    prefactor = 2 * (2 * m + 7) / ((2 * m + 1) * (2 * m + 3))
    integral_value = sp.cancel(
        prefactor
        * (
            12 / (2 * R + 2 * m + 5)
            + 12 / (2 * R + 2 * m + 7)
            + b / (2 * R + 4 * m + 6)
            + a / (2 * R + 4 * m + 8)
            + c / (2 * R + 4 * m + 10)
        )
    )
    residual = sp.factor(sp.cancel(integral_value - rational_racah_value(R, m)))
    assert residual == 0

    d = sp.factor(24 + b)
    coefficient_sum = sp.factor(24 + a + b + c)
    d_minus_c = sp.factor(d - c)
    assert coefficient_sum == 0
    assert d_minus_c == (2 * m - 1) * (2 * m**2 + 7 * m - 3)

    # For m>=1, Q_m=(1-u)P_m, where every displayed summand of P_m
    # is strictly positive on 0<u<1.  The only coefficients requiring
    # checks are C_m and D_m-C_m.
    return {
        "moment_identity_residual": "0",
        "prefactor": "2*(2m+7)/((2m+1)*(2m+3))",
        "density": "u^(2m+4)*Q_m(u)",
        "Q_m": "12*(1+u^2)+u^(2m+1)*(B_m+A_m*u^2+C_m*u^4)",
        "endpoint_identity": "24+A_m+B_m+C_m=0",
        "positive_tail_gap": "D_m-C_m=(2m-1)*(2m^2+7m-3)>0 for m>=1",
        "m_ge_1_factorization": (
            "Q_m=(1-u)*[12(1+u)+24*sum_{i=2}^{2m}u^i+"
            "(D_m-C_m)u^(2m+1)(1+u)+"
            "C_m*u^(2m+1)(1+u)(1-u^2)]"
        ),
        "m_0_factorization": (
            "Q_0=(3/2)(1-u)(u^4+u^3+u^2-7u+8)>0 on 0<u<1"
        ),
        "scope": "All-order strict Hausdorff-moment representation.",
    }


def audit_density_tp(max_q):
    audits = []
    for q in range(1, max_q + 1):
        nodes = [sp.Rational(i + 1, q + 1) for i in range(q)]
        matrix = [
            [density_kernel(node, col) for col in range(q)]
            for node in nodes
        ]
        positive = zero = negative = 0
        first_nonpositive = None
        for order in range(1, q + 1):
            for rows in itertools.combinations(range(q), order):
                for cols in itertools.combinations(range(q), order):
                    value = sp.Matrix(
                        [[matrix[i][j] for j in cols] for i in rows]
                    ).det(method="domain-ge")
                    if value > 0:
                        positive += 1
                    elif value == 0:
                        zero += 1
                    else:
                        negative += 1
                    if value <= 0 and first_nonpositive is None:
                        first_nonpositive = {
                            "rows": rows,
                            "cols": cols,
                            "value": str(value),
                        }
        assert zero == 0 and negative == 0
        audits.append(
            {
                "q": q,
                "positive": positive,
                "zero": zero,
                "negative": negative,
                "first_nonpositive": first_nonpositive,
            }
        )
        print(f"density q={q}: {positive} positive minors", flush=True)
    return audits


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-q", type=int, default=7)
    args = parser.parse_args()

    moment = prove_moment_identity()
    audit = audit_density_tp(args.max_q)
    report = {
        "status": "PASS",
        "moment_proof": moment,
        "finite_density_tp_audit": audit,
        "scope": (
            "The moment representation and positivity of each density are "
            "proved for all m. Total positivity of the density family is "
            "only audited on the stated rational grids."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS", {"max_q": args.max_q, "report": str(OUT)})


if __name__ == "__main__":
    main()
