#!/usr/bin/env python3
"""Exact finite-order Delta1/Q7/lower-cross surplus-coupled cell.

For a nonstar tree, degree surplus e and the exact rank-four motif coordinate
tau determine i3 and i4.  This verifier combines that coupling with the
rank-four two-extension U cap, the all-order rank-five V floor, and the root
attachment floor before applying exact tensor Bernstein conversion.
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
V_FLOOR = HERE / "rank5_branching_surplus_v_floor_corollary_exact_20260825.json"
TAU_REPORT = HERE / "tree_degree_surplus_tau_interval_exact_root_20260826.json"
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
    parser.add_argument("--order", type=int, required=True)
    parser.add_argument("--branch", choices=("low", "high"), required=True)
    parser.add_argument("--e-low")
    parser.add_argument("--e-high")
    parser.add_argument("--v-cap", default="1")
    parser.add_argument("--chunk-columns", type=int, default=2048)
    args = parser.parse_args()
    started = time.perf_counter()
    order = args.order
    assert order >= 28
    mass = sp.Integer(order - 2)
    threshold = mass / 2
    nonstar_max = sp.binomial(order - 3, 2)
    default_low, default_high = (
        (sp.S.One, threshold)
        if args.branch == "low"
        else (threshold, nonstar_max)
    )
    e_low = sp.Rational(args.e_low) if args.e_low else default_low
    e_high = sp.Rational(args.e_high) if args.e_high else default_high
    assert 1 <= e_low < e_high <= nonstar_max
    if args.branch == "low":
        assert e_high <= threshold
    else:
        assert e_low >= threshold
    v_cap = sp.Rational(args.v_cap)
    assert sp.Rational(4, 5) <= v_cap <= 1

    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    floor = json.loads(V_FLOOR.read_text(encoding="utf-8"))
    tau_report = json.loads(TAU_REPORT.read_text(encoding="utf-8"))
    assert source["status"] == "PASS_EXACT_RANK8_DELTA1_Q7_LCROSS_SOURCE_SPARSE"
    assert floor["status"] == "PASS_EXACT_ALL_ORDER_RANK5_BRANCHING_SURPLUS_V_FLOOR_COROLLARY"
    assert tau_report["status"] == "PASS_EXACT_NONSTAR_TREE_DEGREE_SURPLUS_TAU_INTERVAL_N15_PLUS"
    assert source["variables"] == ["n", "w", "x", "U", "K", "V", "Z"]
    maxima = tuple(source["numerator_degrees"])
    assert maxima == (2, 0, 13, 13, 5, 9, 2)
    source_terms = [
        (tuple(int(value) for value in monomial), sp.Rational(coefficient))
        for monomial, coefficient in source["numerator_terms"]
    ]
    assert len(source_terms) == 23_565

    B, A, J, Kc, Vc, Zc = sp.symbols(
        "B A J Kc Vc Zc", nonnegative=True
    )
    cube = (B, A, J, Kc, Vc, Zc)
    context = fmpq_mpoly_ctx.get([str(variable) for variable in cube])
    excess = sp.expand(e_low + (e_high - e_low) * B)
    gamma = (
        sp.S.Zero
        if args.branch == "low"
        else sp.expand(excess * (2 * excess - mass) / (3 * mass))
    )
    tau_low = sp.expand(excess + gamma)
    tau_high = sp.expand(sp.Rational(order - 1, 3) * excess)
    tau_width = sp.factor(tau_high - tau_low)
    assert tau_width.subs(B, 0) >= 0 and tau_width.subs(B, 1) >= 0
    tau = sp.expand(tau_low + (tau_high - tau_low) * A)

    N = sp.expand(sp.binomial(order - 2, 3) + excess)
    D = sp.expand(sp.binomial(order - 3, 4) + (order - 4) * excess - tau)
    G = sp.expand((10 * D4_CONSTANT_CEILING - 2) * D - N)
    v_floor_numerator = sp.expand(8 * excess)
    v_floor_denominator = sp.Integer(5 * (order - 2) * (order - 3))
    v_numerator = sp.expand(
        v_floor_numerator * (1 - Vc)
        + v_cap * v_floor_denominator * Vc
    )
    z_denominator = sp.Integer(order - 12)
    z_numerator = sp.expand((order - 19) + 7 * Zc)
    k_map = 1 + 6 * Kc
    for b in (0, 1):
        for a in (0, 1):
            assert N.subs(B, b) > 0
            assert D.subs({B: b, A: a}) > 0
            assert G.subs({B: b, A: a}) > 0
    assert z_denominator > 0
    assert v_floor_numerator.subs(B, 0) > 0
    assert v_floor_numerator.subs(B, 1) <= sp.Rational(4, 5) * v_floor_denominator

    Nf = to_flint(context, N, cube)
    Df = to_flint(context, D, cube)
    Gf = to_flint(context, G, cube)
    Jf = to_flint(context, 5 * J, cube)
    Kf = to_flint(context, k_map, cube)
    Vnf = to_flint(context, v_numerator, cube)
    Vdf = context.constant(fmpq(int(v_floor_denominator), 1))
    Znf = to_flint(context, z_numerator, cube)
    Zdf = context.constant(fmpq(int(z_denominator), 1))
    N_powers = [Nf**power for power in range(27)]
    D_powers = [Df**power for power in range(14)]
    G_powers = [Gf**power for power in range(14)]
    J_powers = [Jf**power for power in range(14)]
    K_powers = [Kf**power for power in range(6)]
    Vn_powers = [Vnf**power for power in range(10)]
    Vd_powers = [Vdf**power for power in range(10)]
    Zn_powers = [Znf**power for power in range(3)]
    Zd_powers = [Zdf**power for power in range(3)]

    def mapped_terms():
        for monomial, coefficient in source_terms:
            n_power, w_power, x_power, u_power, k_power, v_power, z_power = monomial
            assert w_power == 0
            coefficient *= order**n_power
            numerator, denominator = sp.fraction(coefficient)
            term = context.constant(fmpq(int(numerator), int(denominator)))
            term *= N_powers[x_power + u_power]
            term *= D_powers[13 - x_power]
            term *= G_powers[13 - u_power]
            term *= J_powers[u_power]
            term *= K_powers[k_power]
            term *= Vn_powers[v_power] * Vd_powers[9 - v_power]
            term *= Zn_powers[z_power] * Zd_powers[2 - z_power]
            yield term

    mapped = balanced_batched_sum(mapped_terms(), batch_size=128)
    mapped_terms_list = list(mapped.terms())
    mapped_degrees = tuple(
        int(max((monomial[axis] for monomial, _ in mapped_terms_list), default=0))
        for axis in range(len(cube))
    )
    coefficient_count = math.prod(degree + 1 for degree in mapped_degrees)
    print(
        "PREFLIGHT", json.dumps({
            "mapped_terms": len(mapped_terms_list),
            "mapped_degrees": mapped_degrees,
            "Bernstein_coefficients": coefficient_count,
            "elapsed_seconds": time.perf_counter() - started,
        }, sort_keys=True), flush=True,
    )
    degrees, bernstein, replay_terms = tensor_bernstein_from_flint_matrix(
        mapped, len(cube), chunk_columns=args.chunk_columns
    )
    assert tuple(map(int, degrees)) == mapped_degrees
    assert replay_terms == len(mapped_terms_list)
    minimum, index = minimum_with_index(bernstein)
    negative = sum(bool(value < 0) for value in bernstein.flat)
    zero = sum(bool(value == 0) for value in bernstein.flat)
    status = (
        "PASS_EXACT_DELTA1_Q7_LCROSS_FINITE_NONSTAR_SURPLUS_CELL"
        if negative == 0
        else "FINITE_NONSTAR_SURPLUS_CELL_UNRESOLVED_MIXED_BERNSTEIN_NO_SIGN_CLAIM"
    )
    safe_cap = str(v_cap).replace("/", "_")
    output = HERE / (
        f"rank8_delta1_q7_lcross_finite_surplus_n{order}_{args.branch}_"
        f"vcap_{safe_cap}_exact_root_20260826.json"
    )
    payload = {
        "schema": "rank8-delta1-q7-lcross-finite-surplus-cell-root-v1",
        "status": status,
        "order": order,
        "branch": args.branch,
        "degree_surplus_interval": [str(e_low), str(e_high)],
        "nonstar_degree_surplus_maximum": str(nonstar_max),
        "V_interval": ["8e/(5(n-2)(n-3))", str(v_cap)],
        "maps": {
            "e": str(excess),
            "tau_lower": str(sp.factor(tau_low)),
            "tau_upper": str(sp.factor(tau_high)),
            "tau": str(sp.factor(tau)),
            "i3_N": str(sp.factor(N)),
            "i4_D": str(sp.factor(D)),
            "old_U": "5*N*J/G",
            "G": str(sp.factor(G)),
            "K": str(k_map),
            "V_numerator": str(sp.factor(v_numerator)),
            "V_denominator": str(v_floor_denominator),
            "Z": str(sp.factor(z_numerator / z_denominator)),
        },
        "positive_multiplier": (
            "D**13 * G**13 * V_denominator**9 * Z_denominator**2"
        ),
        "source_terms": len(source_terms),
        "mapped_terms": len(mapped_terms_list),
        "mapped_degrees": list(mapped_degrees),
        "Bernstein_coefficients": int(bernstein.size),
        "minimum": str(minimum),
        "minimum_index": list(index),
        "coefficient_sign_counts": {
            "negative": negative,
            "zero": zero,
            "positive": int(bernstein.size) - negative - zero,
        },
        "ordered_coefficients_sha256": hashlib.sha256(
            "\n".join(str(value) for value in bernstein.flat).encode("ascii")
        ).hexdigest().upper(),
        "dependencies": {
            SOURCE.name: sha256(SOURCE),
            V_FLOOR.name: sha256(V_FLOOR),
            TAU_REPORT.name: sha256(TAU_REPORT),
        },
        "source_sha256": sha256(Path(__file__)),
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "scope_warning": (
            "This covers one continuous nonstar surplus cell at one order. "
            "Paths, stars, the other surplus branch, and other orders are separate."
        ),
    }
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(status)
    print("SIGNS", negative, zero, payload["coefficient_sign_counts"]["positive"])
    print("MINIMUM", minimum, index)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(output))
    return 0 if negative == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
