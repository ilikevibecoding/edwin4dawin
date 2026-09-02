#!/usr/bin/env python3
"""Outer-leaf table adapter for the asymmetric CUDA scan drivers."""

from __future__ import annotations

import numpy as np

import run_rank8_cuda_asymmetric_halves_finite_driver_agent as finite_driver
import run_rank8_cuda_asymmetric_halves_rays_driver_agent as ray_driver


LOCAL_HALVES = 25_088


def local_half_table():
    rows = []
    for other_pendant in range(1, 8):
        for root_link in range(1, 9):
            for middle_outer in range(1, 9):
                for middle_pendant in range(1, 8):
                    for center_middle in range(1, 9):
                        rows.append((
                            center_middle,
                            middle_pendant,
                            middle_outer,
                            root_link,
                            other_pendant,
                        ))
    table = np.asarray(rows, dtype=np.int32)
    assert table.shape == (LOCAL_HALVES, 5)
    masks = (
        (table[:, 0] == 8).astype(np.uint16)
        | ((table[:, 1] == 7).astype(np.uint16) << 1)
        | ((table[:, 2] == 8).astype(np.uint16) << 2)
        | ((table[:, 3] == 8).astype(np.uint16) << 3)
        | ((table[:, 4] == 7).astype(np.uint16) << 4)
    )
    return table, table.sum(axis=1, dtype=np.int32), masks


def configure_driver() -> None:
    ray_driver.LOCAL_HALVES = LOCAL_HALVES
    ray_driver.local_half_table = local_half_table


def run_rays(config, evaluate_kernel, max_batches=None):
    configure_driver()
    ray_driver.run(config, evaluate_kernel, max_batches)


def run_finite(config, evaluate_finite_kernel, max_batches=None):
    configure_driver()
    finite_driver.run(config, evaluate_finite_kernel, max_batches)


_LOCAL_TABLES = local_half_table()
_REMOTE_TABLES = ray_driver.center.half_table()


def make_ray_rows(config, start, stop, first_long):
    configure_driver()
    return ray_driver.make_rows(
        config,
        start,
        stop,
        *_LOCAL_TABLES,
        *_REMOTE_TABLES,
        first_long,
    )


def make_finite_rows(config, start, stop):
    configure_driver()
    return finite_driver.make_rows(
        config,
        start,
        stop,
        *_LOCAL_TABLES,
        *_REMOTE_TABLES,
    )
