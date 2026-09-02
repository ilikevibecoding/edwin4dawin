#!/usr/bin/env python3
"""Import-independent audit of the coupled-F mask-3 orders 51--53 certificate."""

from __future__ import annotations

import hashlib
import json
import math
import os
import sys
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


sys.set_int_max_str_digits(0)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_orders51_53_coupled_F_"
    "independent_audit_root_20260825.json"
)

PINNED = {
    "prove_rank8_delta1_new_leaf_mask3_orders51_53_coupled_F_root.py":
        "6AE7C4A9D228DC3726212B245B762E80E9E33E77AE2AC7A783E45C5475A37ED3",
    "rank8_delta1_new_leaf_mask3_orders51_53_coupled_F_root_20260825.json":
        "C86843D171CF1BFCDF8E1623B746E68F052C6E1E3E7AD00575079EFAB0287792",
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
            HERE / "rank8_delta1_new_leaf_mask3_orders51_53_coupled_F_root_20260825.json"
        ).read_text(encoding="utf-8")
    )
    assert primary["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDERS_51_THROUGH_53"
    )
    assert [report["D_order"] for report in primary["reports"]] == [51, 52, 53]

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
        small_order = 2 * order // 3
        large_order = small_order + 1
        mu4_floor = sp.cancel((N - 7) * (N - 8) / (N - 3))
        mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
        x_lower = sp.cancel(6 / (N - 5))
        x_upper = sp.cancel(6 / mu5_floor)
        y_lower = sp.cancel(5 / (N - 4))
        y_upper = sp.cancel(5 / mu4_floor)
        k4 = sp.cancel(4 * mu4_floor / (5 * (N - 4)))
        k6 = sp.cancel((N - 6) / mu5_floor)
        x = x_lower + (x_upper - x_lower) * X
        y = y_lower + (y_upper - y_lower) * Y

        M = sp.Integer(large_order)
        mu4_F_floor = sp.cancel((M - 7) * (M - 8) / (M - 3))
        l4 = sp.cancel((N - 4) / mu4_F_floor)
        ratio_break = sp.cancel((1 - k4) / (l4 - k4))
        u6_break = sp.cancel(1 / k6)
        assert 0 < ratio_break < u6_break < 1

        d4_floor = math.comb(order - 3, 4)
        d5_floor = math.comb(order - 4, 5)
        d6_floor = math.comb(order - 5, 6)
        a4 = sp.Rational(math.comb(small_order, 4), d4_floor)
        a5 = sp.Rational(math.comb(small_order, 5), d5_floor)
        a6 = sp.Rational(math.comb(small_order, 6), d6_floor)
        small_u4_break = sp.cancel((a4 - (1 - k4)) / k4)
        small_k6 = sp.cancel((small_order - 5) * x_upper / 6)
        small_u6_break = sp.cancel(a6 / small_k6)
        assert 0 < small_u6_break < a5

        large_scope = f"F_order_at_least_{large_order}"
        small_scope = f"F_order_at_most_{small_order}"
        specs = [
            (large_scope, "low", sp.Integer(0), ratio_break, "ratio", "shadow"),
            (large_scope, "middle", ratio_break, u6_break, "missing", "shadow"),
            (large_scope, "high", u6_break, sp.Integer(1), "missing", "shadow"),
        ]
        breaks = {sp.Integer(0), a5, small_u6_break}
        if 0 < small_u4_break < a5:
            breaks.add(small_u4_break)
        ordered_breaks = sorted(breaks)
        for index, (lo, hi) in enumerate(zip(ordered_breaks, ordered_breaks[1:])):
            midpoint = (lo + hi) / 2
            u4_mode = "missing" if 1 - k4 * (1 - midpoint) <= a4 else "absolute"
            u6_mode = "shadow" if k6 * midpoint <= a6 else "absolute"
            specs.append((small_scope, f"interval_{index}", lo, hi, u4_mode, u6_mode))

        assert report["F_order_split"]["D_path_lower_d4_d5_d6"] == [
            d4_floor, d5_floor, d6_floor
        ]
        assert len(specs) == len(report["rows"])
        per_order_digests = []
        for spec, reference in zip(specs, report["rows"]):
            scope, region, lo, hi, u4_mode, u6_mode = spec
            assert reference["scope"] == scope
            assert reference["region"] == region
            assert reference["u5_interval"] == [str(lo), str(hi)]
            u5 = lo + (hi - lo) * S
            if u4_mode == "ratio":
                u4_upper = l4 * u5
            elif u4_mode == "missing":
                u4_upper = 1 - k4 * (1 - u5)
            else:
                u4_upper = a4
            u4 = u4_upper * V4
            if u6_mode == "shadow":
                maximum_F_order = (
                    sp.Integer(small_order) if scope == small_scope else N - 1
                )
                u6 = sp.cancel((maximum_F_order - 5) / 6) * x * u5 * V6
            else:
                u6 = a6 * V6
            if u4_mode == "ratio":
                f4_value = sp.cancel(5 / mu4_F_floor) * x * u5 * V4
            else:
                f4_value = x * y * u4
            expression = sp.expand(
                numerator.subs(
                    {
                        independent.transcript.d[6]: 1,
                        independent.transcript.d[5]: x,
                        independent.transcript.d[4]: x * y,
                        independent.transcript.f[6]: u6,
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
                "large_F_min_order": large_order,
                "regions": len(specs),
                "ordered_tensor_sha256": per_order_digests,
            }
        )
        print("AUDIT_ORDER_PASS", order, "REGIONS", len(specs), flush=True)

    assert {"orders": len(audited), **totals} == primary["aggregate"]
    payload = {
        "schema": "rank8-delta1-mask3-orders51-53-coupled-F-independent-audit-v1",
        "status": (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_"
            "FOR_D_ORDERS_51_THROUGH_53"
        ),
        "independence": (
            "This audit imports neither the producer nor its box probe. It "
            "reconstructs the endpoint from the independent terminal-residual "
            "transcript, rebuilds every coupled bound, and applies the separately "
            "implemented axis-wise exact Bernstein transform."
        ),
        "audited_lemmas": [
            "F=A-N[v] has order at most N-1",
            "6f6<=(|F|-5)f5 retains x=d5/d6 in the u6 bound",
            "mu4(F)>=tF retains y=d4/d5 in the f4 bound",
            "coefficientwise path minimality supplies dk>=C(N-k+1,k)",
        ],
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
