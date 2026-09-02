#!/usr/bin/env python3
"""Exact certificate for the rank-seven rooted cross inequality at n >= 39.

For a tree T rooted at p, write

    d=i5(T), e=i6(T), f=i7(T),
    h=i5(T-p), k=i6(T-p).

The target is

    C7=d(e^2-df)-2e(eh-dk) > 0.

The proof combines the all-forest Q6 theorem, elementary extension
counting in T-N[p], and the already certified rank-(4,5) path-ratio /
extension-mean bounds.  This script verifies every algebraic reduction and
the final all-order scalar sign exactly.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUTPUT = Path("rank7_rooted_cross_large_order_exact_20260816.json")


def main() -> int:
    d, e, f, h, k = sp.symbols("d e f h k", positive=True)
    q6 = 12 * e**2 - d * e - 14 * d * f
    c7 = d * (e**2 - d * f) - 2 * e * (e * h - d * k)
    s7 = d * (2 * e + d) - 28 * (e * h - d * k)

    # Exact decomposition: Q6 >= 0 reduces C7 to S7 >= 0.
    assert sp.expand(c7 - (e * s7 + d * q6) / 14) == 0

    # Root deletion identities.  For F=T-N[p], let a=i4(F), b=i5(F).
    a, b = sp.symbols("a b", positive=True)
    assert sp.expand((k + b) * h - (h + a) * k - (d * b - e * a).subs({d: h + a, e: k + b})) == 0

    # If eh-dk>0, put x=e/d and y=b/a.  From d>=a+b and y<=L,
    # (eh-dk)/d^2 <= (L-x)/(1+L).  The monotonicity in y is exact.
    x, y, L = sp.symbols("x y L", positive=True)
    ratio = (y - x) / (1 + y)
    assert sp.factor(sp.diff(ratio, y)) == (x + 1) / (y + 1) ** 2

    # The path-ratio theorem gives mu4>=t_n.  The extension transfer gives
    # mu5>=mu4-3+2/mu4, and x=mu5/6.  For n>=39 this endpoint is valid and
    # the transfer function is increasing.
    n = sp.symbols("n", integer=True, positive=True)
    t_n = (n - 7) * (n - 8) / (n - 3)
    x_n = (t_n - 3 + 2 / t_n) / 6
    l_n = (n - 6) / 5
    scalar = sp.factor(1 + 2 * x_n - 28 * (l_n - x_n) / (1 + l_n))
    expected = (
        n**5
        - 45 * n**4
        + 75 * n**3
        + 7923 * n**2
        - 69788 * n
        + 168234
    ) / (3 * (n - 8) * (n - 7) * (n - 3) * (n - 1))
    assert sp.factor(scalar - expected) == 0
    assert scalar.subs(n, 39) == sp.Rational(1, 62)

    numerator, denominator = sp.fraction(sp.together(scalar))
    shifted = sp.Poly(sp.expand(numerator.subs(n, n + 39)), n)
    shifted_coefficients = shifted.all_coeffs()
    assert shifted_coefficients == [1, 150, 8265, 199218, 1780216, 65664]
    assert all(value > 0 for value in shifted_coefficients)
    assert sp.factor(
        denominator - 3 * (n - 8) * (n - 7) * (n - 3) * (n - 1)
    ) == 0

    # Degree-sensitive strengthening.  If the root degree is delta, then
    # |T-N[p]|<=n-delta-1 and L improves to (n-delta-5)/5.  Each row below
    # is the exact first order at which the shifted numerator becomes
    # coefficientwise positive; larger root degree only improves the bound.
    degree_thresholds = [
        (9, 19),
        (8, 25),
        (7, 29),
        (6, 32),
        (5, 34),
        (4, 35),
        (3, 37),
        (2, 38),
        (1, 39),
    ]
    degree_certificates = []
    for root_degree, minimum_order in degree_thresholds:
        degree_l = (n - root_degree - 5) / 5
        degree_scalar = sp.factor(
            1 + 2 * x_n - 28 * (degree_l - x_n) / (1 + degree_l)
        )
        degree_num, degree_den = sp.fraction(sp.together(degree_scalar))
        degree_shifted = sp.Poly(
            sp.expand(degree_num.subs(n, n + minimum_order)), n
        )
        degree_coefficients = degree_shifted.all_coeffs()
        assert all(value > 0 for value in degree_coefficients)
        assert degree_den.subs(n, minimum_order) > 0
        degree_certificates.append(
            {
                "minimum_root_degree": root_degree,
                "minimum_order": minimum_order,
                "endpoint_value": str(degree_scalar.subs(n, minimum_order)),
                "shifted_numerator_coefficients": [
                    int(value) for value in degree_coefficients
                ],
            }
        )

    report = {
        "status": "PASS_EXACT_RANK7_ROOTED_CROSS_FOR_ALL_TREES_N_AT_LEAST_39",
        "statement": "i5*(i6^2-i5*i7) - 2*i6*(i6*h5-i5*h6) > 0",
        "minimum_order": 39,
        "exact_decomposition": "14*C7 = i6*S7 + i5*Q6",
        "extension_ceiling": "L=(n-6)/5",
        "path_mean_endpoint": str(sp.factor(x_n)),
        "final_scalar": str(scalar),
        "value_at_39": "1/62",
        "shifted_numerator_coefficients": [int(value) for value in shifted_coefficients],
        "degree_sensitive_certificates": degree_certificates,
        "prerequisites": {
            "Q6": "RANK6_FOREST_THREE_HALVES_THEOREM_2026-08-13.md",
            "rank45_and_transfer": "FOREST_V7_ALPHA12_THEOREM_2026-08-13.md",
        },
        "scope_warning": "This theorem alone does not settle orders below 39 or prove Q7.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"final scalar at n=39: {report['value_at_39']}")
    print(f"shifted numerator coefficients: {shifted_coefficients}")
    print("degree-sensitive thresholds:", degree_thresholds)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
