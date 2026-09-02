#!/usr/bin/env python3
"""Checkpointed ray-row adapter for path:inner_spine_internal."""

from __future__ import annotations

import functools
import itertools

import numpy as np

import run_rank8_cuda_unordered_halves_internal_rays_driver_agent as base_driver
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as center


Config = base_driver.Config
LEFT_STATES = 10_976
GAP_STATES = 8


@functools.lru_cache(maxsize=1)
def left_table():
    pendant_pairs = list(itertools.combinations_with_replacement(range(1, 8), 2))
    rows = np.asarray(
        [
            (center_leaf, inner_leaf, outer_link, low, high)
            for center_leaf in range(1, 8)
            for inner_leaf in range(1, 8)
            for outer_link in range(1, 9)
            for low, high in pendant_pairs
        ],
        dtype=np.int32,
    )
    assert rows.shape == (LEFT_STATES, 5)
    sums = rows.sum(axis=1, dtype=np.int32)
    masks = np.zeros(LEFT_STATES, dtype=np.uint16)
    for local_index, long_value in enumerate((7, 7, 8, 7, 7)):
        masks |= (
            (rows[:, local_index] == long_value).astype(np.uint16)
            << np.uint16(local_index + 2)
        )
    return rows, sums, masks


def decode(start: int, stop: int):
    patterns = np.arange(start, stop, dtype=np.int64)
    split_states = GAP_STATES * GAP_STATES
    pairs = patterns // split_states
    split = patterns % split_states
    left = pairs // center.HALVES
    right = pairs % center.HALVES
    center_gap = (split // GAP_STATES).astype(np.int32)
    inner_gap = (split % GAP_STATES).astype(np.int32)
    assert np.all(left >= 0) and np.all(left < LEFT_STATES)
    assert np.all(right >= 0) and np.all(right < center.HALVES)
    return left.astype(np.int32), right.astype(np.int32), center_gap, inner_gap


def make_rows(config: Config, start, stop, halves, half_sums, half_masks, first_long):
    assert config.near_states == config.tail_states == GAP_STATES
    assert config.near_long_value == config.tail_long_value == 7
    left_rows, left_sums, left_masks = left_table()
    left, right, center_gap, inner_gap = decode(start, stop)
    masks = (
        left_masks[left]
        | (half_masks[right] << np.uint16(7))
        | ((center_gap == 7).astype(np.uint16) << np.uint16(0))
        | ((inner_gap == 7).astype(np.uint16) << np.uint16(1))
    )
    selector = masks != 0
    orders = (
        3
        + left_sums[left]
        + half_sums[right]
        + center_gap
        + inner_gap
    )
    all_short = int(np.count_nonzero(~selector))
    finite = int(np.count_nonzero((~selector) & (orders >= 28)))
    order27 = int(np.count_nonzero((~selector) & (orders == 27)))
    rows = np.empty((int(np.count_nonzero(selector)), 12), dtype=np.int32)
    rows[:, 0] = center_gap[selector]
    rows[:, 1] = inner_gap[selector]
    rows[:, 2:7] = left_rows[left[selector]]
    rows[:, 7:12] = halves[right[selector]]
    ray_masks = masks[selector]
    varying = first_long[ray_masks].astype(np.int32)
    shifts = np.maximum(
        0, 28 - (3 + rows.sum(axis=1, dtype=np.int32))
    ).astype(np.int32)
    return rows, varying, shifts, all_short, finite, order27


def run(config: Config, evaluate_kernel, max_batches: int | None = None):
    original_make_rows = base_driver.make_rows
    original_file = base_driver.__file__
    try:
        base_driver.make_rows = make_rows
        base_driver.__file__ = __file__
        return base_driver.run(config, evaluate_kernel, max_batches)
    finally:
        base_driver.make_rows = original_make_rows
        base_driver.__file__ = original_file
