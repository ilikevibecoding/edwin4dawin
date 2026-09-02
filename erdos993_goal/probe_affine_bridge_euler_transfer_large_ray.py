#!/usr/bin/env python3
"""Targeted exact Euler-block audit on the m=120,x=240 ray through k=100.

Unlike the generic sparse multiplier, this computes only the 102 by 102
northeast square of XQ and XR needed by the moving diagonal targets.  The
coefficient of X=A^aT^b is evaluated from the exact one-dimensional branch
sum, so the large-parameter audit remains integer exact without constructing
the full outer polynomial.
"""

from __future__ import annotations

import functools
import json
import math
from pathlib import Path

from probe_affine_bridge_reaggregated_boundary_layers import sources
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate


def choose(n, k):
    return math.comb(n, k) if n >= 0 and 0 <= k <= n else 0


def targeted_outer(source, a, b, low, high):
    @functools.lru_cache(maxsize=None)
    def x_coefficient(i, j):
        if i < 0 or j < 0:
            return 0
        return sum(
            choose(b, branch)
            * choose(a + b - branch, j - b + branch)
            * choose(a + branch, i - branch)
            for branch in range(b + 1)
        )

    result = {}
    source_items = list(source.items())
    for i in range(low, high + 1):
        for j in range(i, high + 1):
            value = sum(
                coefficient * x_coefficient(i - p, j - q)
                for (p, q), coefficient in source_items
            )
            if value:
                result[(i, j)] = value
                result[(j, i)] = value
    return result, x_coefficient.cache_info()._asdict()


def homogeneous(poly, target, h):
    return sum(
        choose(h, p) * poly.get((target - p, target - h + p), 0)
        for p in range(h + 1)
    )


def audit(parity):
    m_value = 120
    x_value = 240
    maximum_k = 100
    a_value = m_value + x_value - 3
    b_value = 2 * m_value + parity - 5
    low = m_value + 4
    high = m_value + maximum_k + 5

    q_source, r_source = sources("bottom", parity)
    q_numeric = evaluate(q_source, 0, m_value, x_value, high)
    r_numeric = evaluate(r_source, 0, m_value, x_value, high)
    q_outer, q_cache = targeted_outer(q_numeric, a_value, b_value, low, high)
    r_outer, r_cache = targeted_outer(r_numeric, a_value, b_value, low, high)

    orders = []
    maximum_required = 0
    first_full_failure = None
    reflection_pair_checks = 0
    for order in range(maximum_k + 1):
        target = m_value + order + 5
        n = order + 1
        prefix = 0
        reserve_total = 0
        layers = []
        prefixes = []
        for h in range(n + 1):
            q_h = homogeneous(q_outer, target, h)
            rho_h = homogeneous(r_outer, target, h)
            e_h = q_h + h * rho_h
            weighted = choose(n, h) * e_h
            reserve_total += choose(n, h) * rho_h
            prefix += weighted
            prefixes.append(prefix)
            layers.append((h, e_h))
        full = prefix
        if full < 0 and first_full_failure is None:
            first_full_failure = {"k": order, "value": full}
        required = next(
            (
                H for H in range(n + 1)
                if prefixes[H] >= 0
                and all(value >= 0 for _, value in layers[H + 1:])
            ),
            None,
        )
        assert required is not None
        assert full >= 2 * reserve_total
        maximum_required = max(maximum_required, required)
        negative_h = [h for h, value in layers if value < 0]
        if negative_h:
            assert negative_h == list(range(max(negative_h) + 1))
            crossing = max(negative_h)
            for h in negative_h:
                image = 2 * crossing + 2 - h
                reflection_pair_checks += 1
                assert image <= n
                assert (
                    choose(n, h) * layers[h][1]
                    + choose(n, image) * layers[image][1]
                ) >= 0
        orders.append({
            "k": order,
            "target": target,
            "value": full,
            "weighted_reserve_total": reserve_total,
            "full_minus_two_weighted_reserve": full - 2 * reserve_total,
            "full_over_weighted_reserve_decimal": float(full / reserve_total),
            "negative_h_first": min(negative_h) if negative_h else None,
            "negative_h_last": max(negative_h) if negative_h else None,
            "negative_h_count": len(negative_h),
            "least_boundary_block_H": required,
            "boundary_block_value": prefixes[required],
        })

    # Independent prior audit: k=81 is precisely the full next central value
    # obtained by adding the next reserve to the r=80 predecessor.
    prior = json.loads(Path(
        "affine_bridge_reassembled_large_ray_exact_20260811.json"
    ).read_text(encoding="utf-8"))
    prior_value = next(
        record["full_boundary_triple"] for record in prior["records"]
        if record["parity"] == parity
    )
    assert orders[81]["value"] == prior_value
    assert first_full_failure is None

    return {
        "package": "bottom",
        "parity": parity,
        "m": m_value,
        "x": x_value,
        "maximum_k": maximum_k,
        "outer_A_exponent": a_value,
        "outer_T_exponent": b_value,
        "targeted_square": [low, high],
        "q_outer_nonzero": len(q_outer),
        "r_outer_nonzero": len(r_outer),
        "q_coefficient_cache": q_cache,
        "r_coefficient_cache": r_cache,
        "maximum_required_boundary_block_H": maximum_required,
        "reflection_pair_check_count": reflection_pair_checks,
        "first_full_failure": first_full_failure,
        "orders": orders,
    }


def main():
    records = []
    for parity in (0, 1):
        record = audit(parity)
        records.append(record)
        print(
            "parity", parity,
            "maxH", record["maximum_required_boundary_block_H"],
            "fullfail", record["first_full_failure"],
            flush=True,
        )
    report = {
        "status": "NO_EXACT_COUNTEREXAMPLE_LARGE_RAY_THROUGH_K100",
        "identity": (
            "F_k=sum_(h=0)^(k+1) C(k+1,h)(q_h+h*rho_h)"
        ),
        "records": records,
        "scope_warning": "Finite exact large-ray audit, not an all-order proof.",
    }
    output = Path("affine_bridge_euler_transfer_large_ray_exact_20260812.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "maximum_H": [
            record["maximum_required_boundary_block_H"] for record in records
        ],
        "output": str(output),
    }, indent=2))


if __name__ == "__main__":
    main()
