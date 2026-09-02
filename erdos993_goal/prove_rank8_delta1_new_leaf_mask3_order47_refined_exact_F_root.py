#!/usr/bin/env python3
"""Exact refined-F certificate for the Delta1 mask-3 endpoint at |D|=47."""

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
    "rank8_delta1_new_leaf_mask3_order47_refined_exact_F_root_20260825.json"
)
N_VALUE = 47
SMALL_F_MAX_ORDER = 26
REFINED_F_ORDERS = tuple(range(27, 34))
SIMPLE_F_ORDERS = tuple(range(34, 47))
Y_BREAKS = tuple(
    sp.Rational(value)
    for value in (0, sp.Rational(1, 4), sp.Rational(1, 2), sp.Rational(3, 4),
                  sp.Rational(7, 8), sp.Rational(15, 16), sp.Rational(31, 32),
                  sp.Rational(63, 64), 1)
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
    endpoint, metadata = base.corner.new_leaf_corner(1, 3)
    reference = json.loads(
        (
            HERE
            / "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m03_"
              "q_corner_agent_20260823.json"
        ).read_text(encoding="utf-8")
    )
    assert base.corner.polynomial_record(endpoint) == reference["cleared_numerator"]

    N = sp.Integer(N_VALUE)
    small = sp.Integer(SMALL_F_MAX_ORDER)
    mu4_floor = sp.cancel((N - 7) * (N - 8) / (N - 3))
    mu5_floor = sp.cancel(mu4_floor - 3 + 2 / mu4_floor)
    x_lower = sp.cancel(6 / (N - 5))
    x_upper = sp.cancel(6 / mu5_floor)
    y_lower = sp.cancel(5 / (N - 4))
    y_upper = sp.cancel(5 / mu4_floor)
    k4 = sp.cancel(4 * mu4_floor / (5 * (N - 4)))
    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    x = x_lower + (x_upper - x_lower) * X
    rows = []

    def certify_exact_F(F_order_value: int, normalized_lo: sp.Rational,
                        normalized_hi: sp.Rational) -> None:
        M = sp.Integer(F_order_value)
        mu4_F_floor = sp.cancel((M - 7) * (M - 8) / (M - 3))
        y_slab_lower = y_lower + (y_upper - y_lower) * normalized_lo
        y = y_lower + (y_upper - y_lower) * (
            normalized_lo + (normalized_hi - normalized_lo) * Y
        )
        l4 = sp.cancel(5 / (mu4_F_floor * y_slab_lower))
        ratio_break = sp.cancel((1 - k4) / (l4 - k4))
        assert 0 < ratio_break < 1
        for region, lo, hi, mode in (
            ("ratio", sp.Integer(0), ratio_break, "ratio"),
            ("missing", ratio_break, sp.Integer(1), "missing"),
        ):
            u5 = lo + (hi - lo) * S
            if mode == "ratio":
                f4_value = sp.cancel(5 / mu4_F_floor) * x * u5 * V4
            else:
                f4_value = x * y * (1 - k4 * (1 - u5)) * V4
            f6_value = sp.cancel((M - 5) / 6) * x * u5 * V6
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
            result = base.audit(sp.Poly(expression, X, Y, S, V4, V6, domain=sp.QQ))
            assert result["negative"] == 0
            assert result["negative_vertices"] == 0
            assert "adaptive" not in result
            rows.append(
                {
                    "scope": f"F_order_exactly_{F_order_value}",
                    "F_order": F_order_value,
                    "region": region,
                    "normalized_y_interval": [str(normalized_lo), str(normalized_hi)],
                    "u5_interval": [str(lo), str(hi)],
                    **result,
                }
            )

    for F_order_value in REFINED_F_ORDERS:
        for normalized_lo, normalized_hi in zip(Y_BREAKS, Y_BREAKS[1:]):
            certify_exact_F(F_order_value, normalized_lo, normalized_hi)
        print("REFINED_F_PASS", F_order_value, "SLABS", len(Y_BREAKS) - 1, flush=True)
    for F_order_value in SIMPLE_F_ORDERS:
        certify_exact_F(F_order_value, sp.Integer(0), sp.Integer(1))
        print("SIMPLE_F_PASS", F_order_value, flush=True)

    y = y_lower + (y_upper - y_lower) * Y
    d4_floor = math.comb(N_VALUE - 3, 4)
    d5_floor = math.comb(N_VALUE - 4, 5)
    d6_floor = math.comb(N_VALUE - 5, 6)
    a4 = sp.Rational(math.comb(SMALL_F_MAX_ORDER, 4), d4_floor)
    a5 = sp.Rational(math.comb(SMALL_F_MAX_ORDER, 5), d5_floor)
    a6 = sp.Rational(math.comb(SMALL_F_MAX_ORDER, 6), d6_floor)
    small_u4_break = sp.cancel((a4 - (1 - k4)) / k4)
    small_k6 = sp.cancel((small - 5) * x_upper / 6)
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
        u5 = lo + (hi - lo) * S
        u4 = (
            (1 - k4 * (1 - u5)) * V4
            if u4_mode == "missing" else a4 * V4
        )
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
                    base.corner.leaf.f[4]: x * y * u4,
                },
                simultaneous=True,
            )
        )
        result = base.audit(sp.Poly(expression, X, Y, S, V4, V6, domain=sp.QQ))
        assert result["negative"] == 0
        assert result["negative_vertices"] == 0
        assert "adaptive" not in result
        rows.append(
            {
                "scope": f"F_order_at_most_{SMALL_F_MAX_ORDER}",
                "region": f"interval_{index}",
                "normalized_y_interval": ["0", "1"],
                "u5_interval": [str(lo), str(hi)],
                "u4_mode": u4_mode,
                "u6_mode": u6_mode,
                **result,
            }
        )
    print("SMALL_F_PASS", SMALL_F_MAX_ORDER, "REGIONS", len(ordered_breaks) - 1, flush=True)

    totals = {
        key: sum(row[key] for row in rows)
        for key in ("coefficients", "negative", "zero", "positive")
    }
    assert totals["negative"] == 0
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-order47-refined-exact-F-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_FOR_D_ORDER_47",
        "theorem": (
            "Let A be a tree, v a vertex, D=A-v, F=A-N[v], and attach a new "
            "leaf w at v. If |D|=47, then the Delta1 new-leaf residual at "
            "c8=Q7(C)_upper and d7=Q6(D)_upper is nonnegative."
        ),
        "partition": {
            "small_F_max_order": SMALL_F_MAX_ORDER,
            "refined_exact_F_orders": list(REFINED_F_ORDERS),
            "simple_exact_F_orders": list(SIMPLE_F_ORDERS),
            "refined_normalized_y_breaks": [str(value) for value in Y_BREAKS],
        },
        "lemmas": {
            "exact_F_order_coupling": (
                "The same M=|F| controls mu4(F) and 6f6<=(M-5)f5."
            ),
            "coupled_rank4": "f4<=(5/mu4_floor(F))*f5 retains d5/d6.",
            "small_F_absolute": "fk<=C(26,k), divided by path floors for dk.",
            "missing_shadow": "4(d5-f5)<=(N-4)(d4-f4).",
            "sign_engine": "exact tensor Bernstein coefficients on all rational boxes",
        },
        "path_floors_d4_d5_d6": [d4_floor, d5_floor, d6_floor],
        "aggregate": {"regions": len(rows), **totals},
        "rows": rows,
        "dependency_sha256": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("REGIONS", len(rows), "COEFFICIENTS", totals["coefficients"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
