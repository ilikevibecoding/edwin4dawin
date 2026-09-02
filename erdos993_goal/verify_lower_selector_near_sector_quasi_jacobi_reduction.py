#!/usr/bin/env python3
"""Exact replay for the near-sector quasi-Jacobi reduction.

The theorem in the companion note is all-order.  The bounded lower-selector
sweep here is only exact diagnostic evidence for its remaining root ceiling.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_lower_selector_tail3_flint_full import path_gamma, selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_near_sector_quasi_jacobi_exact_20260813.json"


def symbolic_replay() -> dict[str, str]:
    K, theta, u, v = sp.symbols("K theta u v", positive=True)
    jacobi_x, alpha, beta = sp.symbols("jacobi_x alpha beta")
    for degree in range(2, 8):
        connection = (
            (2 * degree + alpha + beta + 1)
            * sp.jacobi(degree, alpha, beta, jacobi_x)
            - (degree + alpha + beta + 1)
            * sp.jacobi(degree, alpha, beta + 1, jacobi_x)
            - (degree + alpha)
            * sp.jacobi(degree - 1, alpha, beta + 1, jacobi_x)
        )
        assert sp.simplify(sp.expand_func(connection)) == 0

    c = K / (K + 1)
    psi = (
        u * v
        + 4 * (u + v) * (1 - theta) / K
        - 16 * theta * (1 - theta) / (K * (K + 1))
    )
    lower = sp.factor(
        K**2
        * psi.subs({u: 1 / K, v: 1 / K})
    )
    expected = sp.factor(9 - 8 * theta - 16 * c * theta * (1 - theta))
    assert sp.factor(lower - expected) == 0

    theta_star = sp.factor(sp.Rational(3, 4) + 1 / (4 * K))
    minimum = sp.factor(expected.subs(theta, theta_star))
    assert sp.factor(minimum - (3 * K - 1) / (K * (K + 1))) == 0

    G0, G1, G2 = sp.symbols("G0 G1 G2", positive=True)
    gamma_at_K = G0 - 2 * K * G1 + K**2 * G2
    turan_split = ((K * G2 - G1) ** 2 + (G0 * G2 - G1**2)) / G2
    assert sp.factor(gamma_at_K - turan_split) == 0

    return {
        "jacobi_connection_replay_degrees": "2 through 7",
        "psi": str(psi),
        "K_squared_psi_lower_bound": str(expected),
        "theta_minimizer": str(theta_star),
        "minimum": str(minimum),
        "gamma_K_turan_split": str(turan_split),
    }


def finite_sturm_audit(max_d: int = 20) -> dict[str, object]:
    t = sp.symbols("t")
    cells = 0
    failures: list[dict[str, object]] = []
    closest_fixed_point_ratio: tuple[sp.Rational, tuple[int, ...]] | None = None

    for d in range(5, max_d + 1):
        for r in range(d - 4):
            path_n = d + r
            for row_s in range(r + 1, path_n + r + 1):
                forced = max(0, row_s - path_n + 1)
                gamma = selector_gamma(path_n, row_s)[forced:]
                m = len(gamma) - 1
                if m < 7:
                    continue

                P = d + row_s
                p_effective = P - 2 * forced
                n = p_effective // 2
                x = n - m + 1
                beta_numerator = 1 if p_effective % 2 else -1
                A = sp.Rational(x * (2 * x + beta_numerator), 2)
                if not ((m - 2) ** 2 < A < (m - 1) ** 2):
                    continue

                K = d + row_s - forced - 1
                polynomial = sp.Poly(
                    sum(sp.Integer(value) * t**j for j, value in enumerate(gamma)),
                    t,
                )
                positive_roots = int(polynomial.count_roots(0, sp.oo))
                roots_above_K = int(polynomial.count_roots(K, sp.oo))

                G1 = path_gamma(path_n - 1, row_s)
                G2 = path_gamma(path_n - 2, row_s)
                value_G1 = sum(sp.Integer(value) * K**j for j, value in enumerate(G1))
                value_G2 = sum(sp.Integer(value) * K**j for j, value in enumerate(G2))
                fixed_point_margin = sp.Integer(K) * value_G2 - value_G1
                ratio = sp.Rational(value_G1, K * value_G2)
                cell = (d, r, row_s, forced, m, K)
                if closest_fixed_point_ratio is None or ratio > closest_fixed_point_ratio[0]:
                    closest_fixed_point_ratio = (ratio, cell)

                if positive_roots != 2 or roots_above_K != 0 or fixed_point_margin <= 0:
                    failures.append({
                        "cell": cell,
                        "positive_roots": positive_roots,
                        "roots_above_K": roots_above_K,
                        "fixed_point_margin": str(fixed_point_margin),
                    })
                cells += 1

    assert cells == 311
    assert not failures
    assert closest_fixed_point_ratio is not None
    return {
        "range": f"5<=d<={max_d}",
        "scope": "finite exact Sturm evidence, not an all-order theorem",
        "near_sector_cells": cells,
        "failures": failures,
        "largest_G1_over_KG2": str(closest_fixed_point_ratio[0]),
        "largest_G1_over_KG2_decimal": float(closest_fixed_point_ratio[0]),
        "largest_G1_over_KG2_cell": closest_fixed_point_ratio[1],
    }


def finite_integer_inequality_audit(max_d: int = 50) -> dict[str, object]:
    cells = 0
    parity_types: set[tuple[int, int]] = set()
    largest_ratio: tuple[sp.Rational, tuple[int, ...]] | None = None
    failures: list[dict[str, object]] = []
    for d in range(5, max_d + 1):
        for r in range(d - 4):
            path_n = d + r
            for row_s in range(r + 1, path_n + r + 1):
                forced = max(0, row_s - path_n + 1)
                m = row_s // 2 + 2 - forced
                if m < 7:
                    continue
                P = d + row_s
                p_effective = P - 2 * forced
                n = p_effective // 2
                x = n - m + 1
                beta_numerator = 1 if p_effective % 2 else -1
                A = sp.Rational(x * (2 * x + beta_numerator), 2)
                if not ((m - 2) ** 2 < A < (m - 1) ** 2):
                    continue

                sigma = row_s % 2
                e = 2 * m - d
                parity_types.add((e, sigma))
                K = d + row_s - forced - 1
                G1 = path_gamma(path_n - 1, row_s)
                G2 = path_gamma(path_n - 2, row_s)
                value_G1 = sum(sp.Integer(value) * K**j for j, value in enumerate(G1))
                value_G2 = sum(sp.Integer(value) * K**j for j, value in enumerate(G2))
                margin = sp.Integer(K) * value_G2 - value_G1
                ratio = sp.Rational(value_G1, K * value_G2)
                cell = (d, r, row_s, forced, m, K)
                if largest_ratio is None or ratio > largest_ratio[0]:
                    largest_ratio = (ratio, cell)
                if margin <= 0:
                    failures.append({"cell": cell, "margin": str(margin)})
                cells += 1

    assert parity_types == {(0, 0), (1, 0), (1, 1), (2, 1)}
    assert cells == 3131
    assert not failures
    assert largest_ratio is not None
    return {
        "range": f"5<=d<={max_d}",
        "scope": "finite exact integer evidence, not an all-order theorem",
        "near_sector_cells": cells,
        "parity_types": sorted(parity_types),
        "failures": failures,
        "largest_G1_over_KG2": str(largest_ratio[0]),
        "largest_G1_over_KG2_decimal": float(largest_ratio[0]),
        "largest_G1_over_KG2_cell": largest_ratio[1],
    }


def main() -> None:
    payload = {
        "kind": "lower_selector_near_sector_quasi_jacobi_reduction",
        "date": "2026-08-13",
        "status": "PASS_EXACT_NEAR_SECTOR_REDUCTION_D20_STURM_D50_INTEGER_AUDITS",
        "theorem": (
            "For m-2<R<m-1 the base polynomial has m-1 positive roots and "
            "one root in (-4,0).  Its unequal double polar derivative has all "
            "roots positive at z=R if u,v>=1/(B+m-2)."
        ),
        "remaining_gaps": [
            "Prove the path-specific selector-root ceiling rho_1,rho_2<=N_D-1 all-order.",
            "Extend the real-anchor orientation through the rotating half-angle sector.",
        ],
        "symbolic_replay": symbolic_replay(),
        "finite_sturm_audit": finite_sturm_audit(),
        "finite_integer_inequality_audit": finite_integer_inequality_audit(),
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("near_sector_cells", payload["finite_sturm_audit"]["near_sector_cells"])
    print("largest_G1_over_KG2_decimal", payload["finite_sturm_audit"]["largest_G1_over_KG2_decimal"])
    print("largest_G1_over_KG2_cell", payload["finite_sturm_audit"]["largest_G1_over_KG2_cell"])
    print("d50_integer_cells", payload["finite_integer_inequality_audit"]["near_sector_cells"])
    print("source_sha256", payload["source_sha256"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
