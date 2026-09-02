#!/usr/bin/env python3
"""Exact lattice probe for the sharpened local reflection ingredients."""

from __future__ import annotations

import json
import math
from fractions import Fraction
from pathlib import Path

from probe_affine_bridge_euler_transfer_large_ray import targeted_outer
from probe_affine_bridge_reaggregated_boundary_layers import sources
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate


OUTPUT = Path("affine_bridge_local_reflection_lattice_exact_20260812.json")


def homogeneous(poly, target, h):
    return sum(
        math.comb(h, p) * poly.get((target - p, target - h + p), 0)
        for p in range(h + 1)
    )


def update(extreme, value, metadata, minimum=True):
    if extreme is None or ((value < extreme[0]) if minimum else (value > extreme[0])):
        return value, metadata
    return extreme


def record_fraction(item):
    if item is None:
        return None
    value, metadata = item
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
        **metadata,
    }


def audit(package, parity, parameters, maximum_k, q_source, r_source):
    if package == "group":
        c_value, m_value, x_value = parameters
        a_value = 2 * c_value + m_value + x_value - 3
        b_value = 2 * m_value + parity - 4
        parameter = {"c": c_value, "m": m_value, "x": x_value}
    else:
        m_value, x_value = parameters
        c_value = 0
        a_value = m_value + x_value - 3
        b_value = 2 * m_value + parity - 5
        parameter = {"m": m_value, "x": x_value}
    low = m_value + 4
    high = m_value + maximum_k + 5
    q_numeric = evaluate(q_source, c_value, m_value, x_value, high)
    r_numeric = evaluate(r_source, c_value, m_value, x_value, high)
    q_outer, _ = targeted_outer(q_numeric, a_value, b_value, low, high)
    r_outer, _ = targeted_outer(r_numeric, a_value, b_value, low, high)

    counts = {
        "negative_sequences": 0,
        "interior_sandwich": 0,
        "endpoint_extension": 0,
        "endpoint_extension_failures": 0,
        "central_S1": 0,
        "reflected_K": 0,
    }
    failures = []
    extrema = {
        "minimum_reflection_slack": None,
        "minimum_sandwich_ratio": None,
        "maximum_sandwich_ratio": None,
        "minimum_S1": None,
        "minimum_K_ratio": None,
    }
    for order in range(maximum_k + 1):
        n = order + 1
        target = m_value + order + 5
        layers = []
        for h in range(n + 1):
            q_h = homogeneous(q_outer, target, h)
            rho_h = homogeneous(r_outer, target, h)
            e_h = q_h + h * rho_h
            layers.append((q_h, rho_h, e_h))
        negative = [h for h, (_, _, e_h) in enumerate(layers) if e_h < 0]
        if not negative:
            continue
        counts["negative_sequences"] += 1
        t = max(negative)
        metadata = {"k": order, "t": t}
        if negative != list(range(t + 1)):
            failures.append({"kind": "single_crossing", **metadata})
            continue
        slack = n - 2 * t - 2
        extrema["minimum_reflection_slack"] = update(
            extrema["minimum_reflection_slack"], Fraction(slack), metadata
        )
        if slack < 0:
            failures.append({"kind": "reflection_endpoint", **metadata})

        for h in range(1, t):
            _, rho_previous, e_previous = layers[h - 1]
            _, rho_current, e_current = layers[h]
            delta = e_current * rho_previous - e_previous * rho_current
            debt = -e_previous * rho_current
            ratio = Fraction(2 * delta, debt)
            counts["interior_sandwich"] += 1
            extrema["minimum_sandwich_ratio"] = update(
                extrema["minimum_sandwich_ratio"], ratio, {**metadata, "h": h}
            )
            extrema["maximum_sandwich_ratio"] = update(
                extrema["maximum_sandwich_ratio"], ratio,
                {**metadata, "h": h}, minimum=False
            )
            if delta < 0 or 2 * delta > debt:
                failures.append({"kind": "interior_sandwich", **metadata, "h": h})

        if t >= 1:
            _, rho_previous, e_previous = layers[t - 1]
            _, rho_current, e_current = layers[t]
            delta = e_current * rho_previous - e_previous * rho_current
            debt = -e_previous * rho_current
            counts["endpoint_extension"] += 1
            if delta < 0 or 2 * delta > debt:
                counts["endpoint_extension_failures"] += 1

        weighted_reserve = [
            math.comb(n, h) * layers[h][1] for h in range(n + 1)
        ]
        ratios = [None] + [
            Fraction(weighted_reserve[h], weighted_reserve[h - 1])
            if weighted_reserve[h - 1] > 0
            else None
            for h in range(1, n + 1)
        ]
        if t >= 2 and t + 4 <= n and ratios[t - 1] and ratios[t + 4]:
            S1 = ratios[t - 1] * ratios[t + 4]
            counts["central_S1"] += 1
            extrema["minimum_S1"] = update(
                extrema["minimum_S1"], S1, metadata
            )
            if S1 < 2:
                failures.append({"kind": "central_S1", **metadata})
        for ell in range(1, t):
            left = t - ell - 1
            right = t + ell + 3
            if left < 1 or right + 1 > n:
                continue
            quotient = (
                (ratios[left] / ratios[left + 1])
                / (ratios[right] / ratios[right + 1])
            )
            counts["reflected_K"] += 1
            extrema["minimum_K_ratio"] = update(
                extrema["minimum_K_ratio"], quotient,
                {**metadata, "ell": ell, "left": left, "right": right}
            )
            if quotient < 1:
                failures.append({"kind": "reflected_K", **metadata, "ell": ell})

    return {
        "package": package,
        "parity": parity,
        **parameter,
        "maximum_k": maximum_k,
        "counts": counts,
        "extrema": {
            key: record_fraction(value) for key, value in extrema.items()
        },
        "failure_count": len(failures),
        "first_failures": failures[:5],
    }


