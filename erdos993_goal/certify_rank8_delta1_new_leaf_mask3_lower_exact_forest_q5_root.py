#!/usr/bin/env python3
"""Exact low-order Delta1 mask-3 slice with both D- and F-Q5 coupled.

The difficult low-order cells cannot simultaneously attain the separate
rank-4 and rank-6 forest envelopes.  This producer keeps the Q5(F) boundary
coupled to f4/f5, while also retaining the exact Q5(D) boundary below its
crossing with the ordinary d4/d5 cap.
"""

from __future__ import annotations

import argparse
import gc
import hashlib
import itertools
import json
import math
import os
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_mask3_exact_F_order_slices_root as base


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def positive_denominator_record(
    denominator: sp.Expr,
    variables: tuple[sp.Symbol, ...],
) -> tuple[dict[str, object], int]:
    coefficient, factors = sp.factor_list(denominator)
    assert coefficient != 0
    total_sign = 1 if coefficient > 0 else -1
    factor_records = []
    for factor, exponent in factors:
        polynomial = sp.Poly(sp.expand(factor), *variables, domain=sp.QQ)
        degrees = tuple(polynomial.degree(variable) for variable in variables)
        assert all(degree <= 1 for degree in degrees), degrees
        active = tuple(index for index, degree in enumerate(degrees) if degree)
        values = []
        for bits in itertools.product((0, 1), repeat=len(active)):
            point = dict.fromkeys(variables, 0)
            for index, bit in zip(active, bits):
                point[variables[index]] = bit
            values.append(polynomial.eval(point))
        minimum, maximum = min(values), max(values)
        if minimum > 0:
            factor_sign = 1
            margin = minimum
        elif maximum < 0:
            factor_sign = -1
            margin = -maximum
        else:
            raise AssertionError(
                ("denominator factor changes sign", sp.factor(factor), degrees,
                 minimum, maximum)
            )
        if factor_sign < 0 and exponent % 2:
            total_sign *= -1
        factor_records.append(
            {
                "factor": str(sp.factor(factor)),
                "exponent": exponent,
                "degrees": list(degrees),
                "constant_sign": factor_sign,
                "minimum_absolute_cube_vertex": str(margin),
            }
        )
    return (
        {
            "expression_before_sign_normalization": str(sp.factor(denominator)),
            "constant": str(coefficient),
            "factors": factor_records,
            "constant_sign_on_cube": total_sign,
            "normalizing_multiplier": total_sign,
        },
        total_sign,
    )


