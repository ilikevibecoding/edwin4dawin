#!/usr/bin/env python3
"""Bounded exact probe for the order-25 subdivision increment.

The previous degree/support cone left 497 relaxed profiles because its E7/E8
caps could be attained simultaneously at infeasible high rows.  Here we use
only the universal normalized-shadow chain of the contracted 24-vertex tree:

    6 H6 <= 19 H5,  7 H7 <= 18 H6,  8 H8 <= 17 H7.

For every normalized-shadow prefix of the auxiliary downset G, the increment
is strictly decreasing in H6,H7,H8.  Substituting the chained upper bounds
therefore gives a rigorous lower relaxation depending only on H2,...,H5.
This script checks that lower relaxation over every degree profile and every
possible split-degree G2 endpoint using exact Bernstein controls.
"""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import derive_iso_n7_bundle_g1_edge_subdivision_g2_profile_cone_obstruction_rank7_g4_piecewise as base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "probe_iso_n7_bundle_g1_edge_subdivision_normalized_shadow_chain_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G1_EDGE_SUBDIVISION_NORMALIZED_SHADOW_"
    "CHAIN_RANK7_G4_PIECEWISE"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def eligible_g2_endpoints(degrees):
    """G2 endpoints after requiring the old 25-tree to be in G1 scope."""
    values = []
    for index, contracted_degree in enumerate(degrees):
        remaining = degrees[:index] + degrees[index + 1:]
        for left_degree in range(1, contracted_degree + 2):
            right_degree = contracted_degree + 2 - left_degree
            old_degrees = remaining + [left_degree, right_degree]
            if max(old_degrees) < 4:
                continue
            if sum(degree >= 3 for degree in old_degrees) < 3:
                continue
            values.append(
                base.G2_DENOMINATOR - (base.ORDER - 2)
                - (left_degree - 2)*(right_degree - 2)
            )
    if not values:
        return ()
    return min(values), max(values)


def main() -> None:
    profiles = 0
    endpoint_cases = 0
    negative_controls = 0
    zero_controls = 0
    worst = None
    stream = hashlib.sha256()

    # These are the exact coefficients of H6,H7,H8 in the seven prefix
    # candidates after fixing G2.  They are negative for 0<=G2<=C(23,2).
    h2 = math.comb(base.ORDER - 1, 2)
    for g2 in range(base.G2_DENOMINATOR + 1):
        coefficient_h6 = (
            -157*h2,
            -157*h2 - 51*g2,
            -157*h2 - 121*g2,
            -157*h2 - 121*g2,
            -157*h2 - 121*g2,
            -157*h2 - 121*g2,
            -157*h2 - 121*g2,
        )
        # The omitted -73*H3 term only makes each H6 coefficient smaller.
        assert all(value < 0 for value in coefficient_h6)
        assert -59*h2 - 8*g2 < 0       # omit the negative -18*H3 term
        assert -8*h2 < 0

    for increments in base.partitions(base.ORDER - 2):
        increments = tuple(increments)
        degrees, moments, star, p4, jmax, upper7, upper8 = base.profile_data(
            increments
        )
        del moments, upper7, upper8
        profiles += 1
        g2_endpoints = eligible_g2_endpoints(degrees)

        for g2 in g2_endpoints:
            endpoint_cases += 1

            def at(s: Fraction, t: Fraction):
                j4 = Fraction(jmax)*s
                l5 = j4*(1 + (base.ORDER - 5)*t)
                row = [Fraction(0)]*9
                row[2] = Fraction(math.comb(base.ORDER - 1, 2))
                row[3] = Fraction(star[3])
                row[4] = Fraction(star[4]) + j4
                row[5] = Fraction(star[5]) + (base.ORDER - 4)*j4 - l5
                # Exact normalized-shadow double-counting caps on a
                # 24-vertex independence complex.
                row[6] = Fraction(base.ORDER - 5, 6)*row[5]
                row[7] = Fraction(base.ORDER - 6, 7)*row[6]
                row[8] = Fraction(base.ORDER - 7, 8)*row[7]
                prefixes = base.prefix_values(row)
                return tuple(
                    prefixes[0]
                    + Fraction(g2, base.G2_DENOMINATOR)
                    * (prefixes[index] - prefixes[0])
                    for index in range(7)
                )

            grid = [
                [at(Fraction(i, 2), Fraction(j, 2)) for j in range(3)]
                for i in range(3)
            ]
            for prefix in range(7):
                controls = base.tensor_controls([
                    [grid[i][j][prefix] for j in range(3)]
                    for i in range(3)
                ])
                negative_controls += sum(value < 0 for value in controls)
                zero_controls += sum(value == 0 for value in controls)
                local = min(controls)
                candidate = (
                    local, increments, g2, prefix, controls.index(local),
                    jmax, p4,
                )
                worst = candidate if worst is None else min(worst, candidate)
                stream.update((repr((
                    increments, tuple(degrees), p4, jmax, g2, prefix,
                    controls,
                )) + "\n").encode("ascii"))

    report = {
        "marker": MARKER,
        "status": "exact bounded probe; promotion requires independent replay",
        "profiles": profiles,
        "g2_endpoint_cases": endpoint_cases,
        "bernstein_controls": endpoint_cases*7*9,
        "negative_controls": negative_controls,
        "zero_controls": zero_controls,
        "minimum_control": str(worst[0]),
        "minimum_profile": list(worst[1]),
        "minimum_g2": worst[2],
        "minimum_prefix": worst[3],
        "minimum_control_index": worst[4],
        "minimum_j4_upper": worst[5],
        "minimum_p4_floor": worst[6],
        "ordered_certificate_stream_sha256": stream.hexdigest().upper(),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
