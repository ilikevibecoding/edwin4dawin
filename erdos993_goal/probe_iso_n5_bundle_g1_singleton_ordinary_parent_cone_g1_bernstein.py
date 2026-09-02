#!/usr/bin/env python3
"""Numerical scouting only for the strengthened singleton-ordinary cone.

This emits PROBE, never PASS.  It samples the exact degree-excess simplex,
the four concave neighbor-excess endpoints, and either the broad W interval
[0,Wcap] or the sharper elementary lower interval.  Its sole purpose is to
locate missing constraints before an exact Bernstein certificate is built.
"""

from __future__ import annotations

import argparse
import itertools

import numpy as np
import sympy as sp

from derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein import derive


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=200_000)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--sharp-w-lower", action="store_true")
    args = parser.parse_args()

    numerator = sp.expand(derive()["strong_parent_cone_numerator"])
    names = {str(symbol): symbol for symbol in numerator.free_symbols}
    ordered_names = (
        "n", "edge_count", "degree_u", "degree_v", "degree_p",
        "C_wedges_E", "C_neighbor_excess_u", "C_neighbor_excess_v",
        "neighbor_excess_p", "adjacent", "adjacent_pu", "adjacent_pv",
        "common_neighbor_pu", "common_neighbor_pv",
    )
    variables = tuple(names[name] for name in ordered_names)
    evaluate = sp.lambdify(variables, numerator, "numpy", cse=True)

    rng = np.random.default_rng(args.seed)
    best = (float("inf"), None)
    checked = 0
    adjacency_modes = tuple(
        mode for mode in itertools.product((0, 1), repeat=3) if sum(mode) <= 2
    )

    while checked < args.samples:
        size = min(10_000, args.samples - checked)
        order = rng.integers(14, 501, size=size).astype(float)
        zu = rng.integers(0, 2, size=size)
        zv = rng.integers(0, 2, size=size)
        zp = rng.integers(0, 2, size=size)
        mode_index = rng.integers(0, len(adjacency_modes), size=size)
        adjacent = np.array([adjacency_modes[i][0] for i in mode_index])
        apu = np.array([adjacency_modes[i][1] for i in mode_index])
        apv = np.array([adjacency_modes[i][2] for i in mode_index])
        valid = (
            ((adjacent == 0) | ((zu == 1) & (zv == 1)))
            & ((apu == 0) | ((zu == 1) & (zp == 1)))
            & ((apv == 0) | ((zv == 1) & (zp == 1)))
        )

        # Split n-2 among the active selected excess coordinates, the
        # unselected degree-excess remainder, and unused order slack.
        raw = rng.exponential(1.0, size=(5, size))
        raw[0] *= zu
        raw[1] *= zv
        raw[2] *= zp
        raw_sum = raw.sum(axis=0)
        shares = raw / raw_sum
        x, y, z, remainder, _unused = shares * (order - 2)
        du, dv, dp = zu + x, zv + y, zp + z
        edges = 1 + x + y + z + remainder
        valid &= edges >= 2

        cpu_allowed = (apu == 0) & (zu == 1) & (zp == 1)
        cpv_allowed = (apv == 0) & (zv == 1) & (zp == 1)
        cpu = rng.integers(0, 2, size=size) * cpu_allowed
        cpv = rng.integers(0, 2, size=size) * cpv_allowed
        valid &= ~((adjacent == 1) & ((cpu == 1) | (cpv == 1)))

        xu_upper = np.where(zu == 1, edges - du, 0.0)
        xv_upper = np.where(zv == 1, edges - dv, 0.0)
        xu = xu_upper * rng.integers(0, 2, size=size)
        xv = xv_upper * rng.integers(0, 2, size=size)
        xp_upper = np.where(zp == 1, edges - dp, 0.0)
        xp = xp_upper * rng.random(size)

        wedge_cap = (
            du * (du - 1) / 2
            + dv * (dv - 1) / 2
            + dp * (dp - 1) / 2
            + remainder * (remainder + 1) / 2
        )
        if args.sharp_w_lower:
            wedge_lower = np.maximum.reduce((
                du * (du - 1) / 2 + dv * (dv - 1) / 2 + dp * (dp - 1) / 2,
                du * (du - 1) / 2 + xu,
                dv * (dv - 1) / 2 + xv,
                dp * (dp - 1) / 2 + xp,
            ))
        else:
            wedge_lower = np.zeros(size)
        valid &= wedge_lower <= wedge_cap + 1e-9
        wedges = wedge_lower + (wedge_cap - wedge_lower) * rng.random(size)

        arrays = (
            order, edges, du, dv, dp, wedges, xu, xv, xp,
            adjacent, apu, apv, cpu, cpv,
        )
        values = np.asarray(evaluate(*arrays), dtype=float)
        values[~valid] = np.inf
        index = int(np.argmin(values))
        if values[index] < best[0]:
            best = (
                float(values[index]),
                {name: float(array[index]) for name, array in zip(ordered_names, arrays)},
            )
        checked += size

    print({
        "marker": "PROBE_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_PARENT_CONE_G1_BERNSTEIN",
        "samples": checked,
        "w_interval": "elementary_lower_to_degree_excess_cap" if args.sharp_w_lower else "zero_to_degree_excess_cap",
        "minimum_numerator": best[0],
        "minimizer": best[1],
        "scope": "randomized continuous relaxation scouting only; no sign theorem",
    }, flush=True)


if __name__ == "__main__":
    main()
