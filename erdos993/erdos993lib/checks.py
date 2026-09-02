"""Exact checks used by the WR + ISO + TAIL framework of the handoff.

Notation (``p`` is an independence polynomial, ``a = alpha`` its degree)::

    L(a)      = ceil((2a - 1) / 3)                       tail cutoff
    WR_r(p)   : p[r-1] <= r * p[r]                        1 <= r <= a
    ISO_r(p)  : Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0,   1 <= r <= a-1
    TAIL(p)   : p[r] >= p[r+1] for all r >= L(a)

TAIL is the Levit-Mandrescu theorem (arXiv:math/0406623, Cor. 2.7/2.8): it is
proved for bipartite graphs -- hence for every forest -- and for
Koenig-Egervary / quasi-regularizable graphs; it is NOT true for arbitrary
graphs with the same threshold (the paper gives counterexamples), so nothing
here should be applied outside forests without re-checking that hypothesis.

Reduction lemma (verified symbolically in ``tests/test_lemma.py``): for r >= 1
with p_{r-1} > 0,

    WR_r and ISO_r and p_r <= p_{r-1}   ==>   p_{r+1} <= p_r,

because r p_r^2 - (r+1) p_r p_{r-1} + p_{r-1}^2 = (r p_r - p_{r-1})(p_r - p_{r-1}) <= 0
gives (r+1) p_{r-1} p_{r+1} <= r p_r^2 + p_{r-1}^2 <= (r+1) p_{r-1} p_r.

Consequently, if WR_r and ISO_r hold for 1 <= r <= L(a) - 1 and TAIL holds,
the sequence is unimodal (``analyze`` records every hypothesis separately).
"""

from __future__ import annotations

from fractions import Fraction
from typing import Dict, List, Optional, Sequence


def alpha(p: Sequence[int]) -> int:
    return len(p) - 1


def tail_cutoff(a: int) -> int:
    """L(a) = ceil((2a - 1) / 3) for a >= 1 (and 0 for a = 0)."""
    if a <= 0:
        return 0
    return -((-(2 * a - 1)) // 3)


def is_unimodal(p: Sequence[int]) -> bool:
    i = 0
    n = len(p)
    while i + 1 < n and p[i] <= p[i + 1]:
        i += 1
    while i + 1 < n and p[i] >= p[i + 1]:
        i += 1
    return i == n - 1


def is_log_concave(p: Sequence[int]) -> bool:
    return all(p[k] * p[k] >= p[k - 1] * p[k + 1] for k in range(1, len(p) - 1))


def log_concavity_failures(p: Sequence[int]) -> List[int]:
    return [k for k in range(1, len(p) - 1) if p[k] * p[k] < p[k - 1] * p[k + 1]]


def iso_value(p: Sequence[int], r: int) -> int:
    """Q_r(p) = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} (needs 1 <= r <= alpha-1)."""
    return r * p[r] * p[r] + p[r - 1] * p[r - 1] - (r + 1) * p[r - 1] * p[r + 1]


def iso_margin(p: Sequence[int], r: int) -> Fraction:
    """Dimensionless form Q_r / (p_{r-1} p_r) = r x + 1/x - (r+1) y."""
    return Fraction(iso_value(p, r), p[r - 1] * p[r])


def wr_slack(p: Sequence[int], r: int) -> int:
    """r p_r - p_{r-1} (needs 1 <= r <= alpha); WR_r holds iff this is >= 0."""
    return r * p[r] - p[r - 1]


def modes(p: Sequence[int]) -> List[int]:
    m = max(p)
    return [i for i, v in enumerate(p) if v == m]


def analyze(p: Sequence[int]) -> Dict[str, object]:
    """Exact report of every hypothesis and conclusion of the WR+ISO+TAIL route.

    All numbers are exact (ints / Fractions rendered as strings in JSON).
    """
    a = alpha(p)
    L = tail_cutoff(a)
    prefix = range(1, min(L, a))  # 1 <= r <= L-1 and r <= a-1 (ISO needs p_{r+1})
    wr_fail = [r for r in range(1, min(L, a + 1)) if wr_slack(p, r) < 0]
    iso_fail = [r for r in prefix if iso_value(p, r) < 0]
    iso_fail_all = [r for r in range(1, a) if iso_value(p, r) < 0]
    desc_iso_fail = [r for r in prefix if p[r] <= p[r - 1] and iso_value(p, r) < 0]
    tail_fail = [r for r in range(L, a) if p[r] < p[r + 1]]
    min_margin: Optional[Fraction] = None
    argmin: Optional[int] = None
    for r in prefix:
        m = iso_margin(p, r)
        if min_margin is None or m < min_margin:
            min_margin, argmin = m, r
    min_wr_ratio: Optional[Fraction] = None  # max of p_{r-1}/(r p_r) over prefix; WR iff <= 1
    for r in range(1, min(L, a + 1)):
        q = Fraction(p[r - 1], r * p[r])
        if min_wr_ratio is None or q > min_wr_ratio:
            min_wr_ratio = q
    unimodal = is_unimodal(p)
    hypotheses_hold = not wr_fail and not iso_fail and not tail_fail
    if hypotheses_hold and not unimodal:
        # The reduction lemma is a theorem; reaching here would mean a bug.
        raise AssertionError("WR+ISO+TAIL hold but sequence is not unimodal: %r" % (list(p),))
    return {
        "alpha": a,
        "L": L,
        "unimodal": unimodal,
        "log_concave": not log_concavity_failures(p),
        "lc_failures": log_concavity_failures(p),
        "modes": modes(p),
        "wr_failures_prefix": wr_fail,
        "iso_failures_prefix": iso_fail,
        "iso_failures_all_indices": iso_fail_all,
        "descent_conditional_iso_failures_prefix": desc_iso_fail,
        "tail_failures": tail_fail,
        "min_iso_margin_prefix": str(min_margin) if min_margin is not None else None,
        "argmin_iso_margin_prefix": argmin,
        "max_wr_ratio_prefix": str(min_wr_ratio) if min_wr_ratio is not None else None,
        "wr_iso_tail_hypotheses_hold": hypotheses_hold,
    }
