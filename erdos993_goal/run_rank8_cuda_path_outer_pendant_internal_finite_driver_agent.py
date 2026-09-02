#!/usr/bin/env python3
"""Checkpointed finite-row adapter for path:outer_pendant_internal."""

from __future__ import annotations

import numpy as np

import run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent as ray_driver
import run_rank8_cuda_unordered_halves_internal_finite_driver_agent as base_driver


def make_rows(config, start, stop, halves, half_sums, half_masks):
    assert config.near_states == ray_driver.NEAR_STATES
    assert config.tail_states == ray_driver.TAIL_STATES
    assert config.near_long_value == config.tail_long_value == 7
    local_rows, local_sums, local_masks = ray_driver.local_table()
    local, opposite, near, tail = ray_driver.decode(start, stop)
    masks = (
        local_masks[local]
        | (half_masks[opposite] << np.uint16(5))
        | ((near == 7).astype(np.uint16) << np.uint16(10))
        | ((tail == 7).astype(np.uint16) << np.uint16(11))
    )
    orders = 2 + local_sums[local] + half_sums[opposite] + near + tail
    all_short_selector = masks == 0
    finite_selector = all_short_selector & (orders >= 28)
    order27 = int(np.count_nonzero(all_short_selector & (orders == 27)))
    rows = np.empty((int(np.count_nonzero(finite_selector)), 12), dtype=np.int32)
    rows[:, :5] = local_rows[local[finite_selector]]
    rows[:, 5:10] = halves[opposite[finite_selector]]
    rows[:, 10] = near[finite_selector]
    rows[:, 11] = tail[finite_selector]
    return rows, int(np.count_nonzero(all_short_selector)), order27


def run(config, evaluate_finite_kernel, max_batches: int | None = None):
    original_make_rows = base_driver.make_rows
    original_file = base_driver.__file__
    try:
        base_driver.make_rows = make_rows
        base_driver.__file__ = __file__
        return base_driver.run(config, evaluate_finite_kernel, max_batches)
    finally:
        base_driver.make_rows = original_make_rows
        base_driver.__file__ = original_file
