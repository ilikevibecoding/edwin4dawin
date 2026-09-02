"""Lean exhaustive scanner: accumulates exact statistics over many polynomials.

Only integer arithmetic on the hot path; ``Fraction`` objects are created just
for the final report.  The scanner records, per order, every failure of
unimodality, log-concavity, WR (prefix), ISO (prefix), the tail theorem, and
the extremal witnesses for the dimensionless ISO margin
``Q_r/(p_{r-1} p_r)`` and the WR ratio ``p_{r-1}/(r p_r)``.
"""

from __future__ import annotations

from fractions import Fraction
from typing import Any, Dict, List, Optional, Sequence

from .checks import tail_cutoff


class ScanStats:
    def __init__(self) -> None:
        self.count = 0
        self.not_unimodal: List[Any] = []
        self.lc_failures = 0
        self.lc_witnesses: List[Any] = []
        self.wr_prefix_failures: List[Any] = []
        self.iso_prefix_failures: List[Any] = []
        self.iso_any_index_failures: List[Any] = []
        self.tail_failures: List[Any] = []
        # min ISO margin on the prefix: store numerator/denominator ints
        self.min_margin_num: Optional[int] = None
        self.min_margin_den: Optional[int] = None
        self.min_margin_witness: Any = None
        self.min_margin_r: Optional[int] = None
        # min ISO margin at descent indices (p_r <= p_{r-1}) on the prefix
        self.min_desc_margin_num: Optional[int] = None
        self.min_desc_margin_den: Optional[int] = None
        self.min_desc_margin_witness: Any = None
        self.min_desc_margin_r: Optional[int] = None
        # max WR ratio p_{r-1}/(r p_r) on the prefix
        self.max_wr_num: Optional[int] = None
        self.max_wr_den: Optional[int] = None
        self.max_wr_witness: Any = None
        self.max_wr_r: Optional[int] = None
        # min tail ratio p_r/p_{r+1} for r >= L (must be >= 1)
        self.min_tail_num: Optional[int] = None
        self.min_tail_den: Optional[int] = None
        self.min_tail_witness: Any = None
        self.min_tail_r: Optional[int] = None
        # per-index minimum ISO margin on the prefix: r -> [num, den, witness]
        self.per_r_min_margin: Dict[int, list] = {}

    def add(self, p: Sequence[int], witness: Any) -> None:
        self.count += 1
        a = len(p) - 1
        L = tail_cutoff(a)
        # unimodality
        i = 0
        while i < a and p[i] <= p[i + 1]:
            i += 1
        while i < a and p[i] >= p[i + 1]:
            i += 1
        if i != a and len(self.not_unimodal) < 50:
            self.not_unimodal.append({"witness": witness, "poly": list(p)})
        elif i != a:
            self.not_unimodal.append(None)
        # log-concavity (all indices)
        lc_bad = [k for k in range(1, a) if p[k] * p[k] < p[k - 1] * p[k + 1]]
        if lc_bad:
            self.lc_failures += 1
            if len(self.lc_witnesses) < 20:
                self.lc_witnesses.append({"witness": witness, "poly": list(p), "indices": lc_bad})
        # prefix checks
        for r in range(1, min(L, a + 1)):
            pr1, pr = p[r - 1], p[r]
            # WR
            if pr1 > r * pr:
                self.wr_prefix_failures.append({"witness": witness, "poly": list(p), "r": r})
            num, den = pr1, r * pr
            if self.max_wr_num is None or num * self.max_wr_den > self.max_wr_num * den:
                self.max_wr_num, self.max_wr_den, self.max_wr_witness, self.max_wr_r = num, den, witness, r
            if r <= a - 1:
                q = r * pr * pr + pr1 * pr1 - (r + 1) * pr1 * p[r + 1]
                if q < 0:
                    self.iso_prefix_failures.append({"witness": witness, "poly": list(p), "r": r, "Q": q})
                d = pr1 * pr
                if self.min_margin_num is None or q * self.min_margin_den < self.min_margin_num * d:
                    self.min_margin_num, self.min_margin_den, self.min_margin_witness, self.min_margin_r = q, d, witness, r
                cur = self.per_r_min_margin.get(r)
                if cur is None or q * cur[1] < cur[0] * d:
                    self.per_r_min_margin[r] = [q, d, witness]
                if pr <= pr1 and (
                    self.min_desc_margin_num is None or q * self.min_desc_margin_den < self.min_desc_margin_num * d
                ):
                    self.min_desc_margin_num, self.min_desc_margin_den = q, d
                    self.min_desc_margin_witness, self.min_desc_margin_r = witness, r
        # ISO at any index (informative only)
        for r in range(1, a):
            if r * p[r] * p[r] + p[r - 1] * p[r - 1] - (r + 1) * p[r - 1] * p[r + 1] < 0:
                if len(self.iso_any_index_failures) < 50:
                    self.iso_any_index_failures.append({"witness": witness, "poly": list(p), "r": r})
                break
        # tail theorem
        for r in range(L, a):
            if p[r] < p[r + 1]:
                self.tail_failures.append({"witness": witness, "poly": list(p), "r": r})
            num, den = p[r], p[r + 1]
            if self.min_tail_num is None or num * self.min_tail_den < self.min_tail_num * den:
                self.min_tail_num, self.min_tail_den, self.min_tail_witness, self.min_tail_r = num, den, witness, r

    def summary(self) -> Dict[str, Any]:
        def frac(num, den):
            if num is None:
                return None
            f = Fraction(num, den)
            return {"exact": str(f), "float": float(f)}

        return {
            "count": self.count,
            "not_unimodal_count": len(self.not_unimodal),
            "not_unimodal_witnesses": [w for w in self.not_unimodal if w is not None][:50],
            "log_concavity_failures_count": self.lc_failures,
            "log_concavity_failure_witnesses": self.lc_witnesses,
            "wr_prefix_failures_count": len(self.wr_prefix_failures),
            "wr_prefix_failures": self.wr_prefix_failures[:50],
            "iso_prefix_failures_count": len(self.iso_prefix_failures),
            "iso_prefix_failures": self.iso_prefix_failures[:50],
            "iso_any_index_failures_count": len(self.iso_any_index_failures),
            "iso_any_index_failures": self.iso_any_index_failures[:50],
            "tail_failures_count": len(self.tail_failures),
            "tail_failures": self.tail_failures[:50],
            "min_iso_margin_prefix": frac(self.min_margin_num, self.min_margin_den),
            "min_iso_margin_prefix_r": self.min_margin_r,
            "min_iso_margin_prefix_witness": self.min_margin_witness,
            "min_iso_margin_at_descent_prefix": frac(self.min_desc_margin_num, self.min_desc_margin_den),
            "min_iso_margin_at_descent_prefix_r": self.min_desc_margin_r,
            "min_iso_margin_at_descent_prefix_witness": self.min_desc_margin_witness,
            "max_wr_ratio_prefix": frac(self.max_wr_num, self.max_wr_den),
            "max_wr_ratio_prefix_r": self.max_wr_r,
            "max_wr_ratio_prefix_witness": self.max_wr_witness,
            "min_tail_ratio": frac(self.min_tail_num, self.min_tail_den),
            "min_tail_ratio_r": self.min_tail_r,
            "min_tail_ratio_witness": self.min_tail_witness,
            "per_index_min_iso_margin_prefix": {
                str(r): {"margin": frac(v[0], v[1]), "witness": v[2]} for r, v in sorted(self.per_r_min_margin.items())
            },
        }
