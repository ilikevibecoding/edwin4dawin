#!/usr/bin/env python3
"""Exact rational D=35 bridge certificate for the exact order |F|=20."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_new_leaf_mask3_order35_exact_F20_bridge_delta1d35_20260825.json"
N_VALUE = 35
F_ORDER = 20
X_BREAKS = (
    sp.Integer(0), sp.Rational(1, 8), sp.Rational(1, 4),
    sp.Rational(1, 2), sp.Integer(1),
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
    small = sp.Integer(F_ORDER)
    mu4_floor = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu4_integer = int(sp.floor(mu4_floor))
    mu4_fraction = sp.cancel(mu4_floor - mu4_integer)
    phi_mu4 = sp.cancel(
        (1 - mu4_fraction) * sp.binomial(mu4_integer - 1, 2)
        + mu4_fraction * sp.binomial(mu4_integer, 2)
    )
    mu5_floor = sp.cancel(2 * phi_mu4 / mu4_floor)
    x_lower = sp.cancel(6 / (n - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (n - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    mu4_f_floor = sp.cancel((small - 7) * (small - 8) / (small - 3))
    rank4_ratio_cap = sp.cancel(5 / mu4_f_floor)
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)

    floors = {
        rank: math.comb(N_VALUE, rank)
        - F_ORDER * math.comb(N_VALUE - 2, rank - 2)
        for rank in (4, 5, 6)
    }
    assert all(value > 0 for value in floors.values())
    a4 = sp.Rational(math.comb(F_ORDER, 4), floors[4])
    a5 = sp.Rational(math.comb(F_ORDER, 5), floors[5])
    a6 = sp.Rational(math.comb(F_ORDER, 6), floors[6])
    rows = []

    for x_index, (x_lo_norm, x_hi_norm) in enumerate(
        zip(X_BREAKS, X_BREAKS[1:])
    ):
        x_lo = x_lower + (x_upper - x_lower) * x_lo_norm
        x_hi = x_lower + (x_upper - x_lower) * x_hi_norm
        x = x_lo + (x_hi - x_lo) * X
        q5_y_cap = sp.cancel(10 * x_hi / (x_hi + 12))
        y_cap = min(y_upper, q5_y_cap)
        assert y_lower <= y_cap
        y = y_lower + (y_cap - y_lower) * Y
        u6_break = sp.cancel(a6 / (sp.cancel((small - 5) * x_hi / 6)))
        u5_breaks = (
            (sp.Integer(0), a5)
            if u6_break >= a5
            else (sp.Integer(0), u6_break, a5)
        )
        for u_index, (lo, hi) in enumerate(zip(u5_breaks, u5_breaks[1:])):
            u5 = lo + (hi - lo) * S
            f4_value = rank4_ratio_cap * x * u5 * V4
            u6_mode = "shadow" if u_index == 0 else "absolute"
            assert (
                sp.cancel((small - 5) * x_upper * ((lo + hi) / 2) / 6)
                <= a6
            ) == (u6_mode == "shadow")
            f6_value = (
                sp.cancel((small - 5) / 6) * x * u5 * V6
                if u6_mode == "shadow" else a6 * V6
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
            assert result["negative"] == 0, (x_index, u_index, result)
            assert result["negative_vertices"] == 0
            assert "adaptive" not in result
            rows.append(
                {
                    "x_slab": x_index,
                    "normalized_x_interval": [str(x_lo_norm), str(x_hi_norm)],
                    "x_interval": [str(x_lo), str(x_hi)],
                    "q5_y_cap_at_right_endpoint": str(q5_y_cap),
                    "y_interval": [str(y_lower), str(y_cap)],
                    "u5_interval": [str(lo), str(hi)],
                    "u4_mode": "exact_F_rank4_ratio",
                    "u6_mode": u6_mode,
                    **result,
                }
            )
            print("EXACT_F20_BRIDGE_PASS", x_index, u_index, u6_mode, flush=True)

    totals = {
        key: sum(row[key] for row in rows)
        for key in ("coefficients", "negative", "zero", "positive")
    }
    assert totals["negative"] == 0 and totals["zero"] == 0
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-order35-exact-F20-bridge-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_F_ORDER_20_BRIDGE",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=35 and |F|=20."
        ),
        "D_order": N_VALUE,
        "F_order": F_ORDER,
        "partition": {
            "normalized_x_breaks": [str(value) for value in X_BREAKS],
            "u5_partition_rule": (
                "For each x slab, split at min(a5,a6/(((M-5)/6)*x_hi))."
            ),
        },
        "lemmas": {
            "q5_compatibility": "Q5(D)>=0 gives y<=10x/(x+12).",
            "edge_count_identity": "|F|=|E(D)|.",
            "edge_union_floor": "i_k(D)>=C(35,k)-20*C(33,k-2).",
            "absolute_caps": "f_k<=C(20,k), for k=4,5,6.",
            "rank4_forest_ratio": "f4<=(85/156)f5 for the exact forest order 20.",
            "rank6_shadow": "6f6<=(20-5)f5.",
            "sign_engine": "exact tensor Bernstein coefficients on rational boxes",
        },
        "edge_count_sensitive_floors_d4_d5_d6": [
            floors[rank] for rank in (4, 5, 6)
        ],
        "absolute_caps_u4_u5_u6": [str(a4), str(a5), str(a6)],
        "rank4_ratio_cap": str(rank4_ratio_cap),
        "u6_switches_by_x_slab": [
            row["u5_interval"][1]
            for row in rows if row["u6_mode"] == "shadow"
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


