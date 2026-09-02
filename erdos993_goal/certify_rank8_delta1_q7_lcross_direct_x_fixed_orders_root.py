#!/usr/bin/env python3
"""Exact fixed-order Delta1/Q7/lower-cross direct-x boxes.

The compactified direct-x tail is already coefficientwise nonnegative for
n>=60.  This verifier removes the unnecessary continuous interpolation
between the remaining integer orders and checks one five-variable box per
order.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import time
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from balanced_flint_mpoly_sum_root import balanced_batched_sum
from certify_rank8_delta4_junction_coupled_box import to_flint
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "rank8_delta1_q7_lcross_source_sparse_root_20260826.json"
OUTPUT = HERE / "rank8_delta1_q7_lcross_direct_x_fixed_orders32_59_exact_root_20260826.json"
D4_CONSTANT_CEILING = sp.Rational(1559, 3575)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def minimum_with_index(values):
    import numpy as np

    position = min(range(values.size), key=lambda index: values.flat[index])
    return values.flat[position], tuple(
        int(value) for value in np.unravel_index(position, values.shape)
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=30)
    parser.add_argument("--max-order", type=int, default=59)
    parser.add_argument("--v-cap", default="1")
    parser.add_argument("--chunk-columns", type=int, default=2048)
    args = parser.parse_args()
    assert 28 <= args.min_order <= args.max_order
    v_cap = sp.Rational(args.v_cap)
    assert 0 < v_cap <= 1
    started = time.perf_counter()

    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    assert source["status"] == "PASS_EXACT_RANK8_DELTA1_Q7_LCROSS_SOURCE_SPARSE"
    assert source["variables"] == ["n", "w", "x", "U", "K", "V", "Z"]
    assert source["numerator_degrees"] == [2, 0, 13, 13, 5, 9, 2]
    source_terms = [
        (tuple(int(value) for value in monomial), sp.Rational(coefficient))
        for monomial, coefficient in source["numerator_terms"]
    ]
    assert len(source_terms) == 23_565
    assert all(monomial[1] == 0 for monomial, _ in source_terms)

    Xc, J, Kc, Vc, Zc = sp.symbols(
        "Xc J Kc Vc Zc", nonnegative=True
    )
    cube = (Xc, J, Kc, Vc, Zc)
    context = fmpq_mpoly_ctx.get([str(variable) for variable in cube])
    kf = to_flint(context, 1 + 6 * Kc, cube)
    vf = to_flint(context, v_cap * Vc, cube)
    fixed_powers = [
        [kf**power for power in range(6)],
        [vf**power for power in range(10)],
    ]

    rows = []
    for order in range(args.min_order, args.max_order + 1):
        local_started = time.perf_counter()
        t = sp.Rational(1, order)
        x_denominator = sp.expand((1 - 5 * t) * (1 - 6 * t))
        x_lower = sp.expand(
            t * (3 + 9 * t) * (sp.Rational(4, 3) + 2 * t / 3)
        )
        x_lower_numerator = sp.expand(x_lower * x_denominator)
        x_upper_numerator = sp.expand(4 * t * (1 - 2 * t))
        x_numerator = sp.expand(
            x_lower_numerator
            + (x_upper_numerator - x_lower_numerator) * Xc
        )
        # The forest two-extension theorem gives d4<=(1+3x)/5.  The
        # source's U is normalized to the older constant ceiling, so after
        # x=x_numerator/x_denominator its exact reparameterization is
        # U=5*x_numerator*J/u_denominator_numerator.
        u_denominator_numerator = sp.expand(
            (10 * D4_CONSTANT_CEILING - 2) * x_denominator - x_numerator
        )
        u_numerator = sp.expand(5 * x_numerator * J)
        z_denominator = 1 - 12 * t
        z_numerator = sp.expand(1 - 19 * t + 7 * t * Zc)
        assert x_denominator > 0 and z_denominator > 0
        assert u_denominator_numerator.subs(Xc, 0) > 0
        assert u_denominator_numerator.subs(Xc, 1) > 0
        assert sp.factor(x_upper_numerator / x_denominator) == sp.Rational(
            4 * (order - 2), (order - 5) * (order - 6)
        )

        xf_num = to_flint(context, x_numerator, cube)
        xf_den = context.constant(fmpq(int(sp.numer(x_denominator)), int(sp.denom(x_denominator))))
        uf_num = to_flint(context, u_numerator, cube)
        uf_den = to_flint(context, u_denominator_numerator, cube)
        zf_num = to_flint(context, z_numerator, cube)
        zf_den = context.constant(fmpq(int(sp.numer(z_denominator)), int(sp.denom(z_denominator))))
        x_num_powers = [xf_num**power for power in range(14)]
        x_den_powers = [xf_den**power for power in range(14)]
        u_num_powers = [uf_num**power for power in range(14)]
        u_den_powers = [uf_den**power for power in range(14)]
        z_num_powers = [zf_num**power for power in range(3)]
        z_den_powers = [zf_den**power for power in range(3)]

        def mapped_terms():
            for monomial, coefficient in source_terms:
                n_power, _, x_power, u_power, k_power, v_power, z_power = monomial
                coefficient *= order**n_power
                numerator, denominator = sp.fraction(coefficient)
                term = context.constant(fmpq(int(numerator), int(denominator)))
                term *= fixed_powers[0][k_power]
                term *= fixed_powers[1][v_power]
                term *= x_num_powers[x_power] * x_den_powers[13 - x_power]
                term *= u_num_powers[u_power] * u_den_powers[13 - u_power]
                term *= z_num_powers[z_power] * z_den_powers[2 - z_power]
                yield term

        mapped = balanced_batched_sum(mapped_terms(), batch_size=128)
        mapped_terms_list = list(mapped.terms())
        degrees = tuple(
            int(max((monomial[axis] for monomial, _ in mapped_terms_list), default=0))
            for axis in range(len(cube))
        )
        expected_count = math.prod(degree + 1 for degree in degrees)
        replay_degrees, bernstein, replay_terms = tensor_bernstein_from_flint_matrix(
            mapped, len(cube), chunk_columns=args.chunk_columns
        )
        assert tuple(map(int, replay_degrees)) == degrees
        assert replay_terms == len(mapped_terms_list)
        assert int(bernstein.size) == expected_count
        minimum, index = minimum_with_index(bernstein)
        negative = sum(bool(value < 0) for value in bernstein.flat)
        zero = sum(bool(value == 0) for value in bernstein.flat)
        row = {
            "order": order,
            "mapped_terms": len(mapped_terms_list),
            "degrees": list(degrees),
            "Bernstein_coefficients": int(bernstein.size),
            "minimum": str(minimum),
            "minimum_index": list(index),
            "negative_coefficients": negative,
            "zero_coefficients": zero,
            "ordered_coefficients_sha256": hashlib.sha256(
                "\n".join(str(value) for value in bernstein.flat).encode("ascii")
            ).hexdigest().upper(),
            "elapsed_seconds": time.perf_counter() - local_started,
        }
        rows.append(row)
        print(
            "FIXED_ORDER", order, "MIN", minimum, "NEG", negative,
            "COEFFICIENTS", int(bernstein.size), flush=True,
        )
        if negative:
            break

    complete = len(rows) == args.max_order - args.min_order + 1
    passed = complete and all(row["negative_coefficients"] == 0 for row in rows)
    status = (
        f"PASS_EXACT_DELTA1_Q7_LCROSS_DIRECT_X_FIXED_ORDERS_{args.min_order}_{args.max_order}"
        if passed
        else "DIRECT_X_FIXED_ORDER_BOX_UNRESOLVED_MIXED_BERNSTEIN_NO_SIGN_CLAIM"
    )
    payload = {
        "schema": "rank8-delta1-q7-lcross-direct-x-fixed-orders-root-v1",
        "status": status,
        "order_interval": [args.min_order, args.max_order],
        "V_interval": ["0", str(v_cap)],
        "x_interval": [
            "t*(3+9t)*(4/3+2t/3)",
            "4(n-2)/((n-5)(n-6))",
        ],
        "root_ratio_floor": "Z in [(n-19)/(n-12),1]",
        "rank4_two_extension_map": (
            "U=5*x*J/(10*D4_constant_ceiling-2-x), 0<=J<=1"
        ),
        "rows": rows,
        "coverage": {
            "expected_orders": args.max_order - args.min_order + 1,
            "checked_orders": len(rows),
            "negative_coefficients": sum(
                row["negative_coefficients"] for row in rows
            ),
            "total_Bernstein_coefficients": sum(
                row["Bernstein_coefficients"] for row in rows
            ),
        },
        "dependencies": {SOURCE.name: sha256(SOURCE)},
        "source_sha256": sha256(Path(__file__)),
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "scope_warning": (
            "A mixed Bernstein failure is only a box obstruction, not a tree "
            "counterexample. A PASS covers exactly the displayed integer orders."
        ),
    }
    output = OUTPUT if (args.min_order, args.max_order, v_cap) == (32, 59, 1) else (
        HERE / f"rank8_delta1_q7_lcross_direct_x_fixed_orders{args.min_order}_{args.max_order}_vcap_{str(v_cap).replace('/', '_')}_diagnostic.json"
    )
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(status)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(output))
    return 0 if passed else 2


if __name__ == "__main__":
    raise SystemExit(main())
