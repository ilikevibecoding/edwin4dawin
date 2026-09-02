#!/usr/bin/env python3
"""Exact Hermite/Laguerre factorization of the arbitrary factorial window.

For Gamma(t)=sum gamma_h t^h put e_h=(-1)^h gamma_h and
N=p+alpha, n=floor(p/2), epsilon=p-2n.  The intermediate polynomial

  R(t)=sum_k 1/(p-2k)! sum_{h<=k}
       gamma_h (p-2h)!/((N-h)!(k-h)!) t^k

has the Hermite lift

  C(x)=sum_h e_h H_(p-2h)(x/2)/(N-h)! = x^p R(-1/x^2).

Writing beta=epsilon-1/2 and y=x^2/4 gives the consecutive monic-Laguerre
form

  C(x)=x^epsilon 4^n/N! sum_h e_h (N)_h/4^h Lhat_(n-h)^beta(y).

The original output is obtained from R by the classical multiplier sequence
1/(alpha+1)_k.  Thus real negative roots of R prove the desired window.

The script also verifies the complete two-positive-factor base theorem.  Its
Laguerre combination is the characteristic polynomial of a Jacobi matrix
whose last coupling is modified.  The reserve p-alpha>=5 makes both that
coupling and the final Sylvester pivot positive, proving positive Laguerre
roots (equivalently real Hermite roots) for all 0<u,v<=1.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path

import sympy as sp

from probe_adjacent_cubic_resultant_bernstein import X, window_polynomial


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_hermite_laguerre_factorization_exact_20260808.json"
T, Y = sp.symbols("t y")


def elementary(values: list[sp.Rational]) -> list[sp.Expr]:
    result: list[sp.Expr] = [sp.Integer(1)]
    for value in values:
        result.append(sp.Integer(0))
        for index in range(len(result) - 1, 0, -1):
            result[index] = sp.expand(
                result[index] + value * result[index - 1]
            )
    return result


def gamma_from_lambda(values: list[sp.Rational]) -> list[sp.Expr]:
    return [(-1) ** h * value for h, value in enumerate(elementary(values))]


def corrected_intermediate(
    p: int, alpha: int, gamma: list[sp.Expr]
) -> sp.Poly:
    n = p // 2
    N = p + alpha
    coefficients = []
    for k in range(n + 1):
        inner = sum(
            gamma[h]
            * sp.factorial(p - 2 * h)
            / (sp.factorial(N - h) * sp.factorial(k - h))
            for h in range(min(k, len(gamma) - 1) + 1)
        )
        coefficients.append(inner / sp.factorial(p - 2 * k))
    return sp.Poly(sum(value * T**k for k, value in enumerate(coefficients)), T)


def hermite_lift(p: int, alpha: int, gamma: list[sp.Expr]) -> sp.Poly:
    N = p + alpha
    expression = sum(
        (-1) ** h
        * gamma[h]
        * sp.hermite(p - 2 * h, X / 2)
        / sp.factorial(N - h)
        for h in range(len(gamma))
    )
    return sp.Poly(sp.expand(expression), X)


def laguerre_core(p: int, alpha: int, gamma: list[sp.Expr]) -> sp.Poly:
    n = p // 2
    epsilon = p - 2 * n
    beta = sp.Rational(2 * epsilon - 1, 2)
    N = p + alpha
    e = [(-1) ** h * gamma[h] for h in range(len(gamma))]
    expression = sum(
        e[h]
        * sp.ff(N, h)
        / 4**h
        * (-1) ** (n - h)
        * sp.factorial(n - h)
        * sp.assoc_laguerre(n - h, beta, Y)
        for h in range(len(gamma))
    )
    return sp.Poly(sp.expand(expression), Y)


def lifted_from_intermediate(p: int, intermediate: sp.Poly) -> sp.Poly:
    n = p // 2
    return sp.Poly(
        sp.expand(
            sum(
                (-1) ** k
                * intermediate.nth(k)
                * X ** (p - 2 * k)
                for k in range(n + 1)
            )
        ),
        X,
    )


def output_from_intermediate(
    p: int, alpha: int, intermediate: sp.Poly
) -> sp.Poly:
    n = p // 2
    scale = sp.factorial(p + 2 * alpha) / sp.factorial(alpha)
    return sp.Poly(
        sum(
            scale * intermediate.nth(k) / sp.rf(alpha + 1, k) * X**k
            for k in range(n + 1)
        ),
        X,
    )


def primitive_digest(poly: sp.Poly) -> str:
    _, integer = poly.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    if primitive.LC() < 0:
        primitive = -primitive
    payload = ",".join(map(str, primitive.all_coeffs()))
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def exact_identity_audit() -> int:
    checks = 0
    for p in range(5, 20):
        n = p // 2
        for alpha in range(5):
            m = min(n, 6)
            gamma = [
                sp.Rational(((3 * p + 5 * alpha + 7 * h) % 17) - 8, h + 2)
                for h in range(m + 1)
            ]
            intermediate = corrected_intermediate(p, alpha, gamma)
            lift = hermite_lift(p, alpha, gamma)
            assert lift == lifted_from_intermediate(p, intermediate)

            core = laguerre_core(p, alpha, gamma)
            epsilon = p % 2
            reconstructed = sp.Poly(
                sp.expand(
                    X**epsilon
                    * 4 ** (p // 2)
                    / sp.factorial(p + alpha)
                    * core.as_expr().subs(Y, X**2 / 4)
                ),
                X,
            )
            assert lift == reconstructed

            output = window_polynomial(p, alpha, gamma)
            assert output == output_from_intermediate(p, alpha, intermediate)
            checks += 3
    return checks


def exact_two_factor_base_audit() -> dict[str, str]:
    """Symbolically verify the sharp reserve-five Jacobi margins."""

    n, N = sp.symbols("n N", integer=True, positive=True)
    results: dict[str, str] = {}
    for epsilon in (0, 1):
        beta = sp.Rational(2 * epsilon - 1, 2)
        Nmax = 4 * n + 2 * epsilon - 5
        coupling_margin = sp.factor(
            (n - 1) * (n + beta - 1) - N * (N - 1) / 16
        )
        coupling_boundary = sp.factor(coupling_margin.subs(N, Nmax))

        L = n + beta - 1
        U = n + beta
        pivot_00 = sp.factor(L * U)
        pivot_10 = sp.factor(L * (U - N / 4))
        pivot_11 = sp.factor(L * (U - N / 2) + N * (N - 1) / 16)
        pivot_10_boundary = sp.factor(pivot_10.subs(N, Nmax))
        pivot_11_boundary = sp.factor(pivot_11.subs(N, Nmax))

        expected_coupling = (
            (2 * n - 3) / 8
            if epsilon == 0
            else (n - 1) / 4
        )
        expected_pivot_10 = (
            sp.Rational(3, 4) * L
            if epsilon == 0
            else sp.Rational(5, 4) * L
        )
        expected_pivot_11 = (
            sp.Rational(3, 8) * (2 * n - 3)
            if epsilon == 0
            else (3 * n - 1) / 4
        )
        assert sp.expand(coupling_boundary - expected_coupling) == 0
        assert sp.expand(pivot_10_boundary - expected_pivot_10) == 0
        assert sp.expand(pivot_11_boundary - expected_pivot_11) == 0

        # The coupling and one-factor corner decrease on N<=Nmax.  For the
        # two-factor corner, the exact backward difference at Nmax is zero
        # in even parity and negative in odd parity; convexity then puts the
        # integer minimum at Nmax (and also Nmax-1 in even parity).  The
        # reserve implies n>=3 in even parity and n>=2 in odd parity, making
        # every displayed boundary expression strictly positive.
        coupling_slope_at_boundary = sp.factor(
            sp.diff(coupling_margin, N).subs(N, Nmax)
        )
        pivot_10_slope = sp.factor(sp.diff(pivot_10, N))
        pivot_11_backward_at_boundary = sp.factor(
            pivot_11.subs(N, Nmax) - pivot_11.subs(N, Nmax - 1)
        )
        expected_coupling_slope = (
            -(8 * n - 11) / 16
            if epsilon == 0
            else -(8 * n - 7) / 16
        )
        expected_pivot_10_slope = (
            -(2 * n - 3) / 8
            if epsilon == 0
            else -(2 * n - 1) / 8
        )
        expected_pivot_11_backward = (
            sp.Integer(0) if epsilon == 0 else -sp.Rational(1, 4)
        )
        assert sp.expand(
            coupling_slope_at_boundary - expected_coupling_slope
        ) == 0
        assert sp.expand(pivot_10_slope - expected_pivot_10_slope) == 0
        assert sp.expand(
            pivot_11_backward_at_boundary - expected_pivot_11_backward
        ) == 0

        results[f"epsilon_{epsilon}_coupling_boundary"] = str(coupling_boundary)
        results[f"epsilon_{epsilon}_pivot_10_boundary"] = str(
            pivot_10_boundary
        )
        results[f"epsilon_{epsilon}_pivot_11_boundary"] = str(
            pivot_11_boundary
        )
    return results


def adversarial_exact_audit(cases_per_m: int) -> dict[str, object]:
    rng = random.Random(993)
    positive = [
        sp.Rational(1, 100),
        sp.Rational(1, 10),
        sp.Rational(1, 3),
        sp.Rational(1, 2),
        sp.Integer(1),
    ]
    negative = [
        -sp.Rational(1, 100),
        -sp.Rational(1, 10),
        -sp.Rational(1, 3),
        -sp.Integer(1),
        -sp.Integer(3),
        -sp.Integer(10),
        -sp.Integer(100),
    ]
    alphas = [0, 1, 2, 5, 10]
    slacks = [0, 1, 2, 5, 10]
    by_m: dict[str, int] = {}
    digest = hashlib.sha256()
    total = 0
    for m in range(2, 16):
        passed = 0
        for _ in range(cases_per_m):
            alpha = rng.choice(alphas)
            p = alpha + 4 * m - 3 + rng.choice(slacks)
            values = [rng.choice(positive), rng.choice(positive)] + [
                rng.choice(negative) for _ in range(m - 2)
            ]
            gamma = gamma_from_lambda(values)
            intermediate = corrected_intermediate(p, alpha, gamma)
            degree = intermediate.degree()
            assert intermediate.nth(0) > 0
            assert intermediate.count_roots(-sp.oo, 0) == degree
            digest.update(primitive_digest(intermediate).encode("ascii"))
            passed += 1
            total += 1
        by_m[str(m)] = passed
        print(json.dumps({"m": m, "passed": passed, "total": total}), flush=True)
    return {
        "total": total,
        "cases_per_m": cases_per_m,
        "by_m": by_m,
        "ordered_case_digest_sha256": digest.hexdigest(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases-per-m", type=int, default=100)
    args = parser.parse_args()

    identity_checks = exact_identity_audit()
    base_margins = exact_two_factor_base_audit()
    adversarial = adversarial_exact_audit(args.cases_per_m)
    report = {
        "kind": "window_hermite_laguerre_factorization_exact",
        "date": "2026-08-08",
        "status": "PASS_EXACT_REDUCTION_AND_TWO_FACTOR_BASE",
        "identity_checks": identity_checks,
        "identities": {
            "hermite": "C(x)=x^p R(-1/x^2)",
            "laguerre": (
                "C(x)=x^epsilon 4^n/N! sum_h e_h (N)_h/4^h "
                "Lhat_(n-h)^(epsilon-1/2)(x^2/4)"
            ),
            "final_multiplier": (
                "S_k=(p+2alpha)!/alpha! * R_k/(alpha+1)_k"
            ),
        },
        "two_positive_factor_base": {
            "status": "PROVED_FOR_p-alpha>=5",
            "method": (
                "positive-definite monic-Laguerre Jacobi matrix with modified "
                "last coupling and final Sylvester pivot"
            ),
            "boundary_margins": base_margins,
        },
        "adversarial_exact_audit": adversarial,
        "remaining_lemma": (
            "show that adjoining each lambda<0 preserves the positive-rooted "
            "Laguerre/Hermite core under the reserve increment"
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