def coefficient_audit(polynomial: sp.Poly) -> dict[str, object]:
    """Return the exact Bernstein tensor without adaptive recursion."""
    degrees, tensor = base.power_to_bernstein_fast(polynomial)
    negative = sum(value < 0 for value in tensor.values())
    zero = sum(value == 0 for value in tensor.values())
    positive = sum(value > 0 for value in tensor.values())
    corner_indices = itertools.product(*((0, degree) for degree in degrees))
    negative_vertices = sum(tensor[index] < 0 for index in corner_indices)
    minimum_index, minimum = min(tensor.items(), key=lambda item: item[1])
    digest = hashlib.sha256()
    for index in sorted(tensor):
        digest.update(
            (",".join(map(str, index)) + ":" + str(tensor[index]) + "\n").encode()
        )
    return {
        "power_terms": len(polynomial.terms()),
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


def cleared_substitution(
    endpoint: sp.Expr,
    substitutions: dict[sp.Symbol, sp.Expr],
) -> tuple[sp.Expr, sp.Expr]:
    """Substitute termwise and clear the exact least factor denominator.

    Calling cancel on the fully substituted degree-nine endpoint is much more
    expensive than the certificate itself.  There are only 139 source terms,
    so factor each coordinate denominator once and construct the common
    numerator directly.
    """
    coordinates = tuple(substitutions)
    source = sp.Poly(endpoint, *coordinates, domain=sp.QQ)
    rational_coordinates: list[
        tuple[sp.Expr, dict[sp.Expr, int]]
    ] = []
    for coordinate in coordinates:
        numerator, denominator = sp.fraction(
            sp.cancel(substitutions[coordinate])
        )
        coefficient, factors = sp.factor_list(denominator)
        assert coefficient > 0
        rational_coordinates.append(
            (
                sp.cancel(numerator / coefficient),
                {factor: exponent for factor, exponent in factors},
            )
        )

    term_data: list[tuple[sp.Expr, dict[sp.Expr, int]]] = []
    maximum_exponents: dict[sp.Expr, int] = {}
    for monomial, coefficient in source.terms():
        term_numerator: sp.Expr = coefficient
        term_factors: dict[sp.Expr, int] = {}
        for exponent, (numerator, factors) in zip(
            monomial, rational_coordinates
        ):
            if exponent:
                term_numerator *= numerator**exponent
                for factor, factor_exponent in factors.items():
                    term_factors[factor] = (
                        term_factors.get(factor, 0)
                        + exponent * factor_exponent
                    )
        term_data.append((term_numerator, term_factors))
        for factor, exponent in term_factors.items():
            maximum_exponents[factor] = max(
                maximum_exponents.get(factor, 0), exponent
            )

    common_denominator = sp.prod(
        factor**exponent
        for factor, exponent in maximum_exponents.items()
    )
    cleared_numerator = sp.Integer(0)
    for term_numerator, term_factors in term_data:
        complement = sp.prod(
            factor ** (exponent - term_factors.get(factor, 0))
            for factor, exponent in maximum_exponents.items()
        )
        cleared_numerator += term_numerator * complement
    return sp.expand(cleared_numerator), sp.expand(common_denominator)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--D-order", type=int, required=True)
    parser.add_argument("--F-order", type=int, required=True)
    parser.add_argument("--x-slabs-below-cap", type=int, default=4)
    parser.add_argument("--x-slabs-above-cap", type=int, default=2)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    n_value, f_value = args.D_order, args.F_order
    assert 26 <= n_value <= 34 and 9 <= f_value < n_value
    assert args.x_slabs_below_cap >= 1 and args.x_slabs_above_cap >= 1
    output = Path(args.output).resolve()
    checkpoint_path = output.with_suffix(output.suffix + ".checkpoint.json")
    current_source_hash = sha256(Path(__file__))
    checkpoint_config = {
        "D_order": n_value,
        "F_order": f_value,
        "x_slabs_below_cap": args.x_slabs_below_cap,
        "x_slabs_above_cap": args.x_slabs_above_cap,
    }

    endpoint, metadata = base.corner.new_leaf_corner(1, 3)
    n, m = sp.Integer(n_value), sp.Integer(f_value)

    # Exact convexified rank-5 extension floor for D.
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
    cap_cross_x = sp.cancel(12 * y_upper / (10 - y_upper))

    mu4_f = sp.cancel((m - 7) * (m - 8) / (m - 3))
    assert mu4_f > 0
    rank4_ratio_cap = sp.cancel(5 / mu4_f)
    rank6_shadow_cap = sp.cancel((m - 5) / 6)
    q5_switch_ratio = sp.cancel(10 / (2 * m - 9))
    normalized_rank4_switch = sp.cancel(q5_switch_ratio / rank4_ratio_cap)
    assert 0 < normalized_rank4_switch < 1

    # Since |E(D)|=|F|, edge-union floors give exact-order absolute caps.
    # The rank-4 cap is coupled to y=d4/d5 below; the rank-5 cap closes the
    # final u5 interval.  No independent rank-6 cap is needed.
    d4_floor = math.comb(n_value, 4) - f_value * math.comb(n_value - 2, 2)
    d5_floor = math.comb(n_value, 5) - f_value * math.comb(n_value - 2, 3)
    assert d4_floor > 0 and d5_floor > 0
    a4 = sp.Rational(math.comb(f_value, 4), d4_floor)
    u5_cap = sp.Rational(math.comb(f_value, 5), d5_floor)

    pieces: list[tuple[str, sp.Expr, sp.Expr]] = []
    if x_lower < cap_cross_x:
        upper = min(x_upper, cap_cross_x)
        count = args.x_slabs_below_cap
        for index in range(count):
            pieces.append(
                (
                    "coupled_q5",
                    x_lower + (upper - x_lower) * sp.Rational(index, count),
                    x_lower + (upper - x_lower) * sp.Rational(index + 1, count),
                )
            )
    if cap_cross_x < x_upper:
        lower = max(x_lower, cap_cross_x)
        count = args.x_slabs_above_cap
        for index in range(count):
            pieces.append(
                (
                    "ordinary_upper",
                    lower + (x_upper - lower) * sp.Rational(index, count),
                    lower + (x_upper - lower) * sp.Rational(index + 1, count),
                )
            )
    assert pieces

    X, Y, S, T, V6 = sp.symbols("X Y S T V6", nonnegative=True)
    variables = (X, Y, S, T, V6)
    rows: list[dict[str, object]] = []
    if checkpoint_path.exists():
        checkpoint = json.loads(checkpoint_path.read_text(encoding="utf-8"))
        if (
            checkpoint.get("source_sha256") == current_source_hash
            and checkpoint.get("config") == checkpoint_config
        ):
            rows = checkpoint["rows"]
            print("RESUME_REGIONS", len(rows), flush=True)
    completed_regions = {
        (int(row["x_piece"]), str(row["F_q5_cap_mode"]))
        for row in rows
    }
    for x_index, (d_cap_mode, x0, x1) in enumerate(pieces):
        x = x0 + (x1 - x0) * X
        d_q5_cap = sp.cancel(10 * x / (x + 12))
        y_top = d_q5_cap if d_cap_mode == "coupled_q5" else y_upper
        y = sp.cancel(y_lower + (y_top - y_lower) * Y)
        y_piece_max = (
            sp.cancel(10 * x1 / (x1 + 12))
            if d_cap_mode == "coupled_q5" else y_upper
        )
        assert sp.cancel(a4 * y_piece_max / q5_switch_ratio) < u5_cap

        # Use z=f4/f5 as a coordinate.  Its crossing with the absolute f4
        # cap occurs at z_abs=a4*y/u5_cap, and its crossing between the
        # rank-6 shadow and Q5(F) occurs at q5_switch_ratio.  This gives three
        # exact regions and avoids the artificial simultaneous extrema.
        z_absolute_switch = sp.cancel(a4 * y / u5_cap)
        assert 0 < z_absolute_switch
        assert sp.cancel(a4 * y_piece_max / u5_cap) < q5_switch_ratio

        low_z = z_absolute_switch * T
        middle_z = (
            z_absolute_switch
            + (q5_switch_ratio - z_absolute_switch) * T
        )
        high_z = q5_switch_ratio + (
            rank4_ratio_cap - q5_switch_ratio
        ) * T
        region_specs = (
            (
                "absolute_cap_inactive_shadow",
                u5_cap * S,
                low_z,
                rank6_shadow_cap,
                ["0", "a4*y/u5_cap"],
            ),
            (
                "absolute_cap_active_shadow",
                sp.cancel(a4 * y * S / middle_z),
                middle_z,
                rank6_shadow_cap,
                ["a4*y/u5_cap", str(q5_switch_ratio)],
            ),
            (
                "absolute_cap_active_forest_q5",
                sp.cancel(a4 * y * S / high_z),
                high_z,
                None,
                [str(q5_switch_ratio), str(rank4_ratio_cap)],
            ),
        )

        for f_cap_mode, u5, rank4_ratio, fixed_rank6_cap, ratio_interval in region_specs:
            region_key = (x_index, f_cap_mode)
            if region_key in completed_regions:
                continue
            f5_value = x * u5
            f4_value = rank4_ratio * f5_value
            rank6_ratio_cap = (
                fixed_rank6_cap
                if fixed_rank6_cap is not None
                else sp.cancel((10 - rank4_ratio) / (12 * rank4_ratio))
            )
            f6_value = rank6_ratio_cap * f5_value * V6
            substitutions = {
                base.corner.leaf.d[6]: sp.Integer(1),
                base.corner.leaf.d[5]: x,
                base.corner.leaf.d[4]: x * y,
                base.corner.leaf.f[6]: f6_value,
                base.corner.leaf.f[5]: f5_value,
                base.corner.leaf.f[4]: f4_value,
            }
            numerator, denominator = cleared_substitution(
                endpoint, substitutions
            )
            denominator_record, denominator_sign = positive_denominator_record(
                denominator, variables
            )
            if denominator_sign < 0:
                numerator = -numerator
                denominator = -denominator
            polynomial = sp.Poly(
                sp.expand(numerator), *variables, domain=sp.QQ
            )
            result = coefficient_audit(polynomial)
            assert result["negative"] == 0, (
                x_index, d_cap_mode, f_cap_mode, result
            )
            assert result["negative_vertices"] == 0
            rows.append(
                {
                    "x_piece": x_index,
                    "x_interval": [str(x0), str(x1)],
                    "D_q5_cap_mode": d_cap_mode,
                    "u5_parameterization": str(sp.factor(u5)),
                    "F_q5_cap_mode": f_cap_mode,
                    "rank4_ratio_interval": ratio_interval,
                    "rank6_ratio_cap": str(sp.factor(rank6_ratio_cap)),
                    "cleared_positive_denominator": denominator_record,
                    **result,
                }
            )
            completed_regions.add(region_key)
            checkpoint_temporary = checkpoint_path.with_suffix(
                checkpoint_path.suffix + ".tmp"
            )
            checkpoint_temporary.write_text(
                json.dumps(
                    {
                        "source_sha256": current_source_hash,
                        "config": checkpoint_config,
                        "rows": rows,
                    },
                    indent=2,
                ) + "\n",
                encoding="utf-8",
            )
            os.replace(checkpoint_temporary, checkpoint_path)
            print(
                "PASS", n_value, f_value, x_index,
                d_cap_mode, f_cap_mode, flush=True,
            )
            del numerator, denominator, polynomial, substitutions
            sp.core.cache.clear_cache()
            gc.collect()

    totals = {
        key: sum(int(row[key]) for row in rows)
        for key in ("coefficients", "negative", "zero", "positive")
    }
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-lower-exact-forest-q5-root-v2",
        "status": (
            f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
            f"F_ORDER_{f_value}_FOREST_Q5_COUPLED"
        ),
        "theorem": (
            "For a tree A, vertex v, D=A-v and F=A-N[v], the Delta1 "
            f"new-leaf mask-3 endpoint is nonnegative when |D|={n_value} "
            f"and |F|={f_value}."
        ),
        "D_order": n_value,
        "F_order": f_value,
        "partition": {
            "x_slabs_below_D_q5_cap": args.x_slabs_below_cap,
            "x_slabs_above_D_q5_cap": args.x_slabs_above_cap,
            "D_q5_cap_cross_x": str(cap_cross_x),
            "normalized_rank4_switch": str(normalized_rank4_switch),
            "rank4_ratio_switch": str(q5_switch_ratio),
            "F_regions_per_x_piece": 3,
        },
        "lemmas": {
            "D_q5_compatibility": "Q5(D)>=0 gives d4/d5<=10x/(x+12).",
            "F_q5_compatibility": "Q5(F)>=0 gives f6/f5<=(10-r)/(12r), where r=f4/f5.",
            "edge_count_identity": "|F|=|E(D)|.",
            "edge_union_floors": "d_k>=C(N,k)-M*C(N-2,k-2), k=4,5.",
            "rank4_absolute_cap": "f4<=C(M,4).",
            "rank4_forest_ratio": "f4/f5<=5/mu4(F).",
            "rank6_shadow": "6f6<=(M-5)f5.",
            "sign_engine": "exact tensor Bernstein coefficients on rational boxes",
        },
        "D_edge_floors_rank4_rank5": [d4_floor, d5_floor],
        "a4_cap": str(a4),
        "u5_cap": str(u5_cap),
        "rank4_ratio_cap": str(rank4_ratio_cap),
        "rank6_shadow_cap": str(rank6_shadow_cap),
        "aggregate": {"regions": len(rows), **totals},
        "rows": rows,
        "endpoint_names": metadata["endpoint_names"],
        "source_sha256": current_source_hash,
    }
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("REGIONS", len(rows), "COEFFICIENTS", totals["coefficients"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(output), flush=True)


if __name__ == "__main__":
    main()
