#!/usr/bin/env python3
"""Diagnostic exact-N-band Bernstein probe for Delta1 mask 3."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base


X_BREAKS = (
    sp.Integer(0), sp.Rational(1, 8), sp.Rational(1, 4),
    sp.Rational(1, 2), sp.Integer(1),
)
Y_BREAKS = (
    sp.Integer(0), sp.Rational(1, 4), sp.Rational(1, 2),
    sp.Rational(3, 4), sp.Rational(7, 8), sp.Rational(15, 16),
    sp.Rational(31, 32), sp.Rational(63, 64), sp.Integer(1),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def positive_denominator(polynomial: sp.Poly) -> dict[str, object]:
    result = base.audit(polynomial)
    if result["negative"] and not result["positive"]:
        polynomial = -polynomial
        result = base.audit(polynomial)
    assert result["negative"] == 0 and result["zero"] == 0, result
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--N-low", type=int, required=True)
    parser.add_argument("--N-high", type=int, required=True)
    parser.add_argument("--F-order", type=int, required=True)
    parser.add_argument("--x-index", type=int)
    parser.add_argument("--y-index", type=int)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    assert 27 <= args.N_low < args.N_high <= 42
    assert 9 <= args.F_order < args.N_low
    if args.x_index is not None:
        assert 0 <= args.x_index < 4
    if args.y_index is not None:
        assert 0 <= args.y_index < 8

    endpoint, metadata = base.corner.new_leaf_corner(1, 3)
    T, X, Y, S, V4, V6 = sp.symbols(
        "T X Y S V4 V6", nonnegative=True
    )
    n = sp.Integer(args.N_low) + (
        sp.Integer(args.N_high - args.N_low) * T
    )
    m = sp.Integer(args.F_order)
    mu4 = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu5 = sp.cancel(mu4 - 3 + 2 / mu4)
    x_lower = sp.cancel(6 / (n - 5))
    x_upper = sp.cancel(6 / mu5)
    y_lower = sp.cancel(5 / (n - 4))
    y_upper = sp.cancel(5 / mu4)
    missing = sp.cancel(4 / (n - 4))
    t_m = sp.cancel((m - 7) * (m - 8) / (m - 3))
    ratio_cap = sp.cancel(5 / t_m)
    x_indices = (
        [args.x_index] if args.x_index is not None else list(range(4))
    )
    y_indices = (
        [args.y_index] if args.y_index is not None else list(range(8))
    )
    rows = []
    cap_checks = []

    for x_index in x_indices:
        x0, x1 = X_BREAKS[x_index:x_index + 2]
        x_lo = sp.cancel(x_lower + (x_upper - x_lower) * x0)
        x_hi = sp.cancel(x_lower + (x_upper - x_lower) * x1)
        x = sp.cancel(x_lo + (x_hi - x_lo) * X)
        q5_cap = sp.cancel(10 * x_hi / (x_hi + 12))
        cap_difference = sp.cancel(q5_cap - y_upper)
        cap_num, cap_den = sp.fraction(sp.together(cap_difference))
        cap_den_record = positive_denominator(
            sp.Poly(sp.expand(cap_den), T, domain=sp.QQ)
        )
        cap_num_record = base.audit(
            sp.Poly(sp.expand(cap_num), T, domain=sp.QQ)
        )
        if x_index < 3:
            assert cap_num_record["positive"] == 0
            y_cap = q5_cap
            mode = "q5"
        else:
            assert cap_num_record["negative"] == 0
            y_cap = y_upper
            mode = "path_ratio"
        cap_checks.append(
            {
                "x_slab": x_index,
                "mode": mode,
                "difference_numerator": str(sp.factor(cap_num)),
                "difference_denominator": str(sp.factor(cap_den)),
                "numerator_audit": cap_num_record,
                "denominator_audit": cap_den_record,
            }
        )

        for y_index in y_indices:
            y0n, y1n = Y_BREAKS[y_index:y_index + 2]
            y0 = sp.cancel(y_lower + (y_cap - y_lower) * y0n)
            y1 = sp.cancel(y_lower + (y_cap - y_lower) * y1n)
            y = sp.cancel(y0 + (y1 - y0) * Y)
            switch = sp.cancel((y0 - missing) / (ratio_cap - missing))
            for region, lo, hi in (
                ("ratio", sp.Integer(0), switch),
                ("missing", switch, sp.Integer(1)),
            ):
                u5 = sp.cancel(lo + (hi - lo) * S)
                f4 = (
                    sp.cancel(ratio_cap * x * u5 * V4)
                    if region == "ratio"
                    else sp.cancel(
                        (x * y - missing * x * (1 - u5)) * V4
                    )
                )
                f6 = sp.cancel((m - 5) / 6) * x * u5 * V6
                expression = endpoint.subs(
                    {
                        base.corner.leaf.d[6]: 1,
                        base.corner.leaf.d[5]: x,
                        base.corner.leaf.d[4]: x * y,
                        base.corner.leaf.f[6]: f6,
                        base.corner.leaf.f[5]: x * u5,
                        base.corner.leaf.f[4]: f4,
                    },
                    simultaneous=True,
                )
                numerator, denominator = sp.fraction(
                    sp.cancel(sp.together(expression))
                )
                denominator_poly = sp.Poly(
                    sp.expand(denominator), T, X, Y, S, V4, V6,
                    domain=sp.QQ,
                )
                denominator_record = positive_denominator(denominator_poly)
                numerator_poly = sp.Poly(
                    sp.expand(numerator), T, X, Y, S, V4, V6,
                    domain=sp.QQ,
                )
                result = base.audit(numerator_poly)
                rows.append(
                    {
                        "x_slab": x_index,
                        "y_slab": y_index,
                        "region": region,
                        "cap_mode": mode,
                        "numerator": result,
                        "denominator": denominator_record,
                        "denominator_factor": str(sp.factor(denominator)),
                    }
                )
                print(
                    "NBAND_CELL", x_index, y_index, region,
                    "NEG", result["negative"], "ZERO", result["zero"],
                    flush=True,
                )

    payload = {
        "schema": "rank8-delta1-mask3-exact-F-N-band-diagnostic-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "N_interval": [args.N_low, args.N_high],
        "F_order": args.F_order,
        "x_indices": x_indices,
        "y_indices": y_indices,
        "endpoint_names": metadata["endpoint_names"],
        "cap_checks": cap_checks,
        "aggregate": {
            key: sum(row["numerator"][key] for row in rows)
            for key in ("coefficients", "negative", "zero", "positive")
        },
        "rows": rows,
        "source_sha256": sha256(Path(__file__)),
    }
    output = Path(args.output).resolve()
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("AGGREGATE", payload["aggregate"], flush=True)


if __name__ == "__main__":
    main()
