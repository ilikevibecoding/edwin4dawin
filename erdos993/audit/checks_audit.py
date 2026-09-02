"""Unimodality / log-concavity / L / WR / ISO / TAIL -- audit implementation.

Written directly from the definitions (``p`` is a coefficient list with
``p[k]`` = number of independent ``k``-sets, ``alpha = len(p) - 1``)::

    L(alpha)  = ceil((2 alpha - 1) / 3)
    WR_r      : p[r-1] <= r * p[r]                                 1 <= r <= L - 1
    ISO_r     : r p[r]^2 + p[r-1]^2 - (r+1) p[r-1] p[r+1] >= 0     1 <= r <= min(L-1, alpha-1)
    TAIL      : p[r] >= p[r+1]                                     L <= r <= alpha - 1
    unimodal  : p is non-decreasing up to some index and non-increasing after it
    log-concave: p[k]^2 >= p[k-1] p[k+1]                           1 <= k <= alpha - 1

All arithmetic is exact (ints and ``fractions.Fraction``).  This module
imports nothing from ``erdos993lib``.
"""

from __future__ import annotations

from fractions import Fraction
from math import ceil
from typing import Dict, List, Optional, Sequence


def alpha(p: Sequence[int]) -> int:
    """Independence number = degree of the polynomial."""
    if not p:
        raise ValueError("empty coefficient list")
    if p[-1] == 0:
        raise ValueError("trailing zero coefficient: not a normalised polynomial")
    return len(p) - 1


def tail_cutoff(a: int) -> int:
    """``L(a) = ceil((2a - 1) / 3)``, evaluated exactly with a Fraction (0 for a = 0)."""
    if a < 0:
        raise ValueError("alpha must be >= 0")
    return ceil(Fraction(2 * a - 1, 3))


def wr_range(a: int) -> range:
    """Indices ``1 <= r <= L - 1`` on which WR is required."""
    return range(1, tail_cutoff(a))


def iso_range(a: int) -> range:
    """Indices ``1 <= r <= min(L - 1, a - 1)`` on which ISO is required."""
    return range(1, min(tail_cutoff(a) - 1, a - 1) + 1)


def tail_range(a: int) -> range:
    """Indices ``L <= r <= a - 1`` on which the tail descent is required."""
    return range(tail_cutoff(a), a)


# --------------------------------------------------------------------------- #
# shape properties
# --------------------------------------------------------------------------- #
def modes(p: Sequence[int]) -> List[int]:
    m = max(p)
    return [k for k, c in enumerate(p) if c == m]


def is_unimodal(p: Sequence[int]) -> bool:
    """Non-decreasing up to the first maximum, non-increasing afterwards.

    If ``p`` is unimodal with mode set ``[m1, m2]`` it is non-decreasing on
    ``[0, m1]`` and non-increasing on ``[m1, alpha]``; the converse is the
    definition, so testing at the first maximum is exact.
    """
    m = p.index(max(p))
    for k in range(m):
        if p[k] > p[k + 1]:
            return False
    for k in range(m, len(p) - 1):
        if p[k] < p[k + 1]:
            return False
    return True


def log_concavity_failures(p: Sequence[int]) -> List[int]:
    return [k for k in range(1, len(p) - 1) if p[k] ** 2 < p[k - 1] * p[k + 1]]


def is_log_concave(p: Sequence[int]) -> bool:
    return not log_concavity_failures(p)


# --------------------------------------------------------------------------- #
# WR / ISO / TAIL
# --------------------------------------------------------------------------- #
def wr_holds(p: Sequence[int], r: int) -> bool:
    return p[r - 1] <= r * p[r]


def wr_ratio(p: Sequence[int], r: int) -> Fraction:
    """``p[r-1] / (r p[r])``; WR_r holds iff this is <= 1."""
    return Fraction(p[r - 1], r * p[r])


def iso_quantity(p: Sequence[int], r: int) -> int:
    """``Q_r = r p[r]^2 + p[r-1]^2 - (r+1) p[r-1] p[r+1]``."""
    return r * p[r] ** 2 + p[r - 1] ** 2 - (r + 1) * p[r - 1] * p[r + 1]


def iso_holds(p: Sequence[int], r: int) -> bool:
    return iso_quantity(p, r) >= 0


def iso_margin(p: Sequence[int], r: int) -> Fraction:
    """Dimensionless ``Q_r / (p[r-1] p[r])``."""
    return Fraction(iso_quantity(p, r), p[r - 1] * p[r])


def wr_failures(p: Sequence[int]) -> List[int]:
    return [r for r in wr_range(alpha(p)) if not wr_holds(p, r)]


def iso_failures(p: Sequence[int]) -> List[int]:
    return [r for r in iso_range(alpha(p)) if not iso_holds(p, r)]


def iso_failures_all_indices(p: Sequence[int]) -> List[int]:
    """ISO at every index ``1 <= r <= alpha - 1`` (informative, not a hypothesis)."""
    return [r for r in range(1, alpha(p)) if not iso_holds(p, r)]


def tail_failures(p: Sequence[int]) -> List[int]:
    return [r for r in tail_range(alpha(p)) if p[r] < p[r + 1]]


def hypotheses_hold(p: Sequence[int]) -> bool:
    return not wr_failures(p) and not iso_failures(p) and not tail_failures(p)


def min_iso_margin(p: Sequence[int]) -> Optional[Fraction]:
    a = alpha(p)
    values = [iso_margin(p, r) for r in iso_range(a)]
    return min(values) if values else None


def analyze(p: Sequence[int]) -> Dict[str, object]:
    """Exact verdicts with the same keys as ``erdos993lib.checks.analyze``.

    Fractions are rendered as strings (``"num/den"``) like the library does.
    """
    a = alpha(p)
    L = tail_cutoff(a)
    lc_fail = log_concavity_failures(p)
    wr_fail = wr_failures(p)
    iso_fail = iso_failures(p)
    tail_fail = tail_failures(p)
    margins = [(iso_margin(p, r), r) for r in iso_range(a)]
    best: Optional[Fraction] = None
    best_r: Optional[int] = None
    for m, r in margins:
        if best is None or m < best:
            best, best_r = m, r
    ratios = [wr_ratio(p, r) for r in wr_range(a)]
    worst_ratio = max(ratios) if ratios else None
    descent_iso_fail = [r for r in iso_range(a) if p[r] <= p[r - 1] and not iso_holds(p, r)]
    holds = not wr_fail and not iso_fail and not tail_fail
    unimodal = is_unimodal(p)
    if holds and not unimodal:
        raise AssertionError("reduction lemma violated (bug): %r" % (list(p),))
    return {
        "alpha": a,
        "L": L,
        "unimodal": unimodal,
        "log_concave": not lc_fail,
        "lc_failures": lc_fail,
        "modes": modes(p),
        "wr_failures_prefix": wr_fail,
        "iso_failures_prefix": iso_fail,
        "iso_failures_all_indices": iso_failures_all_indices(p),
        "descent_conditional_iso_failures_prefix": descent_iso_fail,
        "tail_failures": tail_fail,
        "min_iso_margin_prefix": str(best) if best is not None else None,
        "argmin_iso_margin_prefix": best_r,
        "max_wr_ratio_prefix": str(worst_ratio) if worst_ratio is not None else None,
        "wr_iso_tail_hypotheses_hold": holds,
    }
