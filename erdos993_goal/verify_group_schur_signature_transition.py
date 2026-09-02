#!/usr/bin/env python3
"""Exact obstruction to the initially guessed fixed group-tail signature.

The group endpoint itself is not disproved.  This only shows that the minor
signature observed through m=7 does not persist unchanged: at m=14 the full
determinant has the opposite sign from the old formula.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_group_catalan_square_core import matrix, schur_tail


OUT = Path("group_schur_signature_transition_20260803.json")


def digest_integer(value: int) -> str:
    return hashlib.sha256(str(value).encode("ascii")).hexdigest()


def pivot_signs(m: int):
    d, ambient = 2 * m + 5, 3 * m + 5
    residual = schur_tail(matrix(d, power=2, limit=ambient), d)[:, ::-1]
    _, upper, _ = residual.LUdecomposition()
    pivots = [sp.factor(upper[i, i]) for i in range(m)]
    determinant = sp.factor(sp.prod(pivots))
    assert determinant == sp.factor(residual.det())
    return pivots, determinant


def main() -> None:
    records = []
    for m in (13, 14):
        pivots, determinant = pivot_signs(m)
        signs = [int(sp.sign(value)) for value in pivots]
        records.append(
            {
                "m": m,
                "pivot_signs": signs,
                "determinant_sign": int(sp.sign(determinant)),
                "determinant_numerator_sha256": digest_integer(int(sp.numer(determinant))),
                "determinant_denominator_sha256": digest_integer(int(sp.denom(determinant))),
            }
        )

    assert records[0]["pivot_signs"] == [1, 1] + [-1] * 11
    assert records[0]["determinant_sign"] == -1
    assert records[1]["pivot_signs"] == [1, 1] + [-1] * 11 + [1]
    assert records[1]["determinant_sign"] == -1
    assert (-1) ** 14 == 1

    report = {
        "status": "PASS_EXACT_SIGNATURE_TRANSITION",
        "old_guess": "epsilon_1=epsilon_2=+1 and epsilon_k=(-1)^k for k>=3",
        "first_full_determinant_failure": 14,
        "predicted_m14_determinant_sign": 1,
        "actual_m14_determinant_sign": -1,
        "records": records,
        "scope": (
            "This refutes only the fixed all-order Schur-minor signature, not "
            "real stability of the fixed group endpoint."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
