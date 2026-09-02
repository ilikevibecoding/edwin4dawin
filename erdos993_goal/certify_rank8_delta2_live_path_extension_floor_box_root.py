#!/usr/bin/env python3
"""Exact Delta2 live-path boxes with the strengthened rooted-deletion floor.

The rank-seven root ratio satisfies the following degree-free piecewise floor:

  * 28<=n<=41: (n^2-26n+100)/(n^2-19n+72),
  * n>=42: (n-11)(n-12)(n-13)/
            [(n-11)(n-12)(n-13)+7(n-5)(n-6)].

Each run proves one continuous box containing the indicated integer orders.
A negative Bernstein coefficient is only an enclosure obstruction.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from certify_rank8_delta4_junction_coupled_box import (
    minimum_with_index,
    tensor_bernstein_from_flint,
    to_flint,
)
from probe_rank8_delta2_source_curvatures import build


HERE = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    started = time.perf_counter()
    parser = argparse.ArgumentParser()
    parser.add_argument("--k", type=int, choices=(1, 7), required=True)
    parser.add_argument("--piece", choices=("lcross", "ucap"), required=True)
    parser.add_argument("--domain", choices=("finite", "tail"), required=True)
    args = parser.parse_args()

    value, (n, w, x, U, V, Z) = build(args.k, args.piece)
    numerator, denominator = sp.fraction(sp.cancel(value))
    source = sp.Poly(sp.expand(numerator), n, w, x, U, V, Z, domain=sp.QQ)
    source_terms = source.terms()
    t_shift = max(
        n_power - w_power - x_power
        for (n_power, w_power, x_power, _, _, _), _ in source_terms
    )
    t_shift = max(t_shift, 0)
    base_data = {}
    for monomial, coefficient in source_terms:
        n_power, w_power, x_power, u_power, v_power, z_power = monomial
        key = (
            t_shift + w_power + x_power - n_power,
            w_power + x_power,
            x_power,
            u_power,
            v_power,
            z_power,
        )
        base_data[key] = base_data.get(key, sp.S.Zero) + coefficient
    base_data = {key: coefficient for key, coefficient in base_data.items() if coefficient}
    maxima = tuple(max(key[axis] for key in base_data) for axis in range(6))
    z_degree = maxima[5]
    assert z_degree <= 2

    T, W, A, Uc, Vc, Zc = sp.symbols("T W A Uc Vc Zc", nonnegative=True)
    cube = (T, W, A, Uc, Vc, Zc)
    context = fmpq_mpoly_ctx.get([str(variable) for variable in cube])

    if args.domain == "finite":
        # T=0 is n=41 and T=1 is n=28. The continuous interval is an
        # intentional enlargement containing every required integer slice.
        t_map = sp.Rational(1, 41) + (sp.Rational(1, 28) - sp.Rational(1, 41)) * T
        p = 1 - 26 * t_map + 100 * t_map**2
        q = 7 * t_map * (1 - 4 * t_map)
        order_scope = "integer 28<=n<=41"
        floor_name = "E3"
    else:
        t_map = T / 42
        p = sp.prod(1 - j * t_map for j in (11, 12, 13))
        q = 7 * t_map * (1 - 5 * t_map) * (1 - 6 * t_map)
        order_scope = "integer n>=42"
        floor_name = "B4"
    d = sp.expand(p + q)
    z_numerator = sp.expand(p + q * Zc)

    y_lower = 3 + 9 * t_map
    y_upper = 3 + sp.Rational(546, 25) * t_map
    y_map = y_lower + (y_upper - y_lower) * W
    r_lower = sp.Rational(4, 3) + sp.Rational(2, 3) * t_map
    r_upper = sp.Rational(4, 3) + sp.Rational(1008, 173) * t_map
    r_map = r_lower + (r_upper - r_lower) * A

    basic_maps = [
        to_flint(context, t_map, cube),
        to_flint(context, y_map, cube),
        to_flint(context, r_map, cube),
        to_flint(context, Uc, cube),
        to_flint(context, Vc, cube),
    ]
    powers = [
        [mapping**power for power in range(maximum + 1)]
        for mapping, maximum in zip(basic_maps, maxima[:5])
    ]
    d_flint = to_flint(context, d, cube)
    z_numerator_flint = to_flint(context, z_numerator, cube)
    d_powers = [d_flint**power for power in range(z_degree + 1)]
    z_powers = [z_numerator_flint**power for power in range(z_degree + 1)]

    mapped = context.constant(0)
    for monomial, coefficient in base_data.items():
        coefficient_numerator, coefficient_denominator = sp.fraction(coefficient)
        term = context.constant(
            fmpq(int(coefficient_numerator), int(coefficient_denominator))
        )
        for axis, power in enumerate(monomial[:5]):
            term *= powers[axis][power]
        z_power = monomial[5]
        term *= z_powers[z_power] * d_powers[z_degree - z_power]
        mapped += term

    degrees, bernstein, mapped_terms = tensor_bernstein_from_flint(mapped, len(cube))
    minimum, index = minimum_with_index(bernstein)
    negative_count = sum(bool(coefficient < 0) for coefficient in bernstein.flat)
    zero_count = sum(bool(coefficient == 0) for coefficient in bernstein.flat)
    positive_count = int(bernstein.size) - negative_count - zero_count
    status = (
        "PASS_EXACT_DELTA2_LIVE_PATH_WITH_EXTENSION_FLOOR"
        if negative_count == 0
        else "EXTENSION_FLOOR_BOX_UNRESOLVED"
    )
    elapsed = time.perf_counter() - started
    print("MAPPED", degrees, bernstein.size, minimum, index, flush=True)

    payload = {
        "schema": "rank8-delta2-live-path-extension-floor-box-root-v1",
        "status": status,
        "scope": (
            "Exact Delta2 sign on one reduced live root path and one rank-six "
            f"endpoint for {order_scope} if PASS."
        ),
        "D6_k": args.k,
        "capacity_piece": args.piece,
        "order_domain": args.domain,
        "order_scope": order_scope,
        "positive_multipliers": [f"t**{t_shift}", f"root_floor_denominator**{z_degree}"],
        "root_ratio_floor": {
            "branch": floor_name,
            "p": str(sp.factor(p)),
            "q": str(sp.factor(q)),
            "substitution": "Z=(p+q*Zc)/(p+q), 0<=Zc<=1",
        },
        "coupled_enlarged_box": {
            "t": str(t_map),
            "y": "[3+9t, 3+(546/25)t]",
            "r": "[4/3+2t/3, 4/3+(1008/173)t]",
            "U_V_Zc": "[0,1]^3",
        },
        "source_denominator_factor": str(sp.factor(denominator)),
        "source_numerator_terms": len(source_terms),
        "scaled_sparse_terms": len(base_data),
        "scaled_sparse_degrees": [int(entry) for entry in maxima],
        "mapped_numerator_terms": int(mapped_terms),
        "mapped_degrees": [int(entry) for entry in degrees],
        "bernstein_coefficients": int(bernstein.size),
        "minimum": str(minimum),
        "minimum_index": [int(entry) for entry in index],
        "coefficient_sign_counts": {
            "negative": negative_count,
            "zero": zero_count,
            "positive": positive_count,
        },
        "resources": {"elapsed_seconds": elapsed},
        "immutable_inputs": {
            "probe_rank8_delta2_source_curvatures.py": sha256(HERE / "probe_rank8_delta2_source_curvatures.py"),
            "verify_rank8_q8_terminal_reduction.py": sha256(HERE / "verify_rank8_q8_terminal_reduction.py"),
            "verify_rank8_root_deletion_extension_floor_root.py": sha256(HERE / "verify_rank8_root_deletion_extension_floor_root.py"),
            "rank8_root_deletion_extension_floor_exact_root_20260825.json": sha256(HERE / "rank8_root_deletion_extension_floor_exact_root_20260825.json"),
            "verify_rank8_n28_tight_coordinate_chords_root.py": sha256(HERE / "verify_rank8_n28_tight_coordinate_chords_root.py"),
            "rank8_n28_tight_coordinate_chords_exact_root_20260825.json": sha256(HERE / "rank8_n28_tight_coordinate_chords_exact_root_20260825.json"),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "An unresolved Bernstein box is not a tree counterexample. A PASS "
            "covers only the named Delta2 path and order branch."
        ),
    }
    output = HERE / (
        f"rank8_delta2_{args.piece}_k{args.k}_extension_floor_{args.domain}_"
        "exact_root_20260825.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(output))
    return 0 if negative_count == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
