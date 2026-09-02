"""Order-independent aggregation of per-sequence check results (exact integers)."""

from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, List, Optional, Tuple

from checks import SeqReport

MASK256 = (1 << 256) - 1


def coeff_hash_term(coeffs: Tuple[int, ...]) -> int:
    """256-bit hash of one coefficient vector; summing terms mod 2^256 is order-independent."""
    h = hashlib.sha256(",".join(map(str, coeffs)).encode()).digest()
    return int.from_bytes(h, "big")


class Aggregate:
    """Accumulates counts, extremal cells and a multiset hash for one order n."""

    FIELDS = (
        "count",
        "unimodal",
        "log_concave",
        "iso_all",
        "iso_prefix",
        "nw_all",
        "wr_prefix_ok",
        "tail_ok",
        "descent_lemma_data_ok",
    )

    def __init__(self, keep_coeffs: bool = False):
        self.c: Dict[str, int] = {k: 0 for k in self.FIELDS}
        self.hash_sum = 0
        self.keep_coeffs = keep_coeffs
        self.coeffs: List[Tuple[int, ...]] = []
        # (Q, den, r, label, coeffs)
        self.iso_min: Optional[Tuple[int, int, int, Any, Tuple[int, ...]]] = None
        self.iso_prefix_min: Optional[Tuple[int, int, int, Any, Tuple[int, ...]]] = None
        # per r: minimal ISO ratio over all sequences (Q, den, label, coeffs)
        self.iso_min_by_r: Dict[int, Tuple[int, int, Any, Tuple[int, ...]]] = {}
        self.wr_prefix_failures: List[Tuple[Any, Tuple[int, ...]]] = []
        self.iso_violation_examples: List[Tuple[Any, Tuple[int, ...], List[int]]] = []
        self.nonunimodal_examples: List[Tuple[Any, Tuple[int, ...]]] = []
        self.alpha_hist: Dict[int, int] = {}

    def add(self, rep: SeqReport, coeffs: Tuple[int, ...], label: Any, lemma_ok: bool) -> None:
        c = self.c
        c["count"] += 1
        c["unimodal"] += rep.unimodal
        c["log_concave"] += rep.log_concave
        c["iso_all"] += rep.iso_all
        c["iso_prefix"] += rep.iso_prefix
        c["nw_all"] += rep.nw_all
        c["wr_prefix_ok"] += rep.wr_prefix_ok
        c["tail_ok"] += rep.tail_ok
        c["descent_lemma_data_ok"] += lemma_ok
        self.alpha_hist[rep.alpha] = self.alpha_hist.get(rep.alpha, 0) + 1
        self.hash_sum = (self.hash_sum + coeff_hash_term(coeffs)) & MASK256
        if self.keep_coeffs:
            self.coeffs.append(coeffs)
        if rep.iso_min is not None:
            Q, den, r = rep.iso_min
            m = self.iso_min
            if m is None or Q * m[1] < m[0] * den:
                self.iso_min = (Q, den, r, label, coeffs)
        if rep.iso_prefix_min is not None:
            Q, den, r = rep.iso_prefix_min
            m = self.iso_prefix_min
            if m is None or Q * m[1] < m[0] * den:
                self.iso_prefix_min = (Q, den, r, label, coeffs)
        # per-r minima need the full scan; recompute cheaply from coeffs
        alpha = rep.alpha
        for r in range(1, alpha):
            a, b, cc = coeffs[r - 1], coeffs[r], coeffs[r + 1]
            den = (r + 1) * a * cc
            if den <= 0:
                continue
            Q = r * b * b + a * a - den
            m = self.iso_min_by_r.get(r)
            if m is None or Q * m[1] < m[0] * den:
                self.iso_min_by_r[r] = (Q, den, label, coeffs)
        if not rep.wr_prefix_ok and len(self.wr_prefix_failures) < 5:
            self.wr_prefix_failures.append((label, coeffs))
        if rep.iso_violations and len(self.iso_violation_examples) < 5:
            self.iso_violation_examples.append((label, coeffs, rep.iso_violations))
        if not rep.unimodal and len(self.nonunimodal_examples) < 5:
            self.nonunimodal_examples.append((label, coeffs))

    def merge(self, other: "Aggregate") -> None:
        for k in self.FIELDS:
            self.c[k] += other.c[k]
        for a, v in other.alpha_hist.items():
            self.alpha_hist[a] = self.alpha_hist.get(a, 0) + v
        self.hash_sum = (self.hash_sum + other.hash_sum) & MASK256
        if self.keep_coeffs:
            self.coeffs.extend(other.coeffs)
        for attr in ("iso_min", "iso_prefix_min"):
            m, o = getattr(self, attr), getattr(other, attr)
            if o is not None and (m is None or o[0] * m[1] < m[0] * o[1]):
                setattr(self, attr, o)
        for r, o in other.iso_min_by_r.items():
            m = self.iso_min_by_r.get(r)
            if m is None or o[0] * m[1] < m[0] * o[1]:
                self.iso_min_by_r[r] = o
        self.wr_prefix_failures = (self.wr_prefix_failures + other.wr_prefix_failures)[:5]
        self.iso_violation_examples = (self.iso_violation_examples + other.iso_violation_examples)[:5]
        self.nonunimodal_examples = (self.nonunimodal_examples + other.nonunimodal_examples)[:5]

    @staticmethod
    def _cell(m) -> Optional[Dict[str, Any]]:
        if m is None:
            return None
        Q, den, r, label, coeffs = m
        return {
            "r": r,
            "Q_r": str(Q),
            "denominator_(r+1)p_{r-1}p_{r+1}": str(den),
            "ratio_float": (Q / den) if den else None,
            "argmin": label,
            "coefficients": list(coeffs),
        }

    def to_json(self, n: int) -> Dict[str, Any]:
        out: Dict[str, Any] = {"n": n}
        out.update(self.c)
        out["all_unimodal"] = self.c["unimodal"] == self.c["count"]
        out["all_iso"] = self.c["iso_all"] == self.c["count"]
        out["all_iso_prefix"] = self.c["iso_prefix"] == self.c["count"]
        out["all_wr_prefix"] = self.c["wr_prefix_ok"] == self.c["count"]
        out["all_tail"] = self.c["tail_ok"] == self.c["count"]
        out["all_log_concave"] = self.c["log_concave"] == self.c["count"]
        out["alpha_histogram"] = {str(k): v for k, v in sorted(self.alpha_hist.items())}
        out["coefficient_multiset_hashsum_sha256_mod_2^256"] = f"{self.hash_sum:064x}"
        if self.keep_coeffs:
            sorted_list = sorted(self.coeffs)
            blob = json.dumps([list(t) for t in sorted_list], separators=(",", ":"))
            out["coefficient_multiset_sorted_sha256"] = hashlib.sha256(blob.encode()).hexdigest()
        out["iso_min_all_r"] = self._cell(self.iso_min)
        out["iso_min_prefix_2<=r<=L-1"] = self._cell(self.iso_prefix_min)
        out["iso_min_by_r"] = {
            str(r): {
                "Q_r": str(v[0]),
                "denominator": str(v[1]),
                "ratio_float": v[0] / v[1],
                "argmin": v[2],
                "coefficients": list(v[3]),
            }
            for r, v in sorted(self.iso_min_by_r.items())
        }
        out["wr_prefix_failure_examples"] = [
            {"forest": lab, "coefficients": list(cf)} for lab, cf in self.wr_prefix_failures
        ]
        out["iso_violation_examples"] = [
            {"forest": lab, "coefficients": list(cf), "violating_r": vr}
            for lab, cf, vr in self.iso_violation_examples
        ]
        out["nonunimodal_examples"] = [
            {"forest": lab, "coefficients": list(cf)} for lab, cf in self.nonunimodal_examples
        ]
        return out
