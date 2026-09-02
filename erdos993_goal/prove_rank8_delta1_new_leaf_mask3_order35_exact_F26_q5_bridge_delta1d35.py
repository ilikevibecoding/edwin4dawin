#!/usr/bin/env python3
"""Exact D=35, |F|=26 mask-3 certificate using the forest Q5 coupling."""

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
    "rank8_delta1_new_leaf_mask3_order35_exact_F26_q5_bridge_"
    "delta1d35_20260825.json"
)
N_VALUE = 35
F_ORDER = 26
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
    "rank8_delta03_arbitrary_leaf_extension_new_leaf_r1_m03_"
    "q_corner_agent_20260823.json":
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


def positive_denominator_record(
    denominator: sp.Expr,
    variables: tuple[sp.Symbol, ...],
) -> dict[str, object]:
    polynomial = sp.Poly(sp.expand(denominator), *variables, domain=sp.QQ)
    coefficients = polynomial.coeffs()
    assert coefficients and all(value >= 0 for value in coefficients)
    assert polynomial.eval(dict.fromkeys(variables, 0)) > 0
    return {
        "expression": str(sp.factor(denominator)),
        "power_terms": len(polynomial.terms()),
        "minimum_power_coefficient": str(min(coefficients)),
    }


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
    m = sp.Integer(F_ORDER)
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
    mu4_f_floor = sp.cancel((m - 7) * (m - 8) / (m - 3))
    rank4_ratio_cap = sp.cancel(5 / mu4_f_floor)
    rank6_shadow_cap = sp.cancel((m - 5) / 6)
    q5_switch_ratio = sp.Rational(10, 43)
    normalized_rank4_switch = sp.cancel(
        q5_switch_ratio / rank4_ratio_cap
    )
    assert 0 < normalized_rank4_switch < 1

    floors = {
        rank: math.comb(N_VALUE, rank)
        - F_ORDER * math.comb(N_VALUE - 2, rank - 2)
        for rank in (4, 5, 6)
    }
    assert all(value > 0 for value in floors.values())
    absolute_caps = {
        rank: sp.Rational(math.comb(F_ORDER, rank), floors[rank])
        for rank in (4, 5, 6)
    }

    X, Y, S, T, V6 = sp.symbols("X Y S T V6", nonnegative=True)
    variables = (X, Y, S, T, V6)
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
        u5 = absolute_caps[5] * S
        f5_value = x * u5
        assert rank6_shadow_cap * x_hi * absolute_caps[5] <= absolute_caps[6]

        for coupling_region in ("shadow", "forest_q5"):
            if coupling_region == "shadow":
                normalized_rank4 = normalized_rank4_switch * T
                rank6_ratio_cap = rank6_shadow_cap
            else:
                normalized_rank4 = (
                    normalized_rank4_switch
                    + (1 - normalized_rank4_switch) * T
                )
                rank4_ratio = rank4_ratio_cap * normalized_rank4
                rank6_ratio_cap = sp.cancel(
                    (10 - rank4_ratio) / (12 * rank4_ratio)
                )
            rank4_ratio = rank4_ratio_cap * normalized_rank4
            assert sp.factor(
                rank6_ratio_cap.subs(T, 0) - rank6_shadow_cap
            ) == 0 if coupling_region == "forest_q5" else True
            f4_value = rank4_ratio * f5_value
            f6_value = rank6_ratio_cap * f5_value * V6
            rational_expression = sp.cancel(
                endpoint.subs(
                    {
                        base.corner.leaf.d[6]: 1,
                        base.corner.leaf.d[5]: x,
                        base.corner.leaf.d[4]: x * y,
                        base.corner.leaf.f[6]: f6_value,
                        base.corner.leaf.f[5]: f5_value,
                        base.corner.leaf.f[4]: f4_value,
                    },
                    simultaneous=True,
                )
            )
            numerator, denominator = sp.fraction(rational_expression)
            denominator_record = positive_denominator_record(
                denominator, variables
            )
            polynomial = sp.Poly(
                sp.expand(numerator), *variables, domain=sp.QQ
            )
            result = base.audit(polynomial)
            assert result["negative"] == 0, (
                x_index, coupling_region, result
            )
            assert result["negative_vertices"] == 0
            assert "adaptive" not in result
            rows.append(
                {
                    "x_slab": x_index,
                    "normalized_x_interval": [str(x_lo_norm), str(x_hi_norm)],
                    "x_interval": [str(x_lo), str(x_hi)],
                    "q5_y_cap_at_right_endpoint": str(q5_y_cap),
                    "y_interval": [str(y_lower), str(y_cap)],
                    "u5_interval": ["0", str(absolute_caps[5])],
                    "coupling_region": coupling_region,
                    "normalized_rank4_interval": (
                        ["0", str(normalized_rank4_switch)]
                        if coupling_region == "shadow"
                        else [str(normalized_rank4_switch), "1"]
                    ),
                    "rank6_ratio_cap": str(sp.factor(rank6_ratio_cap)),
                    "cleared_positive_denominator": denominator_record,
                    **result,
                }
            )
            print(
                "EXACT_F26_Q5_BRIDGE_PASS",
                x_index,
                coupling_region,
                flush=True,
            )

    totals = {
        key: sum(row[key] for row in rows)
        for key in ("coefficients", "negative", "zero", "positive")
    }
    assert totals["negative"] == 0 and totals["zero"] == 0
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-order35-exact-F26-q5-bridge-v1",
        "status": "PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_35_F_ORDER_26_Q5_BRIDGE",
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            "new-leaf mask-3 endpoint is nonnegative when |D|=35 and "
            "|F|=26. The joint rank-4/rank-6 relaxation is cut by the "
            "certified rank-5 forest Q5 inequality."
        ),
        "D_order": N_VALUE,
        "F_order": F_ORDER,
        "partition": {
            "normalized_x_breaks": [str(value) for value in X_BREAKS],
            "normalized_rank4_switch": str(normalized_rank4_switch),
            "rank4_ratio_switch": str(q5_switch_ratio),
            "regions": ["shadow", "forest_q5"],
        },
        "lemmas": {
            "D_q5_compatibility": "Q5(D)>=0 gives y<=10x/(x+12).",
            "F_q5_compatibility": (
                "Q5(F)>=0 gives f6/f5 <= "
                "(10-f4/f5)/(12(f4/f5))."
            ),
            "edge_count_identity": "|F|=|E(D)|.",
            "edge_union_floor": "i_k(D)>=C(35,k)-26*C(33,k-2).",
            "absolute_caps": "f_k<=C(26,k), for k=4,5,6.",
            "rank4_forest_ratio": "f4<=(115/342)f5.",
            "rank6_shadow": "6f6<=21f5.",
            "sign_engine": "exact tensor Bernstein coefficients on rational boxes",
        },
        "edge_count_sensitive_floors_d4_d5_d6": [
            floors[rank] for rank in (4, 5, 6)
        ],
        "absolute_caps_u4_u5_u6": [
            str(absolute_caps[rank]) for rank in (4, 5, 6)
        ],
        "rank4_ratio_cap": str(rank4_ratio_cap),
        "rank6_shadow_cap": str(rank6_shadow_cap),
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
