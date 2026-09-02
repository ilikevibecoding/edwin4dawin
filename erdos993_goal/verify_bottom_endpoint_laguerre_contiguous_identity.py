#!/usr/bin/env python3
"""Exact certificates for the bottom endpoint's contiguous Laguerre pair."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_group_reserve_reverse_borel_laguerre_identity import (
    A,
    G,
    Q,
    T,
    X,
    Y,
    base_family,
    borel,
    laguerre_seed,
)


OUT = Path("bottom_endpoint_laguerre_contiguous_identity_certificate_20260802.json")
tau = sp.symbols("tau")


def main() -> None:
    checks = []

    fixed_defect_cases = 0
    for defect in (3, 4):
        for n in range(defect, 15):
            lhs = laguerre_seed(n, n - defect, X)
            rhs = (
                sp.factorial(n - defect)
                / sp.factorial(n)
                * X**defect
                * sp.assoc_laguerre(n - defect, defect, -X)
            )
            assert sp.expand(lhs - rhs) == 0
            fixed_defect_cases += 1
    checks.append(
        {
            "name": "fixed_defect_Laguerre_factorization",
            "cases": fixed_defect_cases,
            "passed": True,
        }
    )

    contiguous_cases = 0
    for n, a, b in ((6, 2, 3), (9, 5, 5), (12, 8, 7), (10, 6, 4)):
        kernel = A**a * T**b
        p_direct = borel(kernel * G * T, n)
        p_shift = base_family(n, a + 1, b + 3) - base_family(n - 1, a, b + 1)
        assert sp.expand(p_direct - p_shift) == 0

        q_direct = borel(kernel * Q * A * ((b + 2) * G + 2 * Q), n)
        q_shift = (b + 2) * base_family(n - 1, a + 2, b + 2) - b * base_family(
            n - 2, a + 1, b
        )
        assert sp.expand(q_direct - q_shift) == 0
        contiguous_cases += 1
    checks.append(
        {
            "name": "bare_bottom_contiguous_pair",
            "cases": contiguous_cases,
            "passed": True,
        }
    )

    formal_derivative_cases = 0
    for a, b in ((2, 3), (5, 5), (8, 7), (6, 4)):
        core = A**a * tau**b * (A * tau**2 - Q)
        lhs = sp.expand(Q * A * tau * sp.diff(core, tau))
        rhs = sp.expand(
            A**a * tau**b * Q * A * ((b + 2) * (A * tau**2 - Q) + 2 * Q)
        )
        assert sp.expand(lhs - rhs) == 0
        formal_derivative_cases += 1
    checks.append(
        {
            "name": "coupled_tail_as_formal_T_derivative",
            "cases": formal_derivative_cases,
            "passed": True,
        }
    )

    endpoint_cases = 0
    for m in range(1, 21):
        n, a, b = 3 * m + 3, 3 * m - 1, 2 * m + 1
        assert a == n - 4
        assert 3 * b == 2 * n - 3
        endpoint_cases += 1
    checks.append(
        {
            "name": "bottom_endpoint_fixed_defect_arithmetic",
            "cases": endpoint_cases,
            "passed": True,
        }
    )

    report = {
        "kind": "bottom_endpoint_laguerre_contiguous_identity_certificate",
        "date": "2026-08-02",
        "status": "PASS_EXACT_IDENTITIES",
        "seed_factorization": (
            "P_N^(N-d)(X)=((N-d)!/N!)*X^d*L_(N-d)^(d)(-X), d in {3,4}"
        ),
        "bottom_endpoint_parameters": "N=3m+3, a=N-4, b=2m+1, 3b=2N-3",
        "proper_position_first_block": "P=B_N^(a+1,b+3)-B_(N-1)^(a,b+1)",
        "proper_position_second_block": (
            "Q=(b+2)B_(N-1)^(a+2,b+2)-b B_(N-2)^(a+1,b)"
        ),
        "formal_derivative": (
            "A^a*T^b*q*A*((b+2)G+2q)=q*A*T*d/dT[A^a*T^b*G]"
        ),
        "remaining_lemma": (
            "Prove P+UQ real stable for a=N-4 and 3b=2N-3; "
            "sampled evidence supports the orientation P << Q."
        ),
        "checks": checks,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "checks": checks, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
