#!/usr/bin/env python3
"""Independent exact audit of the Delta1 mask-3 orders 54--179 theorem."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from fractions import Fraction
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root as transcript


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_orders54_179_F_split_"
    "independent_audit_root_20260825.json"
)

PINNED = {
    "prove_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root.py":
        "B57C78913FDC93EA395E357FD0D649A0E296D761254CD45C2BCF0E471A860157",
    "rank8_delta1_new_leaf_mask3_orders54_179_F_split_root_20260825.json":
        "4C6A3DDBD170679F14E0AA6268CDED14F3EC8CC4A3522F13594EC2AFA289CA03",
    "audit_rank8_delta1_new_leaf_masks012_normalized_containment_box_root.py":
        "A96B75C97B37646912ECE5E8843D72616BBF6A2089E0A6C14D86F32E3C948289",
    "rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json":
        "549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A",
    "FOREST_V6_ALPHA10_THEOREM_2026-08-13.md":
        "D6F2B1017B3C222167209AC00158423C98607CAE1804415C24ED82F2DC8F91FF",
    "prove_forest_v6_alpha10.py":
        "2B3620BEF00E761B857AAFBAA2BABB79A5419D0E0D26AB45C787CED2585DD947",
    "forest_v6_alpha10_exact_20260813.json":
        "5F3954C8E3CC8817376CE89685CF283BAEE2FF55214A8E9FCFE816D50A8E9AA4",
    "FOREST_V7_ORDER25_THEOREM_2026-08-13.md":
        "724A3804237E3C1D999E6ADA3FA5CEC6D90BFD9C51988C3716F3F828B3521C63",
    "prove_forest_v7_order25.py":
        "246D36938DAFDB3763D1FB7CB8A5A60EE0488DAC587260ADCB23BDE16B5EB2B9",
    "forest_v7_order25_exact_20260813.json":
        "DB992D316684E2A8EF354B19A0889B636E4EC4EC7917F809EFBF97B0C4BCF7F4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical_record(expression: sp.Expr) -> dict[str, object]:
    generators = sorted(expression.free_symbols, key=str)
    polynomial = sp.Poly(sp.expand(expression), *generators)
    terms = polynomial.terms()
    serial = json.dumps(
        {
            "generators": [str(value) for value in generators],
            "terms": [
                [list(monomial), str(coefficient)]
                for monomial, coefficient in terms
            ],
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    return {
        "generators": [str(value) for value in generators],
        "terms": len(terms),
        "negative": sum(1 for _, coefficient in terms if coefficient < 0),
        "positive": sum(1 for _, coefficient in terms if coefficient > 0),
        "sha256": hashlib.sha256(serial).hexdigest().upper(),
    }


def bernstein_record(polynomial: sp.Poly) -> dict[str, object]:
    """Independent axis-by-axis power-to-Bernstein transform."""
    degrees = tuple(polynomial.degree(variable) for variable in polynomial.gens)
    tensor = {
        index: Fraction(0)
        for index in itertools.product(*(range(degree + 1) for degree in degrees))
    }
    for monomial, coefficient in polynomial.terms():
        value = Fraction(int(coefficient.p), int(coefficient.q))
        for exponent, degree in zip(monomial, degrees):
            value /= math.comb(degree, exponent)
        tensor[monomial] = value
    for axis, degree in enumerate(degrees):
        others = [index for index in range(len(degrees)) if index != axis]
        transformed = {}
        for fixed in itertools.product(*(range(degrees[index] + 1) for index in others)):
            def key(position: int) -> tuple[int, ...]:
                result = [0] * len(degrees)
                result[axis] = position
                for index, entry in zip(others, fixed):
                    result[index] = entry
                return tuple(result)

            source = [tensor[key(position)] for position in range(degree + 1)]
            for target in range(degree + 1):
                transformed[key(target)] = sum(
                    (
                        math.comb(target, source_index) * source[source_index]
                        for source_index in range(target + 1)
                    ),
                    Fraction(0),
                )
        tensor = transformed
    negative = sum(value < 0 for value in tensor.values())
    zero = sum(value == 0 for value in tensor.values())
    positive = sum(value > 0 for value in tensor.values())
    corner_indices = itertools.product(*((0, degree) for degree in degrees))
    negative_vertices = sum(tensor[index] < 0 for index in corner_indices)
    minimum_index, minimum = min(tensor.items(), key=lambda item: item[1])
    digest = hashlib.sha256()
    for index in sorted(tensor):
        digest.update((",".join(map(str, index)) + ":" + str(tensor[index]) + "\n").encode())
    return {
        "degrees": list(degrees),
        "coefficients": len(tensor),
        "negative": negative,
        "zero": zero,
        "positive": positive,
        "negative_vertices": negative_vertices,
        "minimum_index": list(minimum_index),
        "minimum": str(minimum),
        "ordered_sha256": digest.hexdigest().upper(),
    }


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    primary = json.loads(
        (
            HERE / "rank8_delta1_new_leaf_mask3_orders54_179_F_split_root_20260825.json"
        ).read_text(encoding="utf-8")
    )
    assert primary["status"] == (
        "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDERS_54_THROUGH_179"
    )
    assert [report["D_order"] for report in primary["reports"]] == list(range(54, 180))

    gate = transcript.delta1_new_leaf_gate()
    numerator, denominator = transcript.endpoint_numerator(gate, 3)
    raw = canonical_record(numerator)
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
    total_regions = total_coefficients = total_zero = total_positive = 0
    for report in primary["reports"]:
        order = report["D_order"]
        N = sp.Integer(order)
        small_order = 7 * order // 10
        large_order = small_order + 1
        mu4_floor = sp.cancel((N - 7) * (N - 8) / (N - 3))
        mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
        x_lower = sp.cancel(6 / (N - 5))
        x_upper = sp.cancel(6 / mu5_floor)
        y_lower = sp.cancel(5 / (N - 4))
        y_upper = sp.cancel(5 / mu4_floor)
        k4 = sp.cancel(4 * mu4_floor / (5 * (N - 4)))
        k6 = sp.cancel((N - 5) / mu5_floor)
        x = x_lower + (x_upper - x_lower) * X
        y = y_lower + (y_upper - y_lower) * Y

        M = sp.Integer(large_order)
        mu4_F_floor = sp.cancel((M - 7) * (M - 8) / (M - 3))
        l4 = sp.cancel((N - 4) / mu4_F_floor)
        ratio_break = sp.cancel((1 - k4) / (l4 - k4))
        u6_break = sp.cancel(1 / k6)
        assert 0 < ratio_break < u6_break < 1

        d4_floor = math.comb(order, 4) - (order - 1) * math.comb(order - 2, 2)
        d5_floor = math.comb(order, 5) - (order - 1) * math.comb(order - 2, 3)
        d6_floor = math.comb(order, 6) - (order - 1) * math.comb(order - 2, 4)
        assert min(d4_floor, d5_floor, d6_floor) > 0
        a4 = sp.Rational(math.comb(small_order, 4), d4_floor)
        a5 = sp.Rational(math.comb(small_order, 5), d5_floor)
        a6 = sp.Rational(math.comb(small_order, 6), d6_floor)
        small_u4_break = sp.cancel((a4 - (1 - k4)) / k4)
        small_u6_break = sp.cancel(a6 / k6)
        assert 0 < small_u6_break < a5

        large_scope = f"F_order_at_least_{large_order}"
        small_scope = f"F_order_at_most_{small_order}"
        specs = [
            (large_scope, "low", sp.Integer(0), ratio_break, "ratio", "shadow"),
            (large_scope, "middle", ratio_break, u6_break, "missing", "shadow"),
            (large_scope, "high", u6_break, sp.Integer(1), "missing", "free"),
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
                u6 = k6 * u5 * V6
            elif u6_mode == "absolute":
                u6 = a6 * V6
            else:
                u6 = V6
            expression = sp.expand(
                numerator.subs(
                    {
                        transcript.d[6]: 1,
                        transcript.d[5]: x,
                        transcript.d[4]: x * y,
                        transcript.f[6]: u6,
                        transcript.f[5]: x * u5,
                        transcript.f[4]: x * y * u4,
                    },
                    simultaneous=True,
                )
            )
            polynomial = sp.Poly(expression, X, Y, S, V4, V6, domain=sp.QQ)
            result = bernstein_record(polynomial)
            assert reference["power_terms"] == len(polynomial.terms())
            for key, value in result.items():
                assert reference[key] == value, (order, scope, region, key)
            assert result["negative"] == 0
            total_regions += 1
            total_coefficients += result["coefficients"]
            total_zero += result["zero"]
            total_positive += result["positive"]
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

    assert total_regions == primary["aggregate"]["regions"]
    assert total_coefficients == primary["aggregate"]["coefficients"]
    assert total_zero == primary["aggregate"]["zero"]
    assert total_positive == primary["aggregate"]["positive"]
    payload = {
        "schema": "rank8-delta1-mask3-orders54-179-F-split-independent-audit-v1",
        "status": (
            "PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_"
            "FOR_D_ORDERS_54_THROUGH_179"
        ),
        "independence": (
            "This audit does not import the finite-range producer or its box probe. "
            "It reconstructs the endpoint from the independent terminal-residual "
            "transcript, rebuilds all 693 boxes, and uses a separately implemented "
            "axis-wise exact Bernstein transform."
        ),
        "raw_endpoint_numerator": raw,
        "aggregate": {
            "orders": len(audited),
            "regions": total_regions,
            "coefficients": total_coefficients,
            "negative": 0,
            "zero": total_zero,
            "positive": total_positive,
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
