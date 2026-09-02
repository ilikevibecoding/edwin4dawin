#!/usr/bin/env python3
"""Checkpointed ray-row adapter for path:outer_pendant_internal."""

from __future__ import annotations

import functools
import itertools

import numpy as np

import run_rank8_cuda_unordered_halves_internal_rays_driver_agent as base_driver
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as center


Config = base_driver.Config
LOCAL_STATES = 21_952
NEAR_STATES = 8
TAIL_STATES = 7


@functools.lru_cache(maxsize=1)
def local_table():
    rows = np.asarray(
        [
            (center_leaf, inner_link, inner_leaf, outer_link, outer_leaf)
            for center_leaf in range(1, 8)
            for inner_link in range(1, 9)
            for inner_leaf in range(1, 8)
            for outer_link in range(1, 9)
            for outer_leaf in range(1, 8)
        ],
        dtype=np.int32,
    )
    assert rows.shape == (LOCAL_STATES, 5)
    sums = rows.sum(axis=1, dtype=np.int32)
    masks = np.zeros(LOCAL_STATES, dtype=np.uint16)
    for index, long_value in enumerate((7, 8, 7, 8, 7)):
        masks |= (
            (rows[:, index] == long_value).astype(np.uint16)
            << np.uint16(index)
        )
    return rows, sums, masks


def decode(start: int, stop: int):
    patterns = np.arange(start, stop, dtype=np.int64)
    split_states = NEAR_STATES * TAIL_STATES
    pairs = patterns // split_states
    split = patterns % split_states
    local = pairs // center.HALVES
    opposite = pairs % center.HALVES
    near = (split // TAIL_STATES).astype(np.int32)
    tail = (split % TAIL_STATES + 1).astype(np.int32)
    assert np.all(local >= 0) and np.all(local < LOCAL_STATES)
    assert np.all(opposite >= 0) and np.all(opposite < center.HALVES)
    return local.astype(np.int32), opposite.astype(np.int32), near, tail


def make_rows(config: Config, start, stop, halves, half_sums, half_masks, first_long):
    assert config.near_states == NEAR_STATES
    assert config.tail_states == TAIL_STATES
    assert config.near_long_value == config.tail_long_value == 7
    local_rows, local_sums, local_masks = local_table()
    local, opposite, near, tail = decode(start, stop)
    masks = (
        local_masks[local]
        | (half_masks[opposite] << np.uint16(5))
        | ((near == 7).astype(np.uint16) << np.uint16(10))
        | ((tail == 7).astype(np.uint16) << np.uint16(11))
    )
    selector = masks != 0
    orders = 2 + local_sums[local] + half_sums[opposite] + near + tail
    all_short = int(np.count_nonzero(~selector))
    finite = int(np.count_nonzero((~selector) & (orders >= 28)))
    order27 = int(np.count_nonzero((~selector) & (orders == 27)))
    rows = np.empty((int(np.count_nonzero(selector)), 12), dtype=np.int32)
    rows[:, :5] = local_rows[local[selector]]
    rows[:, 5:10] = halves[opposite[selector]]
    rows[:, 10] = near[selector]
    rows[:, 11] = tail[selector]
    ray_masks = masks[selector]
    varying = first_long[ray_masks].astype(np.int32)
    shifts = np.maximum(
        0, 28 - (2 + rows.sum(axis=1, dtype=np.int32))
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
