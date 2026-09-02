#!/usr/bin/env python3
"""Import-independent replay of one low-order exact-F hybrid certificate."""

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
PRODUCER = HERE / "certify_rank8_delta1_new_leaf_mask3_lower_exact_f_hybrid_root.py"


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
    assert primary["schema"] == (
        "rank8-delta1-new-leaf-mask3-lower-exact-f-hybrid-root-v1"
    )
    n_value, f_value = int(primary["D_order"]), int(primary["F_order"])
    assert primary["status"] == (
        f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
        f"F_ORDER_{f_value}_HYBRID"
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

    n, m = sp.Integer(n_value), sp.Integer(f_value)
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
    mu4_f = sp.cancel((m - 7) * (m - 8) / (m - 3))
    rank4_ratio = sp.cancel(5 / mu4_f)
    floors = {
        rank: math.comb(n_value, rank)
        - f_value * math.comb(n_value - 2, rank - 2)
        for rank in (4, 5, 6)
    }
    a4 = sp.Rational(math.comb(f_value, 4), floors[4])
    a5 = sp.Rational(math.comb(f_value, 5), floors[5])
    a6 = sp.Rational(math.comb(f_value, 6), floors[6])
    x_breaks = tuple(
        sp.Rational(value)
        for value in primary["partition"]["normalized_x_breaks"]
    )
    y_slabs = int(primary["partition"]["y_slabs_per_x_slab"])
    assert primary["edge_count_sensitive_floors_d4_d5_d6"] == [
        floors[rank] for rank in (4, 5, 6)
    ]
    assert primary["absolute_caps_u4_u5_u6"] == [
        str(value) for value in (a4, a5, a6)
    ]
    assert primary["rank4_ratio_cap"] == str(rank4_ratio)

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
        q5_cap = sp.cancel(10 * x1 / (x1 + 12))
        y_cap = min(y_upper, q5_cap)
        y_breaks = tuple(
            y_lower + (y_cap - y_lower) * sp.Rational(index, y_slabs)
            for index in range(y_slabs + 1)
        )
        for y_index, (y0, y1) in enumerate(zip(y_breaks, y_breaks[1:])):
            y = y0 + (y1 - y0) * Y
            ratio_low = sp.cancel(a4 * y0 / rank4_ratio)
            ratio_high = sp.cancel(a4 * y1 / rank4_ratio)
            u6_break = sp.cancel(a6 / (sp.cancel((m - 5) * x1 / 6)))
            breaks = {sp.Integer(0), a5}
            for value in (ratio_low, ratio_high, u6_break):
                if 0 < value < a5:
                    breaks.add(value)
            u_breaks = tuple(sorted(breaks))
            for u_index, (lo, hi) in enumerate(zip(u_breaks, u_breaks[1:])):
                reference = references[row_index]
                row_index += 1
                midpoint = (lo + hi) / 2
                y_midpoint = (y0 + y1) / 2
                u5 = lo + (hi - lo) * S
                f4_mode = (
                    "ratio"
                    if rank4_ratio * midpoint <= a4 * y_midpoint
                    else "absolute"
                )
                f4_value = (
                    rank4_ratio * x * u5 * V4
                    if f4_mode == "ratio"
                    else a4 * x * y * V4
                )
                f6_mode = "shadow" if hi <= u6_break else "absolute"
                f6_value = (
                    sp.cancel((m - 5) / 6) * x * u5 * V6
                    if f6_mode == "shadow" else a6 * V6
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
                assert reference["y_slab"] == y_index
                assert reference["normalized_x_interval"] == [str(x0n), str(x1n)]
                assert reference["x_interval"] == [str(x0), str(x1)]
                assert reference["y_interval"] == [str(y0), str(y1)]
                assert reference["u5_interval"] == [str(lo), str(hi)]
                assert reference["f4_mode"] == f4_mode
                assert reference["f6_mode"] == f6_mode
                for key, value in result.items():
                    assert reference[key] == value, (
                        x_index, y_index, u_index, key
                    )
                assert result["negative"] == 0 and result["negative_vertices"] == 0
                totals["regions"] += 1
                for key in ("coefficients", "negative", "zero", "positive"):
                    totals[key] += int(result[key])
                digest.update(
                    (
                        f"{x_index}:{y_index}:{u_index}:"
                        f"{result['ordered_sha256']}\n"
                    ).encode()
                )
                print(
                    "AUDIT_PASS", n_value, f_value, x_index,
                    y_index, u_index, flush=True,
                )
                del expression, polynomial
                sp.core.cache.clear_cache()
                gc.collect()

    assert row_index == len(references)
    assert primary["aggregate"] == totals
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-lower-exact-f-hybrid-independent-audit-v1",
        "status": (
            f"PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
            f"F_ORDER_{f_value}_HYBRID_AUDIT"
        ),
        "D_order": n_value,
        "F_order": f_value,
        "independence": (
            "Imports neither producer nor probe. Reconstructs the endpoint "
            "from the canonical transcript and independently recomputes every "
            "hybrid ratio/absolute rational Bernstein coefficient."
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
