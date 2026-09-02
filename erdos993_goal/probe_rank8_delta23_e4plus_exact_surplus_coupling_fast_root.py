#!/usr/bin/env python3
"""Cached-raw wrapper for the exact-surplus Delta2/Delta3 diagnostic.

The canonical source builders recompute the common rank-eight Newton table on
every call.  This wrapper computes that table once, injects it into both
builder modules, and then runs the unchanged scout logic.
"""

from __future__ import annotations

import probe_rank8_delta2_source_curvatures as delta2
import probe_rank8_delta3_source_curvatures as delta3
import probe_rank8_delta23_e4plus_exact_surplus_coupling_root as scout
from verify_rank8_q8_terminal_reduction import newton_coefficients, residual


RAW_RESIDUAL = residual()
RAW_COEFFICIENTS = newton_coefficients(RAW_RESIDUAL)


def cached_residual():
    return RAW_RESIDUAL


def cached_coefficients(_expression):
    return RAW_COEFFICIENTS


delta2.residual = cached_residual
delta2.newton_coefficients = cached_coefficients
delta3.residual = cached_residual
delta3.newton_coefficients = cached_coefficients
scout.build_delta2 = delta2.build
scout.build_delta3 = delta3.build


if __name__ == "__main__":
    scout.main()
