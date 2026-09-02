#!/usr/bin/env python3
"""Test the raw lift integrand after the application shift c=1+C.

The exact reduced residual integrands were exported as sparse
polynomials in z,w,c,m,s,x after removal of the common positive
factor (Z+W)^(2m+epsilon-4).  For the surviving intersection range
c>=1, substitute c=1+C by an exact sparse binomial transform and
check every resulting coefficient.
"""

from __future__ import annotations

import json
import math
from collections import defaultdict
from fractions import Fraction
from pathlib import Path


def main() -> None:
    records = []
    total_negative = 0
    cone_records = []
    total_cone_negative = 0
    for parity in (0, 1):
        source_path = Path(
            "path_isolate_p4_group_integrand_stable_"
            f"parity{parity}_terms_20260730.json"
        )
        source = json.loads(source_path.read_text(encoding="utf-8"))
        transformed: dict[tuple[int, ...], Fraction] = defaultdict(
            Fraction
        )
        for item in source["terms"]:
            powers = tuple(item["monomial_z_w_c_m_s_x"])
            coefficient = Fraction(item["coefficient"])
            c_power = powers[2]
            for shifted_power in range(c_power + 1):
                shifted_powers = (
                    powers[0],
                    powers[1],
                    shifted_power,
                    powers[3],
                    powers[4],
                    powers[5],
                )
                transformed[shifted_powers] += (
                    coefficient
                    * math.comb(c_power, shifted_power)
                )
        transformed = {
            powers: coefficient
            for powers, coefficient in transformed.items()
            if coefficient
        }
        negative = [
            (powers, coefficient)
            for powers, coefficient in transformed.items()
            if coefficient < 0
        ]
        total_negative += len(negative)
        records.append(
            {
                "parity_epsilon": parity,
                "source": str(source_path),
                "source_term_count": len(source["terms"]),
                "transformed_term_count": len(transformed),
                "negative_coefficient_count": len(negative),
                "smallest_coefficient": str(
                    min(transformed.values())
                ),
                "first_negative_terms": [
                    {
                        "monomial_z_w_C_m_s_x": list(powers),
                        "coefficient": str(coefficient),
                    }
                    for powers, coefficient in negative[:50]
                ],
            }
        )

        # The application domain is c+m>=4.  Partition c>=1 into
        # four disjoint cones and exploit the corresponding m shift:
        # (1,3+M), (2,2+M), (3,1+M), (4+C,M).
        for c_base, m_base, variable_c, label in (
            (1, 3, False, "c=1,m=3+M"),
            (2, 2, False, "c=2,m=2+M"),
            (3, 1, False, "c=3,m=1+M"),
            (4, 0, True, "c=4+C,m=M"),
        ):
            cone: dict[tuple[int, ...], Fraction] = defaultdict(
                Fraction
            )
            for item in source["terms"]:
                powers = tuple(
                    item["monomial_z_w_c_m_s_x"]
                )
                coefficient = Fraction(item["coefficient"])
                c_power = powers[2]
                m_power = powers[3]
                c_terms = (
                    [
                        (
                            shifted_c,
                            math.comb(c_power, shifted_c)
                            * c_base ** (c_power - shifted_c),
                        )
                        for shifted_c in range(c_power + 1)
                    ]
                    if variable_c
                    else [(0, c_base**c_power)]
                )
                for shifted_c, c_coefficient in c_terms:
                    for shifted_m in range(m_power + 1):
                        shifted_powers = (
                            powers[0],
                            powers[1],
                            shifted_c,
                            shifted_m,
                            powers[4],
                            powers[5],
                        )
                        cone[shifted_powers] += (
                            coefficient
                            * c_coefficient
                            * math.comb(m_power, shifted_m)
                            * m_base ** (m_power - shifted_m)
                        )
            cone = {
                powers: coefficient
                for powers, coefficient in cone.items()
                if coefficient
            }
            cone_negative = [
                (powers, coefficient)
                for powers, coefficient in cone.items()
                if coefficient < 0
            ]
            total_cone_negative += len(cone_negative)
            cone_records.append(
                {
                    "parity_epsilon": parity,
                    "domain": label,
                    "term_count": len(cone),
                    "negative_coefficient_count": len(
                        cone_negative
                    ),
                    "smallest_coefficient": str(
                        min(cone.values())
                    ),
                    "first_negative_terms": [
                        {
                            "monomial_z_w_C_M_s_x": list(
                                powers
                            ),
                            "coefficient": str(coefficient),
                        }
                        for powers, coefficient in cone_negative[:30]
                    ],
                }
            )

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_POSITIVE_INTERSECTION_RAW_INTEGRAND"
            if total_negative == 0
            else "FAIL_PATH_ISOLATE_P4_POSITIVE_INTERSECTION_RAW_INTEGRAND"
        ),
        "substitution": "c=1+C",
        "domain_if_pass": (
            "C,m,s,x>=0, both parities, with the exported common "
            "factor interpreted on its supported d>=4 range"
        ),
        "negative_coefficient_count": total_negative,
        "records": records,
        "application_cone_status": (
            "PASS_APPLICATION_CONES"
            if total_cone_negative == 0
            else "FAIL_APPLICATION_CONES"
        ),
        "application_cone_negative_coefficient_count": (
            total_cone_negative
        ),
        "application_cone_records": cone_records,
    }
    Path(
        "path_isolate_p4_positive_intersection_raw_integrand_"
        "20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    if total_negative:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