def main():
    maximum_k = 20
    records = []
    for package in ("group", "bottom"):
        for parity in (0, 1):
            q_source, r_source = sources(package, parity)
            points = (
                [
                    (c, m, x)
                    for c in range(1, 4)
                    for m in range(3, 9)
                    for x in (0, 1, 2, 2 * m)
                ]
                if package == "group"
                else [
                    (m, x)
                    for m in range(3, 11)
                    for x in (0, 1, 2, 2 * m)
                ]
            )
            for parameters in points:
                records.append(
                    audit(
                        package, parity, parameters, maximum_k,
                        q_source, r_source
                    )
                )
            print(package, parity, "done", len(points), flush=True)
    failures = [record for record in records if record["failure_count"]]
    totals = {
        key: sum(record["counts"][key] for record in records)
        for key in records[0]["counts"]
    }

    def global_extreme(key, minimum=True):
        candidates = [
            (Fraction(
                record["extrema"][key]["numerator"],
                record["extrema"][key]["denominator"],
            ), record)
            for record in records if record["extrema"][key] is not None
        ]
        value, record = (
            min(candidates, key=lambda item: item[0])
            if minimum
            else max(candidates, key=lambda item: item[0])
        )
        return {
            **record["extrema"][key],
            "package": record["package"],
            "parity": record["parity"],
            **{name: record[name] for name in ("c", "m", "x") if name in record},
        }

    report = {
        "status": (
            "NO_EXACT_COUNTEREXAMPLE_LOCAL_REFLECTION_LATTICE"
            if not failures else "LOCAL_REFLECTION_LATTICE_COUNTEREXAMPLE"
        ),
        "scope": (
            "group 1<=c<=3,3<=m<=8,x in {0,1,2,2m}; bottom "
            "3<=m<=10,x in {0,1,2,2m}; both parities; 0<=k<=20"
        ),
        "record_count": len(records),
        "totals": totals,
        "global_extrema": {
            "minimum_reflection_slack": global_extreme("minimum_reflection_slack"),
            "minimum_sandwich_ratio": global_extreme("minimum_sandwich_ratio"),
            "maximum_sandwich_ratio": global_extreme(
                "maximum_sandwich_ratio", minimum=False
            ),
            "minimum_S1": global_extreme("minimum_S1"),
            "minimum_K_ratio": global_extreme("minimum_K_ratio"),
        },
        "failure_record_count": len(failures),
        "first_failure_records": failures[:10],
        "records": records,
        "scope_warning": "Finite exact lattice, not an all-order proof.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
