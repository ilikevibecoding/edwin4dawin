#!/usr/bin/env python3
"""Certify initial stronger recurrences from a bottom-pair artifact.

The source artifact contains exact rational formulas for the initial
coefficients P_k after normalization by the central binomial.  This
script proves the coefficient forms of

  P_actual(m+1,x) - (1+2z)^2 P_actual(m,x) >= 0,
  P_actual(m,x+1) - (1+2z) P_actual(m,x) >= 0.

After division by the old central binomial, these become

  rho_m P_k(m+1,x) - P_k - 4 P_(k-1) - 4 P_(k-2),
  P_k(m,x+1) - P_k - 2 P_(k-1),

where missing negative-index coefficients are zero.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from prove_path_isolate_p4_bottom_pair_initial_quotient import (
    certificate,
    simplify_exact,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=4)
    args = parser.parse_args()

    source_path = Path(
        "path_isolate_p4_bottom_pair_initial_quotient_"
        f"order0_to_{args.max_order}_20260730.json"
    )
    source = json.loads(source_path.read_text(encoding="utf-8"))
    M, x_value = sp.symbols(
        "M x", integer=True, nonnegative=True
    )
    locals_map = {"M": M, "x": x_value}
    records = []
    total_failures = 0
    for parity in (0, 1):
        parity_records = sorted(
            (
                item
                for item in source["records"]
                if item["parity_epsilon"] == parity
            ),
            key=lambda item: item["quotient_order"],
        )
        coefficients = [
            sp.sympify(
                item["coefficient"]["expression"],
                locals=locals_map,
            )
            for item in parity_records
        ]
        m_value = M + 3
        central_ratio = (
            2 * (2 * m_value + 1) / (m_value + 1)
            if parity == 0
            else 2 * (2 * m_value + 3) / (m_value + 2)
        )
        for order, coefficient in enumerate(coefficients):
            previous = (
                coefficients[order - 1]
                if order >= 1
                else sp.Integer(0)
            )
            previous2 = (
                coefficients[order - 2]
                if order >= 2
                else sp.Integer(0)
            )
            m_residual = simplify_exact(
                central_ratio
                * coefficient.subs(M, M + 1)
                - coefficient
                - 4 * previous
                - 4 * previous2
            )
            x_residual = simplify_exact(
                coefficient.subs(x_value, x_value + 1)
                - coefficient
                - 2 * previous
            )
            item = {
                "parity_epsilon": parity,
                "quotient_order": order,
                "m_multiplicative_recurrence": certificate(
                    m_residual, M, x_value
                ),
                "x_multiplicative_recurrence": certificate(
                    x_residual, M, x_value
                ),
            }
            for key in (
                "m_multiplicative_recurrence",
                "x_multiplicative_recurrence",
            ):
                total_failures += (
                    item[key][
                        "negative_numerator_coefficient_count"
                    ]
                    + item[key][
                        "negative_denominator_coefficient_count"
                    ]
                )
            records.append(item)

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_INITIAL_"
            "MULTIPLICATIVE_RECURRENCE"
            if total_failures == 0
            else "FAIL_PATH_ISOLATE_P4_BOTTOM_PAIR_INITIAL_"
            "MULTIPLICATIVE_RECURRENCE"
        ),
        "source": str(source_path),
        "domain": "m>=3, x>=0, epsilon in {0,1}",
        "factorization": "F=z(1+z)^(2m+x-1)P",
        "proved_recurrences": {
            "m": "P_actual(m+1,x)>=(1+2z)^2 P_actual(m,x)",
            "x": "P_actual(m,x+1)>=(1+2z) P_actual(m,x)",
        },
        "proved_quotient_orders": list(
            range(args.max_order + 1)
        ),
        "negative_coefficient_count": total_failures,
        "records": records,
    }
    output_path = Path(
        "path_isolate_p4_bottom_pair_initial_multiplicative_"
        f"recurrence_order0_to_{args.max_order}_20260730.json"
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
