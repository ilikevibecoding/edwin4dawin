#!/usr/bin/env python3
"""Prove initial multiplicative recurrences for the c>=1 quotient.

Starting from the exact support formulas through s=3, derive the first
four formal quotient coefficients Q_k after removing
(1+z)^(2c+2m+x-1).  For c=1+C, certify the coefficient forms of

  Q(c+1,m,x) >= (1+2z)^2 Q(c,m,x),
  Q_actual(c,m+1,x) >= (1+2z)^2 Q_actual(c,m,x),
  Q(c,m,x+1) >= (1+2z) Q(c,m,x).

The actual m-recurrence includes the central-binomial normalization
ratio.  In odd parity Q has an initial z factor; the same recurrences
hold before or after that common shift.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


def simplify_exact(expression: sp.Expr) -> sp.Expr:
    return sp.factor(sp.cancel(sp.expand_func(expression)))


def certificate(
    expression: sp.Expr,
    C: sp.Symbol,
    m: sp.Symbol,
    x: sp.Symbol,
) -> dict:
    numerator, denominator = map(
        sp.factor, sp.fraction(simplify_exact(expression))
    )
    numerator_poly = sp.Poly(
        sp.expand(numerator), C, m, x
    )
    denominator_poly = sp.Poly(
        sp.expand(denominator), C, m, x
    )
    numerator_terms = numerator_poly.terms()
    negative_numerator = [
        (monomial, coefficient)
        for monomial, coefficient in numerator_terms
        if coefficient < 0
    ]
    negative_denominator = [
        (monomial, coefficient)
        for monomial, coefficient in denominator_poly.terms()
        if coefficient < 0
    ]
    canonical = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in numerator_terms
    )
    return {
        "denominator": str(denominator),
        "degree_C_m_x": list(numerator_poly.degree_list()),
        "numerator_term_count": len(numerator_terms),
        "negative_numerator_coefficient_count": len(
            negative_numerator
        ),
        "negative_denominator_coefficient_count": len(
            negative_denominator
        ),
        "smallest_numerator_coefficient": min(
            int(coefficient)
            for _, coefficient in numerator_terms
        ),
        "numerator_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
    }


def main() -> None:
    c, C, m, x = sp.symbols(
        "c C m x", integer=True, nonnegative=True
    )
    source_path = Path(
        "path_isolate_p4_general_layer_lift_boundary_"
        "s3_20260730.json"
    )
    source = json.loads(source_path.read_text(encoding="utf-8"))
    values: dict[int, dict[int, sp.Expr]] = {
        0: {},
        1: {-1: sp.Integer(0)},
    }
    for item in source["certificates"]:
        values[item["parity_epsilon"]][
            item["support_distance_s"]
        ] = sp.sympify(
            item["lift_residual_over_central_binomial"],
            locals={"c": c, "m": m, "x": x},
        )

    exponent = 2 * c + 2 * m + x - 1
    records = []
    total_failures = 0
    for parity in (0, 1):
        row = [
            values[parity][support]
            for support in (-1, 0, 1, 2, 3)
        ]
        newton = []
        for _ in range(4):
            newton.append(simplify_exact(row[0]))
            row = [
                simplify_exact(row[index + 1] - row[index])
                for index in range(len(row) - 1)
            ]

        quotient = []
        for order, coefficient in enumerate(newton):
            value = coefficient - sum(
                (
                    sp.binomial(exponent, shift)
                    * quotient[order - shift]
                    for shift in range(1, order + 1)
                ),
                sp.Integer(0),
            )
            quotient.append(simplify_exact(value))

        central_ratio = (
            2 * (2 * m + 1) / (m + 1)
            if parity == 0
            else 2 * (2 * m + 3) / (m + 2)
        )
        for order, coefficient in enumerate(quotient):
            previous = (
                quotient[order - 1]
                if order >= 1
                else sp.Integer(0)
            )
            previous2 = (
                quotient[order - 2]
                if order >= 2
                else sp.Integer(0)
            )
            residuals = {
                "c": simplify_exact(
                    coefficient.subs(c, c + 1)
                    - coefficient
                    - 4 * previous
                    - 4 * previous2
                ),
                "m": simplify_exact(
                    central_ratio
                    * coefficient.subs(m, m + 1)
                    - coefficient
                    - 4 * previous
                    - 4 * previous2
                ),
                "x": simplify_exact(
                    coefficient.subs(x, x + 1)
                    - coefficient
                    - 2 * previous
                ),
            }
            item = {
                "parity_epsilon": parity,
                "quotient_order": order,
            }
            for coordinate, residual in residuals.items():
                print(
                    f"certifying epsilon={parity}, "
                    f"order={order}, coordinate={coordinate}",
                    flush=True,
                )
                result = certificate(
                    residual.subs(c, C + 1),
                    C,
                    m,
                    x,
                )
                item[f"{coordinate}_recurrence"] = result
                total_failures += (
                    result[
                        "negative_numerator_coefficient_count"
                    ]
                    + result[
                        "negative_denominator_coefficient_count"
                    ]
                )
            records.append(item)

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_POSITIVE_INTERSECTION_"
            "INITIAL_MULTIPLICATIVE_RECURRENCE"
            if total_failures == 0
            else "FAIL_PATH_ISOLATE_P4_POSITIVE_INTERSECTION_"
            "INITIAL_MULTIPLICATIVE_RECURRENCE"
        ),
        "source": str(source_path),
        "domain": (
            "c=1+C with C,m,x>=0, epsilon in {0,1}"
        ),
        "factorization": (
            "F=(1+z)^(2c+2m+x-1)Q; Q has a z factor "
            "when epsilon=1"
        ),
        "proved_recurrences": {
            "c": "Q(c+1,m,x)>=(1+2z)^2 Q(c,m,x)",
            "m": "Q_actual(c,m+1,x)>=(1+2z)^2 Q_actual(c,m,x)",
            "x": "Q(c,m,x+1)>=(1+2z) Q(c,m,x)",
        },
        "proved_quotient_orders": [0, 1, 2, 3],
        "certificate_count": len(records) * 3,
        "negative_coefficient_count": total_failures,
        "records": records,
    }
    output_path = Path(
        "path_isolate_p4_positive_intersection_initial_"
        "multiplicative_recurrence_order0_to_3_20260730.json"
    )
    output_path.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if total_failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
