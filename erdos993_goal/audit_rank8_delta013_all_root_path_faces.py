#!/usr/bin/env python3
"""Independent domain/algebra audit of the Delta0/1/3 path certificates."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def path_count(order: sp.Expr, rank: int) -> sp.Expr:
    return choose(order - rank + 1, rank)


def main() -> None:
    here = Path(__file__).resolve().parent
    source = here / "verify_rank8_delta013_all_root_path_faces.py"
    source_hash = sha256(source)
    report = here / "rank8_delta013_all_root_path_faces_exact_20260820.json"
    report_hash = sha256(report)
    assert source_hash == "33E1119097FA0FCFA572E600504F518E9C2003CBBBF101EFA19DD6FA0BF4E245"
    assert report_hash == "951CF842CEA1B6D6E6AED3D1EC940F582F489B53532899A1E7C3BF15A2118349"

    n = sp.symbols("n", integer=True, nonnegative=True)
    D, M = sp.symbols("D M", integer=True, nonnegative=True)
    left = sp.symbols("left", integer=True, nonnegative=True)
    path_c = {c[rank]: path_count(n, rank) for rank in range(9)}
    coefficients = newton_coefficients(residual())
    results = {}
    for delta_rank in (0, 1, 3):
        delta = sp.expand(coefficients[delta_rank])
        deleted = {}
        for rank in (6, 7):
            deleted[rank] = sp.expand(
                sum(
                    path_count(left, split)
                    * path_count(n - 1 - left, rank - split)
                    for split in range(rank + 1)
                )
            )
        expression = sp.expand(
            delta.subs(
                {**path_c, h[6]: deleted[6], h[7]: deleted[7]},
                simultaneous=True,
            )
        )

        # Correct no-gap small-L substitution: n=D+23, not D+23-L.
        small_rows = []
        for L_value in range(5):
            polynomial = sp.Poly(
                expression.subs(
                    {left: L_value + 6, n: D + 23}, simultaneous=True
                ),
                D,
            )
            assert all(value > 0 for value in polynomial.all_coeffs())
            small_rows.append(
                {
                    "L": L_value,
                    "left": L_value + 6,
                    "d": f"D+{10-2*L_value}",
                    "n": "D+23",
                    "terms": len(polynomial.terms()),
                    "minimum": str(min(polynomial.all_coeffs())),
                }
            )

        bulk = sp.Poly(
            expression.subs(
                {left: M + 11, n: 2 * M + 23 + D}, simultaneous=True
            ),
            M,
            D,
        )
        assert all(value > 0 for value in bulk.coeffs())
        results[str(delta_rank)] = {
            "corrected_small_rows": small_rows,
            "bulk_degrees": list(bulk.degree_list()),
            "bulk_terms": len(bulk.terms()),
            "bulk_minimum": str(min(bulk.coeffs())),
        }

    status = "PASS_INDEPENDENT_EXACT_RANK8_DELTA013_PATH_FACE_AUDIT"
    payload = {
        "status": status,
        "audited_source_sha256": source_hash,
        "audited_report_sha256": report_hash,
        "domain_derivation": (
            "left=L+6,right=left+d,n=2L+13+d,n>=23 iff 2L+d>=10; "
            "for L=0..4 set d=D+10-2L, hence n=D+23"
        ),
        "historical_defect_repaired": (
            "The superseded FA6... source used n=D+23-L in the small rows. The "
            "audited 33E... source correctly uses n=D+23, and all rows are positive."
        ),
        "corrected_exact_results": results,
        "bulk_split_valid": True,
        "scope_warning": "Path cores only; no nonpath theorem is asserted.",
    }
    output = here / "rank8_delta013_all_root_path_faces_independent_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("SCRIPT", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
