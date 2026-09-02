#!/usr/bin/env python3
"""Exact finite mask-0 registry for 26<=N<=39 and 0<=m<=15."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

from flint import fmpz_mpoly_ctx

from analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent import (
    base_polynomial,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_n26_39_m0_15_exact_agent_20260823.json"
BOUNDS_REPORT = HERE / "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_forest6_15_component_jet_bounds_agent.py":
        "D0E0E18E2E2D3BB6BEEF080BB360FC61EA8129EE415E447DAEF5A448A80519E5",
    "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json":
        "5416988DAB946AF2A9F0A24B41096AC4D0B6D8D508780D3098AA673E7BAF61A1",
    "audit_rank8_forest6_15_component_jet_bounds_agent.py":
        "1D896071A729A8614B32518344006F588E05A0C3D50D212990BB625A8DDF4F08",
    "rank8_forest6_15_component_jet_bounds_independent_audit_agent_20260823.json":
        "0F3967E97751D44F42E854FA71D4F29B4F8E7BFDADDC95EE44D6B28E3472683E",
    "analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent.py":
        "10CF82012DA64D69B216F3580DE8923F5D9F89C1C63D061A7D21BBC8DC76A27B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def parse_fraction(value: str) -> Fraction:
    numerator, separator, denominator = value.partition("/")
    return Fraction(int(numerator), int(denominator) if separator else 1)


def path_minima(m: int) -> list[int]:
    return [choose(m - j + 1, j) for j in range(5)]


def gap_from_minima(r: int, components: int, minima: list[int]) -> int:
    return sum(
        minima[j] * choose(r - min(j, components), 5 - j)
        for j in range(5)
    )


def d6_upper(N: int, r: int) -> int:
    return choose(N - 1, 6) + choose(r - 1, 5)


def common_xy(N: int, r: int, minima: list[int], components: int, ring):
    X, V = ring.gens()[:2]
    qden = N * N - 15 * N + 10
    xden = (N - 5) * qden
    xnum = 6 * qden + 60 * (N - 1) * X
    upper = d6_upper(N, r)
    gap = gap_from_minima(r, components, minima)
    yden = xden * upper
    ynum = xnum * upper - gap * xden
    return X, V, xnum, xden, ynum, yden, gap, upper


def clear_zero(base, N: int, r: int, minima: list[int], components: int):
    ring = fmpz_mpoly_ctx.get(["X", "V"])
    X, V, xnum, xden, ynum, yden, gap, upper = common_xy(
        N, r, minima, components, ring
    )
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        if zp:
            continue
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (1 - xp)
        term *= (ynum * V) ** yp * yden ** (2 - yp)
        answer += term
    return answer, {"gap": gap, "d6_upper": upper}


def clear_zero_root_floor(base, N: int, r: int, f5_maximum: int):
    """Use y=f5/d6<=f5_maximum/C(r,6), since all roots are independent."""
    ring = fmpz_mpoly_ctx.get(["X", "V"])
    X, V = ring.gens()
    qden = N * N - 15 * N + 10
    xden = (N - 5) * qden
    xnum = 6 * qden + 60 * (N - 1) * X
    ynum = ring.constant(f5_maximum)
    root_sixsets = choose(r, 6)
    assert root_sixsets > 0
    yden = ring.constant(root_sixsets)
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        if zp:
            continue
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (1 - xp)
        term *= (ynum * V) ** yp * yden ** (2 - yp)
        answer += term
    return answer, {
        "f5_maximum": f5_maximum,
        "d6_root_sixset_floor": root_sixsets,
        "y_upper": str(Fraction(f5_maximum, root_sixsets)),
    }


def clear_positive(
    base, N: int, r: int, minima: list[int], components: int, t_upper: Fraction
):
    m = N - r
    ring = fmpz_mpoly_ctx.get(["X", "V", "T"])
    X, V, T = ring.gens()
    _, _, xnum, xden, ynum, yden, gap, upper = common_xy(
        N, r, minima, components, ring
    )
    t_lower = Fraction(6, m - 5)
    assert t_lower <= t_upper
    tden = math.lcm(t_lower.denominator, t_upper.denominator)
    lower_integer = t_lower.numerator * (tden // t_lower.denominator)
    upper_integer = t_upper.numerator * (tden // t_upper.denominator)
    tnum = lower_integer + (upper_integer - lower_integer) * T
    znum = ynum * tden
    zden = yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (1 - xp)
        term *= (ynum * V) ** yp * yden ** (2 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer, {
        "gap": gap,
        "d6_upper": upper,
        "t_lower": str(t_lower),
        "t_upper": str(t_upper),
    }


def bernstein_sign(cleared):
    power = cleared.to_dict()
    axes = len(next(iter(power)))
    degrees = tuple(max(index[axis] for index in power) for axis in range(axes))
    scales = []
    for degree in degrees:
        scale = 1
        for exponent in range(degree + 1):
            scale = math.lcm(scale, math.comb(degree, exponent))
        scales.append(scale)
    blocks = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for source, coefficient in power.items():
            if any(a > b for a, b in zip(source, target)):
                continue
            weight = 1
            for a, b, degree, scale in zip(source, target, degrees, scales):
                weight *= math.comb(b, a) * scale // math.comb(degree, a)
            value += int(coefficient) * weight
        blocks[target] = value
    negative = [list(index) for index, value in sorted(blocks.items()) if value < 0]
    return {
        "degrees": [int(value) for value in degrees],
        "blocks": len(blocks),
        "negative": len(negative),
        "zero": sum(value == 0 for value in blocks.values()),
        "positive": sum(value > 0 for value in blocks.values()),
        "minimum": str(min(blocks.values())),
        "negative_indices": negative,
    }


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    catalog = json.loads(BOUNDS_REPORT.read_text(encoding="utf-8"))
    component_rows = {
        (row["order"], row["components"]): row
        for row in catalog["component_rows"]
    }
    global_rows = {row["order"]: row for row in catalog["global_order_rows"]}
    base = base_polynomial()
    rows = []
    subbox_count = 0
    split_zero_subboxes = 0
    split_positive_subboxes = 0
    for N in range(26, 40):
        for m in range(16):
            r = N - m
            branches = []
            # f6=0 is possible only through order 10.  Global boxes close all
            # but the three smallest m=10 cells.
            if m <= 10:
                if m < 10 or N >= 29:
                    cleared, metadata = clear_zero(base, N, r, path_minima(m), 4)
                    sign = bernstein_sign(cleared)
                    assert sign["negative"] == 0
                    branches.append(
                        {
                            "branch": "f6_zero",
                            "route": "GLOBAL_PATH_GAP_EDGE_CONCENTRATION",
                            "subcases": [{"components": "all", "metadata": metadata, "bernstein": sign}],
                        }
                    )
                    subbox_count += 1
                else:
                    subcases = []
                    expected_components = []
                    for components in range(1, m + 1):
                        item = component_rows[(m, components)]["f6_zero"]
                        if not item["jet_count"]:
                            continue
                        expected_components.append(components)
                        if N == 26 and components in (2, 3):
                            cleared, metadata = clear_zero_root_floor(
                                base, N, r, item["maximum_f5"]
                            )
                            metadata["route"] = "ROOT_SIXSET_F5_CAP"
                        else:
                            cleared, metadata = clear_zero(
                                base, N, r, item["minimum_f0_to_f4"], components
                            )
                            metadata["route"] = "COMPONENT_GAP"
                        sign = bernstein_sign(cleared)
                        assert sign["negative"] == 0, (N, m, components, sign)
                        subcases.append(
                            {"components": components, "metadata": metadata, "bernstein": sign}
                        )
                    assert expected_components == [1, 2, 3, 4, 5]
                    branches.append(
                        {
                            "branch": "f6_zero",
                            "route": "COMPONENT_JET_SPLIT",
                            "subcases": subcases,
                        }
                    )
                    subbox_count += len(subcases)
                    split_zero_subboxes += len(subcases)

            # f6>0 starts at order 6.  Exact global finite ratios close all
            # but N=26..29 at m=11, which receive a component split.
            if m >= 6:
                if m != 11 or N >= 30:
                    t_upper = parse_fraction(
                        global_rows[m]["f6_positive_maximum_f5_over_f6"]
                    )
                    cleared, metadata = clear_positive(
                        base, N, r, path_minima(m), 4, t_upper
                    )
                    sign = bernstein_sign(cleared)
                    assert sign["negative"] == 0, (N, m, sign)
                    branches.append(
                        {
                            "branch": "f6_positive",
                            "route": "GLOBAL_FINITE_RATIO_PATH_GAP_EDGE_CONCENTRATION",
                            "subcases": [{"components": "all", "metadata": metadata, "bernstein": sign}],
                        }
                    )
                    subbox_count += 1
                else:
                    subcases = []
                    expected_components = []
                    for components in range(1, m + 1):
                        item = component_rows[(m, components)]["f6_positive"]
                        if not item["jet_count"]:
                            continue
                        expected_components.append(components)
                        cleared, metadata = clear_positive(
                            base,
                            N,
                            r,
                            item["minimum_f0_to_f4"],
                            components,
                            parse_fraction(item["maximum_f5_over_f6"]),
                        )
                        sign = bernstein_sign(cleared)
                        assert sign["negative"] == 0, (N, m, components, sign)
                        subcases.append(
                            {"components": components, "metadata": metadata, "bernstein": sign}
                        )
                    assert expected_components == list(range(1, 12))
                    branches.append(
                        {
                            "branch": "f6_positive",
                            "route": "COMPONENT_JET_SPLIT",
                            "subcases": subcases,
                        }
                    )
                    subbox_count += len(subcases)
                    split_positive_subboxes += len(subcases)
            expected_branches = ["f6_zero"] if m < 6 else (
                ["f6_positive"] if m > 10 else ["f6_zero", "f6_positive"]
            )
            assert [branch["branch"] for branch in branches] == expected_branches
            rows.append(
                {
                    "N": N,
                    "m": m,
                    "r": r,
                    "status": "SEALED_MASK0_FINITE_SMALL_M",
                    "branches": branches,
                }
            )
    assert len(rows) == 224
    assert subbox_count == 346
    assert (split_zero_subboxes, split_positive_subboxes) == (15, 44)
    assert [(row["N"], row["m"], row["r"]) for row in rows] == [
        (N, m, N - m) for N in range(26, 40) for m in range(16)
    ]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-n26-39-m0-15-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK0_N26_39_M0_15_ALL_224",
        "scope": (
            "26<=N=|D|<=39, 0<=m=|F|<=15, r=N-m, selected-lower c8/d7 mask0."
        ),
        "counts": {
            "cells": 224,
            "logical_f6_zero_branches": 154,
            "logical_f6_positive_branches": 140,
            "bernstein_subboxes": subbox_count,
            "m10_zero_component_subboxes": split_zero_subboxes,
            "m11_positive_component_subboxes": split_positive_subboxes,
            "open": 0,
        },
        "exact_inputs": [
            "d6<=C(N-1,6)+C(r-1,5) by edge concentration",
            "component-resolved lower f0..f4 bounds and maximum f5/f6 ratios from the independently audited forest-order catalog",
            "for the two smallest m=10 zero subcases, d6>=C(r,6) because the distinguished roots are independent, hence f5/d6<=f5_max/C(r,6)",
        ],
        "rows": rows,
        "hashes": hashes,
        "proof_boundary": (
            "This seals exactly the 224 finite small-m cells for Delta0/new-leaf/"
            "mask0.  It does not cover masks1..3, q=v, Delta1..3, connected Q8, "
            "or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 224 SUBBOXES", subbox_count, "OPEN 0")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
