"""Exhaustive scans of independence sequences over all trees of a given order.

:func:`scan_order` computes, for every tree of order ``n`` (up to isomorphism),
the independence polynomial and the checks of :mod:`erdos993.checks`, and
aggregates exact statistics together with explicit witnesses (parent arrays
and polynomials) for every extremal or failing case.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from fractions import Fraction
from typing import Iterator

from .checks import (
    FrameworkInconsistency,
    descent_propagation_check,
    is_unimodal,
    iso_values,
    log_concavity_breaks,
    tail_cutoff,
    tail_failures,
    unimodality_via_framework,
    wr_failures,
)
from .enumerate import ParentArray, iter_trees
from .indpoly import Poly, independence_polynomial_parent_array


@dataclass(frozen=True)
class Witness:
    """A tree (as a gentreeg parent array) with its independence sequence."""

    n: int
    r: int | None
    value: int | Fraction | None
    parents: ParentArray
    poly: Poly


@dataclass
class OrderStats:
    """Aggregated exact statistics for all trees of one order ``n``.

    ``*_pairs`` counters count ``(tree, r)`` pairs, ``*_trees`` counters count
    trees with at least one such ``r``.  ``L`` denotes ``L(alpha)`` of the
    tree's own independence number.
    """

    n: int
    trees: int = 0
    non_unimodal_trees: int = 0
    lc_break_pairs: int = 0
    lc_break_trees: int = 0
    wr_fail_cut_pairs: int = 0
    wr_fail_cut_trees: int = 0
    wr_fail_all_pairs: int = 0
    iso_fail_pairs: int = 0
    iso_fail_trees: int = 0
    iso_fail_cut_pairs: int = 0
    tail_fail_pairs: int = 0
    lemma_inconsistent_trees: int = 0
    framework_certified_trees: int = 0
    min_q: Witness | None = None
    min_q_cut: Witness | None = None
    min_q_r_ge2: Witness | None = None
    min_slack: Witness | None = None
    wr_fail_min_gap: int | None = None
    non_unimodal_witness: Witness | None = None
    lc_break_witness: Witness | None = None
    wr_fail_cut_witness: Witness | None = None
    iso_fail_witness: Witness | None = None
    tail_fail_witness: Witness | None = None
    min_q_r_histogram: dict[int, int] = field(default_factory=dict)

    @property
    def framework_gap_trees(self) -> int:
        """Trees the framework does not certify (WR or ISO failure below the cutoff)."""
        return self.trees - self.framework_certified_trees


def analyse_tree(n: int, parents: ParentArray, stats: OrderStats) -> None:
    """Update ``stats`` with the checks for one tree."""
    poly = independence_polynomial_parent_array(parents)
    alpha = len(poly) - 1
    cutoff = tail_cutoff(alpha)
    stats.trees += 1

    if not is_unimodal(poly):
        stats.non_unimodal_trees += 1
        if stats.non_unimodal_witness is None:
            stats.non_unimodal_witness = Witness(n, None, None, parents, poly)

    breaks = log_concavity_breaks(poly)
    if breaks:
        stats.lc_break_pairs += len(breaks)
        stats.lc_break_trees += 1
        if stats.lc_break_witness is None:
            stats.lc_break_witness = Witness(n, breaks[0], None, parents, poly)

    wr_bad = wr_failures(poly)
    stats.wr_fail_all_pairs += len(wr_bad)
    if wr_bad:
        gap = wr_bad[0] - cutoff
        if stats.wr_fail_min_gap is None or gap < stats.wr_fail_min_gap:
            stats.wr_fail_min_gap = gap
    wr_bad_cut = [r for r in wr_bad if r <= cutoff]
    if wr_bad_cut:
        stats.wr_fail_cut_pairs += len(wr_bad_cut)
        stats.wr_fail_cut_trees += 1
        if stats.wr_fail_cut_witness is None:
            stats.wr_fail_cut_witness = Witness(n, wr_bad_cut[0], None, parents, poly)

    q_values = iso_values(poly)
    iso_bad = [r for r, q in enumerate(q_values, start=1) if q < 0]
    if iso_bad:
        stats.iso_fail_pairs += len(iso_bad)
        stats.iso_fail_trees += 1
        stats.iso_fail_cut_pairs += sum(1 for r in iso_bad if r <= cutoff)
        if stats.iso_fail_witness is None:
            r = iso_bad[0]
            stats.iso_fail_witness = Witness(n, r, q_values[r - 1], parents, poly)

    for r, q in enumerate(q_values, start=1):
        if stats.min_q is None or q < stats.min_q.value:
            stats.min_q = Witness(n, r, q, parents, poly)
        if r <= cutoff and (stats.min_q_cut is None or q < stats.min_q_cut.value):
            stats.min_q_cut = Witness(n, r, q, parents, poly)
        if r >= 2 and (stats.min_q_r_ge2 is None or q < stats.min_q_r_ge2.value):
            stats.min_q_r_ge2 = Witness(n, r, q, parents, poly)
        slack = Fraction(q, poly[r - 1] * poly[r])
        if stats.min_slack is None or slack < stats.min_slack.value:
            stats.min_slack = Witness(n, r, slack, parents, poly)
    if q_values:
        r_min = min(range(1, alpha), key=lambda r: q_values[r - 1])
        stats.min_q_r_histogram[r_min] = stats.min_q_r_histogram.get(r_min, 0) + 1

    tail_bad = tail_failures(poly)
    if tail_bad:
        stats.tail_fail_pairs += len(tail_bad)
        if stats.tail_fail_witness is None:
            stats.tail_fail_witness = Witness(n, tail_bad[0], None, parents, poly)

    if not descent_propagation_check(poly).consistent:
        stats.lemma_inconsistent_trees += 1

    try:
        if unimodality_via_framework(poly).certified:
            stats.framework_certified_trees += 1
    except FrameworkInconsistency:
        stats.lemma_inconsistent_trees += 1


def scan_order(
    n: int, res: int | None = None, mod: int | None = None, backend: str = "auto"
) -> OrderStats:
    """Scan all trees of order ``n`` (or the ``res/mod`` slice of them)."""
    stats = OrderStats(n=n)
    for parents in iter_trees(n, res=res, mod=mod, backend=backend):
        analyse_tree(n, parents, stats)
    return stats


def scan_orders(
    max_n: int,
    min_n: int = 1,
    res: int | None = None,
    mod: int | None = None,
    backend: str = "auto",
) -> Iterator[OrderStats]:
    """Yield :class:`OrderStats` for ``n = min_n .. max_n``."""
    for n in range(min_n, max_n + 1):
        yield scan_order(n, res=res, mod=mod, backend=backend)
