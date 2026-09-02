#!/usr/bin/env python3
"""Import-independent replay of one low-order small-F prefix certificate."""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "certify_rank8_delta1_new_leaf_mask3_lower_small_f_root.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--primary", required=True)
    parser.add_argument("--expected-primary-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    primary_path = Path(args.primary).resolve()
    output = Path(args.output).resolve()
    primary_sha256 = sha256(primary_path)
    assert primary_sha256 == args.expected_primary_sha256.upper()
    primary = json.loads(primary_path.read_text(encoding="utf-8"))
    assert primary["schema"] == "rank8-delta1-new-leaf-mask3-lower-small-f-root-v1"
    n_value = int(primary["D_order"])
    small_value = int(primary["F_order_at_most"])
    assert primary["status"] == (
        f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
        f"F_ORDER_AT_MOST_{small_value}"
    )
    assert primary["source_sha256"] == sha256(PRODUCER)

    gate = independent.transcript.delta1_new_leaf_gate()
    endpoint, endpoint_denominator = independent.transcript.endpoint_numerator(
        gate, 3
    )
    raw = independent.canonical_record(endpoint)
    assert raw["sha256"] == (
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    )
    assert str(endpoint_denominator) == "2744*d5**4*(d6 + f5)"

    n, small = sp.Integer(n_value), sp.Integer(small_value)
    mu4 = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu4_integer = int(sp.floor(mu4))
    mu4_fraction = sp.cancel(mu4 - mu4_integer)
    phi4 = sp.cancel(
        (1 - mu4_fraction) * sp.binomial(mu4_integer - 1, 2)
        + mu4_fraction * sp.binomial(mu4_integer, 2)
    )
    mu5 = sp.cancel(2 * phi4 / mu4)
    x_lower, x_upper = sp.cancel(6 / (n - 5)), sp.cancel(6 / mu5)
    y_lower, y_upper = sp.cancel(5 / (n - 4)), sp.cancel(5 / mu4)
    k4 = sp.cancel(4 * mu4 / (5 * (n - 4)))
    floors = {
        rank: math.comb(n_value, rank)
        - small_value * math.comb(n_value - 2, rank - 2)
        for rank in (4, 5, 6)
    }
    a4 = sp.Rational(math.comb(small_value, 4), floors[4])
    a5 = sp.Rational(math.comb(small_value, 5), floors[5])
    a6 = sp.Rational(math.comb(small_value, 6), floors[6])
    u4_break = sp.cancel((a4 - (1 - k4)) / k4)
    x_breaks = tuple(
        sp.Rational(value)
        for value in primary["partition"]["normalized_x_breaks"]
    )
    assert primary["partition"] == {
        "normalized_x_breaks": [str(value) for value in x_breaks],
        "u4_switch": str(u4_break),
        "u6_switch_is_recomputed_per_x_slab": True,
    }
    assert primary["edge_count_sensitive_floors_d4_d5_d6"] == [
        floors[rank] for rank in (4, 5, 6)
    ]
    assert primary["absolute_caps_u4_u5_u6"] == [
        str(value) for value in (a4, a5, a6)
    ]

    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    references = primary["rows"]
    row_index = 0
    totals = {
        key: 0
        for key in ("regions", "coefficients", "negative", "zero", "positive")
    }
    digest = hashlib.sha256()
    for x_index, (x0n, x1n) in enumerate(zip(x_breaks, x_breaks[1:])):
        x0 = x_lower + (x_upper - x_lower) * x0n
        x1 = x_lower + (x_upper - x_lower) * x1n
        x = x0 + (x1 - x0) * X
        q5_y_cap = sp.cancel(10 * x1 / (x1 + 12))
        y_cap = min(y_upper, q5_y_cap)
        y = y_lower + (y_cap - y_lower) * Y
        u6_break = sp.cancel(a6 / (sp.cancel((small - 5) * x1 / 6)))
        breaks = {sp.Integer(0), a5}
        if 0 < u4_break < a5:
            breaks.add(u4_break)
        if 0 < u6_break < a5:
            breaks.add(u6_break)
        u5_breaks = tuple(sorted(breaks))
        for u_index, (lo, hi) in enumerate(zip(u5_breaks, u5_breaks[1:])):
            reference = references[row_index]
            row_index += 1
            midpoint = (lo + hi) / 2
            u5 = lo + (hi - lo) * S
            missing_cap = 1 - k4 * (1 - midpoint)
            u4_mode = "absolute" if a4 <= missing_cap else "missing"
            f4_cap = a4 if u4_mode == "absolute" else 1 - k4 * (1 - u5)
            f4_value = x * y * f4_cap * V4
            u6_mode = "shadow" if hi <= u6_break else "absolute"
            f6_value = (
                sp.cancel((small - 5) / 6) * x * u5 * V6
                if u6_mode == "shadow" else a6 * V6
            )
            expression = sp.expand(
                endpoint.subs(
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
            polynomial = sp.Poly(
                expression, X, Y, S, V4, V6, domain=sp.QQ
            )
            result = independent.bernstein_record(polynomial)
            result = {"power_terms": len(polynomial.terms()), **result}
            assert reference["x_slab"] == x_index
            assert reference["normalized_x_interval"] == [str(x0n), str(x1n)]
            assert reference["x_interval"] == [str(x0), str(x1)]
            assert reference["q5_y_cap_at_right_endpoint"] == str(q5_y_cap)
            assert reference["y_interval"] == [str(y_lower), str(y_cap)]
            assert reference["u5_interval"] == [str(lo), str(hi)]
            assert reference["u4_mode"] == u4_mode
            assert reference["u6_mode"] == u6_mode
            for key, value in result.items():
                assert reference[key] == value, (x_index, u_index, key)
            assert result["negative"] == 0 and result["negative_vertices"] == 0
            totals["regions"] += 1
            for key in ("coefficients", "negative", "zero", "positive"):
                totals[key] += int(result[key])
            digest.update(
                f"{x_index}:{u_index}:{result['ordered_sha256']}\n".encode()
            )
            print("AUDIT_PASS", n_value, small_value, x_index, u_index, flush=True)
            del expression, polynomial
            sp.core.cache.clear_cache()
            gc.collect()

    assert row_index == len(references)
    assert primary["aggregate"] == totals
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-lower-small-f-independent-audit-v1",
        "status": (
            f"PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
            f"F_ORDER_AT_MOST_{small_value}_AUDIT"
        ),
        "D_order": n_value,
        "F_order_at_most": small_value,
        "independence": (
            "Imports neither producer nor probe. Reconstructs the endpoint "
            "from the canonical transcript and independently recomputes every "
            "exact rational Bernstein coefficient."
        ),
        "raw_endpoint_numerator": raw,
        "aggregate": {
            **totals,
            "ordered_region_digest_sha256": digest.hexdigest().upper(),
        },
        "primary": {"path": str(primary_path), "sha256": primary_sha256},
        "producer_source_sha256": sha256(PRODUCER),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("REGIONS", totals["regions"], "COEFFICIENTS", totals["coefficients"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(output), flush=True)


if __name__ == "__main__":
    main()
