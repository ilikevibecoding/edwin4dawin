#!/usr/bin/env python3
"""Replay Chebyshev-limit failures under the correctly scaled T_c family.

Since c^k/(c)_k -> 1, the normalized seed g_c(cX) tends to the unsmoothed
Chebyshev seed.  Proper-position stability is invariant under this variable
scaling, but the affine-line bases/directions must scale by c and the pencil
variable by c^2.  This script locates the finite-c transition on exact limit
failure lines.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from probe_catalan_smoothed_proper_position import derivative_sum_line, derivative_table
from probe_jacobi_multiplier_parameter_proper_position import seed
from probe_umbral_repaired_core_stability import add, integer_values, multiply


OUT = Path("jacobi_multiplier_transition_witness_probe_20260802.json")


def nonreal(values: list[sp.Rational]) -> int:
    return sum(
        multiplicity
        for root, multiplicity in fmpz_poly(integer_values(values)).complex_roots()
        if not root.imag.is_zero()
    )


def pencil_count(
    m: int,
    c: sp.Integer | None,
    model: dict[str, object],
    normalized: bool,
    derivative_cache: dict[tuple[int, str], tuple[list[sp.Poly], list[sp.Poly]]],
) -> int:
    N = 3 * m + 3
    b = 2 * m + 1
    cache_key = (m, "identity" if c is None else str(c))
    if cache_key not in derivative_cache:
        derivative_cache[cache_key] = (
            derivative_table(seed(N, c), b + 2),
            derivative_table(seed(N - 1, c), b),
        )
    g_derivatives, h_derivatives = derivative_cache[cache_key]
    if normalized and c is not None:
        scale = int(c)
        xy_base = tuple(scale * value for value in model["xy_base"])
        xy_direction = tuple(scale * value for value in model["xy_direction"])
        u = [scale**2 * model["u_base"], scale**2 * model["u_direction"]]
    else:
        xy_base = model["xy_base"]
        xy_direction = model["xy_direction"]
        u = [model["u_base"], model["u_direction"]]
    a_line = derivative_sum_line(g_derivatives, b + 2, xy_base, xy_direction)
    b_line = derivative_sum_line(h_derivatives, b, xy_base, xy_direction)
    return nonreal(add(b_line, multiply(a_line, u)))


def main() -> None:
    ctx.prec = 160
    rng = random.Random(993_200_003)
    trials = 12
    line_models = {}
    for m in range(1, 16):
        line_models[m] = [
            {
                "xy_base": (rng.randint(-18, 18), rng.randint(-18, 18)),
                "xy_direction": (rng.randint(1, 12), rng.randint(1, 12)),
                "u_base": rng.randint(-18, 18),
                "u_direction": rng.randint(1, 12),
            }
            for _ in range(trials)
        ]

    witnesses = []
    derivative_cache = {}
    for m in range(1, 16):
        for trial, model in enumerate(line_models[m]):
            count = pencil_count(m, None, model, normalized=False, derivative_cache=derivative_cache)
            if count:
                witnesses.append({"m": m, "trial": trial, **model, "limit_nonreal": count})
    assert len(witnesses) == 4

    parameters = [1, 2, 3, 4, 5, 8, 16, 32, 64, 128, 256, 512, 1024]
    transitions = []
    for witness_index, witness in enumerate(witnesses):
        model = {
            key: witness[key]
            for key in ("xy_base", "xy_direction", "u_base", "u_direction")
        }
        counts = {}
        for c in parameters:
            count = pencil_count(
                witness["m"],
                sp.Integer(c),
                model,
                normalized=True,
                derivative_cache=derivative_cache,
            )
            counts[str(c)] = count
            print(
                {"witness": witness_index, "m": witness["m"], "c": c, "nonreal": count},
                flush=True,
            )
        transitions.append({"witness": witness, "normalized_nonreal_by_c": counts})

    report = {
        "kind": "jacobi_multiplier_transition_witness_probe",
        "date": "2026-08-02",
        "status": "DONE_EXACT_NORMALIZED_TRANSITION_SCAN",
        "normalization": "g_c(cX), with affine X,Y scaled by c and U scaled by c^2",
        "limit_witnesses": len(witnesses),
        "parameters": parameters,
        "transitions": transitions,
        "warning": "Finite exact failure lines locate obstructions; passing values are evidence only.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "transitions": "omitted", "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
