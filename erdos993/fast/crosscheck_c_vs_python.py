"""Cross-check the C verifier (wromcheck) against the Python tree reports.

1. For n <= 14: run `wromcheck --dump`, hash the sorted multiset of coefficient
   vectors exactly as the Python suite does, and compare with
   reports/trees_nNN.json["coefficient_multiset_sorted_sha256"].
2. For every n with a Python tree report: compare counts, all per-check counts,
   and the exact per-r minimum ISO fractions (Q_r, denominator) and the prefix
   minimum.  Argmin trees may legitimately differ when several trees tie, so
   for the argmin only the exact ratio recomputed from the reported
   coefficients is compared.

Usage: python3 crosscheck_c_vs_python.py [NMAX_DUMP=14] [NMAX=22]
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BIN = os.path.join(HERE, "wromcheck")


def ratio_from_coeffs(coeffs, r) -> Fraction:
    a, b, c = coeffs[r - 1], coeffs[r], coeffs[r + 1]
    den = (r + 1) * a * c
    return Fraction(r * b * b + a * a - den, den)


def main() -> int:
    nmax_dump = int(sys.argv[1]) if len(sys.argv) > 1 else 14
    nmax = int(sys.argv[2]) if len(sys.argv) > 2 else 22
    ok = True
    rows = []
    # 1. multiset hashes via --dump
    for n in range(1, nmax_dump + 1):
        path = os.path.join(ROOT, "reports", f"trees_n{n:02d}.json")
        if not os.path.exists(path):
            continue
        py = json.load(open(path))
        out = subprocess.run([BIN, "--nmin", str(n), "--nmax", str(n), "--dump"], capture_output=True, text=True, check=True).stdout
        coeffs = []
        for line in out.splitlines():
            if line.startswith("{"):
                continue
            _, co = line.split(";")
            coeffs.append(tuple(int(x) for x in co.strip("[]").split(",")))
        h = hashlib.sha256(json.dumps([list(t) for t in sorted(coeffs)], separators=(",", ":")).encode()).hexdigest()
        same = h == py["coefficient_multiset_sorted_sha256"] and len(coeffs) == py["count"]
        ok &= same
        print(f"n={n:2d} dump multiset hash {'MATCH' if same else 'MISMATCH'} ({len(coeffs)} trees)")
    # 2. summary comparison
    out = subprocess.run([BIN, "--nmin", "1", "--nmax", str(nmax)], capture_output=True, text=True, check=True).stdout
    for line in out.splitlines():
        c = json.loads(line)
        n = c["n"]
        path = os.path.join(ROOT, "reports", f"trees_n{n:02d}.json")
        if not os.path.exists(path):
            continue
        py = json.load(open(path))
        checks = {
            "count": c["count"] == py["count"] == py["tree_count_formula_A000055"] and c["count_check"] == "PASS",
            "unimodal": c["unimodal"] == py["unimodal"],
            "log_concave": c["log_concave"] == py["log_concave"],
            "iso_all": c["iso_all"] == py["iso_all"],
            "iso_prefix": c["iso_prefix"] == py["iso_prefix"],
            "nw_all": c["nw_all"] == py["nw_all"],
            "wr_prefix_ok": c["wr_prefix_ok"] == py["wr_prefix_ok"],
            "tail_ok": c["tail_ok"] == py["tail_ok"],
        }
        # per-r minima
        by_r_ok = True
        for r, cell in c["iso_min_by_r"].items():
            pcell = py["iso_min_by_r"].get(r)
            if pcell is None:
                by_r_ok = False
                continue
            fc = Fraction(int(cell["Q_r"]), int(cell["denominator"]))
            fp = Fraction(int(pcell["Q_r"]), int(pcell["denominator"]))
            fc2 = ratio_from_coeffs(cell["coefficients"], int(r))
            fp2 = ratio_from_coeffs(pcell["coefficients"], int(r))
            if not (fc == fp == fc2 == fp2):
                by_r_ok = False
        checks["iso_min_by_r"] = by_r_ok and set(c["iso_min_by_r"]) == set(py["iso_min_by_r"])
        cp, pp = c["iso_min_prefix_2<=r<=L-1"], py["iso_min_prefix_2<=r<=L-1"]
        if cp is None or pp is None:
            checks["iso_min_prefix"] = cp is None and pp is None
        else:
            checks["iso_min_prefix"] = Fraction(int(cp["Q_r"]), int(cp["denominator"])) == Fraction(int(pp["Q_r"]), int(pp["denominator_(r+1)p_{r-1}p_{r+1}"]))
        line_ok = all(checks.values())
        ok &= line_ok
        rows.append({"n": n, "count": c["count"], "ok": line_ok, "checks": checks})
        print(f"n={n:2d} count={c['count']:8d} {'OK' if line_ok else 'MISMATCH ' + str(checks)}")
    with open(os.path.join(ROOT, "reports", "crosscheck_c_vs_python.json"), "w") as fh:
        json.dump({"rows": rows, "all_match": ok, "nmax_dump": nmax_dump, "nmax": nmax}, fh, indent=1)
    print("CROSSCHECK_C_VS_PYTHON_PASS" if ok else "CROSSCHECK_C_VS_PYTHON_FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
