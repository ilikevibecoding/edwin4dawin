#!/usr/bin/env python3
"""Import-independent replay of one low-order coupled D/F-Q5 certificate."""

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

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "certify_rank8_delta1_new_leaf_mask3_lower_exact_forest_q5_root.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def cleared_substitution(
    endpoint: sp.Expr,
    substitutions: dict[sp.Symbol, sp.Expr],
) -> tuple[sp.Expr, sp.Expr]:
    coordinates = tuple(substitutions)
    source = sp.Poly(endpoint, *coordinates, domain=sp.QQ)
    rational_coordinates: list[tuple[sp.Expr, dict[sp.Expr, int]]] = []
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


def denominator_record(
    denominator: sp.Expr,
    variables: tuple[sp.Symbol, ...],
) -> tuple[dict[str, object], int]:
    coefficient, factors = sp.factor_list(denominator)
    assert coefficient != 0
    total_sign = 1 if coefficient > 0 else -1
    records = []
    for factor, exponent in factors:
        polynomial = sp.Poly(sp.expand(factor), *variables, domain=sp.QQ)
        degrees = tuple(polynomial.degree(variable) for variable in variables)
        assert all(degree <= 1 for degree in degrees)
        active = tuple(index for index, degree in enumerate(degrees) if degree)
        values = []
        for bits in itertools.product((0, 1), repeat=len(active)):
            point = dict.fromkeys(variables, 0)
            for index, bit in zip(active, bits):
                point[variables[index]] = bit
            values.append(polynomial.eval(point))
        minimum, maximum = min(values), max(values)
        if minimum > 0:
            factor_sign, margin = 1, minimum
        elif maximum < 0:
            factor_sign, margin = -1, -maximum
        else:
            raise AssertionError((factor, degrees, minimum, maximum))
        if factor_sign < 0 and exponent % 2:
            total_sign *= -1
        records.append(
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
            "factors": records,
            "constant_sign_on_cube": total_sign,
            "normalizing_multiplier": total_sign,
        },
        total_sign,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--primary", required=True)
    parser.add_argument("--expected-primary-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    primary_path = Path(args.primary).resolve()
    output = Path(args.output).resolve()
    assert sha256(primary_path) == args.expected_primary_sha256.upper()
    primary = json.loads(primary_path.read_text(encoding="utf-8"))
    assert primary["schema"] == (
        "rank8-delta1-new-leaf-mask3-lower-exact-forest-q5-root-v2"
    )
    n_value, f_value = int(primary["D_order"]), int(primary["F_order"])
    assert 26 <= n_value <= 34 and 20 <= f_value < n_value
    assert primary["status"] == (
        f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
        f"F_ORDER_{f_value}_FOREST_Q5_COUPLED"
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
    cap_cross_x = sp.cancel(12 * y_upper / (10 - y_upper))
    mu4_f = sp.cancel((m - 7) * (m - 8) / (m - 3))
    rank4_ratio_cap = sp.cancel(5 / mu4_f)
    rank6_shadow_cap = sp.cancel((m - 5) / 6)
    q5_switch_ratio = sp.cancel(10 / (2 * m - 9))
    normalized_rank4_switch = sp.cancel(q5_switch_ratio / rank4_ratio_cap)

    d4_floor = math.comb(n_value, 4) - f_value * math.comb(n_value - 2, 2)
    d5_floor = math.comb(n_value, 5) - f_value * math.comb(n_value - 2, 3)
    a4 = sp.Rational(math.comb(f_value, 4), d4_floor)
    u5_cap = sp.Rational(math.comb(f_value, 5), d5_floor)
    assert primary["D_edge_floors_rank4_rank5"] == [d4_floor, d5_floor]
    assert primary["a4_cap"] == str(a4)
    assert primary["u5_cap"] == str(u5_cap)
    assert primary["rank4_ratio_cap"] == str(rank4_ratio_cap)
    assert primary["rank6_shadow_cap"] == str(rank6_shadow_cap)

    below = int(primary["partition"]["x_slabs_below_D_q5_cap"])
    above = int(primary["partition"]["x_slabs_above_D_q5_cap"])
    assert primary["partition"] == {
        "x_slabs_below_D_q5_cap": below,
        "x_slabs_above_D_q5_cap": above,
        "D_q5_cap_cross_x": str(cap_cross_x),
        "normalized_rank4_switch": str(normalized_rank4_switch),
        "rank4_ratio_switch": str(q5_switch_ratio),
        "F_regions_per_x_piece": 3,
    }
    pieces: list[tuple[str, sp.Expr, sp.Expr]] = []
    if x_lower < cap_cross_x:
        upper = min(x_upper, cap_cross_x)
        for index in range(below):
            pieces.append(
                (
                    "coupled_q5",
                    x_lower + (upper - x_lower) * sp.Rational(index, below),
                    x_lower + (upper - x_lower) * sp.Rational(index + 1, below),
                )
            )
    if cap_cross_x < x_upper:
        lower = max(x_lower, cap_cross_x)
        for index in range(above):
            pieces.append(
                (
                    "ordinary_upper",
                    lower + (x_upper - lower) * sp.Rational(index, above),
                    lower + (x_upper - lower) * sp.Rational(index + 1, above),
                )
            )

    X, Y, S, T, V6 = sp.symbols("X Y S T V6", nonnegative=True)
    variables = (X, Y, S, T, V6)
    reference_rows = primary["rows"]
    assert len(reference_rows) == 3 * len(pieces)
    totals = {
        key: 0
        for key in ("regions", "coefficients", "negative", "zero", "positive")
    }
    digest = hashlib.sha256()
    row_index = 0
    for x_index, (d_cap_mode, x0, x1) in enumerate(pieces):
        x = x0 + (x1 - x0) * X
        d_q5_cap = sp.cancel(10 * x / (x + 12))
        y_top = d_q5_cap if d_cap_mode == "coupled_q5" else y_upper
        y = sp.cancel(y_lower + (y_top - y_lower) * Y)
        z_absolute_switch = sp.cancel(a4 * y / u5_cap)
        low_z = z_absolute_switch * T
        middle_z = z_absolute_switch + (
            q5_switch_ratio - z_absolute_switch
        ) * T
        high_z = q5_switch_ratio + (
            rank4_ratio_cap - q5_switch_ratio
        ) * T
        specs = (
            (
                "absolute_cap_inactive_shadow", u5_cap * S, low_z,
                rank6_shadow_cap, ["0", "a4*y/u5_cap"],
            ),
            (
                "absolute_cap_active_shadow",
                sp.cancel(a4 * y * S / middle_z), middle_z,
                rank6_shadow_cap,
                ["a4*y/u5_cap", str(q5_switch_ratio)],
            ),
            (
                "absolute_cap_active_forest_q5",
                sp.cancel(a4 * y * S / high_z), high_z, None,
                [str(q5_switch_ratio), str(rank4_ratio_cap)],
            ),
        )
        for f_cap_mode, u5, z, fixed_cap, ratio_interval in specs:
            reference = reference_rows[row_index]
            row_index += 1
            f5_value = x * u5
            f4_value = z * f5_value
            rank6_cap = (
                fixed_cap
                if fixed_cap is not None
                else sp.cancel((10 - z) / (12 * z))
            )
            f6_value = rank6_cap * f5_value * V6
            substitutions = {
                independent.transcript.d[6]: sp.Integer(1),
                independent.transcript.d[5]: x,
                independent.transcript.d[4]: x * y,
                independent.transcript.f[6]: f6_value,
                independent.transcript.f[5]: f5_value,
                independent.transcript.f[4]: f4_value,
            }
            numerator, denominator = cleared_substitution(endpoint, substitutions)
            positive_record, sign = denominator_record(denominator, variables)
            if sign < 0:
                numerator = -numerator
            polynomial = sp.Poly(
                sp.expand(numerator), *variables, domain=sp.QQ
            )
            result = independent.bernstein_record(polynomial)
            result = {"power_terms": len(polynomial.terms()), **result}

            assert reference["x_piece"] == x_index
            assert reference["x_interval"] == [str(x0), str(x1)]
            assert reference["D_q5_cap_mode"] == d_cap_mode
            assert reference["u5_parameterization"] == str(sp.factor(u5))
            assert reference["F_q5_cap_mode"] == f_cap_mode
            assert reference["rank4_ratio_interval"] == ratio_interval
            assert reference["rank6_ratio_cap"] == str(sp.factor(rank6_cap))
            assert reference["cleared_positive_denominator"] == positive_record
            for key, value in result.items():
                assert reference[key] == value, (x_index, f_cap_mode, key)
            assert result["negative"] == 0 and result["negative_vertices"] == 0
            totals["regions"] += 1
            for key in ("coefficients", "negative", "zero", "positive"):
                totals[key] += int(result[key])
            digest.update(
                f"{x_index}:{f_cap_mode}:{result['ordered_sha256']}\n".encode()
            )
            print("AUDIT_PASS", n_value, f_value, x_index, f_cap_mode, flush=True)
            del numerator, denominator, polynomial, substitutions
            sp.core.cache.clear_cache()
            gc.collect()

    assert row_index == len(reference_rows)
    assert primary["aggregate"] == totals
    payload = {
        "schema": "rank8-delta1-new-leaf-mask3-lower-exact-forest-q5-independent-audit-v1",
        "status": (
            f"PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
            f"F_ORDER_{f_value}_FOREST_Q5_COUPLED_AUDIT"
        ),
        "D_order": n_value,
        "F_order": f_value,
        "independence": (
            "Imports neither the producer nor its probe. Reconstructs the "
            "endpoint from the canonical transcript, rebuilds the three-region "
            "D/F-Q5 partition, proves every denominator factor has constant "
            "sign on the cube, and independently transforms every exact "
            "rational coefficient to Bernstein form."
        ),
        "raw_endpoint_numerator": raw,
        "aggregate": {
            **totals,
            "ordered_region_digest_sha256": digest.hexdigest().upper(),
        },
        "primary": {
            "path": str(primary_path),
            "sha256": sha256(primary_path),
        },
        "producer_source_sha256": sha256(PRODUCER),
        "independent_transcript_source_sha256": sha256(
            HERE / "audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root.py"
        ),
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
