#!/usr/bin/env python3
"""Exact finite probe of a uniform Delta3 old-root tail for every near>=19.

This is a routing/profile computation, not a theorem claim.  The active path
orders are put on their stable binomial-polynomial branches, and all small
tail/short/difference exceptions are enumerated by a disjoint finite split.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from functools import lru_cache
from pathlib import Path

import numpy as np
import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_e1_old_root_near19_uniform_tail_profile_exact_agent_20260825.json"
MAX_RANK = 8
DEGREE = 26
WIDTH = DEGREE + 1
NEAR_SHIFT = 19
SMALL_CUTOFF = 6
EXTENSIONS = ("root", "short", "long")
COORDINATES = ("near", "tail", "short", "difference")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def poly_add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[index] + right[index] for index in range(MAX_RANK + 1))


def poly_mul(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * (MAX_RANK + 1)
    for i, left_value in enumerate(left):
        if not left_value:
            continue
        for j, right_value in enumerate(right[: MAX_RANK + 1 - i]):
            if right_value:
                out[i + j] += left_value * right_value
    return tuple(out)


def poly_product(polynomials: tuple[tuple[int, ...], ...]) -> tuple[int, ...]:
    out = (1,) + (0,) * MAX_RANK
    for polynomial in polynomials:
        out = poly_mul(out, polynomial)
    return out


def shift(polynomial: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + polynomial[:MAX_RANK]


@lru_cache(maxsize=None)
def path_poly(order: int) -> tuple[int, ...]:
    assert order >= 0
    return tuple(
        math.comb(order - rank + 1, rank)
        if order - rank + 1 >= rank
        else 0
        for rank in range(MAX_RANK + 1)
    )


@lru_cache(maxsize=None)
def claw_poly(arms: tuple[int, int, int]) -> tuple[int, ...]:
    excluded_center = poly_product(tuple(path_poly(length) for length in arms))
    included_center = shift(
        poly_product(tuple(path_poly(max(length - 1, 0)) for length in arms))
    )
    return poly_add(excluded_center, included_center)


def delta3_terms() -> tuple[tuple[int, tuple[tuple[int, int], ...]], ...]:
    variables = (*c[:9], h[6], h[7])
    raw = sp.Poly(
        newton_coefficients(residual())[3], *variables, domain=sp.QQ
    ).terms()
    assert len(raw) == 26
    terms = []
    for monomial, coefficient in raw:
        assert coefficient.q == 1
        factors = tuple(
            (index, exponent)
            for index, exponent in enumerate(monomial)
            if exponent
        )
        assert all(exponent in (1, 2) for _, exponent in factors)
        terms.append((int(coefficient), factors))
    weights = tuple(range(9)) + (6, 7)
    assert max(
        sum(exponent * weights[index] for index, exponent in factors)
        for _, factors in terms
    ) == DEGREE
    return tuple(terms)


TERMS = delta3_terms()


def evaluate(core: tuple[int, ...], deleted: tuple[int, ...]) -> int:
    values = (*core, deleted[6], deleted[7])
    total = 0
    for coefficient, factors in TERMS:
        term = coefficient
        for index, exponent in factors:
            value = values[index]
            term *= value if exponent == 1 else value * value
        total += term
    return total


def deleted_poly(
    near: int,
    tail: int,
    other_short: int,
    other_long: int,
) -> tuple[int, ...]:
    # Literal deletion identity for a root at distance near+1: the component
    # beyond the root is P_tail and the center component is a three-arm claw
    # with prefix length near.
    return poly_mul(
        path_poly(tail), claw_poly((near, other_short, other_long))
    )


def increment(
    extension: str,
    near: int,
    tail: int,
    short: int,
    difference: int,
) -> int:
    old_arms = (near + tail + 1, short + 1, short + difference + 1)
    old_core = claw_poly(old_arms)
    old_deleted = deleted_poly(near, tail, old_arms[1], old_arms[2])
    new_arms = list(old_arms)
    new_arms[{"root": 0, "short": 1, "long": 2}[extension]] += 1
    new_arms_tuple = tuple(new_arms)
    new_core = claw_poly(new_arms_tuple)
    new_tail = new_arms_tuple[0] - near - 1
    new_deleted = deleted_poly(
        near, new_tail, new_arms_tuple[1], new_arms_tuple[2]
    )
    return evaluate(new_core, new_deleted) - evaluate(old_core, old_deleted)


def transform_axis(values: np.ndarray, axis: int) -> None:
    moved = np.moveaxis(values, axis, 0)
    for trailing in np.ndindex(moved.shape[1:]):
        work = [int(moved[(position,) + trailing]) for position in range(WIDTH)]
        for order in range(WIDTH):
            moved[(order,) + trailing] = work[0]
            for position in range(WIDTH - order - 1):
                work[position] = work[position + 1] - work[position]


def regions() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []

    def add(label: str, shifts: tuple[int, int, int, int], axes: tuple[str, ...]) -> None:
        rows.append({"label": label, "shifts": shifts, "axes": axes})

    # tail>=6
    add(
        "tail>=6, short>=6, difference>=0",
        (NEAR_SHIFT, 6, 6, 0),
        COORDINATES,
    )
    for short in range(SMALL_CUTOFF):
        difference_shift = SMALL_CUTOFF - short
        add(
            f"tail>=6, short={short}, difference>={difference_shift}",
            (NEAR_SHIFT, 6, short, difference_shift),
            ("near", "tail", "difference"),
        )
        for difference in range(difference_shift):
            add(
                f"tail>=6, short={short}, difference={difference}",
                (NEAR_SHIFT, 6, short, difference),
                ("near", "tail"),
            )

    # fixed tail 0..5
    for tail in range(SMALL_CUTOFF):
        add(
            f"tail={tail}, short>=6, difference>=0",
            (NEAR_SHIFT, tail, 6, 0),
            ("near", "short", "difference"),
        )
        for short in range(SMALL_CUTOFF):
            difference_shift = SMALL_CUTOFF - short
            add(
                f"tail={tail}, short={short}, difference>={difference_shift}",
                (NEAR_SHIFT, tail, short, difference_shift),
                ("near", "difference"),
            )
            for difference in range(difference_shift):
                add(
                    f"tail={tail}, short={short}, difference={difference}",
                    (NEAR_SHIFT, tail, short, difference),
                    ("near",),
                )

    assert len(rows) == 196
    by_dimension = {
        dimension: sum(len(row["axes"]) == dimension for row in rows)
        for dimension in (1, 2, 3, 4)
    }
    assert by_dimension == {1: 126, 2: 57, 3: 12, 4: 1}
    assert sum(WIDTH ** len(row["axes"]) for row in rows) == 812592
    return rows


def certify_region(extension: str, region: dict[str, object]) -> dict[str, object]:
    axes = tuple(region["axes"])
    shifts = tuple(region["shifts"])
    shape = (WIDTH,) * len(axes)
    values = np.empty(shape, dtype=object)
    minimum_sampled = None
    for index in itertools.product(range(WIDTH), repeat=len(axes)):
        parameters = list(shifts)
        for coordinate, offset in zip(axes, index):
            parameters[COORDINATES.index(coordinate)] += offset
        value = increment(extension, *parameters)
        values[index] = value
        minimum_sampled = value if minimum_sampled is None else min(minimum_sampled, value)
    for axis in range(len(axes)):
        transform_axis(values, axis)

    digest = hashlib.sha256()
    negative = zero = 0
    minimum_coefficient = None
    first_negative = None
    for index in np.ndindex(values.shape):
        value = int(values[index])
        digest.update(str(value).encode("ascii"))
        digest.update(b"\n")
        if value < 0:
            negative += 1
            if first_negative is None:
                first_negative = {
                    "newton_orders": list(index),
                    "coefficient": str(value),
                }
        elif value == 0:
            zero += 1
        minimum_coefficient = (
            value if minimum_coefficient is None else min(minimum_coefficient, value)
        )
    count = values.size
    return {
        **region,
        "dimension": len(axes),
        "coefficients": count,
        "negative": negative,
        "zero": zero,
        "positive": count - negative - zero,
        "origin": str(int(values[(0,) * len(axes)])),
        "minimum_sampled_increment": str(minimum_sampled),
        "minimum_coefficient": str(minimum_coefficient),
        "first_negative": first_negative,
        "ordered_coefficients_sha256": digest.hexdigest().upper(),
    }


def main() -> None:
    partition = regions()
    profiles = []
    for extension in EXTENSIONS:
        rows = []
        for index, region in enumerate(partition, start=1):
            row = certify_region(extension, region)
            rows.append(row)
            if index == 1 or index % 20 == 0 or index == len(partition):
                print(
                    "UNIFORM_TAIL_PROGRESS",
                    extension,
                    index,
                    "NEGATIVE_SO_FAR",
                    sum(item["negative"] for item in rows),
                    flush=True,
                )
        totals = {
            "regions": len(rows),
            "regions_by_dimension": {
                str(dimension): sum(row["dimension"] == dimension for row in rows)
                for dimension in (1, 2, 3, 4)
            },
            "coefficients": sum(row["coefficients"] for row in rows),
            "negative": sum(row["negative"] for row in rows),
            "zero": sum(row["zero"] for row in rows),
            "positive": sum(row["positive"] for row in rows),
            "minimum_sampled_increment": str(
                min(int(row["minimum_sampled_increment"]) for row in rows)
            ),
            "minimum_origin": str(min(int(row["origin"]) for row in rows)),
            "minimum_coefficient": str(
                min(int(row["minimum_coefficient"]) for row in rows)
            ),
        }
        profiles.append({"extension": extension, "totals": totals, "rows": rows})
        print("UNIFORM_TAIL_EXTENSION", extension, totals, flush=True)

    proving = all(
        profile["totals"]["negative"] == 0
        and int(profile["totals"]["minimum_sampled_increment"]) > 0
        and int(profile["totals"]["minimum_origin"]) > 0
        for profile in profiles
    )
    payload = {
        "schema": "rank8-delta3-e1-old-root-near19-uniform-tail-profile-agent-v1",
        "status": (
            "PASS_EXACT_UNIFORM_TAIL_PROFILE_NO_THEOREM_CLAIM"
            if proving
            else "EXACT_UNIFORM_TAIL_PROFILE_HAS_NEWTON_OBSTRUCTIONS"
        ),
        "scope": (
            "Delta3 old-root arm-extension increments on ordered e=1 subdivided "
            "claws for every near>=19 and all nonnegative tail,short,difference; "
            "all three extension orbits."
        ),
        "source_order_note": (
            "near>=19 makes n=near+tail+2*short+difference+4>=23 automatic"
        ),
        "path_transfer": "I(P_m;x)=I(P_(m-1);x)+x I(P_(m-2);x)",
        "stable_branch_reason": (
            "For path rank r, [x^r]I(P_m;x)=C(m-r+1,r).  An active path "
            "order m>=r-1 avoids negative upper arguments.  near>=19 is stable "
            "through rank eight; tail>=6 is stable through H7; an other-arm "
            "length >=7 is stable through core rank eight."
        ),
        "degree_bound_each_active_axis": DEGREE,
        "degree_bound_reason": (
            "Each c_r has coordinate degree at most r, H6/H7 at most 6/7, "
            "and the maximum rank-weighted monomial degree among the 26 exact "
            "Delta3 residual terms is 26."
        ),
        "partition": {
            "near": "near>=19 in every region",
            "tail": "tail>=6 or tail=0..5",
            "short_difference": (
                "short>=6,difference>=0; or short=s in 0..5 with "
                "difference>=6-s or difference=0..5-s"
            ),
            "disjoint_exhaustive": True,
            "regions_per_extension": 196,
            "regions_by_dimension": {"1": 126, "2": 57, "3": 12, "4": 1},
            "coefficients_per_extension": 812592,
        },
        "profiles": profiles,
        "warning": (
            "This exact routing profile makes no theorem claim and has not been "
            "replayed by the independent literal adjacency-list tree-DP audit."
        ),
        "dependency_sha256": {
            "verify_rank8_q8_terminal_reduction.py": sha256(
                HERE / "verify_rank8_q8_terminal_reduction.py"
            )
        },
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
