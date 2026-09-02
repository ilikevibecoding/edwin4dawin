#!/usr/bin/env python3
"""Exact rational D=36, Delta1 mask-3 certificate for an F-order shard."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base


HERE = Path(__file__).resolve().parent
N_VALUE = 36
X_BREAKS = (
    sp.Integer(0), sp.Rational(1, 8), sp.Rational(1, 4),
    sp.Rational(1, 2), sp.Integer(1),
)
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
    parser.add_argument("--F-start", type=int, required=True)
    parser.add_argument("--F-end", type=int, required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    assert 20 <= args.F_start <= args.F_end <= 35
    exact_orders = tuple(range(args.F_start, args.F_end + 1))

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
    missing_constant = sp.cancel(4 / (n - 4))
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    rows = []

    for f_order_value in exact_orders:
        m = sp.Integer(f_order_value)
        mu4_f_floor = sp.cancel((m - 7) * (m - 8) / (m - 3))
        ratio_cap = sp.cancel(5 / mu4_f_floor)
        for x_index, (x_lo_norm, x_hi_norm) in enumerate(
            zip(X_BREAKS, X_BREAKS[1:])
        ):
            x_lo = x_lower + (x_upper - x_lower) * x_lo_norm
            x_hi = x_lower + (x_upper - x_lower) * x_hi_norm
            x = x_lo + (x_hi - x_lo) * X
            q5_y_cap = sp.cancel(10 * x_hi / (x_hi + 12))
            y_cap = min(y_upper, q5_y_cap)
            assert y_lower <= y_cap
            for y_lo_norm, y_hi_norm in zip(Y_BREAKS, Y_BREAKS[1:]):
                y_slab_lower = y_lower + (y_cap - y_lower) * y_lo_norm
                y_slab_upper = y_lower + (y_cap - y_lower) * y_hi_norm
                y = y_slab_lower + (y_slab_upper - y_slab_lower) * Y
                ratio_envelope = sp.cancel(ratio_cap / y_slab_lower)
                missing_envelope_slope = sp.cancel(
                    missing_constant / y_slab_lower
                )
                switch = sp.cancel(
                    (y_slab_lower - missing_constant)
                    / (ratio_cap - missing_constant)
                )
                assert sp.factor(
                    switch
                    - (1 - missing_envelope_slope)
                    / (ratio_envelope - missing_envelope_slope)
                ) == 0
                assert 0 < switch < 1
                for region, lo, hi in (
                    ("ratio", sp.Integer(0), switch),
                    ("missing", switch, sp.Integer(1)),
                ):
                    u5 = lo + (hi - lo) * S
                    f4_value = (
                        ratio_cap * x * u5 * V4
                        if region == "ratio"
                        else (
                            x * y - missing_constant * x * (1 - u5)
                        ) * V4
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
                    assert result["negative"] == 0, (
                        f_order_value, x_index, y_lo_norm, y_hi_norm, region,
                        result,
                    )
                    assert result["negative_vertices"] == 0
                    assert "adaptive" not in result
                    rows.append(
                        {
                            "F_order": f_order_value,
                            "x_slab": x_index,
                            "normalized_x_interval": [
                                str(x_lo_norm), str(x_hi_norm)
                            ],
                            "x_interval": [str(x_lo), str(x_hi)],
                            "q5_y_cap_at_right_endpoint": str(q5_y_cap),
                            "y_cap": str(y_cap),
                            "normalized_y_interval": [
                                str(y_lo_norm), str(y_hi_norm)
                            ],
                            "y_interval": [
                                str(y_slab_lower), str(y_slab_upper)
                            ],
                            "region": region,
                            "u5_interval": [str(lo), str(hi)],
                            "mu4_F_floor": str(mu4_f_floor),
                            "rank4_ratio_cap": str(ratio_cap),
                            "rank6_shadow_multiplier": str(
                                sp.cancel((m - 5) / 6)
                            ),
                            **result,
                        }
                    )
        print("EXACT_F_PASS", f_order_value, "REGIONS", 64, flush=True)

    totals = {
        key: sum(row[key] for row in rows)
        for key in ("coefficients", "negative", "zero", "positive")
    }
    assert totals["negative"] == 0 and totals["zero"] == 0
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-order36-exact-F-shard-v1",
        "status": (
            "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_36_"
            f"F_ORDERS_{args.F_start}_THROUGH_{args.F_end}"
        ),
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=36 and "
            f"{args.F_start}<=|F|<={args.F_end}."
        ),
        "D_order": N_VALUE,
        "F_orders": list(exact_orders),
        "partition": {
            "normalized_x_breaks": [str(value) for value in X_BREAKS],
            "normalized_y_breaks": [str(value) for value in Y_BREAKS],
        },
        "lemmas": {
            "q5_compatibility": "Q5(D)>=0 gives y<=10x/(x+12).",
            "exact_F_order_coupling": (
                "The same exact M=|F| controls the rank-4 ratio and "
                "rank-6 shadow in every row."
            ),
            "rank4_forest_ratio": (
                "mu4(F)>=(M-7)(M-8)/(M-3), hence "
                "f4<=(5/mu4(F))f5."
            ),
            "rank6_shadow": "6f6<=(M-5)f5.",
            "missing_shadow": "4(d5-f5)<=(36-4)(d4-f4).",
            "sign_engine": "exact tensor Bernstein coefficients on rational boxes",
        },
        "ratio_bounds": {
            "x_d5_over_d6": [str(x_lower), str(x_upper)],
            "y_d4_over_d5": [str(y_lower), str(y_upper)],
        },
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


