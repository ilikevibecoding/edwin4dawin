#!/usr/bin/env python3
"""Generic exact Q5-compatible Delta1 mask-3 certificate at one D order."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base


HERE = Path(__file__).resolve().parent
Y_BREAKS = (
    sp.Integer(0), sp.Rational(1, 4), sp.Rational(1, 2),
    sp.Rational(3, 4), sp.Rational(7, 8), sp.Rational(15, 16),
    sp.Rational(31, 32), sp.Rational(63, 64), sp.Integer(1),
)

PINNED = {
    "probe_rank8_delta1_mask3_exact_F_order_slices_root.py":
        "3CE1822062F91A6969705CE9A3E1D5AB918996A111EEABD493D01B93FAC13B8F",
    "probe_rank8_delta1_mask3_shadow_adaptive_subdivision_root.py":
        "15745DEC544D96B89C490BCCE82EBB9C492C91538D33527200A29CEF59D48E90",
    "analyze_rank8_delta03_arbitrary_leaf_extension_q_corner_agent.py":
        "D3A17F85CC3E31A229BED7E16201FCDA031E8C9D63ED5568AF0F90D0A66DBBBB",
    "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py":
        "CC1F0204C2CBE3B202E35CEB60EBD6FA847CBEF1BE74DD255023198AB3707BAA",
    "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m03_q_corner_agent_20260823.json":
        "2ED841411515F64B53226DE715A98CB28182CA6CCD2EAC0858F7E59D0CC297AB",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
    "verify_rank5_three_halves_convolution_cones.py":
        "06BD1AA9355B1C07DE5B9087AFEE0477D9C583E0ED943EA86FC332FB692A8194",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--D-order", type=int, required=True)
    parser.add_argument("--small-F-max", type=int, required=True)
    parser.add_argument("--x-slabs", type=int, required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    n_value = args.D_order
    small_value = args.small_F_max
    assert n_value >= 26
    assert 17 <= small_value < n_value - 1
    assert args.x_slabs >= 1
    exact_orders = tuple(range(small_value + 1, n_value))
    x_breaks = tuple(
        sp.Rational(index, args.x_slabs)
        for index in range(args.x_slabs + 1)
    )

    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    endpoint, metadata = base.corner.new_leaf_corner(1, 3)
    reference = json.loads(
        (
            HERE
            / "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m03_"
              "q_corner_agent_20260823.json"
        ).read_text(encoding="utf-8")
    )
    assert base.corner.polynomial_record(endpoint) == reference["cleared_numerator"]

    n = sp.Integer(n_value)
    small = sp.Integer(small_value)
    mu4_floor = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    x_lower = sp.cancel(6 / (n - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (n - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    k4 = sp.cancel(4 * mu4_floor / (5 * (n - 4)))
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    rows = []

    for f_order_value in exact_orders:
        m = sp.Integer(f_order_value)
        mu4_f_floor = sp.cancel((m - 7) * (m - 8) / (m - 3))
        x = x_lower + (x_upper - x_lower) * X
        for y_lo_norm, y_hi_norm in zip(Y_BREAKS, Y_BREAKS[1:]):
            y_slab_lower = y_lower + (y_upper - y_lower) * y_lo_norm
            y = y_lower + (y_upper - y_lower) * (
                y_lo_norm + (y_hi_norm - y_lo_norm) * Y
            )
            ratio_multiplier = sp.cancel(5 / (mu4_f_floor * y_slab_lower))
            ratio_break = sp.cancel((1 - k4) / (ratio_multiplier - k4))
            assert 0 < ratio_break < 1
            for region, lo, hi in (
                ("ratio", sp.Integer(0), ratio_break),
                ("missing", ratio_break, sp.Integer(1)),
            ):
                u5 = lo + (hi - lo) * S
                f4_value = (
                    sp.cancel(5 / mu4_f_floor) * x * u5 * V4
                    if region == "ratio"
                    else x * y * (1 - k4 * (1 - u5)) * V4
                )
                f6_value = sp.cancel((m - 5) / 6) * x * u5 * V6
                expression = sp.expand(
                    endpoint.subs(
                        {
                            base.corner.leaf.d[6]: 1,
                            base.corner.leaf.d[5]: x,
                            base.corner.leaf.d[4]: x * y,
                            base.corner.leaf.f[6]: f6_value,
                            base.corner.leaf.f[5]: x * u5,
                            base.corner.leaf.f[4]: f4_value,
                        },
                        simultaneous=True,
                    )
                )
                result = base.audit(
                    sp.Poly(expression, X, Y, S, V4, V6, domain=sp.QQ)
                )
                assert result["negative"] == 0
                assert result["negative_vertices"] == 0
                assert "adaptive" not in result
                rows.append(
                    {
                        "scope": f"F_order_exactly_{f_order_value}",
                        "F_order": f_order_value,
                        "region": region,
                        "normalized_y_interval": [str(y_lo_norm), str(y_hi_norm)],
                        "u5_interval": [str(lo), str(hi)],
                        **result,
                    }
                )
        print("EXACT_F_PASS", f_order_value, "REGIONS", 16, flush=True)

    floors = {
        rank: math.comb(n_value, rank)
        - small_value * math.comb(n_value - 2, rank - 2)
        for rank in (4, 5, 6)
    }
    assert all(value > 0 for value in floors.values())
    a4 = sp.Rational(math.comb(small_value, 4), floors[4])
    a5 = sp.Rational(math.comb(small_value, 5), floors[5])
    a6 = sp.Rational(math.comb(small_value, 6), floors[6])
    u4_break = sp.cancel((a4 - (1 - k4)) / k4)
    u6_break = sp.cancel(a6 / (sp.cancel((small - 5) * x_upper / 6)))
    u5_break_set = {sp.Integer(0), a5}
    if 0 < u4_break < a5:
        u5_break_set.add(u4_break)
    if 0 < u6_break < a5:
        u5_break_set.add(u6_break)
    u5_breaks = tuple(sorted(u5_break_set))
    for x_index, (x_lo_norm, x_hi_norm) in enumerate(
        zip(x_breaks, x_breaks[1:])
    ):
        x_lo = x_lower + (x_upper - x_lower) * x_lo_norm
        x_hi = x_lower + (x_upper - x_lower) * x_hi_norm
        x = x_lo + (x_hi - x_lo) * X
        q5_y_cap = sp.cancel(10 * x_hi / (x_hi + 12))
        y_cap = min(y_upper, q5_y_cap)
        assert y_lower <= y_cap
        y = y_lower + (y_cap - y_lower) * Y
        for u_index, (lo, hi) in enumerate(zip(u5_breaks, u5_breaks[1:])):
            midpoint = (lo + hi) / 2
            u5 = lo + (hi - lo) * S
            u4_mode = (
                "missing" if 1 - k4 * (1 - midpoint) <= a4 else "absolute"
            )
            f4_value = x * y * (
                (1 - k4 * (1 - u5)) if u4_mode == "missing" else a4
            ) * V4
            u6_mode = (
                "shadow"
                if sp.cancel((small - 5) / 6) * x_upper * midpoint <= a6
                else "absolute"
            )
            f6_value = (
                sp.cancel((small - 5) / 6) * x * u5 * V6
                if u6_mode == "shadow"
                else a6 * V6
            )
            expression = sp.expand(
                endpoint.subs(
                    {
                        base.corner.leaf.d[6]: 1,
                        base.corner.leaf.d[5]: x,
                        base.corner.leaf.d[4]: x * y,
                        base.corner.leaf.f[6]: f6_value,
                        base.corner.leaf.f[5]: x * u5,
                        base.corner.leaf.f[4]: f4_value,
                    },
                    simultaneous=True,
                )
            )
            result = base.audit(
                sp.Poly(expression, X, Y, S, V4, V6, domain=sp.QQ)
            )
            assert result["negative"] == 0
            assert result["negative_vertices"] == 0
            assert "adaptive" not in result
            rows.append(
                {
                    "scope": f"F_order_at_most_{small_value}",
                    "x_slab": x_index,
                    "normalized_x_interval": [str(x_lo_norm), str(x_hi_norm)],
                    "x_interval": [str(x_lo), str(x_hi)],
                    "y_interval": [str(y_lower), str(y_cap)],
                    "q5_y_cap_at_right_endpoint": str(q5_y_cap),
                    "u5_interval": [str(lo), str(hi)],
                    "u4_mode": u4_mode,
                    "u6_mode": u6_mode,
                    **result,
                }
            )
    small_regions = args.x_slabs * (len(u5_breaks) - 1)
    print("SMALL_F_Q5_PASS", small_value, "REGIONS", small_regions, flush=True)

    totals = {
        key: sum(row[key] for row in rows)
        for key in ("coefficients", "negative", "zero", "positive")
    }
    assert totals["negative"] == 0
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-q5-exact-F-generic-v1",
        "status": f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_{n_value}",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            f"new-leaf mask-3 endpoint is nonnegative when |D|={n_value}."
        ),
        "D_order": n_value,
        "partition": {
            "small_F_max_order": small_value,
            "small_normalized_x_breaks": [str(value) for value in x_breaks],
            "small_u5_breaks": [str(value) for value in u5_breaks],
            "exact_F_orders": list(exact_orders),
            "exact_normalized_y_breaks": [str(value) for value in Y_BREAKS],
        },
        "lemmas": {
            "q5_compatibility": "Q5(D)>=0 gives y<=10x/(x+12).",
            "edge_count_identity": "|F|=|E(D)|.",
            "edge_union_floor": "i_k(D)>=C(N,k)-M*C(N-2,k-2).",
            "exact_F_order_coupling": (
                "The same M controls mu4(F) and 6f6<=(M-5)f5."
            ),
            "missing_shadow": "4(d5-f5)<=(N-4)(d4-f4).",
            "sign_engine": "exact tensor Bernstein coefficients on rational boxes",
        },
        "small_edge_count_sensitive_floors_d4_d5_d6": [
            floors[rank] for rank in (4, 5, 6)
        ],
        "small_absolute_caps_u4_u5_u6": [str(a4), str(a5), str(a6)],
        "aggregate": {"regions": len(rows), **totals},
        "rows": rows,
        "endpoint_names": metadata["endpoint_names"],
        "dependency_sha256": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("REGIONS", len(rows), "COEFFICIENTS", totals["coefficients"], flush=True)
    print("SOURCE", sha256(Path(__file__)), flush=True)
    print("REPORT", sha256(output), flush=True)


if __name__ == "__main__":
    main()
