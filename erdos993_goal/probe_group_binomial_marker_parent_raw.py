"""Probe the reverse-Borel (factorial-scaled) binomial marker parent.

If the factorial-scaled polynomial is real stable, applying the classical
multiplier sequence 1/k! independently in X and Y proves stability of the
actual marker parent.  The raw polynomial is expected to retain the direct
odd-path matching interpretation of the seed coefficients.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import sympy as sp

from probe_group_binomial_marker_parent import X, Y, T, parent


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_binomial_marker_parent_raw_probe_20260804.json"
tau = sp.symbols("tau")


def reverse_borel_xy(poly: sp.Poly) -> sp.Poly:
    expr = sp.S.Zero
    for (a, b, c), coefficient in poly.terms():
        expr += coefficient * sp.factorial(a) * sp.factorial(b) * X**a * Y**b * T**c
    return sp.Poly(sp.expand(expr), X, Y, T, domain=sp.QQ)


def digest(q: sp.Poly) -> str:
    _, primitive = q.clear_denoms(convert=True)
    coeffs = primitive.all_coeffs()
    if coeffs and coeffs[0] < 0:
        coeffs = [-a for a in coeffs]
    return hashlib.sha256(",".join(map(str, coeffs)).encode()).hexdigest()


def main() -> None:
    rng = random.Random(993_531_20260804)
    records = []
    status = "PASS_PROBE_ONLY"
    first_failure = None
    for m in range(1, 5):
        N, d = 3 * m + 4, 2 * m + 5
        raw = reverse_borel_xy(parent(N, d))
        print(f"built raw parent m={m}, terms={len(raw.terms())}", flush=True)
        for trial in range(8):
            bases = [rng.randint(-23, 23) for _ in range(3)]
            dirs = [rng.randint(1, 13) for _ in range(3)]
            line = {X: bases[0] + dirs[0] * tau,
                    Y: bases[1] + dirs[1] * tau,
                    T: bases[2] + dirs[2] * tau}
            q = sp.Poly(sp.expand(raw.as_expr().subs(line)), tau, domain=sp.QQ)
            real = int(q.count_roots(-sp.oo, sp.oo))
            item = {
                "m": m, "N": N, "d": d, "trial": trial,
                "degree": q.degree(), "real_roots": real,
                "bases": bases, "directions": dirs, "digest": digest(q),
            }
            records.append(item)
            print(
                f"  line={trial + 1}: degree={q.degree()} real={real}",
                flush=True,
            )
            if real != q.degree():
                status = "COUNTEREXAMPLE"
                first_failure = item
                break
        if first_failure is not None:
            break

    report = {
        "status": status,
        "line_test_count": len(records),
        "first_failure": first_failure,
        "records": records,
        "scope": (
            "A clean run would not prove stability.  A failure rules out the "
            "direct reverse-Borel/multiplier-sequence route."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": status,
        "line_test_count": len(records),
        "first_failure": first_failure,
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
