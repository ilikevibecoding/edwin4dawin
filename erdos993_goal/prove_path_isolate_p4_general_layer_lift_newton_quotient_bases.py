#!/usr/bin/env python3
"""Prove positivity of the reduced Newton polynomial on base pairs.

If the observed coordinatewise monotonicity of the reduced polynomial
P(c,m,x,epsilon;z) is proved, every admissible c+m>=4 reduces to one
of the five pairs c+m=4 at x=0.  This script computes those ten finite
base polynomials exactly and certifies every coefficient is
nonnegative.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_general_layer_lift_newton_factor import (
    divide_by_one_plus_z,
)
from stress_path_isolate_p4_general_layer_lift_newton_quotient_monotonicity import (
    reduced_polynomial,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def main() -> None:
    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    records = []
    try:
        for parity in (0, 1):
            for c in range(5):
                m = 4 - c
                coefficients = reduced_polynomial(
                    c, m, 0, parity
                )
                negative = [
                    (order, coefficient)
                    for order, coefficient in enumerate(coefficients)
                    if coefficient < 0
                ]
                assert not negative
                canonical = "\n".join(
                    f"{order}:{coefficient}"
                    for order, coefficient in enumerate(coefficients)
                )
                records.append(
                    {
                        "parity_epsilon": parity,
                        "c": c,
                        "m": m,
                        "x": 0,
                        "degree": len(coefficients) - 1,
                        "coefficient_count": len(coefficients),
                        "leading_zero_count": next(
                            (
                                order
                                for order, coefficient in enumerate(
                                    coefficients
                                )
                                if coefficient != 0
                            ),
                            len(coefficients),
                        ),
                        "minimum_nonzero_coefficient": min(
                            coefficient
                            for coefficient in coefficients
                            if coefficient > 0
                        ),
                        "coefficient_gcd": math.gcd(*coefficients),
                        "negative_coefficient_count": len(negative),
                        "coefficient_sha256": hashlib.sha256(
                            canonical.encode("utf-8")
                        ).hexdigest(),
                    }
                )
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_"
            "NEWTON_QUOTIENT_BASES"
        ),
        "factor_removed": "(1+z)^(2c+2m+x-1)",
        "base_domain": (
            "c,m>=0, c+m=4, x=0, epsilon in {0,1}"
        ),
        "base_polynomial_count": len(records),
        "certificates": records,
        "conditional_consequence": (
            "Coefficientwise monotonicity of the reduced polynomial "
            "in c,m,x would propagate these ten bases to every "
            "admissible parameter tuple."
        ),
    }
    Path(
        "path_isolate_p4_general_layer_lift_newton_quotient_"
        "bases_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
