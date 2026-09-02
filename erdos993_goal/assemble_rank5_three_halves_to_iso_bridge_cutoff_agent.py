#!/usr/bin/env python3
"""Assemble the proved all-forest rank-five reserve into prefix ISO_5.

This is a dependency bridge, not a new proof of the rank-five reserve.  The
dependency theorem states that every forest of order at least ten satisfies

    S5 = 10 p5^2 - p4 p5 - 12 p4 p6 >= 0.

The only prefix-relevant forest outside that order range is the edgeless
nine-vertex forest, which is checked exactly here.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md"


def cutoff(alpha: int) -> int:
    return (2 * alpha + 1) // 3


def main() -> None:
    p4, p5, p6 = sp.symbols("p4 p5 p6", nonnegative=True)
    reserve = 10 * p5**2 - p4 * p5 - 12 * p4 * p6
    iso = 5 * p5**2 + p4**2 - 6 * p4 * p6
    payment = p4**2 + sp.Rational(1, 2) * p4 * p5
    assert sp.expand(iso - sp.Rational(1, 2) * reserve - payment) == 0

    # L(alpha)=floor((2 alpha+1)/3); rank five is a target exactly at
    # alpha>=9.  The finite loop is a replay of the elementary integer
    # equivalence, while the report records its closed form.
    assert all((5 < cutoff(alpha)) == (alpha >= 9) for alpha in range(1000))

    # If a nine-vertex graph has alpha nine, it has no edge, hence its
    # independence polynomial is (1+x)^9.  This is the sole target-prefix
    # case not covered by the order-at-least-ten dependency theorem.
    q4, q5, q6 = comb(9, 4), comb(9, 5), comb(9, 6)
    exceptional_reserve = 10 * q5**2 - q4 * q5 - 12 * q4 * q6
    exceptional_iso = 5 * q5**2 + q4**2 - 6 * q4 * q6
    assert (q4, q5, q6) == (126, 126, 84)
    assert exceptional_reserve == 15_876
    assert exceptional_iso == 31_752

    report = {
        "marker": "PASS_EXACT_RANK5_THREE_HALVES_TO_PREFIX_ISO_BRIDGE",
        "dependency": (
            "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md proves "
            "S5>=0 for every forest of order at least ten"
        ),
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "definitions": {
            "S5": "10 p5^2-p4 p5-12 p4 p6",
            "ISO5": "5 p5^2+p4^2-6 p4 p6",
            "L(alpha)": "floor((2 alpha+1)/3)",
        },
        "bridge_identity": "ISO5=S5/2+p4^2+p4 p5/2",
        "cutoff_equivalence": "5<L(alpha) iff alpha>=9",
        "small_order_completion": {
            "reason": (
                "alpha>=9 and order<10 forces order=alpha=9; any edge "
                "would lower alpha, so F=9K1"
            ),
            "coefficients_p4_p5_p6": [q4, q5, q6],
            "S5": exceptional_reserve,
            "ISO5": exceptional_iso,
        },
        "conclusion": (
            "Every forest satisfies ISO5 at every prefix-relevant rank-five "
            "cell.  Target ISO5 needs no FML induction; this does not remove "
            "internal D5/N5 dependencies used by higher target ranks."
        ),
        "scope": (
            "Exact assembly from the cited dependency theorem; this script "
            "does not reprove that theorem or establish any rank r>=6."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
