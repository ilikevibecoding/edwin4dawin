"""Exact replay of the lower-selector coherent-pencil reduction."""

from __future__ import annotations

import json
from math import comb
from pathlib import Path

import sympy as sp

from verify_lower_qsharp_reduction import path_gamma, selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_coherent_pencil_exact_20260810.json"
T = sp.symbols("t")


def poly(coefficients: list[sp.Expr]) -> sp.Poly:
    return sp.Poly(sum(value * T**j for j, value in enumerate(coefficients)), T)


def wronskian(f: sp.Expr, g: sp.Expr) -> sp.Expr:
    return sp.expand(sp.diff(f, T) * g - f * sp.diff(g, T))


def zero_order(p: sp.Poly) -> int:
    for j in range(p.degree() + 1):
        if p.nth(j) != 0:
            return j
    return p.degree() + 1


def choose(n: int, k: int) -> int:
    return comb(n, k) if n >= 0 and 0 <= k <= n else 0


def main() -> None:
    selector_cases = 0
    wronskian_cases = 0
    turan_cases = 0
    terminal_cases = 0

    for N in range(4, 16):
        for s in range(2, 2 * N - 5):
            rows = [poly(path_gamma(N - q, s)) for q in range(3)]
            gamma = poly(selector_gamma(N, s))
            forced = max(0, s - N + 1)
            core = sp.Poly(sp.cancel(gamma.as_expr() / T**forced), T)
            expected_negative = s // 2 - forced
            assert core.count_roots(-sp.oo, 0) == expected_negative
            assert core.count_roots(1, sp.oo) == 2
            selector_cases += 1

            w01 = wronskian(rows[0].as_expr(), rows[1].as_expr())
            w02 = wronskian(rows[0].as_expr(), rows[2].as_expr())
            w12 = wronskian(rows[1].as_expr(), rows[2].as_expr())
            discriminant = sp.Poly(sp.expand(w02**2 - 4 * w01 * w12), T)
            order = zero_order(discriminant)
            disc_core = sp.Poly(
                sp.cancel(discriminant.as_expr() / T**order), T
            )
            assert order % 2 == 0
            assert disc_core.LC() < 0
            assert disc_core.count_roots(-sp.oo, sp.oo) == 0
            wronskian_cases += 1

            turan = sp.Poly(
                sp.expand(rows[1].as_expr() ** 2 - rows[0].as_expr() * rows[2].as_expr()),
                T,
            )
            assert not turan.is_zero
            assert all(turan.nth(j) >= 0 for j in range(turan.degree() + 1))
            assert any(turan.nth(j) > 0 for j in range(turan.degree() + 1))
            turan_cases += 1

        s = 2 * N - 5
        gamma = poly(selector_gamma(N, s))
        forced = N - 4
        core = sp.Poly(sp.cancel(gamma.as_expr() / T**forced), T)
        c0 = 4 * (choose(N + 4, 8) + choose(N + 3, 8))
        c1 = 4 * sum(choose(3, k) * choose(N + 5 - k, 8) for k in range(4))
        c2 = 4 * (choose(N + 1, 4) + choose(N, 4))
        assert core == sp.Poly(c0 + c1 * T - c2 * T**2, T)
        assert core.count_roots(-sp.oo, 0) == 1
        assert core.count_roots(0, sp.oo) == 1
        terminal_cases += 1

    report = {
        "status": "PASS_EXACT_LOWER_SELECTOR_COHERENT_PENCIL_REPLAY",
        "selector_cases": selector_cases,
        "wronskian_discriminant_cases": wronskian_cases,
        "coefficientwise_turan_cases": turan_cases,
        "terminal_formula_cases": terminal_cases,
        "range": "4<=N<=15, 2<=s<=2N-6, plus s=2N-5 terminal",
        "scope": (
            "The convexity/unit-interval reduction and terminal formula are all-order. "
            "Wronskian-discriminant negativity and Turan positivity are finite evidence."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
