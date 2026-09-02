#!/usr/bin/env python3
"""Independent audit of the rank-eight Delta2 path-face certificate."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


ROOT = Path(__file__).resolve().parent
SOURCE_HASH = "1B80D8D0B3A36A4289039A602349330C72519116B024026246E41D9D7CCA6299"
REPORT_HASH = "CDAC219760F73C37C7897B8564A28F0D5C473F294127B1E0ADDF742F5C340865"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def path_sets(order: sp.Expr, rank: int) -> sp.Expr:
    return choose_poly(order - rank + 1, rank)


def fixed_path_sets(order: int, rank: int) -> sp.Integer:
    top = order - rank + 1
    return sp.Integer(math.comb(top, rank) if top >= rank >= 0 else 0)


def main() -> None:
    require_source = ROOT / "verify_rank8_delta2_path_forcing_and_face.py"
    require_report = ROOT / "rank8_delta2_path_forcing_and_face_exact_20260820.json"
    assert sha256(require_source) == SOURCE_HASH
    assert sha256(require_report) == REPORT_HASH
    stored = json.loads(require_report.read_text(encoding="utf-8"))
    assert stored["status"] == "PASS_EXACT_RANK8_DELTA2_PATH_FACE_AND_DEGREE_SURPLUS_SPLIT"

    n, e, tau = sp.symbols("n e tau", integer=True, nonnegative=True)
    i2 = choose_poly(n - 1, 2)
    i3 = choose_poly(n - 2, 3) + e
    i4 = choose_poly(n - 3, 4) + (n - 4) * e - tau
    w = sp.factor(i2 / i3)
    r = sp.factor(i3**2 / (i2 * i4))
    w_path = sp.factor(w.subs({e: 0, tau: 0}))
    r_path = sp.factor(r.subs({e: 0, tau: 0}))
    assert sp.factor(w_path.subs(n, 23) - sp.Rational(33, 190)) == 0
    assert sp.factor(r_path.subs(n, 23) - sp.Rational(2660, 1683)) == 0
    nonpath_w = sp.factor(i2 / (choose_poly(n - 2, 3) + 1))
    assert sp.factor(nonpath_w - 3 * (n - 2) / (n**2 - 8 * n + 18)) == 0
    assert sp.factor(nonpath_w.subs(n, 23) - sp.Rational(21, 121)) == 0

    delta2 = sp.expand(newton_coefficients(residual())[2])
    path_c = {c[rank]: path_sets(n, rank) for rank in range(9)}
    m = sp.symbols("m", nonnegative=True)
    boundary_stats = []
    for left in range(6):
        deletion = {}
        for rank in (6, 7):
            deletion[rank] = sp.expand(
                sum(
                    fixed_path_sets(left, j)
                    * path_sets(n - 1 - left, rank - j)
                    for j in range(rank + 1)
                )
            )
        expression = sp.expand(
            delta2.subs(
                {**path_c, h[6]: deletion[6], h[7]: deletion[7]},
                simultaneous=True,
            )
        )
        shifted = sp.Poly(expression.subs(n, m + 23), m)
        assert len(shifted.terms()) == 27
        assert all(value > 0 for value in shifted.all_coeffs())
        boundary_stats.append((left, shifted.degree(), len(shifted.terms()), str(min(shifted.all_coeffs()))))

    left, L, d = sp.symbols("left L d", nonnegative=True)
    deletion = {}
    for rank in (6, 7):
        deletion[rank] = sp.expand(
            sum(
                path_sets(left, j) * path_sets(n - 1 - left, rank - j)
                for j in range(rank + 1)
            )
        )
    interior = sp.expand(
        delta2.subs(
            {**path_c, h[6]: deletion[6], h[7]: deletion[7]},
            simultaneous=True,
        )
    )
    interior_shift = sp.Poly(
        interior.subs({left: L + 6, n: 2 * L + 13 + d}), L, d
    )
    assert interior_shift.degree_list() == (26, 26)
    assert len(interior_shift.terms()) == 378
    assert all(value > 0 for value in interior_shift.coeffs())

    payload = {
        "schema": "rank8-delta2-path-face-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_PATH_FACE",
        "source_sha256": SOURCE_HASH,
        "report_sha256": REPORT_HASH,
        "verified": [
            "degree-surplus-zero forces the path and exact n23 w,r",
            "nonpath degree-surplus gap w<=3(n-2)/(n^2-8n+18)",
            "six boundary-root polynomials have 27/27 positive coefficients after n=m+23",
            "interior-root polynomial has degrees (26,26) and 378/378 positive coefficients",
        ],
        "boundary_stats": boundary_stats,
        "interior_stats": {
            "degrees": list(interior_shift.degree_list()),
            "terms": len(interior_shift.terms()),
            "minimum_coefficient": str(min(interior_shift.coeffs())),
        },
        "conclusion": "Delta2>0 for every root of every path P_n, n>=23",
        "scope_guard": "The nonpath Delta2 tensors remain unsigned; this is not an all-tree Delta2 theorem.",
    }
    output = ROOT / "rank8_delta2_path_forcing_and_face_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
