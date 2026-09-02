#!/usr/bin/env python3
"""Ray-row adapter for the outer-spine layout shared with inner-spine."""

from __future__ import annotations

import run_rank8_cuda_path_inner_spine_internal_rays_driver_agent as implementation


Config = implementation.Config
LEFT_STATES = implementation.LEFT_STATES
GAP_STATES = implementation.GAP_STATES
left_table = implementation.left_table
decode = implementation.decode
make_rows = implementation.make_rows


def run(config: Config, evaluate_kernel, max_batches: int | None = None):
    original_file = implementation.__file__
    try:
        implementation.__file__ = __file__
        return implementation.run(config, evaluate_kernel, max_batches)
    finally:
        implementation.__file__ = original_file
