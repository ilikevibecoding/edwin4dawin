"""Exact inequality checks on an independence-polynomial coefficient sequence.

Notation (all integers):  p = (p_0, ..., p_alpha), alpha = degree.

    L(alpha)   = ceil((2*alpha - 1) / 3)
    WR_r       : p_{r-1} <= r * p_r
    ISO_r      : Q_r = r*p_r^2 + p_{r-1}^2 - (r+1)*p_{r-1}*p_{r+1} >= 0
    NW_r       : r*p_r^2 >= (r+1)*p_{r-1}*p_{r+1}        (weakened Newton; NW_r => ISO_r)
    LC_r       : p_r^2 >= p_{r-1}*p_{r+1}                  (log-concavity)
    TAIL       : p_r >= p_{r+1} for all L <= r <= alpha-1

The descent lemma (verified symbolically in ``lemma_check.py``): if WR_r and ISO_r
hold and p_{r-1} >= p_r, then p_r >= p_{r+1}.  Together with TAIL this makes
unimodality follow from WR_r and ISO_r for the *prefix* 2 <= r <= L-1 only.
The prefix is therefore reported separately from the full range.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Sequence, Tuple


def L_cutoff(alpha: int) -> int:
    return -((-(2 * alpha - 1)) // 3)  # ceil((2 alpha - 1)/3)


def is_unimodal(p: Sequence[int]) -> bool:
    i = 0
    n = len(p)
    while i + 1 < n and p[i] <= p[i + 1]:
        i += 1
    while i + 1 < n and p[i] >= p[i + 1]:
        i += 1
    return i + 1 >= n


@dataclass
class SeqReport:
    alpha: int
    L: int
    unimodal: bool
    log_concave: bool
    iso_all: bool          # ISO_r for all 1 <= r <= alpha-1
    iso_prefix: bool       # ISO_r for all 2 <= r <= L-1
    nw_all: bool           # weakened Newton for all 1 <= r <= alpha-1
    wr_prefix_ok: bool     # WR_r for all 2 <= r <= L-1
    wr_max_R: int          # largest R with WR_r for all 1 <= r <= R
    tail_ok: bool
    # tightest ISO cell: (Q_r, (r+1) p_{r-1} p_{r+1}, r) with the minimal ratio
    iso_min: Optional[Tuple[int, int, int]] = None
    iso_prefix_min: Optional[Tuple[int, int, int]] = None
    iso_violations: List[int] = field(default_factory=list)


def analyze(p: Sequence[int]) -> SeqReport:
    alpha = len(p) - 1
    L = L_cutoff(alpha)
    # unimodality
    unimodal = is_unimodal(p)
    log_concave = True
    iso_all = True
    iso_prefix = True
    nw_all = True
    iso_min = None
    iso_prefix_min = None
    iso_violations: List[int] = []
    for r in range(1, alpha):
        a, b, c = p[r - 1], p[r], p[r + 1]
        if b * b < a * c:
            log_concave = False
        den = (r + 1) * a * c
        Q = r * b * b + a * a - den
        if r * b * b < den:
            nw_all = False
        if Q < 0:
            iso_all = False
            iso_violations.append(r)
            if 2 <= r <= L - 1:
                iso_prefix = False
        if den > 0:
            if iso_min is None or Q * iso_min[1] < iso_min[0] * den:
                iso_min = (Q, den, r)
            if 2 <= r <= L - 1:
                if iso_prefix_min is None or Q * iso_prefix_min[1] < iso_prefix_min[0] * den:
                    iso_prefix_min = (Q, den, r)
    # weak ratio
    wr_max_R = 0
    for r in range(1, alpha + 1):
        if p[r - 1] <= r * p[r]:
            wr_max_R = r
        else:
            break
    wr_prefix_ok = wr_max_R >= L - 1 or L - 1 < 2
    # tail
    tail_ok = all(p[r] >= p[r + 1] for r in range(max(L, 0), alpha))
    return SeqReport(
        alpha=alpha,
        L=L,
        unimodal=unimodal,
        log_concave=log_concave,
        iso_all=iso_all,
        iso_prefix=iso_prefix,
        nw_all=nw_all,
        wr_prefix_ok=wr_prefix_ok,
        wr_max_R=wr_max_R,
        tail_ok=tail_ok,
        iso_min=iso_min,
        iso_prefix_min=iso_prefix_min,
        iso_violations=iso_violations,
    )


def descent_lemma_holds(p: Sequence[int]) -> bool:
    """Direct check of the *conclusion* of the WR+ISO+TAIL argument on one sequence.

    Returns True iff for every r with 2 <= r <= L-1 the implication
    (p_{r-1} >= p_r) => (p_r >= p_{r+1}) is realised whenever WR_r and ISO_r hold.
    This is only a sanity check of the lemma on data, not a proof.
    """
    alpha = len(p) - 1
    L = L_cutoff(alpha)
    for r in range(2, min(L - 1, alpha - 1) + 1):
        a, b, c = p[r - 1], p[r], p[r + 1]
        wr = a <= r * b
        iso = r * b * b + a * a >= (r + 1) * a * c
        if wr and iso and a >= b and not (b >= c):
            return False
    return True
