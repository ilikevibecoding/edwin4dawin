#!/usr/bin/env python3
"""Exact Q5-compatible certificate for the Delta1 mask-3 endpoint at |D|=45."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "rank8_delta1_new_leaf_mask3_order45_q5_exact_F_root_20260825.json"
)
N_VALUE = 45
SMALL_F_MAX_ORDER = 30
EXACT_F_ORDERS = tuple(range(31, 45))
NORMALIZED_X_BREAKS = (sp.Integer(0), sp.Rational(1, 2), sp.Integer(1))
Y_BREAKS = tuple(
    sp.Rational(value)
    for value in (
        0, sp.Rational(1, 4), sp.Rational(1, 2), sp.Rational(3, 4),
        sp.Rational(7, 8), sp.Rational(15, 16), sp.Rational(31, 32),
        sp.Rational(63, 64), 1,
    )
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

    n = sp.Integer(N_VALUE)
    small = sp.Integer(SMALL_F_MAX_ORDER)
    mu4_floor = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    x_lower = sp.cancel(6 / (n - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (n - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    k4 = sp.cancel(4 * mu4_floor / (5 * (n - 4)))
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    rows = []

    # Exact M=|F| slices.  The same M supplies the rank-4 forest ratio and
    # the rank-6 extension shadow, avoiding incompatible cross-order extrema.
    for f_order_value in EXACT_F_ORDERS:
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
                        "normalized_y_interval": [
                            str(y_lo_norm), str(y_hi_norm)
                        ],
                        "u5_interval": [str(lo), str(hi)],
                        **result,
                    }
                )
        print("EXACT_F_PASS", f_order_value, "REGIONS", 16, flush=True)

    # Coarse M<=30 branch.  Here |F|=|E(D)|, so a union bound over edges
    # sharpens the path coefficient floors.  Q5(D)>=0 gives
    # y=d4/d5 <= 10x/(x+12), with x=d5/d6.  Two x slabs cover that curved
    # compatibility region by rigorous outer rectangles.
    floors = {
        rank: math.comb(N_VALUE, rank)
        - SMALL_F_MAX_ORDER * math.comb(N_VALUE - 2, rank - 2)
        for rank in (4, 5, 6)
    }
    a4 = sp.Rational(math.comb(SMALL_F_MAX_ORDER, 4), floors[4])
    a5 = sp.Rational(math.comb(SMALL_F_MAX_ORDER, 5), floors[5])
    a6 = sp.Rational(math.comb(SMALL_F_MAX_ORDER, 6), floors[6])
    u6_break = sp.cancel(a6 / (sp.cancel((small - 5) * x_upper / 6)))
    assert 0 < u6_break < a5
    u5_breaks = (sp.Integer(0), u6_break, a5)
    for x_index, (x_lo_norm, x_hi_norm) in enumerate(
        zip(NORMALIZED_X_BREAKS, NORMALIZED_X_BREAKS[1:])
    ):
        x_lo = x_lower + (x_upper - x_lower) * x_lo_norm
        x_hi = x_lower + (x_upper - x_lower) * x_hi_norm
        x = x_lo + (x_hi - x_lo) * X
        q5_y_cap = sp.cancel(10 * x_hi / (x_hi + 12))
        y_cap = min(y_upper, q5_y_cap)
        assert y_lower <= y_cap
        y = y_lower + (y_cap - y_lower) * Y
        for u_index, (lo, hi) in enumerate(zip(u5_breaks, u5_breaks[1:])):
            u5 = lo + (hi - lo) * S
            u6_mode = "shadow" if u_index == 0 else "absolute"
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
                        base.corner.leaf.f[4]: x * y * a4 * V4,
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
                    "scope": "F_order_at_most_30",
                    "x_slab": x_index,
                    "normalized_x_interval": [str(x_lo_norm), str(x_hi_norm)],
                    "x_interval": [str(x_lo), str(x_hi)],
                    "y_interval": [str(y_lower), str(y_cap)],
                    "q5_y_cap_at_right_endpoint": str(q5_y_cap),
                    "u5_interval": [str(lo), str(hi)],
                    "u6_mode": u6_mode,
                    **result,
                }
            )
    print("SMALL_F_Q5_PASS", SMALL_F_MAX_ORDER, "REGIONS", 4, flush=True)

    totals = {
        key: sum(row[key] for row in rows)
        for key in ("coefficients", "negative", "zero", "positive")
    }
    assert totals["negative"] == 0
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-order45-q5-exact-F-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_45",
        "theorem": (
            "Let A be a tree, v a vertex, D=A-v, F=A-N[v], and attach "
            "a new leaf w at v. If |D|=45, then the Delta1 new-leaf "
            "residual at c8=Q7(C)_upper and d7=Q6(D)_upper is nonnegative."
        ),
        "partition": {
            "small_F_max_order": SMALL_F_MAX_ORDER,
            "small_normalized_x_breaks": [
                str(value) for value in NORMALIZED_X_BREAKS
            ],
            "exact_F_orders": list(EXACT_F_ORDERS),
            "exact_normalized_y_breaks": [str(value) for value in Y_BREAKS],
        },
        "lemmas": {
            "q5_compatibility": (
                "The proved all-forest Q5(D)>=0 gives y<=10x/(x+12)."
            ),
            "edge_count_identity": (
                "D has deg_A(v) components, so |E(D)|=|D|-deg_A(v)=|F|."
            ),
            "edge_union_floor": (
                "For |F|<=M, i_k(D)>=C(N,k)-M*C(N-2,k-2)."
            ),
            "exact_F_order_coupling": (
                "The same integer M controls mu4(F) and 6f6<=(M-5)f5."
            ),
            "missing_shadow": "4(d5-f5)<=(N-4)(d4-f4).",
            "sign_engine": "exact tensor Bernstein coefficients on rational boxes",
        },
        "small_edge_count_sensitive_floors_d4_d5_d6": [
            floors[rank] for rank in (4, 5, 6)
        ],
        "aggregate": {"regions": len(rows), **totals},
        "rows": rows,
        "endpoint_names": metadata["endpoint_names"],
        "dependency_sha256": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REGIONS", len(rows), "COEFFICIENTS", totals["coefficients"], flush=True)
    print("SOURCE", sha256(Path(__file__)), flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
