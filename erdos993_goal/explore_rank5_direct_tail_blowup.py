#!/usr/bin/env python3
"""Resolve the S=1, Z=0 corner of a direct isolate tensor."""

from __future__ import annotations

import argparse
import pickle
from pathlib import Path

import numpy as np
import sympy as sp

from explore_rank4_three_halves_grouped import (
    split_bernstein_midpoint,
)
from explore_rank5_direct_array_cache import (
    bernstein_to_power_axis,
    first_negative_with_index,
    power_to_bernstein_axis,
)


def factor_last_two(power):
    locations = np.argwhere(
        np.vectorize(lambda value: value != 0)(power)
    )
    assert locations.size
    first = int(locations[:, -2].min())
    second = int(locations[:, -1].min())
    return power[..., first:, second:], (first, second)


def tail_corner_blowups(coefficients, z_axis, s_axis):
    # The supplied tail uses a local coordinate t increasing toward
    # S=1.  Reverse it so R=1-t and the problematic endpoint is R=0.
    reflected = np.flip(coefficients, axis=s_axis)
    power = bernstein_to_power_axis(reflected, z_axis)
    power = bernstein_to_power_axis(power, s_axis)
    moved = np.moveaxis(power, (z_axis, s_axis), (-2, -1))
    z_degree = moved.shape[-2] - 1
    r_degree = moved.shape[-1] - 1
    prefix_shape = moved.shape[:-2]

    # R <= Z: R=Z U.  Indices become (Z exponent j+i, U exponent i).
    r_le_z = np.empty(
        prefix_shape + (z_degree + r_degree + 1, r_degree + 1),
        dtype=object,
    )
    r_le_z.fill(sp.S.Zero)
    for j in range(z_degree + 1):
        for i in range(r_degree + 1):
            r_le_z[..., j + i, i] += moved[..., j, i]
    r_le_z, factor_one = factor_last_two(r_le_z)
    r_le_z = power_to_bernstein_axis(r_le_z, r_le_z.ndim - 2)
    r_le_z = power_to_bernstein_axis(r_le_z, r_le_z.ndim - 1)
    r_le_z = np.moveaxis(
        r_le_z, (-2, -1), (z_axis, s_axis)
    )

    # Z <= R: Z=R U.  Indices become (U exponent j, R exponent i+j).
    z_le_r = np.empty(
        prefix_shape + (z_degree + 1, r_degree + z_degree + 1),
        dtype=object,
    )
    z_le_r.fill(sp.S.Zero)
    for j in range(z_degree + 1):
        for i in range(r_degree + 1):
            z_le_r[..., j, i + j] += moved[..., j, i]
    z_le_r, factor_two = factor_last_two(z_le_r)
    z_le_r = power_to_bernstein_axis(z_le_r, z_le_r.ndim - 2)
    z_le_r = power_to_bernstein_axis(z_le_r, z_le_r.ndim - 1)
    z_le_r = np.moveaxis(
        z_le_r, (-2, -1), (z_axis, s_axis)
    )
    return (
        ("R_le_Z", r_le_z, factor_one),
        ("Z_le_R", z_le_r, factor_two),
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("cache", type=Path)
    args = parser.parse_args()
    with args.cache.open("rb") as stream:
        data = pickle.load(stream)
    coefficients = data["coefficients"]
    names = ("X", "T", "A", "W", "V", "Z", "S")
    s_axis = names.index("S")
    z_axis = names.index("Z")
    left, right = split_bernstein_midpoint(coefficients, s_axis)
    print(
        f"left_half_negative={first_negative_with_index(left)}",
        flush=True,
    )
    for label, patch, factor in tail_corner_blowups(
        right, z_axis, s_axis
    ):
        degrees = tuple(size - 1 for size in patch.shape)
        negative = first_negative_with_index(patch)
        print(
            f"{label}: degrees={degrees} factor_Z_R={factor} "
            f"negative={negative}",
            flush=True,
        )
        output = Path(
            f"{args.cache.stem}_{label}.pkl"
        )
        with output.open("wb") as stream:
            pickle.dump(
                {
                    "coefficients": patch,
                    "degrees": degrees,
                    "names": names,
                    "region": label,
                },
                stream,
                protocol=pickle.HIGHEST_PROTOCOL,
            )
        print(f"saved {output}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
