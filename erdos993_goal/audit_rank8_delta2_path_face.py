#!/usr/bin/env python3
"""Independent exact audit of the rank-eight Delta2 path-face theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


SOURCE_HASH = "1B80D8D0B3A36A4289039A602349330C72519116B024026246E41D9D7CCA6299"
REPORT_HASH = "CDAC219760F73C37C7897B8564A28F0D5C473F294127B1E0ADDF742F5C340865"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def path_count(order: sp.Expr, rank: int) -> sp.Expr:
    return choose(order - rank + 1, rank)


def main() -> None:
    here = Path(__file__).resolve().parent
    assert sha256(here / "verify_rank8_delta2_path_forcing_and_face.py") == SOURCE_HASH
    assert sha256(here / "rank8_delta2_path_forcing_and_face_exact_20260820.json") == REPORT_HASH

    n, e, tau = sp.symbols("n e tau", integer=True, nonnegative=True)
    i2 = choose(n - 1, 2)
    # Independent edge inclusion-exclusion: W=(n-2)+e adjacent edge pairs,
    # and T3=(n-3)+tau connected three-edge subtrees.
    i3_inclusion = choose(n, 3) - (n - 1) * (n - 2) + (n - 2 + e)
    i4_inclusion = (
        choose(n, 4)
        - (n - 1) * choose(n - 2, 2)
        + choose(n - 1, 2)
        + (n - 4) * (n - 2 + e)
        - (n - 3 + tau)
    )
    i3 = choose(n - 2, 3) + e
    i4 = choose(n - 3, 4) + (n - 4) * e - tau
    assert sp.expand(i3_inclusion - i3) == 0
    assert sp.expand(i4_inclusion - i4) == 0
    w_path = sp.factor(i2 / choose(n - 2, 3))
    w_nonpath = sp.factor(i2 / (choose(n - 2, 3) + 1))
    path_gap = sp.factor(w_path - w_nonpath)
    assert sp.factor(
        path_gap - 18 / ((n - 4) * (n - 3) * (n**2 - 8 * n + 18))
    ) == 0

    delta2 = sp.expand(newton_coefficients(residual())[2])
    path_coefficients = {c[rank]: path_count(n, rank) for rank in range(9)}
    m = sp.symbols("m", nonnegative=True)
    boundary_counts = []
    for left_order in range(6):
        def deleted(rank: int) -> sp.Expr:
            return sp.expand(
                sum(
                    path_count(left_order, split)
                    * path_count(n - 1 - left_order, rank - split)
                    for split in range(rank + 1)
                )
            )

        expression = sp.expand(
            delta2.subs(
                {
                    **path_coefficients,
                    h[6]: deleted(6),
                    h[7]: deleted(7),
                },
                simultaneous=True,
            )
        )
        shifted = sp.Poly(expression.subs(n, m + 23), m)
        assert shifted.degree() == 26
        assert len(shifted.terms()) == 27
        assert all(coefficient > 0 for coefficient in shifted.all_coeffs())
        boundary_counts.append(len(shifted.terms()))

    # Up to reversal every remaining root has left>=6 and right>=left.
    # left=L+6, right=left+d, so n=left+right+1=2L+13+d.
    left, L, d = sp.symbols("left L d", nonnegative=True)
    interior_deleted = {}
    for rank in (6, 7):
        interior_deleted[rank] = sp.expand(
            sum(
                path_count(left, split)
                * path_count(n - 1 - left, rank - split)
                for split in range(rank + 1)
            )
        )
    interior = sp.expand(
        delta2.subs(
            {
                **path_coefficients,
                h[6]: interior_deleted[6],
                h[7]: interior_deleted[7],
            },
            simultaneous=True,
        )
    )
    interior_shifted = sp.Poly(
        interior.subs({left: L + 6, n: 2 * L + 13 + d}), L, d
    )
    coefficients = interior_shifted.coeffs()
    assert interior_shifted.degree_list() == (26, 26)
    assert len(interior_shifted.terms()) == 378
    assert all(coefficient > 0 for coefficient in coefficients)
    assert min(coefficients) == sp.Rational(1, 121927680000)

    payload = {
        "status": "PASS_INDEPENDENT_EXACT_RANK8_DELTA2_PATH_FACE_AUDIT",
        "hashes_verified": {
            "verify_rank8_delta2_path_forcing_and_face.py": SOURCE_HASH,
            "rank8_delta2_path_forcing_and_face_exact_20260820.json": REPORT_HASH,
        },
        "motif_audit": {
            "i3": str(i3),
            "i4": str(i4),
            "path_nonpath_w_gap": str(path_gap),
        },
        "root_coverage": {
            "symmetry": "left<=right",
            "boundary_left_orders": list(range(6)),
            "boundary_positive_coefficients": sum(boundary_counts),
            "interior_substitution": "left=L+6,right=left+d,n=2L+13+d",
            "no_gap": True,
        },
        "interior_certificate": {
            "degrees": list(interior_shifted.degree_list()),
            "positive_coefficients": len(coefficients),
            "minimum": str(min(coefficients)),
        },
        "defects": [],
        "scope_warning": "The audit closes only the all-order path face, not nonpath Delta2.",
    }
    output = here / "rank8_delta2_path_face_independent_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SCRIPT", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
