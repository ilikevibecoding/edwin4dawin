#!/usr/bin/env python3
"""Bounded exact subdivision-increment profiles for new orders 27..31."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_rank7_g4_piecewise import (
    partitions,
)
from probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_p4_rank7_g4_piecewise import (
    p4_floor,
)
from derive_iso_n7_bundle_g1_edge_subdivision_g2_profile_cone_obstruction_rank7_g4_piecewise import (
    tensor_controls,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "probe_iso_n7_bundle_g1_no_parent_n27_31_degree2_subdivision_batch_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N27_31_DEGREE2_"
    "SUBDIVISION_BATCH_RANK7_G4_PIECEWISE"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def axis_controls(values):
    return (
        values[0],
        2*values[1] - (values[0] + values[2])/2,
        values[2],
    )


def prefix_values(order, row):
    h2, h3, h4, h5, h6, h7, h8 = row[2:9]
    base = (
        8*h2*h2 + 40*h2*h3 - 40*h2*h4 - 170*h2*h5
        - 157*h2*h6 - 59*h2*h7 - 8*h2*h8 + 104*h3*h3
        + 186*h3*h4 - 28*h3*h5 - 73*h3*h6 - 18*h3*h7
        + 129*h4*h4 + 76*h4*h5 + 10*h5*h5
    )
    coefficients = (
        16*h2 + 24*h3 - 64*h4 - 106*h5 - 51*h6 - 8*h7,
        24*h2 + 160*h3 + 90*h4 - 12*h5 - 10*h6,
        -64*h2 + 90*h3 + 78*h4 + 10*h5,
        -106*h2 - 12*h3 + 10*h4,
        -51*h2 - 10*h3,
        -8*h2,
    )
    ground = order - 1
    values = [base]
    value = base
    for rank, coefficient in zip(range(2, 8), coefficients):
        value += coefficient*math.comb(ground, rank)
        values.append(value)
    return tuple(values)


def profile_data(order, increments):
    edges = order - 1
    degrees = [value + 1 for value in increments]
    degrees += [1]*(order - len(degrees))
    moments = {
        rank: sum(math.comb(degree, rank) for degree in degrees)
        for rank in range(2, 8)
    }
    star = {
        rank: (
            math.comb(order, rank)
            - edges*math.comb(order - 2, rank - 2)
            + sum(
                (-1)**support*moments[support]
                * math.comb(order - support - 1, rank - support - 1)
                for support in range(2, rank)
            )
        )
        for rank in range(3, 6)
    }
    p4 = p4_floor(order, increments) if len(increments) >= 2 else 0
    jmax = math.comb(edges, 2) - moments[2] - p4
    assert jmax >= 0
    return degrees, moments, star, p4, jmax


def eligible_g2_endpoints(order, degrees):
    denominator = math.comb(order - 1, 2)
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
                denominator - (order - 2)
                - (left_degree - 2)*(right_degree - 2)
            )
    if not values:
        return ()
    return min(values), max(values)


def certify_order(order):
    denominator = math.comb(order - 1, 2)
    profiles = 0
    endpoint_cases = 0
    controls_checked = 0
    worst = None
    stream = hashlib.sha256()

    for increments in partitions(order - 2):
        increments = tuple(increments)
        degrees, moments, star, p4, jmax = profile_data(order, increments)
        profiles += 1
        for g2 in eligible_g2_endpoints(order, degrees):
            endpoint_cases += 1

            def at(s, t):
                j4 = Fraction(jmax)*s
                l5 = j4*(1 + (order - 5)*t)
                row = [Fraction(0)]*9
                row[2] = Fraction(denominator)
                row[3] = Fraction(star[3])
                row[4] = Fraction(star[4]) + j4
                row[5] = Fraction(star[5]) + (order - 4)*j4 - l5
                row[6] = Fraction(order - 5, 6)*row[5]
                row[7] = Fraction(order - 6, 7)*row[6]
                row[8] = Fraction(order - 7, 8)*row[7]
                prefixes = prefix_values(order, row)
                return tuple(
                    prefixes[0]
                    + Fraction(g2, denominator)*(prefixes[k] - prefixes[0])
                    for k in range(7)
                )

            grid = [
                [at(Fraction(i, 2), Fraction(j, 2)) for j in range(3)]
                for i in range(3)
            ]
            for prefix in range(7):
                controls = tensor_controls([
                    [grid[i][j][prefix] for j in range(3)]
                    for i in range(3)
                ])
                controls_checked += len(controls)
                local = min(controls)
                candidate = (
                    local, increments, g2, prefix, controls.index(local),
                    p4, jmax,
                )
                worst = candidate if worst is None else min(worst, candidate)
                stream.update((repr((
                    order, increments, tuple(degrees),
                    tuple(sorted(moments.items())), p4, jmax, g2, prefix,
                    controls,
                )) + "\n").encode("ascii"))

    return {
        "contracted_order": order,
        "old_order": order + 1,
        "new_order": order + 2,
        "profiles": profiles,
        "eligible_g2_endpoint_cases": endpoint_cases,
        "bernstein_controls": controls_checked,
        "increment_lower_bound": str(worst[0]),
        "minimum_profile": list(worst[1]),
        "minimum_g2": worst[2],
        "minimum_prefix": worst[3],
        "minimum_control_index": worst[4],
        "minimum_p4_floor": worst[5],
        "minimum_j4_upper": worst[6],
        "ordered_certificate_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    results = {
        str(order + 2): certify_order(order)
        for order in range(25, 30)
    }
    report = {
        "marker": MARKER,
        "status": "exact bounded probe; promotion requires independent replay",
        "new_orders": [27, 31],
        "results": results,
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
