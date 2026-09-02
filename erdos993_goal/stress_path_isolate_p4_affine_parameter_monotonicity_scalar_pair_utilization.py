#!/usr/bin/env python3
"""Stress the conjectured 3/4 reflected-pair reserve bound."""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
)
from stress_path_isolate_p4_affine_parameter_monotonicity_large_rays import (
    audit_components,
)


def audit(case, sources):
    package, parity, coordinate, c_value, m_value, x_value, r = case
    result = audit_components(
        package, parity, coordinate, c_value, m_value, x_value, r,
        sources[0], sources[1], store_components=True,
    )
    base = result["base_j_aggregates"]
    reserve = result["reserve_j_aggregates"]
    utilizations = []
    reserve_nonpositive = 0
    for j in range((r // 2) + 1):
        base_pair = base[j] + base[r - j]
        reserve_pair = reserve[j] + reserve[r - j]
        reserve_nonpositive += reserve_pair <= 0
        if base_pair < 0 and reserve_pair > 0:
            utilizations.append((j, Fraction(-base_pair, reserve_pair)))
    maximum = max(utilizations, key=lambda item: item[1], default=None)
    return {
        "case": list(case),
        "reserve_pair_nonpositive_count": reserve_nonpositive,
        "utilization_at_least_three_quarters_count": sum(
            value >= Fraction(3, 4) for _, value in utilizations
        ),
        "maximum_utilization": (
            {
                "index": maximum[0],
                "ratio_numerator": maximum[1].numerator,
                "ratio_denominator": maximum[1].denominator,
                "ratio_float": float(maximum[1]),
            }
            if maximum else None
        ),
    }


def main():
    group_sources = tuple(map(to_sparse, group_increment(0, "m")))
    bottom_sources = tuple(map(to_sparse, bottom_increment(1, "x")))
    records = []
    for m_value in (30, 60, 90, 120):
        for x_value in (2 * m_value, 6 * m_value):
            for r in (2 * m_value, 3 * m_value):
                for case, sources in (
                    (("group", 0, "m", 1, m_value, x_value, r), group_sources),
                    (("bottom", 1, "x", 0, m_value, x_value, r), bottom_sources),
                ):
                    record = audit(case, sources)
                    records.append(record)
                    print(
                        case[0], m_value, x_value, r,
                        record["maximum_utilization"], flush=True,
                    )
    status = (
        "PASS_FINITE_THREE_QUARTER_PAIR_UTILIZATION"
        if all(
            not record["reserve_pair_nonpositive_count"]
            and not record["utilization_at_least_three_quarters_count"]
            for record in records
        ) else "FAIL"
    )
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "scalar_pair_utilization_stress_20260802.json"
    ).write_text(
        json.dumps({"status": status, "records": records}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(status)


if __name__ == "__main__":
    main()
