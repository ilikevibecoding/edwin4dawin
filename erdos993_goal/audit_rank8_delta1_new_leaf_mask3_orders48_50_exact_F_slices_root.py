#!/usr/bin/env python3
"""Import-independent audit of the exact-F mask-3 orders 48--50 block."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_orders48_50_exact_F_slices_"
    "independent_audit_root_20260825.json"
)

PINNED = {
    "prove_rank8_delta1_new_leaf_mask3_orders48_50_exact_F_slices_root.py":
        "1FB209E9B32097C37C143BA00814A79064BE898540428A7B009F5361FA9AA2C1",
    "rank8_delta1_new_leaf_mask3_orders48_50_exact_F_slices_root_20260825.json":
        "C83ADC5157FE1B651BBF66D685547F69AF0203D1171A789D7EC2DD03652FC2A0",
    "audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root.py":
        "C61B4A48DDCF30BE8BE38FB8723CE0DD765986BADDB10EFC2DBED95CB48CA5B7",
    "audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root.py":
        "A96B75C97B37646912ECE5E8843D72616BBF6A2089E0A6C14D86F32E3C948289",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "FOREST_V6_ALPHA10_THEOREM_2026-08-13.md":
        "D6F2B1017B3C222167209AC00158423C98607CAE1804415C24ED82F2DC8F91FF",
    "forest_v6_alpha10_exact_20260813.json":
        "5F3954C8E3CC8817376CE89685CF283BAEE2FF55214A8E9FCFE816D50A8E9AA4",
    "FOREST_V7_ORDER25_THEOREM_2026-08-13.md":
        "724A3804237E3C1D999E6ADA3FA5CEC6D90BFD9C51988C3716F3F828B3521C63",
    "forest_v7_order25_exact_20260813.json":
        "DB992D316684E2A8EF354B19A0889B636E4EC4EC7917F809EFBF97B0C4BCF7F4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    primary = json.loads(
        (
            HERE / "rank8_delta1_new_leaf_mask3_orders48_50_exact_F_slices_root_20260825.json"
        ).read_text(encoding="utf-8")
    )
    assert primary["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDERS_48_THROUGH_50"
    )
    assert [report["D_order"] for report in primary["reports"]] == [48, 49, 50]

    gate = independent.transcript.delta1_new_leaf_gate()
    numerator, denominator = independent.transcript.endpoint_numerator(gate, 3)
    raw = independent.canonical_record(numerator)
    assert raw == {
        "generators": ["d4", "d5", "d6", "f4", "f5", "f6"],
        "terms": 139,
        "negative": 91,
        "positive": 48,
        "sha256": "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E",
    }
    assert str(denominator) == "2744*d5**4*(d6 + f5)"

    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    audited = []
    aggregate_digest = hashlib.sha256()
    totals = {key: 0 for key in ("regions", "coefficients", "negative", "zero", "positive")}
    for report in primary["reports"]:
        order = report["D_order"]
        N = sp.Integer(order)
        small_order = order - 17
        mu4_floor = sp.cancel((N - 7) * (N - 8) / (N - 3))
        mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
        x_lower = sp.cancel(6 / (N - 5))
        x_upper = sp.cancel(6 / mu5_floor)
        y_lower = sp.cancel(5 / (N - 4))
        y_upper = sp.cancel(5 / mu4_floor)
        k4 = sp.cancel(4 * mu4_floor / (5 * (N - 4)))
        x = x_lower + (x_upper - x_lower) * X
        y = y_lower + (y_upper - y_lower) * Y

        specs = []
        for F_order_value in range(order - 16, order):
            M = sp.Integer(F_order_value)
            mu4_F_floor = sp.cancel((M - 7) * (M - 8) / (M - 3))
            l4 = sp.cancel((N - 4) / mu4_F_floor)
            ratio_break = sp.cancel((1 - k4) / (l4 - k4))
            assert 0 < ratio_break < 1
            specs.extend(
                [
                    (f"F_order_exactly_{F_order_value}", F_order_value, "ratio", sp.Integer(0), ratio_break, "ratio", mu4_F_floor),
                    (f"F_order_exactly_{F_order_value}", F_order_value, "missing", ratio_break, sp.Integer(1), "missing", mu4_F_floor),
                ]
            )

        d4_floor = math.comb(order - 3, 4)
        d5_floor = math.comb(order - 4, 5)
        d6_floor = math.comb(order - 5, 6)
        a4 = sp.Rational(math.comb(small_order, 4), d4_floor)
        a5 = sp.Rational(math.comb(small_order, 5), d5_floor)
        a6 = sp.Rational(math.comb(small_order, 6), d6_floor)
        small_u4_break = sp.cancel((a4 - (1 - k4)) / k4)
        small_k6 = sp.cancel((sp.Integer(small_order) - 5) * x_upper / 6)
        small_u6_break = sp.cancel(a6 / small_k6)
        assert 0 < small_u6_break < a5
        breaks = {sp.Integer(0), a5, small_u6_break}
        if 0 < small_u4_break < a5:
            breaks.add(small_u4_break)
        ordered_breaks = sorted(breaks)
        large_k6 = sp.cancel((N - 6) / mu5_floor)
        small_scope = f"F_order_at_most_{small_order}"
        for index, (lo, hi) in enumerate(zip(ordered_breaks, ordered_breaks[1:])):
            midpoint = (lo + hi) / 2
            u4_mode = "missing" if 1 - k4 * (1 - midpoint) <= a4 else "absolute"
            u6_mode = "shadow" if large_k6 * midpoint <= a6 else "absolute"
            specs.append(
                (small_scope, None, f"interval_{index}", lo, hi, (u4_mode, u6_mode), None)
            )

        assert report["F_order_partition"]["D_path_lower_d4_d5_d6"] == [
            d4_floor, d5_floor, d6_floor
        ]
        assert len(specs) == len(report["rows"]) == 34
        per_order_digests = []
        for spec, reference in zip(specs, report["rows"]):
            scope, F_order_value, region, lo, hi, mode, mu4_F_floor = spec
            assert reference["scope"] == scope
            assert reference["region"] == region
            assert reference["u5_interval"] == [str(lo), str(hi)]
            u5 = lo + (hi - lo) * S
            if F_order_value is not None:
                assert reference["F_order"] == F_order_value
                M = sp.Integer(F_order_value)
                if mode == "ratio":
                    f4_value = sp.cancel(5 / mu4_F_floor) * x * u5 * V4
                else:
                    f4_value = x * y * (1 - k4 * (1 - u5)) * V4
                f6_value = sp.cancel((M - 5) / 6) * x * u5 * V6
            else:
                u4_mode, u6_mode = mode
                assert reference["u4_mode"] == u4_mode
                assert reference["u6_mode"] == u6_mode
                if u4_mode == "missing":
                    u4 = (1 - k4 * (1 - u5)) * V4
                else:
                    u4 = a4 * V4
                f4_value = x * y * u4
                if u6_mode == "shadow":
                    f6_value = sp.cancel((sp.Integer(small_order) - 5) / 6) * x * u5 * V6
                else:
                    f6_value = a6 * V6
            expression = sp.expand(
                numerator.subs(
                    {
                        independent.transcript.d[6]: 1,
                        independent.transcript.d[5]: x,
                        independent.transcript.d[4]: x * y,
                        independent.transcript.f[6]: f6_value,
                        independent.transcript.f[5]: x * u5,
                        independent.transcript.f[4]: f4_value,
                    },
                    simultaneous=True,
                )
            )
            polynomial = sp.Poly(expression, X, Y, S, V4, V6, domain=sp.QQ)
            result = independent.bernstein_record(polynomial)
            assert reference["power_terms"] == len(polynomial.terms())
            for key, value in result.items():
                assert reference[key] == value, (order, scope, region, key)
            assert result["negative"] == 0
            totals["regions"] += 1
            for key in ("coefficients", "negative", "zero", "positive"):
                totals[key] += result[key]
            per_order_digests.append(result["ordered_sha256"])
            aggregate_digest.update(
                f"{order}:{scope}:{region}:{result['ordered_sha256']}\n".encode()
            )
        audited.append(
            {
                "D_order": order,
                "small_F_max_order": small_order,
                "exact_large_F_orders": list(range(order - 16, order)),
                "regions": len(specs),
                "ordered_tensor_sha256": per_order_digests,
            }
        )
        print("AUDIT_ORDER_PASS", order, "REGIONS", len(specs), flush=True)

    assert {"orders": len(audited), **totals} == primary["aggregate"]
    payload = {
        "schema": "rank8-delta1-mask3-orders48-50-exact-F-slices-independent-audit-v1",
        "status": (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_"
            "FOR_D_ORDERS_48_THROUGH_50"
        ),
        "independence": (
            "This audit imports neither the producer nor its probe. It reconstructs "
            "the endpoint, all exact F-order slices, the small-F boxes, and every "
            "tensor using an independently implemented exact Bernstein transform."
        ),
        "raw_endpoint_numerator": raw,
        "aggregate": {
            "orders": len(audited),
            **totals,
            "ordered_region_digest_sha256": aggregate_digest.hexdigest().upper(),
        },
        "orders": audited,
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
