#!/usr/bin/env python3
"""Ordered-half adapter for the checkpointed twelve-coordinate finite driver."""

from __future__ import annotations

import numpy as np

import run_rank8_cuda_ordered_halves_internal_rays_driver_agent as ray_driver
import run_rank8_cuda_unordered_halves_internal_finite_driver_agent as base_driver


def make_rows(config, start, stop, halves, half_sums, half_masks):
    left, right, near, tail = ray_driver.decode(
        start, stop, config.near_states, config.tail_states
    )
    masks = (
        half_masks[left]
        | (half_masks[right] << np.uint16(5))
        | ((near == config.near_long_value).astype(np.uint16) << np.uint16(10))
        | ((tail == config.tail_long_value).astype(np.uint16) << np.uint16(11))
    )
    orders = 2 + half_sums[left] + half_sums[right] + near + tail
    all_short_selector = masks == 0
    finite_selector = all_short_selector & (orders >= 28)
    order27 = int(np.count_nonzero(all_short_selector & (orders == 27)))
    selected_left = left[finite_selector]
    selected_right = right[finite_selector]
    rows = np.empty((len(selected_left), 12), dtype=np.int32)
    rows[:, :5] = halves[selected_left]
    rows[:, 5:10] = halves[selected_right]
    rows[:, 10] = near[finite_selector]
    rows[:, 11] = tail[finite_selector]
    return rows, int(np.count_nonzero(all_short_selector)), order27


def run(config, evaluate_finite_kernel, max_batches: int | None = None):
    """Delegate checkpoint mechanics while pinning this adapter as the driver."""
    original_make_rows = base_driver.make_rows
    original_file = base_driver.__file__
    try:
        base_driver.make_rows = make_rows
        base_driver.__file__ = __file__
        return base_driver.run(config, evaluate_finite_kernel, max_batches)
    finally:
        base_driver.make_rows = original_make_rows
        base_driver.__file__ = original_file
