#!/usr/bin/env python3
"""Bounded exact profile probe for the degree-two-free order-26 G1 lane."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_rank7_g4_piecewise import (
    partitions,
    q,
)
from probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_p4_rank7_g4_piecewise import (
    p4_floor,
)
from derive_iso_n7_bundle_g1_edge_subdivision_g2_profile_cone_obstruction_rank7_g4_piecewise import (
    tensor_controls,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "probe_iso_n7_bundle_g1_no_parent_n26_degree2free_shadow_chain_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N26_DEGREE2FREE_SHADOW_"
    "CHAIN_RANK7_G4_PIECEWISE"
)
ORDER = 26
EDGES = ORDER - 1


def choose(value: int, rank: int) -> int:
    return math.comb(value, rank) if value >= rank >= 0 else 0


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def profile_data(increments):
    degrees = [value + 1 for value in increments]
    degrees += [1]*(ORDER - len(degrees))
    moments = {
        rank: sum(choose(degree, rank) for degree in degrees)
        for rank in range(2, 8)
    }
    star = {
        rank: (
            choose(ORDER, rank) - EDGES*choose(ORDER - 2, rank - 2)
            + sum(
                (-1)**support*moments[support]
                * choose(ORDER - support - 1, rank - support - 1)
                for support in range(2, rank)
            )
        )
        for rank in range(3, 6)
    }
    p4 = p4_floor(ORDER, increments)
    disjoint_edge_pairs = choose(EDGES, 2) - moments[2]
    jmax = disjoint_edge_pairs - p4
    assert jmax >= 0
    return degrees, moments, star, p4, jmax


def main() -> None:
    profiles = 0
    controls_checked = 0
    negative_controls = 0
    zero_controls = 0
    derivative_maximum = None
    derivative_witness = None
    worst = None
    stream = hashlib.sha256()

    for increments in partitions(ORDER - 2):
        increments = tuple(increments)
        if 1 in increments:              # exactly the degree-two-free lane
            continue
        if increments[0] < 3:            # maximum degree at least four
            continue
        if sum(value >= 2 for value in increments) < 3:
            continue                     # at least three branching vertices

        degrees, moments, star, p4, jmax = profile_data(increments)
        profiles += 1

        def at(s: Fraction, t: Fraction):
            j4 = Fraction(jmax)*s
            l5 = j4*(1 + (ORDER - 5)*t)
            row = {
                3: Fraction(star[3]),
                4: Fraction(star[4]) + j4,
                5: Fraction(star[5]) + (ORDER - 4)*j4 - l5,
            }
            # q is affine in H6,H7,H8.  The following are the largest
            # values permitted by normalized-shadow double counting.
            row[6] = Fraction(ORDER - 5, 6)*row[5]
            row[7] = Fraction(ORDER - 6, 7)*row[6]
            row[8] = Fraction(ORDER - 7, 8)*row[7]
            derivative6 = -106*row[3] - 12*row[4] + 10*row[5]
            return q(row), derivative6, row

        grid = [
            [at(Fraction(i, 2), Fraction(j, 2)) for j in range(3)]
            for i in range(3)
        ]
        q_controls = tensor_controls([
            [grid[i][j][0] for j in range(3)] for i in range(3)
        ])
        derivative_controls = tensor_controls([
            [grid[i][j][1] for j in range(3)] for i in range(3)
        ])
        # The derivative is only bilinear, but the degree-(2,2) elevation is
        # exact and convenient.  A negative maximum proves q decreases in H6.
        local_derivative_maximum = max(derivative_controls)
        if derivative_maximum is None or local_derivative_maximum > derivative_maximum:
            derivative_maximum = local_derivative_maximum
            derivative_witness = (
                increments, derivative_controls.index(local_derivative_maximum)
            )

        controls_checked += len(q_controls)
        negative_controls += sum(value < 0 for value in q_controls)
        zero_controls += sum(value == 0 for value in q_controls)
        local = min(q_controls)
        candidate = (
            local, increments, q_controls.index(local), p4, jmax,
        )
        worst = candidate if worst is None else min(worst, candidate)
        stream.update((repr((
            increments, tuple(degrees), tuple(sorted(moments.items())),
            tuple(sorted(star.items())), p4, jmax, q_controls,
            derivative_controls,
        )) + "\n").encode("ascii"))

    report = {
        "marker": MARKER,
        "status": "exact bounded probe; promotion requires independent replay",
        "order": ORDER,
        "profiles": profiles,
        "bernstein_controls": controls_checked,
        "negative_controls": negative_controls,
        "zero_controls": zero_controls,
        "maximum_H6_derivative": str(derivative_maximum),
        "maximum_H6_derivative_profile": list(derivative_witness[0]),
        "maximum_H6_derivative_control": derivative_witness[1],
        "minimum_control": str(worst[0]),
        "minimum_profile": list(worst[1]),
        "minimum_control_index": worst[2],
        "minimum_p4_floor": worst[3],
        "minimum_j4_upper": worst[4],
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
