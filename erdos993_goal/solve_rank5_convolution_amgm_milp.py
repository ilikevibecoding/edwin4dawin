#!/usr/bin/env python3
"""Solve a discrete exact AM-GM resource allocation by MILP."""

from __future__ import annotations

import argparse
import math

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import coo_matrix, vstack

from explore_rank5_convolution_amgm_pairs import (
    monomial_text,
    quotient_slice,
)


def ceil_div(numerator: int, denominator: int) -> int:
    return (numerator + denominator - 1) // denominator


def tradeoff_options(
    needed: int,
    left_capacity: int,
    right_capacity: int,
    grid_size: int,
) -> list[tuple[int, int]]:
    minimum_left = ceil_div(
        needed * needed, 4 * right_capacity
    )
    maximum_left = left_capacity
    if minimum_left > maximum_left:
        return []
    candidates = {minimum_left, maximum_left}
    if minimum_left > 0 and maximum_left > minimum_left:
        logs = np.linspace(
            math.log(minimum_left),
            math.log(maximum_left),
            grid_size,
        )
        candidates.update(int(round(math.exp(value))) for value in logs)
    for numerator in range(1, 20):
        candidates.add(left_capacity * numerator // 20)
    options = set()
    for left_use in candidates:
        if not 1 <= left_use <= left_capacity:
            continue
        right_use = ceil_div(
            needed * needed, 4 * left_use
        )
        if right_use <= right_capacity:
            options.add((left_use, right_use))
    return sorted(options)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--a-power", type=int, default=0)
    parser.add_argument("--scale", type=int, default=1_000_000)
    parser.add_argument("--grid-size", type=int, default=45)
    parser.add_argument("--chunks", type=int, default=1)
    parser.add_argument("--time-limit", type=float, default=180.0)
    args = parser.parse_args()
    variables, coefficients = quotient_slice(args.a_power)
    capacities = {
        monomial: args.scale * coefficient
        for monomial, coefficient in coefficients.items()
        if coefficient > 0
    }
    base_negatives = sorted(
        (
            args.scale * -coefficient,
            monomial,
        )
        for monomial, coefficient in coefficients.items()
        if coefficient < 0
    )
    negatives = []
    for needed, middle in base_negatives:
        quotient, remainder = divmod(needed, args.chunks)
        negatives.extend(
            (quotient + (1 if index < remainder else 0), middle)
            for index in range(args.chunks)
        )
    options = []
    group_options: list[list[int]] = []
    used_sources = set()
    for group_index, (needed, middle) in enumerate(negatives):
        indices = []
        for left, left_capacity in capacities.items():
            right = tuple(
                2 * middle_index - left_index
                for middle_index, left_index in zip(middle, left)
            )
            if left > right or right not in capacities:
                continue
            for left_use, right_use in tradeoff_options(
                needed,
                left_capacity,
                capacities[right],
                args.grid_size,
            ):
                index = len(options)
                options.append(
                    (
                        group_index,
                        needed,
                        middle,
                        left,
                        right,
                        left_use,
                        right_use,
                    )
                )
                indices.append(index)
                used_sources.add(left)
                used_sources.add(right)
        if not indices:
            raise AssertionError(
                f"no options for {needed} "
                f"{monomial_text(variables, middle)}"
            )
        group_options.append(indices)

    sources = sorted(used_sources)
    source_index = {
        monomial: index for index, monomial in enumerate(sources)
    }
    row_indices = []
    column_indices = []
    data = []
    for column, option in enumerate(options):
        left, right, left_use, right_use = (
            option[3],
            option[4],
            option[5],
            option[6],
        )
        row_indices.extend(
            (source_index[left], source_index[right])
        )
        column_indices.extend((column, column))
        data.extend((left_use, right_use))
    resource_matrix = coo_matrix(
        (data, (row_indices, column_indices)),
        shape=(len(sources), len(options)),
        dtype=float,
    ).tocsr()

    group_rows = []
    group_columns = []
    group_data = []
    for group_index, indices in enumerate(group_options):
        for column in indices:
            group_rows.append(group_index)
            group_columns.append(column)
            group_data.append(1.0)
    group_matrix = coo_matrix(
        (group_data, (group_rows, group_columns)),
        shape=(len(negatives), len(options)),
    ).tocsr()
    matrix = vstack((group_matrix, resource_matrix), format="csr")
    lower = np.concatenate(
        (
            np.ones(len(negatives)),
            np.full(len(sources), -np.inf),
        )
    )
    upper = np.concatenate(
        (
            np.ones(len(negatives)),
            np.asarray(
                [capacities[source] for source in sources],
                dtype=float,
            ),
        )
    )
    objective = np.asarray(
        [
            option[5] / capacities[option[3]]
            + option[6] / capacities[option[4]]
            for option in options
        ],
        dtype=float,
    )
    print(
        f"groups={len(negatives)} sources={len(sources)} "
        f"options={len(options)}",
        flush=True,
    )
    result = milp(
        c=objective,
        integrality=np.ones(len(options)),
        bounds=Bounds(
            np.zeros(len(options)), np.ones(len(options))
        ),
        constraints=LinearConstraint(matrix, lower, upper),
        options={"time_limit": args.time_limit},
    )
    print(
        f"success={result.success} status={result.status} "
        f"message={result.message} objective={result.fun}",
        flush=True,
    )
    if result.x is None:
        return 1
    chosen_indices = [
        index for index, value in enumerate(result.x) if value > 0.5
    ]
    assert len(chosen_indices) == len(negatives)
    usage = {source: 0 for source in sources}
    for index in chosen_indices:
        (
            _,
            needed,
            middle,
            left,
            right,
            left_use,
            right_use,
        ) = options[index]
        assert 4 * left_use * right_use >= needed * needed
        usage[left] += left_use
        usage[right] += right_use
        print(
            f"({needed}, {middle}, {left_use}, {left}, "
            f"{right_use}, {right}),"
        )
    for source, used in usage.items():
        assert used <= capacities[source]
    print(
        f"PASS max_resource_fraction="
        f"{max(usage[source] / capacities[source] for source in sources)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
