#!/usr/bin/env python3
"""Exact nonpath Delta1/Q7/lower-cross box with the all-order V floor.

For a tree of order n put

    e = sum_v binom(deg(v)-1, 2).

The case e=0 is exactly the path and is covered by the existing all-root
path certificate.  Here e is parameterized continuously over the safe
nonpath interval 1 <= e <= binom(n-2,2).  The exact coefficient identities

    i3 = binom(n-2,3) + e,
    i2 = (n-1)(n-2)/2

give y=n*i2/i3.  The proved component-surplus theorem gives the independent
rank-five coordinate floor

    V >= 8e/(5(n-2)(n-3)).

This script maps those coupled rational coordinates into the sparse
Delta1/Q7/lower-cross source.  It is experimental until a PASS report and
an independent mapping replay are both produced.
"""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import math
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
PATH_REPORT = HERE / "rank8_delta013_all_root_path_faces_exact_20260820.json"
PATH_AUDIT = HERE / "rank8_delta013_all_root_path_faces_independent_audit_20260820.json"
OUTPUT = HERE / "rank8_delta1_q7_lcross_nonpath_surplus_vfloor_exact_root_20260826.json"
CUTOFF = 28


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def minimum_with_index(values):
    import numpy as np

    index = min(range(values.size), key=lambda position: values.flat[position])
    return values.flat[index], tuple(int(value) for value in np.unravel_index(index, values.shape))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--map-only", action="store_true")
    parser.add_argument("--v-cap", default="1")
    parser.add_argument("--chunk-columns", type=int, default=1024)
    args = parser.parse_args()
    started = time.perf_counter()
    v_cap = sp.Rational(args.v_cap)
    assert 0 < v_cap <= 1

    floor_report = json.loads(V_FLOOR.read_text(encoding="utf-8"))
    assert floor_report["status"] == (
        "PASS_EXACT_ALL_ORDER_RANK5_BRANCHING_SURPLUS_V_FLOOR_COROLLARY"
    )
    path_report = json.loads(PATH_REPORT.read_text(encoding="utf-8"))
    path_audit = json.loads(PATH_AUDIT.read_text(encoding="utf-8"))
    assert "PASS" in path_report["status"] and "PASS" in path_audit["status"]

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

    # Keep x as the actual ratio i3/i4.  Since its rational map below already
    # contains the factor t=1/n, the only Laurent power introduced here is
    # n**n_power=t**(-n_power).  Multiplying by t**max(n_power) clears it.
    # (Using max(n_power-x_power) here would be appropriate only if the mapped
    # variable were x/t; doing both would count the t factor twice.)
    t_shift = max(
        max(n_power for (n_power, _, _, _, _, _, _), _ in source_terms),
        0,
    )
    base_data = {}
    for monomial, coefficient in source_terms:
        n_power, _, x_power, u_power, k_power, v_power, z_power = monomial
        key = (
            t_shift - n_power,
            x_power,
            u_power,
            k_power,
            v_power,
            z_power,
        )
        base_data[key] = base_data.get(key, sp.S.Zero) + coefficient
    base_data = {key: value for key, value in base_data.items() if value}
    maxima = tuple(max(key[axis] for key in base_data) for axis in range(6))
    assert maxima == (2, 13, 13, 5, 9, 2)

    T, Ec, A, Uc, Kc, Vc, Zc = sp.symbols(
        "T Ec A Uc Kc Vc Zc", nonnegative=True
    )
    cube = (T, Ec, A, Uc, Kc, Vc, Zc)
    context = fmpq_mpoly_ctx.get([str(variable) for variable in cube])
    t = T / CUTOFF

    # e = 1 + (binom(n-2,2)-1) Ec, written after multiplying by t^2.
    emax_t2 = (1 - 2 * t) * (1 - 3 * t) / 2
    e_t2 = sp.expand(t**2 + (emax_t2 - t**2) * Ec)
    # y=n*i2/i3.  Both numerator and denominator below have been multiplied
    # by the same positive 6*t^3.
    y_numerator = sp.expand(3 * (1 - t) * (1 - 2 * t))
    y_denominator = sp.expand(
        (1 - 2 * t) * (1 - 3 * t) * (1 - 4 * t) + 6 * t * e_t2
    )
    r_lower = sp.Rational(4, 3) + sp.Rational(2, 3) * t
    r_upper = sp.Rational(4, 3) + sp.Rational(1008, 173) * t
    r_map = sp.expand(r_lower + (r_upper - r_lower) * A)
    x_numerator = sp.expand(t * y_numerator * r_map)
    x_denominator = y_denominator

    floor_numerator = sp.expand(8 * e_t2)
    floor_denominator = sp.expand(5 * (1 - 2 * t) * (1 - 3 * t))
    v_numerator = sp.expand(
        floor_numerator * (1 - Vc) + v_cap * floor_denominator * Vc
    )
    v_denominator = floor_denominator

    z_numerator = sp.expand(1 - 19 * t + 7 * t * Zc)
    z_denominator = sp.expand(1 - 12 * t)
    k_map = 1 + 6 * Kc

    # Exact endpoint and positivity checks on the compactified domain.
    assert sp.factor(e_t2.subs(Ec, 0) - t**2) == 0
    assert sp.factor(e_t2.subs(Ec, 1) - emax_t2) == 0
    assert sp.factor(floor_numerator.subs(Ec, 1) / floor_denominator - sp.Rational(4, 5)) == 0
    assert x_denominator.subs({T: 0, Ec: 0}) == 1
    assert x_denominator.subs({T: 1, Ec: 0}) > 0
    assert floor_denominator.subs(T, 1) > 0
    assert z_denominator.subs(T, 1) > 0

    tf = to_flint(context, t, cube)
    xf_num = to_flint(context, x_numerator, cube)
    xf_den = to_flint(context, x_denominator, cube)
    uf = to_flint(context, Uc, cube)
    kf = to_flint(context, k_map, cube)
    vf_num = to_flint(context, v_numerator, cube)
    vf_den = to_flint(context, v_denominator, cube)
    zf_num = to_flint(context, z_numerator, cube)
    zf_den = to_flint(context, z_denominator, cube)
    maps = (tf, uf, kf)
    map_degrees = (maxima[0], maxima[2], maxima[3])
    powers = [
        [mapping**power for power in range(maximum + 1)]
        for mapping, maximum in zip(maps, map_degrees, strict=True)
    ]
    x_num_powers = [xf_num**power for power in range(maxima[1] + 1)]
    x_den_powers = [xf_den**power for power in range(maxima[1] + 1)]
    v_num_powers = [vf_num**power for power in range(maxima[4] + 1)]
    v_den_powers = [vf_den**power for power in range(maxima[4] + 1)]
    z_num_powers = [zf_num**power for power in range(maxima[5] + 1)]
    z_den_powers = [zf_den**power for power in range(maxima[5] + 1)]

    def mapped_source_terms():
        for key, coefficient in base_data.items():
            t_power, x_power, u_power, k_power, v_power, z_power = key
            numerator, denominator = sp.fraction(coefficient)
            term = context.constant(fmpq(int(numerator), int(denominator)))
            for axis, power in enumerate((t_power, u_power, k_power)):
                term *= powers[axis][power]
            term *= x_num_powers[x_power] * x_den_powers[maxima[1] - x_power]
            term *= v_num_powers[v_power] * v_den_powers[maxima[4] - v_power]
            term *= z_num_powers[z_power] * z_den_powers[maxima[5] - z_power]
            yield term

    def progress(count: int, batches: int) -> None:
        if count == len(base_data) or count % 1024 == 0:
            print("MAP_PROGRESS", count, len(base_data), "BATCHES", batches, flush=True)

    mapped = balanced_batched_sum(mapped_source_terms(), batch_size=128, progress=progress)
    mapped_terms = list(mapped.terms())
    degrees = tuple(
        int(max((monomial[axis] for monomial, _ in mapped_terms), default=0))
        for axis in range(len(cube))
    )
    coefficient_count = math.prod(degree + 1 for degree in degrees)
    preflight = {
        "mapped_terms": len(mapped_terms),
        "mapped_degrees": list(degrees),
        "dense_Bernstein_coefficients": coefficient_count,
        "elapsed_seconds": time.perf_counter() - started,
    }
    print("PREFLIGHT", json.dumps(preflight, sort_keys=True), flush=True)
    if args.map_only:
        return 0

    replay_degrees, bernstein, replay_terms = tensor_bernstein_from_flint_matrix(
        mapped, len(cube), chunk_columns=args.chunk_columns
    )
    assert tuple(map(int, replay_degrees)) == degrees
    assert replay_terms == len(mapped_terms)
    minimum, index = minimum_with_index(bernstein)
    negative = sum(bool(value < 0) for value in bernstein.flat)
    zero = sum(bool(value == 0) for value in bernstein.flat)
    positive = int(bernstein.size) - negative - zero
    status = (
        "PASS_EXACT_DELTA1_Q7_LCROSS_NONPATH_SURPLUS_VFLOOR_N28_PLUS"
        if negative == 0
        else "NONPATH_SURPLUS_VFLOOR_BOX_UNRESOLVED_MIXED_BERNSTEIN_NO_SIGN_CLAIM"
    )
    payload = {
        "schema": "rank8-delta1-q7-lcross-nonpath-surplus-vfloor-root-v1",
        "status": status,
        "theorem_if_pass": (
            "Delta1 is nonnegative on the Q7/lower-cross terminal box for every "
            "nonpath tree of order at least 28."
        ),
        "degree_surplus_map": "e=1+(binom(n-2,2)-1)Ec",
        "V_interval": ["8e/(5(n-2)(n-3))", str(v_cap)],
        "positive_multipliers": [
            f"t**{t_shift} for every finite n",
            f"x_denominator**{maxima[1]}",
            f"V_floor_denominator**{maxima[4]}",
            f"root_floor_denominator**{maxima[5]}",
        ],
        "path_branch": {
            PATH_REPORT.name: sha256(PATH_REPORT),
            PATH_AUDIT.name: sha256(PATH_AUDIT),
        },
        "preflight": preflight,
        "minimum": str(minimum),
        "minimum_index": list(index),
        "coefficient_sign_counts": {
            "negative": negative,
            "zero": zero,
            "positive": positive,
        },
        "dependencies": {
            SOURCE.name: sha256(SOURCE),
            V_FLOOR.name: sha256(V_FLOOR),
        },
        "source_sha256": sha256(Path(__file__)),
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "scope_warning": (
            "A mixed Bernstein result is an enclosure diagnostic unless every "
            "coefficient is nonnegative and an independent mapping replay passes."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("SIGNS", negative, zero, positive)
    print("MINIMUM", minimum, index)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    del bernstein
    gc.collect()
    return 0 if negative == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
