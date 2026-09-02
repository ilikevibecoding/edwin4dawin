"""Exact-arithmetic toolkit for Erdős Problem #993 (unimodality of the
independence polynomial of every tree/forest).

Everything in this package works with Python integers and ``fractions``; no
floating point is used in any statement that is meant to be checkable.
"""

from .indpoly import (
    indpoly_forest,
    indpoly_parent_array,
    indpoly_bruteforce,
    poly_mul,
)
from .checks import (
    alpha,
    tail_cutoff,
    is_unimodal,
    is_log_concave,
    iso_value,
    wr_slack,
    analyze,
)

__all__ = [
    "indpoly_forest",
    "indpoly_parent_array",
    "indpoly_bruteforce",
    "poly_mul",
    "alpha",
    "tail_cutoff",
    "is_unimodal",
    "is_log_concave",
    "iso_value",
    "wr_slack",
    "analyze",
]
