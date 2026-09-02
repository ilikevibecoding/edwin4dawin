"""Locate the empirical stability threshold in the marker smoothing order.

For fixed N, H_(N,d+1)=(1+T(D_X+D_Y))H_(N,d).  Since this operator
preserves real stability, proving one stable threshold d0 proves every
larger smoothing order.  Exact line failures give lower bounds on d0;
clean finite screens are only evidence.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import sympy as sp

from probe_group_binomial_marker_parent import X, Y, T, parent


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_marker_smoothing_threshold_probe_20260804.json"
tau = sp.symbols("tau")


def digest(q: sp.Poly) -> str:
    _, primitive = q.clear_denoms(convert=True)
    coeffs = primitive.all_coeffs()
    if coeffs and coeffs[0] < 0:
        coeffs = [-a for a in coeffs]
    return hashlib.sha256(",".join(map(str, coeffs)).encode()).hexdigest()


def main() -> None:
    rng = random.Random(993_532_20260804)
    records = []
    summary = []
    for N in range(4, 14):
        for d in range(4, min(2 * N, 13) + 1):
            H = parent(N, d)
            first_failure = None
            for trial in range(8):
                bases = [rng.randint(-29, 29) for _ in range(3)]
                dirs = [rng.randint(1, 13) for _ in range(3)]
                line = {X: bases[0] + dirs[0] * tau,
                        Y: bases[1] + dirs[1] * tau,
                        T: bases[2] + dirs[2] * tau}
                q = sp.Poly(sp.expand(H.as_expr().subs(line)), tau, domain=sp.QQ)
                real = int(q.count_roots(-sp.oo, sp.oo))
                item = {
                    "N": N, "d": d, "trial": trial,
                    "degree": q.degree(), "real_roots": real,
                    "bases": bases, "directions": dirs, "digest": digest(q),
                }
                records.append(item)
                if real != q.degree():
                    first_failure = item
                    break
            summary.append({
                "N": N, "d": d,
                "status": "FAIL" if first_failure else "CLEAN_8_LINES",
                "first_failure": first_failure,
            })
            print(
                f"N={N} d={d}: "
                f"{'FAIL ' + str(first_failure['real_roots']) + '/' + str(first_failure['degree']) if first_failure else 'clean'}",
                flush=True,
            )

    report = {
        "status": "PROBE_COMPLETE",
        "summary": summary,
        "records": records,
        "scope": (
            "Failures are exact obstructions.  Clean cells are finite line "
            "screens, not stability proofs."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "cell_count": len(summary),
        "failure_count": sum(x["status"] == "FAIL" for x in summary),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
