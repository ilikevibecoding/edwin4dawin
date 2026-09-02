#!/usr/bin/env python3
"""Exact replay for the independent-grade Q-sharp parent no-go."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_lower_qsharp_reduction import (
    gamma_to_palindromic,
    qsharp_binary,
    selector_gamma,
)


HERE = Path(__file__).resolve().parent
OUT = HERE / "qsharp_independent_grade_parent_nogo_exact_20260810.json"
z, t = sp.symbols("z t")


def main() -> None:
    inverse_checks = 0
    coefficient_checks = 0

    # In symmetric polarization coordinates, B_P is diagonal with the
    # nonzero eigenvalues binom(P,j); hence its inverse on Qsharp is exactly C_s.
    for d in range(5, 13):
        for r in range(d - 4):
            N = d + r
            for s in range(r + 1, N + r + 1):
                P = d + s
                pre = gamma_to_palindromic(selector_gamma(N, s), P)
                qsharp = qsharp_binary(P, selector_gamma(N, s))
                recovered = [
                    sp.cancel(qsharp[j] / sp.binomial(P, j)) for j in range(P + 1)
                ]
                assert recovered == pre
                inverse_checks += 1
                coefficient_checks += P + 1

    # First exact lower cell.
    N, d, s = 5, 5, 1
    P = d + s
    gamma_coeffs = selector_gamma(N, s)
    gamma = sp.Poly(sum(c * t**j for j, c in enumerate(gamma_coeffs)), t)
    assert gamma == sp.Poly(4 * (t - 1) * (t - 2), t)

    pre = gamma_to_palindromic(gamma_coeffs, P)
    cpoly = sp.Poly(sum(pre[j] * z**j for j in range(P + 1)), z)
    expected_c = sp.Poly(4 * (z + 1) ** 2 * (z**2 + z + 1) * (2 * z**2 + 3 * z + 2), z)
    assert cpoly == expected_c
    assert sp.discriminant(z**2 + z + 1, z) == -3
    assert sp.discriminant(2 * z**2 + 3 * z + 2, z) == -7
    assert cpoly.count_roots(-sp.oo, sp.oo) == 1
    assert sp.gcd(cpoly, cpoly.diff()).monic().as_expr() == z + 1

    qcoeff = qsharp_binary(P, gamma_coeffs)
    qpoly = sp.Poly(sum(qcoeff[j] * z**j for j in range(P + 1)), z)
    expected_q = sp.Poly(
        4 * (2 * z**6 + 54 * z**5 + 285 * z**4 + 480 * z**3 + 285 * z**2 + 54 * z + 2),
        z,
    )
    assert qpoly == expected_q
    assert sp.gcd(qpoly, qpoly.diff()).degree() == 0
    assert qpoly.count_roots(-sp.oo, 0) == 6

    rho = sp.symbols("rho", real=True)
    quadratic = rho * z**2 + (2 * rho - 1) * z + rho
    quadratic_discriminant = sp.factor(sp.discriminant(quadratic, z))
    assert quadratic_discriminant == 1 - 4 * rho

    report = {
        "status": "PASS",
        "theorem": (
            "No jointly stable symmetric-slot parent can produce Qsharp by a slot-only "
            "B_P followed by an independent standard fixed-s coefficient extraction."
        ),
        "reason": (
            "B_P commutes with the extraction and is invertible, forcing the pre-B slice "
            "to be Pol(C_s); coefficient extraction would make it stable, but C_s has "
            "nonreal roots from the two positive selector-gamma roots."
        ),
        "inverse_cell_checks": inverse_checks,
        "inverse_coefficient_checks": coefficient_checks,
        "first_witness": {"N": N, "d": d, "s": s, "P": P},
        "first_witness_C_distinct_real_roots": int(cpoly.count_roots(-sp.oo, sp.oo)),
        "first_witness_C_real_root_multiplicity": 2,
        "first_witness_C_degree": cpoly.degree(),
        "first_witness_Qsharp_negative_roots": int(qpoly.count_roots(-sp.oo, 0)),
        "gamma_root_quadratic_discriminant": str(quadratic_discriminant),
        "remaining_lemma": (
            "Construct one stable contraction coupling path grade and shared-slot "
            "allocation, so its (s,j) action does not commute into a stable C_s slice."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "report": str(OUT)}))


if __name__ == "__main__":
    main()
