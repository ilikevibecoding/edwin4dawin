#!/usr/bin/env python3
"""Root audit of the Chebyshev transform of scalar reflection pairs."""

from __future__ import annotations

import json
from pathlib import Path

from flint import ctx, fmpz_poly

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
)
from stress_path_isolate_p4_affine_parameter_monotonicity_large_rays import (
    audit_components,
)


def add_scaled(target, source, scale):
    if len(target) < len(source):
        target.extend([0] * (len(source) - len(target)))
    for index, value in enumerate(source):
        target[index] += scale * value


def chebyshev_transform(pairs):
    degree = len(pairs) - 1
    if degree % 2:
        raise ValueError("implemented first for even reciprocal degree")
    n = degree // 2
    # C_k(y)=t^k+t^-k for y=t+t^-1.
    polynomials = [[2], [0, 1]]
    for k in range(2, n + 1):
        current = [0] + polynomials[-1]
        add_scaled(current, polynomials[-2], -1)
        polynomials.append(current)
    result = [pairs[n]]
    for k in range(1, n + 1):
        add_scaled(result, polynomials[k], pairs[n - k])
    while result and result[-1] == 0:
        result.pop()
    return result


def audit(case):
    package, parity, coordinate, c_value, m_value, x_value, r = case
    sources = (
        group_increment(parity, coordinate)
        if package == "group" else bottom_increment(parity, coordinate)
    )
    result = audit_components(
        package, parity, coordinate, c_value, m_value, x_value, r,
        to_sparse(sources[0]), to_sparse(sources[1]), store_sequence=True,
    )
    values = result["j_aggregates"]
    pairs = [values[j] + values[r - j] for j in range(r + 1)]
    transformed = chebyshev_transform(pairs)
    below = inside = above = nonreal = 0
    for root, multiplicity in fmpz_poly(transformed).complex_roots():
        if root.imag.is_zero():
            if root.real < -2:
                below += multiplicity
            elif root.real > 2:
                above += multiplicity
            else:
                inside += multiplicity
        else:
            nonreal += multiplicity
    return {
        "case": list(case),
        "transformed_degree": len(transformed) - 1,
        "real_roots_below_minus_two": below,
        "real_roots_in_minus_two_two": inside,
        "real_roots_above_two": above,
        "nonreal_root_count": nonreal,
    }


def main():
    ctx.prec = 80
    cases = []
    for m_value, x_value in (
        (12, 24), (12, 96), (24, 48), (24, 96),
        (30, 90), (30, 180),
    ):
        r = 2 * m_value
        cases.extend([
            ("group", 0, "m", 1, m_value, x_value, r),
            ("bottom", 1, "x", 0, m_value, x_value, r),
        ])
    records = []
    for case in cases:
        record = audit(case)
        records.append(record)
        print(case[0], case[4], case[5], record, flush=True)
    status = (
        "PASS_FINITE_REAL_ROOTED_CHEBYSHEV_TRANSFORMS"
        if all(not record["nonreal_root_count"] for record in records)
        else "FAIL"
    )
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "reflection_chebyshev_roots_probe_20260802.json"
    ).write_text(
        json.dumps({"status": status, "records": records}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(status)


if __name__ == "__main__":
    main()
