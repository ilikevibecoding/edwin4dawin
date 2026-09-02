"""
Descent-gated variant of the ISO target: exact collar data.

The handoff's descent argument (WR_r + ISO_r => no ascent right after a
descent, for prefix indices 1 <= r <= L(alpha)-1) only ever invokes ISO_r at
an index r where p_r <= p_{r-1}.  Hence, for any constant c >= 0, the
unconditional inequality

    GATED_r^{(c)} :  Q_r + c * p_r * (p_r - p_{r-1}) >= 0

is an equally valid target:

  Lemma.  If p_{r-1} >= p_r >= 1, WR_r holds and GATED_r^{(c)} holds, then
  ISO_r holds, and therefore p_{r+1} <= p_r.
  Proof.  At a descent p_r - p_{r-1} <= 0, so Q_r >= c p_r (p_{r-1} - p_r)
  >= 0, which is ISO_r; the handoff's argument (see WR_ISO_TAIL_LEMMA.md)
  then yields p_{r+1} <= p_r.  In the ascending part GATED is weaker than
  ISO, so it never asks for more than ISO does.                         []

This script measures, exactly, on every nonisomorphic forest of order
<= NMAX and every prefix index:
  * the minimal ISO ratio rho_r = (r p_r^2 + p_{r-1}^2)/((r+1) p_{r-1} p_{r+1})
    separately at descent indices (p_r <= p_{r-1}) and ascent indices;
  * the minimal log-concavity ratio p_r^2/(p_{r-1} p_{r+1}) at descents
    (at a descent, LC_r alone already implies ISO_r);
  * c_max(n) = min over strict prefix descents of Q_r / (p_r (p_{r-1}-p_r)),
    the largest c for which GATED^{(c)} holds on the order-n collar;
  * the minimal normalised slack of GATED^{(1)} versus plain ISO.

Finite data only: nothing here proves anything for orders beyond NMAX.
"""

from __future__ import annotations

import hashlib
import json
import sys
import time
from fractions import Fraction

from forest_indep import (L_cutoff, Q_iso, forests, tree_level_sequences,
                          tree_polys_upto)

NMAX = int(sys.argv[1]) if len(sys.argv) > 1 else 18


def frac(x: Fraction) -> str:
    return f"{x.numerator}/{x.denominator}"


def describe(comps, seqs):
    return [[k, seqs[k][i]] for k, i in comps]


def main() -> int:
    t0 = time.time()
    tp = tree_polys_upto(NMAX)
    seqs = {k: list(tree_level_sequences(k)) for k in range(1, NMAX + 1)}
    per_n = []
    gated_c1_valid_everywhere = True
    iso_valid_everywhere = True
    for n in range(1, NMAX + 1):
        best = {"desc_iso": None, "desc_lc": None, "asc_iso": None,
                "cmax": None, "gated1": None, "iso": None}
        counts = {"forests": 0, "prefix_indices": 0, "descent_indices": 0}
        for comps, P in forests(n, tp):
            counts["forests"] += 1
            alpha = len(P) - 1
            L = L_cutoff(alpha) if alpha >= 1 else 0
            for r in range(1, L):
                counts["prefix_indices"] += 1
                den = (r + 1) * P[r - 1] * P[r + 1]
                Q = Q_iso(P, r)
                rho = Fraction(r * P[r] ** 2 + P[r - 1] ** 2, den)
                gated = Fraction(Q + P[r] * (P[r] - P[r - 1]), den)
                if Q < 0:
                    iso_valid_everywhere = False
                if Q + P[r] * (P[r] - P[r - 1]) < 0:
                    gated_c1_valid_everywhere = False
                cand = (rho, r, comps)
                if best["iso"] is None or rho < best["iso"][0]:
                    best["iso"] = cand
                if best["gated1"] is None or gated < best["gated1"][0]:
                    best["gated1"] = (gated, r, comps)
                if P[r] <= P[r - 1]:
                    counts["descent_indices"] += 1
                    if best["desc_iso"] is None or rho < best["desc_iso"][0]:
                        best["desc_iso"] = cand
                    lc = Fraction(P[r] ** 2, P[r - 1] * P[r + 1])
                    if best["desc_lc"] is None or lc < best["desc_lc"][0]:
                        best["desc_lc"] = (lc, r, comps)
                    if P[r] < P[r - 1]:
                        c = Fraction(Q, P[r] * (P[r - 1] - P[r]))
                        if best["cmax"] is None or c < best["cmax"][0]:
                            best["cmax"] = (c, r, comps)
                else:
                    if best["asc_iso"] is None or rho < best["asc_iso"][0]:
                        best["asc_iso"] = cand
        row = {"n": n, **counts}
        for key, val in best.items():
            if val is None:
                row[key] = None
            else:
                x, r, comps = val
                row[key] = {"value": frac(x), "approx": float(x), "r": r,
                            "forest": describe(comps, seqs)}
        per_n.append(row)
        d = row["desc_iso"]["approx"] if row["desc_iso"] else None
        a = row["asc_iso"]["approx"] if row["asc_iso"] else None
        g = row["gated1"]["approx"] if row["gated1"] else None
        c = row["cmax"]["approx"] if row["cmax"] else None
        print(f"n={n:2d} forests={counts['forests']:7d} "
              f"min ISO ratio at descents={d} at ascents={a} "
              f"min GATED(1) slack={g} c_max={c}")

    marker = ("PASS_EXACT_DESCENT_GATED_TARGET_COLLAR"
              if gated_c1_valid_everywhere and iso_valid_everywhere
              else "FAIL_EXACT_DESCENT_GATED_TARGET_COLLAR")
    report = {
        "script": "descent_gated_target.py",
        "script_sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest(),
        "core_sha256": hashlib.sha256(open("forest_indep.py", "rb").read()).hexdigest(),
        "nmax": NMAX,
        "iso_holds_on_all_prefix_indices": iso_valid_everywhere,
        "gated_c1_holds_on_all_prefix_indices": gated_c1_valid_everywhere,
        "per_n": per_n,
        "seconds": round(time.time() - t0, 2),
        "marker": marker,
        "scope": "finite collar only; falsification evidence, not a proof",
    }
    with open("results/descent_gated_target.json", "w") as fh:
        json.dump(report, fh, indent=1)
    print(marker)
    return 0 if marker.startswith("PASS") else 1


if __name__ == "__main__":
    import os
    os.makedirs("results", exist_ok=True)
    sys.exit(main())
