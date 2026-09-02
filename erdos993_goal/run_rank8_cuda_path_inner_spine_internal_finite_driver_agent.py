#!/usr/bin/env python3
"""Checkpointed finite-row adapter for path:inner_spine_internal."""

from __future__ import annotations

import numpy as np

import run_rank8_cuda_path_inner_spine_internal_rays_driver_agent as ray_driver
import run_rank8_cuda_unordered_halves_internal_finite_driver_agent as base_driver


def make_rows(config, start, stop, halves, half_sums, half_masks):
    assert config.near_states == config.tail_states == ray_driver.GAP_STATES
    assert config.near_long_value == config.tail_long_value == 7
    left_rows, left_sums, left_masks = ray_driver.left_table()
    left, right, center_gap, inner_gap = ray_driver.decode(start, stop)
    masks = (
        left_masks[left]
        | (half_masks[right] << np.uint16(7))
        | ((center_gap == 7).astype(np.uint16) << np.uint16(0))
        | ((inner_gap == 7).astype(np.uint16) << np.uint16(1))
    )
    orders = (
        3
        + left_sums[left]
        + half_sums[right]
        + center_gap
        + inner_gap
    )
    all_short_selector = masks == 0
    finite_selector = all_short_selector & (orders >= 28)
    order27 = int(np.count_nonzero(all_short_selector & (orders == 27)))
    rows = np.empty((int(np.count_nonzero(finite_selector)), 12), dtype=np.int32)
    rows[:, 0] = center_gap[finite_selector]
    rows[:, 1] = inner_gap[finite_selector]
    rows[:, 2:7] = left_rows[left[finite_selector]]
    rows[:, 7:12] = halves[right[finite_selector]]
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
