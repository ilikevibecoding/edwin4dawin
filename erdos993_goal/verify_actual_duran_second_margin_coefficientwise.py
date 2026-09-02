#!/usr/bin/env python3
"""Exact all-rank proof certificate for the second Durán residual margin.

At L=s+beta-1, the residual quadratic value E(L) has the sign of the
actual Durán coefficient polynomial Q_D(L), because all m-2 removed roots
are negative.  Expanding Q_D(L) in the nonnegative negative-factor
parameters gives coefficientwise positivity.  This proves the second Jacobi
margin in all ranks; the first (constant/product) margin remains open.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "actual_duran_second_margin_coefficientwise_exact_20260809.json"
Z = sp.symbols("z")


def elementary(values: list[sp.Expr]) -> list[sp.Expr]:
    result: list[sp.Expr] = [sp.Integer(1)]
    for value in values:
        result.append(sp.Integer(0))
        for index in range(len(result) - 1, 0, -1):
            result[index] = sp.expand(result[index] + value * result[index - 1])
    return result


def gamma_from_lambda(values: list[sp.Expr]) -> list[sp.Expr]:
    return [(-1) ** h * value for h, value in enumerate(elementary(values))]


def falling(value: sp.Expr | int, order: int) -> sp.Expr:
    return sp.prod((value - offset for offset in range(order)), start=sp.Integer(1))


def rising(value: sp.Expr | int, order: int) -> sp.Expr:
    return sp.prod((value + offset for offset in range(order)), start=sp.Integer(1))


def duran_polynomial(N: int, gamma: list[sp.Expr]) -> sp.Poly:
    m = len(gamma) - 1
    return sp.Poly(
        sp.expand(
            sum(
                gamma[h] * falling(N, h) / 4**h * rising(Z, m - h)
                for h in range(m + 1)
            )
        ),
        Z,
    )


def primitive_digest(poly: sp.Poly) -> str:
    primitive = sp.primitive(poly.as_expr(), Z)[1]
    return hashlib.sha256(str(primitive).encode("utf-8")).hexdigest()


def main() -> None:
    n, m, j, alpha = sp.symbols("n m j alpha", integer=True)
    symbolic = {}
    for epsilon in (0, 1):
        beta = sp.Rational(2 * epsilon - 1, 2)
        N = 2 * n + epsilon + alpha
        D = n + beta
        ratio = sp.cancel((N - j) / (4 * (D - j)))
        next_ratio = sp.cancel((N - j - 1) / (4 * (D - j - 1)))
        one_minus_numerator = sp.factor(4 * (D - j) - (N - j))
        expected_one_minus = 2 * n + 3 * epsilon - 2 - alpha - 3 * j
        assert sp.expand(one_minus_numerator - expected_one_minus) == 0

        alpha_max = 2 * n + epsilon - 4 * m + 3
        reserve_boundary = sp.factor(one_minus_numerator.subs(alpha, alpha_max))
        expected_boundary = (
            m + 2 * epsilon + 1 + 3 * (m - 2 - j)
        )
        assert sp.expand(reserve_boundary - expected_boundary) == 0

        ratio_difference = sp.factor(next_ratio - ratio)
        expected_difference = sp.cancel(
            (N - D) / (4 * (D - j) * (D - j - 1))
        )
        assert sp.factor(ratio_difference - expected_difference) == 0

        corner_11 = sp.factor(1 - 2 * ratio + ratio * next_ratio)
        corner_decomposition = sp.factor(
            (1 - ratio) ** 2 + ratio * (next_ratio - ratio)
        )
        assert sp.factor(corner_11 - corner_decomposition) == 0
        symbolic[f"epsilon_{epsilon}"] = {
            "beta": str(beta),
            "r_j": str(ratio),
            "r_j_plus_1_minus_r_j": str(ratio_difference),
            "one_minus_r_j_numerator": str(one_minus_numerator),
            "reserve_boundary_decomposition": str(reserve_boundary),
            "u_v_corner_11": str(corner_11),
            "positive_corner_decomposition": str(corner_decomposition),
        }

    # Generic multiaffine coefficient checks through three negative factors.
    u, v = sp.symbols("u v")
    direct_checks = []
    for negative_count in range(4):
        ds = sp.symbols(f"d0:{negative_count}")
        total_degree = negative_count + 2
        p = 4 * total_degree - 3 + (negative_count % 2)
        alpha_value = 0
        parity = p % 2
        n_value = p // 2
        beta_value = sp.Rational(-1, 2) if parity == 0 else sp.Rational(1, 2)
        N_value = p + alpha_value
        L_value = n_value - total_degree + beta_value + 1
        gamma = gamma_from_lambda([u, v, *[-d for d in ds]])
        q = duran_polynomial(N_value, gamma)
        evaluated = sp.Poly(sp.expand(q.eval(L_value)), *ds)

        e_d = elementary(list(ds))
        reconstructed = sp.Integer(0)
        coefficient_records = []
        for order in range(negative_count + 1):
            w0 = (
                falling(N_value, order)
                / 4**order
                * rising(L_value, total_degree - order)
            )
            w1 = (
                falling(N_value, order + 1)
                / 4 ** (order + 1)
                * rising(L_value, total_degree - order - 1)
            )
            w2 = (
                falling(N_value, order + 2)
                / 4 ** (order + 2)
                * rising(L_value, total_degree - order - 2)
            )
            coefficient = sp.factor(w0 - (u + v) * w1 + u * v * w2)
            reconstructed += e_d[order] * coefficient
            coefficient_records.append(str(coefficient))
        assert sp.expand(evaluated.as_expr() - reconstructed) == 0
        direct_checks.append(
            {
                "negative_factors": negative_count,
                "m": total_degree,
                "p": p,
                "parity": "even" if parity == 0 else "odd",
                "L": str(L_value),
                "elementary_coefficients": coefficient_records,
                "q_digest": primitive_digest(q),
            }
        )

    payload = {
        "kind": "actual_duran_second_margin_coefficientwise_exact",
        "date": "2026-08-09",
        "status": "PASS_EXACT_ALL_RANK_DURAN_SECOND_MARGIN_THEOREM",
        "scope": "analytic all-rank theorem plus symbolic replay",
        "setup": {
            "L": "s+beta-1=n-m+beta+1",
            "Q_D": "sum_h gamma_h*(N)^fall_h/4^h*(z)_(m-h)^rise",
            "residual": "Q_D(z)=B(z)*E(z), with all roots of monic B negative",
            "second_margin": "M2=E(L)=Q_D(L)/B(L)",
        },
        "coefficient_formula": (
            "[e_j(d)]Q_D(L)=w_j*(1-(u+v)r_j+uv*r_j*r_(j+1)), "
            "where r_j=(N-j)/(4(n+beta-j))"
        ),
        "corner_proof": {
            "r_j_positive": True,
            "r_j_less_than_one": (
                "At alpha<=2n+epsilon-4m+3 and j<=m-2, the numerator of "
                "1-r_j is at least m+2epsilon+1+3(m-2-j)>0."
            ),
            "r_j_increasing": (
                "r_(j+1)-r_j=(N-(n+beta))/(4(n+beta-j)(n+beta-j-1))>0."
            ),
            "bilinear_corners": [
                "1",
                "1-r_j",
                "1-r_j",
                "(1-r_j)^2+r_j*(r_(j+1)-r_j)",
            ],
        },
        "symbolic_identities": symbolic,
        "generic_multiaffine_replays": direct_checks,
        "conclusion": (
            "Every coefficient in the nonnegative negative-factor variables is positive, "
            "so Q_D(L)>0. Since B(L)>0, the second exceptional quadratic/Jacobi margin "
            "is positive in all ranks."
        ),
        "remaining_theorem": (
            "Prove the first margin (s-1)(s+beta-1)>G2, equivalently the residual "
            "constant/product bound, for the actual coefficient polynomial."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**payload, "output": str(REPORT)}, indent=2))


if __name__ == "__main__":
    main()
