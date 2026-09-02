#!/usr/bin/env python3
"""Exact replay of the local g sandwich and reflected reserve curvature.

This deliberately distinguishes the needed interior range ``1 <= h < t``
from the generally false endpoint extension ``h=t``.  It also records an
exact PF-infinity counterexample showing that negative-rootedness of the
weighted reserve polynomial alone does not imply the reflected curvature.
"""

from __future__ import annotations

import json
import math
from fractions import Fraction
from pathlib import Path


SOURCE = Path("affine_bridge_euler_transfer_blocks_probe_20260812.json")
OUTPUT = Path(
    "affine_bridge_local_sandwich_reserve_curvature_exact_20260812.json"
)


def update_minimum(current, value, metadata):
    if current is None or value < current[0]:
        return value, metadata
    return current


def update_maximum(current, value, metadata):
    if current is None or value > current[0]:
        return value, metadata
    return current


def fraction_record(value: Fraction, metadata: dict) -> dict:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
        **metadata,
    }


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    failures = []
    counts = {
        "interior_sandwich": 0,
        "endpoint_extension": 0,
        "endpoint_extension_failures": 0,
        "central_S1": 0,
        "reflected_K": 0,
        "central_reserve_0": 0,
        "central_reserve_1": 0,
    }
    minimum_sandwich_ratio = None
    maximum_sandwich_ratio = None
    minimum_S1 = None
    minimum_K_ratio = None
    minimum_central_0 = None
    minimum_central_1 = None
    first_endpoint_failure = None

    for record in source["records"]:
        parameter = {
            key: value for key, value in record.items() if key != "orders"
        }
        for order in record["orders"]:
            n = order["r"] + 1
            layers = order["layers"]
            negative = [item["h"] for item in layers if item["e_h"] < 0]
            if not negative:
                continue
            t = max(negative)
            metadata = {**parameter, "k": order["r"], "t": t}
            if negative != list(range(t + 1)):
                failures.append({"kind": "single_crossing", **metadata})
                continue

            # Delta_(h-1) = rho_(h-1)rho_h(g_h-g_(h-1)).  The upper
            # sandwich is needed only while h+1 is still negative, namely
            # on 1 <= h < t.
            for h in range(1, t):
                previous = layers[h - 1]
                current = layers[h]
                delta = (
                    current["e_h"] * previous["rho_h"]
                    - previous["e_h"] * current["rho_h"]
                )
                debt_scale = -previous["e_h"] * current["rho_h"]
                counts["interior_sandwich"] += 1
                if delta < 0 or 2 * delta > debt_scale:
                    failures.append(
                        {
                            "kind": "interior_sandwich",
                            **metadata,
                            "h": h,
                            "delta": delta,
                            "debt_scale": debt_scale,
                        }
                    )
                ratio = Fraction(2 * delta, debt_scale)
                item_metadata = {**metadata, "h": h}
                minimum_sandwich_ratio = update_minimum(
                    minimum_sandwich_ratio, ratio, item_metadata
                )
                maximum_sandwich_ratio = update_maximum(
                    maximum_sandwich_ratio, ratio, item_metadata
                )

            if t >= 1:
                h = t
                previous = layers[h - 1]
                current = layers[h]
                delta = (
                    current["e_h"] * previous["rho_h"]
                    - previous["e_h"] * current["rho_h"]
                )
                debt_scale = -previous["e_h"] * current["rho_h"]
                counts["endpoint_extension"] += 1
                if delta < 0 or 2 * delta > debt_scale:
                    counts["endpoint_extension_failures"] += 1
                    if first_endpoint_failure is None:
                        first_endpoint_failure = {
                            **metadata,
                            "h": h,
                            "two_delta_over_debt_scale": fraction_record(
                                Fraction(2 * delta, debt_scale), {}
                            ),
                        }

            weighted_reserve = [
                math.comb(n, h) * layers[h]["rho_h"]
                for h in range(n + 1)
            ]
            if t + 2 <= n and weighted_reserve[t] > 0:
                counts["central_reserve_0"] += 1
                ratio = Fraction(weighted_reserve[t + 2], weighted_reserve[t])
                minimum_central_0 = update_minimum(
                    minimum_central_0, ratio, metadata
                )
                if ratio < 1:
                    failures.append({"kind": "central_reserve_0", **metadata})
            if t >= 1 and t + 3 <= n and weighted_reserve[t - 1] > 0:
                counts["central_reserve_1"] += 1
                ratio = Fraction(
                    weighted_reserve[t + 3], weighted_reserve[t - 1]
                )
                minimum_central_1 = update_minimum(
                    minimum_central_1, ratio, metadata
                )
                if ratio < 1:
                    failures.append({"kind": "central_reserve_1", **metadata})

            # R_i = a_i/a_(i-1), K_i=R_i/R_(i+1), with
            # a_i=binom(n,i)rho_i.
            ratios = [None] + [
                Fraction(weighted_reserve[i], weighted_reserve[i - 1])
                if weighted_reserve[i - 1] > 0
                else None
                for i in range(1, n + 1)
            ]
            if t >= 2 and t + 4 <= n:
                S1 = ratios[t + 4] * ratios[t - 1]
                counts["central_S1"] += 1
                minimum_S1 = update_minimum(minimum_S1, S1, metadata)
                if S1 < 2:
                    failures.append({"kind": "central_S1", **metadata})

            for ell in range(1, t):
                h = t - ell
                j = t + 2 + ell
                if h - 1 < 1 or j + 2 > n:
                    continue
                left_K = ratios[h - 1] / ratios[h]
                right_K = ratios[j + 1] / ratios[j + 2]
                quotient = left_K / right_K
                counts["reflected_K"] += 1
                item_metadata = {
                    **metadata,
                    "ell": ell,
                    "h": h,
                    "j": j,
                }
                minimum_K_ratio = update_minimum(
                    minimum_K_ratio, quotient, item_metadata
                )
                if quotient < 1:
                    failures.append({"kind": "reflected_K", **item_metadata})

    # Exact PF-infinity obstruction.  These are the coefficients of
    # product_(r in roots)(1+r*y), hence the polynomial has eight strictly
    # negative real roots.  Nevertheless K_1<K_7 at n=8,t=3,ell=1.
    roots = [1, 1, 3, 3, 5, 10, 20, 20]
    pf_coefficients = [1]
    for root in roots:
        next_coefficients = [0] * (len(pf_coefficients) + 1)
        for index, coefficient in enumerate(pf_coefficients):
            next_coefficients[index] += coefficient
            next_coefficients[index + 1] += root * coefficient
        pf_coefficients = next_coefficients
    assert pf_coefficients == [
        1, 63, 1512, 17634, 108429, 361695, 641450, 552000, 180000
    ]
    pf_ratios = [None] + [
        Fraction(pf_coefficients[i], pf_coefficients[i - 1])
        for i in range(1, 9)
    ]
    pf_K1 = pf_ratios[1] / pf_ratios[2]
    pf_K7 = pf_ratios[7] / pf_ratios[8]
    assert pf_K1 < pf_K7

    # Scaling every root by 1/10 preserves PF-infinity and leaves all K_i
    # unchanged, but multiplies S1=R_7 R_2 by 1/100.  Hence even PF-infinity,
    # a prescribed initial sign crossing, and the local g sandwich cannot
    # imply the central reserve bound without path-specific normalization.
    scaled_S1 = pf_ratios[7] * pf_ratios[2] / 100
    assert scaled_S1 < 2
    generic_g = [-8, -4, -2, -1, 1, 2, 3, 4, 5]
    for h in range(1, 3):
        increment = generic_g[h] - generic_g[h - 1]
        assert 0 <= 2 * increment <= -generic_g[h - 1]

    report = {
        "status": (
            "PASS_AFFINE_BRIDGE_LOCAL_SANDWICH_RESERVE_CURVATURE"
            if not failures
            else "FAIL_AFFINE_BRIDGE_LOCAL_SANDWICH_RESERVE_CURVATURE"
        ),
        "source": str(SOURCE),
        "counts": counts,
        "failure_count": len(failures),
        "first_failures": failures[:10],
        "interior_sandwich_two_delta_over_debt_minimum": fraction_record(
            minimum_sandwich_ratio[0], minimum_sandwich_ratio[1]
        ),
        "interior_sandwich_two_delta_over_debt_maximum": fraction_record(
            maximum_sandwich_ratio[0], maximum_sandwich_ratio[1]
        ),
        "first_false_endpoint_extension": first_endpoint_failure,
        "central_S1_minimum": fraction_record(
            minimum_S1[0], minimum_S1[1]
        ),
        "reflected_K_quotient_minimum": fraction_record(
            minimum_K_ratio[0], minimum_K_ratio[1]
        ),
        "central_reserve_0_minimum": fraction_record(
            minimum_central_0[0], minimum_central_0[1]
        ),
        "central_reserve_1_minimum": fraction_record(
            minimum_central_1[0], minimum_central_1[1]
        ),
        "pf_infinity_abstraction_counterexample": {
            "roots_in_product_1_plus_root_y": roots,
            "coefficients": pf_coefficients,
            "n": 8,
            "t": 3,
            "ell": 1,
            "K_1": fraction_record(pf_K1, {}),
            "K_7": fraction_record(pf_K7, {}),
            "K_1_less_than_K_7": True,
            "scaled_roots_factor": "1/10",
            "scaled_S1": fraction_record(scaled_S1, {}),
            "generic_g_with_initial_negative_block_and_local_sandwich": generic_g,
            "conclusion": (
                "PF-infinity, single crossing, and the local g sandwich do "
                "not imply reflected K curvature or central S1; the path "
                "coefficient normalization is essential."
            ),
        },
        "exact_local_reduction": (
            "Delta_(h-1)=rho_(h-1)rho_h(g_h-g_(h-1)).  For 1<=h<t, "
            "Delta>=0 follows from monotonicity of g.  If "
            "g_(h+1)-2g_h+g_(h-1)>=0, then g_(h+1)<0 gives "
            "2g_h<g_(h-1), hence 2Delta<(-e_(h-1))rho_h."
        ),
        "scope_warning": "Exact finite hard-record replay, not proof.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
