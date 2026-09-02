#!/usr/bin/env python3
"""Exact capacity-edge reduction and concavity obstruction for Delta^7."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def choose_poly(z: sp.Expr, k: int) -> sp.Expr:
    return sp.prod(z - j for j in range(k)) / sp.factorial(k)


def main() -> None:
    coefficient = newton_coefficients(residual())[7]
    n = sp.symbols("n", integer=True, positive=True)
    S, D, E = sp.symbols("S D E", nonnegative=True)

    # The independent weak box h6=S*c6, h7=D*c7 is false: its corner
    # S=0,D=1 has a strictly negative coefficient.  This is not realizable,
    # because h7>0 implies h6>0.
    weak = sp.expand(
        coefficient.subs(
            {c[0]: 1, c[1]: n, c[2]: choose_poly(n - 1, 2), h[6]: S * c[6], h[7]: D * c[7]},
            simultaneous=True,
        )
    )
    weak_corner = sp.factor(weak.subs({S: 0, D: 1}))
    assert weak_corner == -126 * c[7] ** 3

    # The exact extension capacity in H=A-q is
    #   7*h7 <= (|H|-6)h6 <= (n-7)h6.
    # Parameterize h7=E*(n-7)h6/7 and h6=S*c6.  The resulting coefficient is
    # separately concave in S,E for n>=8.
    capacity = sp.expand(
        coefficient.subs(
            {
                c[0]: 1,
                c[1]: n,
                c[2]: choose_poly(n - 1, 2),
                h[6]: S * c[6],
                h[7]: E * (n - 7) * S * c[6] / 7,
            },
            simultaneous=True,
        )
    )
    second_E = sp.factor(sp.diff(capacity, E, 2))
    assert second_E == -36 * S**2 * c[6] ** 2 * c[7] * (n - 7) ** 2 / 7
    G = (
        18 * E**2 * (n - 7) ** 2
        + E * (-256 * n**2 + 1535 * n + 1799)
        + 504 * n**2
        - 448 * n
        + 1064
    )
    second_S = sp.factor(sp.diff(capacity, S, 2))
    assert sp.expand(second_S + 2 * c[6] ** 2 * c[7] * G / 7) == 0
    derivative_G_at_1 = sp.factor(sp.diff(G, E).subs(E, 1))
    assert sp.expand(derivative_G_at_1 + 220 * n**2 - 1031 * n - 3563) == 0
    shifted_negative = sp.Poly(
        sp.expand((-derivative_G_at_1).subs(n, n + 8)), n
    )
    assert all(value > 0 for value in shifted_negative.all_coeffs())
    assert sp.expand(G.subs(E, 1) - 266 * n**2 - 835 * n - 3745) == 0
    assert capacity.subs(S, 0) == 0

    # Coordinatewise concavity reduces the nonzero capacity endpoints to
    # (S,E)=(1,0),(1,1).  At either endpoint the expression is decreasing in
    # c8, so ordinary extension counting sends c8 to (n-7)c7/8.  The result
    # is concave in c7.
    endpoint_rows: list[dict[str, object]] = []
    endpoint_expressions: dict[int, sp.Expr] = {}
    for e_value in (0, 1):
        endpoint = sp.expand(capacity.subs({S: 1, E: e_value}))
        derivative8 = sp.factor(sp.diff(endpoint, c[8]))
        expected8 = -16 * c[6] * (47 * c[7] * n + 119 * c[7] + 16 * c[8])
        assert sp.expand(derivative8 - expected8) == 0
        after8 = sp.factor(endpoint.subs(c[8], (n - 7) * c[7] / 8))
        curvature7 = sp.factor(sp.diff(after8, c[7], 2))
        expected7 = -32 * c[6] * (49 * n**2 + 246 * n + 561)
        assert sp.expand(curvature7 - expected7) == 0
        endpoint_expressions[e_value] = after8
        endpoint_rows.append(
            {
                "capacity_endpoint_E": e_value,
                "d_dc8": str(derivative8),
                "d2_dc7": str(curvature7),
            }
        )

    # The proved Q6 defect interval has c7 endpoints
    #   (12c6^2/c5-k*c6)/14, k=7 (lower), k=1 (upper).
    # The selected-degree theorem ensures the lower endpoint is nonnegative
    # from n=18: 6c6/c5>=n-15+10/n>=7/2.
    mu5_margin = sp.factor(n - 15 + sp.Rational(10, 1) / n - sp.Rational(7, 2))
    assert sp.expand(mu5_margin - (2 * n**2 - 37 * n + 20) / (2 * n)) == 0
    shifted_margin = sp.Poly(sp.expand((2 * n * mu5_margin).subs(n, n + 18)), n)
    assert all(value > 0 for value in shifted_margin.all_coeffs())

    # A tempting repeat of the rank-seven D5-concavity step is genuinely
    # false.  At the feasible path P18 jet, capacity endpoint E=0 and upper
    # Q6 endpoint k=1, -d2/dc6^2 is strictly negative.
    y = sp.symbols("y", positive=True)
    d5_curvature_rows: list[dict[str, object]] = []
    obstruction = None
    for e_value in (0, 1):
        for k in (1, 7):
            d6_endpoint = (12 * y**2 / c[5] - k * y) / 14
            in_y = endpoint_expressions[e_value].subs(
                {c[6]: y, c[7]: d6_endpoint}, simultaneous=True
            )
            curvature = sp.factor(-sp.diff(in_y, y, 2))
            numerator, denominator = sp.fraction(sp.together(curvature))
            polynomial = sp.Poly(sp.expand(numerator), c[3], c[4], c[5], n, y)
            signs = sorted({int(sp.sign(value)) for _, value in polynomial.terms()})
            row = {
                "capacity_E": e_value,
                "D6_k": k,
                "curvature_numerator_terms": len(polynomial.terms()),
                "curvature_numerator_signs": signs,
            }
            d5_curvature_rows.append(row)
            if e_value == 0 and k == 1:
                path18 = {
                    n: 18,
                    c[3]: choose_poly(16, 3),
                    c[4]: choose_poly(15, 4),
                    c[5]: choose_poly(14, 5),
                    y: choose_poly(13, 6),
                }
                exact_value = sp.factor(curvature.subs(path18))
                assert exact_value == -sp.Rational(112776889827360, 2401)
                obstruction = {
                    "tree": "P18",
                    "independence_jet_c3_to_c6": [560, 1365, 2002, 1716],
                    "capacity_E": 0,
                    "D6_k": 1,
                    "minus_second_derivative": str(exact_value),
                    "consequence": "the D5 endpoint reduction by concavity is invalid even on a feasible tree jet",
                }
    assert obstruction is not None

    output = Path(__file__).with_name(
        "rank8_q8_terminal_delta7_capacity_reduction_exact_20260817.json"
    )
    payload = {
        "status": "PASS_EXACT_RANK8_TERMINAL_DELTA7_CAPACITY_REDUCTION_WITH_D5_OBSTRUCTION",
        "weak_box_failure": {
            "corner": "h6/c6=0, h7/c7=1",
            "value": str(weak_corner),
            "warning": "not realizable; extension capacity must be retained",
        },
        "proved_reduction": {
            "capacity": "7*h7<=(n-7)*h6",
            "range": "n>=18",
            "root_endpoints": ["(S,E)=(1,0)", "(S,E)=(1,1)"],
            "c8_endpoint": "c8=(n-7)c7/8",
            "c7_endpoints": ["(12c6^2/c5-c6)/14", "(12c6^2/c5-7c6)/14"],
            "endpoint_rows": endpoint_rows,
        },
        "D5_curvature_audit": d5_curvature_rows,
        "genuine_concavity_obstruction": obstruction,
        "warning": "This is an exact reduction, not a proof of Delta7>=0; an interior-D5 certificate is still required.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
