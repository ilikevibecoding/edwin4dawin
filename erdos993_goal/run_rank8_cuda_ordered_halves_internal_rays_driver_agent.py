#!/usr/bin/env python3
"""Ordered-half adapter for the checkpointed twelve-coordinate CUDA ray driver."""

from __future__ import annotations

import numpy as np

import run_rank8_cuda_unordered_halves_internal_rays_driver_agent as base_driver
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as center


Config = base_driver.Config


def decode(start: int, stop: int, near_states: int, tail_states: int):
    patterns = np.arange(start, stop, dtype=np.int64)
    split_states = near_states * tail_states
    ordered_pairs = patterns // split_states
    split = patterns % split_states
    left = ordered_pairs // center.HALVES
    right = ordered_pairs % center.HALVES
    near = (split // tail_states).astype(np.int32)
    tail = (split % tail_states + 1).astype(np.int32)
    assert np.all(left >= 0) and np.all(left < center.HALVES)
    assert np.all(right >= 0) and np.all(right < center.HALVES)
    return left.astype(np.int32), right.astype(np.int32), near, tail


def make_rows(config: Config, start, stop, halves, half_sums, half_masks, first_long):
    left, right, near, tail = decode(
        start, stop, config.near_states, config.tail_states
    )
    masks = (
        half_masks[left]
        | (half_masks[right] << np.uint16(5))
        | ((near == config.near_long_value).astype(np.uint16) << np.uint16(10))
        | ((tail == config.tail_long_value).astype(np.uint16) << np.uint16(11))
    )
    selector = masks != 0
    orders = 2 + half_sums[left] + half_sums[right] + near + tail
    all_short = int(np.count_nonzero(~selector))
    finite = int(np.count_nonzero((~selector) & (orders >= 28)))
    order27 = int(np.count_nonzero((~selector) & (orders == 27)))
    selected_left = left[selector]
    selected_right = right[selector]
    rows = np.empty((len(selected_left), 12), dtype=np.int32)
    rows[:, :5] = halves[selected_left]
    rows[:, 5:10] = halves[selected_right]
    rows[:, 10] = near[selector]
    rows[:, 11] = tail[selector]
    ray_masks = masks[selector]
    varying = first_long[ray_masks].astype(np.int32)
    shifts = np.maximum(
        0, 28 - (2 + rows.sum(axis=1, dtype=np.int32))
    ).astype(np.int32)
    return rows, varying, shifts, all_short, finite, order27


def run(config: Config, evaluate_kernel, max_batches: int | None = None):
    """Delegate checkpoint mechanics while pinning this adapter as the driver."""
    original_make_rows = base_driver.make_rows
    original_file = base_driver.__file__
    try:
        base_driver.make_rows = make_rows
        base_driver.__file__ = __file__
        return base_driver.run(config, evaluate_kernel, max_batches)
    finally:
        base_driver.make_rows = original_make_rows
        base_driver.__file__ = original_file
