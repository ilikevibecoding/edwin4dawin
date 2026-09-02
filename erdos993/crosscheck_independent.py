"""Compare reports/forests_n*.json with the independent brute-force replay.

Checks, for every n covered by both: forest counts, per-check counts, the exact
minimum ISO ratio (as a Fraction), and the SHA256 of the sorted coefficient
multiset (recomputed here from the brute-force ``coeffs_n{n}.txt`` files as well).
"""

from __future__ import annotations

import glob
import hashlib
import json
import os
import sys
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))


def main() -> int:
    cands = sorted(glob.glob(os.path.join(HERE, "independent", "bruteforce_forests_report*.json")))
    if not cands:
        print("no independent report found")
        return 2
    # prefer the report with the largest nmax
    best = max(cands, key=lambda p: json.load(open(p)).get("nmax", 0))
    ind = {e["n"]: e for e in json.load(open(best))["per_n"]}
    ok = True
    rows = []
    for n in sorted(ind):
        path = os.path.join(HERE, "reports", f"forests_n{n:02d}.json")
        if not os.path.exists(path):
            continue
        mine = json.load(open(path))
        e = ind[n]
        txt = os.path.join(HERE, "independent", f"coeffs_n{n}.txt")
        with open(txt) as fh:
            rows_txt = sorted(tuple(int(x) for x in line.split(",")) for line in fh if line.strip())
        h_txt = hashlib.sha256(json.dumps([list(t) for t in rows_txt], separators=(",", ":")).encode()).hexdigest()
        m = mine["iso_min_all_r"]
        fr_mine = None if m is None else Fraction(int(m["Q_r"]), int(m["denominator_(r+1)p_{r-1}p_{r+1}"]))
        fr_ind = None if e["min_iso_ratio"] in (None, "None") else Fraction(e["min_iso_ratio"])
        checks = {
            "count": mine["count"] == e["forests"] == mine["forest_count_formula_A005195"],
            "hash": mine["coefficient_multiset_sorted_sha256"] == e["coeff_multiset_sha256"] == h_txt,
            "unimodal": mine["unimodal"] == e["unimodal"],
            "log_concave": mine["log_concave"] == e["log_concave"],
            "iso": mine["iso_all"] == e["iso_ok"],
            "tail": mine["tail_ok"] == e["tail_ok"],
            "wr_prefix": (mine["count"] - mine["wr_prefix_ok"]) == e["wr_fails_for_some_r_le_Lminus1"],
            "min_iso_ratio": fr_mine == fr_ind,
        }
        line_ok = all(checks.values())
        ok &= line_ok
        rows.append({"n": n, "count": mine["count"], "min_iso_ratio": str(fr_mine), "hash": mine["coefficient_multiset_sorted_sha256"], "ok": line_ok, "checks": checks})
        print(f"n={n:2d} count={mine['count']:6d} min_iso={str(fr_mine):>10s} hash={mine['coefficient_multiset_sorted_sha256'][:16]}... {'OK' if line_ok else 'MISMATCH ' + str(checks)}")
    out = {"independent_report": os.path.relpath(best, HERE), "rows": rows, "all_match": ok}
    with open(os.path.join(HERE, "reports", "crosscheck_independent.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    print("CROSSCHECK_INDEPENDENT_PASS" if ok else "CROSSCHECK_INDEPENDENT_FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
