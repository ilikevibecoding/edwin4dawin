#!/usr/bin/env python3
"""Import-independent audit of the refined exact-F mask-3 order-47 block."""

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
    "rank8_delta1_new_leaf_mask3_order47_refined_exact_F_"
    "independent_audit_root_20260825.json"
)
Y_BREAKS = (
    sp.Integer(0), sp.Rational(1, 4), sp.Rational(1, 2), sp.Rational(3, 4),
    sp.Rational(7, 8), sp.Rational(15, 16), sp.Rational(31, 32),
    sp.Rational(63, 64), sp.Integer(1),
)

PINNED = {
    "prove_rank8_delta1_new_leaf_mask3_order47_refined_exact_F_root.py":
        "3F60EC8F6565056131FBB2A54C59BB6738F4AB5EFB7BBBDD9A6EADE5378A843A",
    "rank8_delta1_new_leaf_mask3_order47_refined_exact_F_root_20260825.json":
        "58E8301FEEB3850083C75AB3BC9CEF03FDD9E607B1F5BA318EEF24341DC6671B",
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
            HERE / "rank8_delta1_new_leaf_mask3_order47_refined_exact_F_root_20260825.json"
        ).read_text(encoding="utf-8")
    )
    assert primary["status"] == "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_47"
    assert primary["partition"] == {
        "small_F_max_order": 26,
        "refined_exact_F_orders": list(range(27, 34)),
        "simple_exact_F_orders": list(range(34, 47)),
        "refined_normalized_y_breaks": [str(value) for value in Y_BREAKS],
    }

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

    N = sp.Integer(47)
    small_order = 26
    mu4_floor = sp.cancel((N - 7) * (N - 8) / (N - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    x_lower = sp.cancel(6 / (N - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (N - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    k4 = sp.cancel(4 * mu4_floor / (5 * (N - 4)))
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    x = x_lower + (x_upper - x_lower) * X
    specs = []

    def add_exact_specs(F_order_value: int, y_breaks: tuple[sp.Rational, ...]) -> None:
        M = sp.Integer(F_order_value)
        mu4_F_floor = sp.cancel((M - 7) * (M - 8) / (M - 3))
        for normalized_lo, normalized_hi in zip(y_breaks, y_breaks[1:]):
            y_slab_lower = y_lower + (y_upper - y_lower) * normalized_lo
            l4 = sp.cancel(5 / (mu4_F_floor * y_slab_lower))
            ratio_break = sp.cancel((1 - k4) / (l4 - k4))
            assert 0 < ratio_break < 1
            specs.extend(
                [
                    (F_order_value, "ratio", normalized_lo, normalized_hi,
                     sp.Integer(0), ratio_break, "ratio", mu4_F_floor),
                    (F_order_value, "missing", normalized_lo, normalized_hi,
                     ratio_break, sp.Integer(1), "missing", mu4_F_floor),
                ]
            )

    for F_order_value in range(27, 34):
        add_exact_specs(F_order_value, Y_BREAKS)
    for F_order_value in range(34, 47):
        add_exact_specs(F_order_value, (sp.Integer(0), sp.Integer(1)))

    d4_floor = math.comb(44, 4)
    d5_floor = math.comb(43, 5)
    d6_floor = math.comb(42, 6)
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
    for index, (lo, hi) in enumerate(zip(ordered_breaks, ordered_breaks[1:])):
        midpoint = (lo + hi) / 2
        u4_mode = "missing" if 1 - k4 * (1 - midpoint) <= a4 else "absolute"
        u6_mode = "shadow" if large_k6 * midpoint <= a6 else "absolute"
        specs.append((None, f"interval_{index}", sp.Integer(0), sp.Integer(1),
                      lo, hi, (u4_mode, u6_mode), None))

    assert len(specs) == len(primary["rows"]) == 140
    digest = hashlib.sha256()
    totals = {key: 0 for key in ("regions", "coefficients", "negative", "zero", "positive")}
    per_region_digests = []
    for spec, reference in zip(specs, primary["rows"]):
        F_order_value, region, normalized_lo, normalized_hi, lo, hi, mode, mu4_F_floor = spec
        assert reference["region"] == region
        assert reference["normalized_y_interval"] == [str(normalized_lo), str(normalized_hi)]
        assert reference["u5_interval"] == [str(lo), str(hi)]
        y = y_lower + (y_upper - y_lower) * (
            normalized_lo + (normalized_hi - normalized_lo) * Y
        )
        u5 = lo + (hi - lo) * S
        if F_order_value is not None:
            assert reference["scope"] == f"F_order_exactly_{F_order_value}"
            assert reference["F_order"] == F_order_value
            M = sp.Integer(F_order_value)
            if mode == "ratio":
                f4_value = sp.cancel(5 / mu4_F_floor) * x * u5 * V4
            else:
                f4_value = x * y * (1 - k4 * (1 - u5)) * V4
            f6_value = sp.cancel((M - 5) / 6) * x * u5 * V6
        else:
            assert reference["scope"] == "F_order_at_most_26"
            u4_mode, u6_mode = mode
            assert reference["u4_mode"] == u4_mode
            assert reference["u6_mode"] == u6_mode
            u4 = (
                (1 - k4 * (1 - u5)) * V4
                if u4_mode == "missing" else a4 * V4
            )
            f4_value = x * y * u4
            f6_value = (
                sp.cancel((sp.Integer(small_order) - 5) / 6) * x * u5 * V6
                if u6_mode == "shadow" else a6 * V6
            )
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
            assert reference[key] == value, (F_order_value, region, key)
        assert result["negative"] == 0
        totals["regions"] += 1
        for key in ("coefficients", "negative", "zero", "positive"):
            totals[key] += result[key]
        per_region_digests.append(result["ordered_sha256"])
        digest.update(
            f"{F_order_value}:{normalized_lo}:{normalized_hi}:{region}:"
            f"{result['ordered_sha256']}\n".encode()
        )

    assert primary["path_floors_d4_d5_d6"] == [d4_floor, d5_floor, d6_floor]
    assert primary["aggregate"] == {"regions": len(specs), **{
        key: totals[key] for key in ("coefficients", "negative", "zero", "positive")
    }}
    payload = {
        "schema": "rank8-delta1-mask3-order47-refined-exact-F-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_47",
        "independence": (
            "This audit imports neither the order-47 producer nor its probe. It "
            "reconstructs the endpoint, all 140 boxes, and every tensor through "
            "the independently implemented axis-wise exact Bernstein transform."
        ),
        "raw_endpoint_numerator": raw,
        "aggregate": {
            **totals,
            "ordered_region_digest_sha256": digest.hexdigest().upper(),
        },
        "ordered_tensor_sha256": per_region_digests,
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("REGIONS", totals["regions"], "COEFFICIENTS", totals["coefficients"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
