"""Exact obstruction: fiberwise conditional compatibility alone does not imply M1."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial


HERE = Path(__file__).resolve().parent
REPORT = HERE / "endpoint_compatibility_not_sufficient_for_m1_exact_20260812.json"
T, U, Z = sp.symbols("t u z")


def main() -> None:
    H = (T + sp.Rational(1, 100)) * (T + sp.Rational(1, 1000))
    coherent = sp.expand(H * (T + 1 + 2 * U) ** 2)

    # Every positive-u fiber is negative-rooted, with the displayed exact
    # linear-factor decomposition.  Taking the two conditional leaves equal
    # makes their common interlacer and the endpoint-mixture identity trivial.
    conditional_u = coherent
    conditional_minus_one = coherent
    mixture = sp.cancel((conditional_u + U * conditional_minus_one) / (U + 1))
    assert sp.expand(mixture - coherent) == 0

    diagonal = sp.factor(coherent.subs(U, -T))
    expected_diagonal = sp.factor(H * (1 - T) ** 2)
    assert sp.expand(diagonal - expected_diagonal) == 0
    gamma_poly = sp.Poly(diagonal, T)
    gamma = [gamma_poly.nth(index) for index in range(5)]

    q = duran_polynomial(9, gamma)
    q_monic = sp.Poly(sp.monic(q.as_expr(), Z), Z)
    expected_q = sp.Poly(
        Z**4
        + sp.Rational(4953, 2) * Z**3
        + 447527 * Z**2
        - 1121286 * Z
        + 1181250,
        Z,
    )
    assert q_monic == expected_q
    assert q_monic.count_roots(-2281, -2280) == 1
    assert q_monic.count_roots(-199, -198) == 1
    assert q_monic.count_roots(-sp.oo, sp.oo) == 2

    benign_product_upper = sp.Integer(2281 * 199)
    residual_product_lower = sp.Rational(q_monic.TC(), benign_product_upper)
    first_margin_base = sp.Rational(3, 2)
    assert residual_product_lower > first_margin_base

    payload = {
        "kind": "endpoint_compatibility_not_sufficient_for_m1_exact",
        "date": "2026-08-12",
        "status": "PASS_EXACT_ENDPOINT_COMPATIBILITY_ALONE_NOT_SUFFICIENT_FOR_M1",
        "coherent_family": str(coherent),
        "fiber_factorization": "(t+1/100)(t+1/1000)(t+1+2u)^2",
        "fiber_statement": (
            "For every u>0 all four fiber roots are negative. Choosing both "
            "conditional leaves equal to this fiber gives a common interlacer "
            "and (K_u+u*K_-1)/(u+1)=Q identically."
        ),
        "diagonal_u_equals_minus_t": str(diagonal),
        "diagonal_roots": ["1", "1", "-1/100", "-1/1000"],
        "duran_normalization": {"P": 9, "alpha": 0, "m": 4, "A": "3/2"},
        "monic_duran_polynomial": str(q_monic.as_expr()),
        "negative_root_intervals": [[-2281, -2280], [-199, -198]],
        "benign_product_upper": str(benign_product_upper),
        "residual_product_lower": str(residual_product_lower),
        "first_margin_base": str(first_margin_base),
        "conclusion": (
            "Fiberwise negative-rootedness and compatibility of the two leaves "
            "do not by themselves imply the diagonal Duran M1 bound. Any valid "
            "endpoint route must retain additional path-determinant relations."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": payload["status"],
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "report_sha256": hashlib.sha256(REPORT.read_bytes()).hexdigest().upper(),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
