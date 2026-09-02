#!/usr/bin/env python3
"""Assemble the proved all-forest rank-six reserve into prefix ISO_6.

Dependency theorem: every forest with alpha at least ten satisfies

    S6 = 12 p6^2 - p5 p6 - 14 p5 p7 >= 0.

That alpha range is exactly the range in which rank six lies in the strict
prefix.  This is a dependency bridge, not a replay of the reserve theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "RANK6_FOREST_THREE_HALVES_THEOREM_2026-08-13.md"


def cutoff(alpha: int) -> int:
    return (2 * alpha + 1) // 3


def main() -> None:
    p5, p6, p7 = sp.symbols("p5 p6 p7", nonnegative=True)
    reserve = 12 * p6**2 - p5 * p6 - 14 * p5 * p7
    iso = 6 * p6**2 + p5**2 - 7 * p5 * p7
    payment = p5**2 + sp.Rational(1, 2) * p5 * p6
    assert sp.expand(iso - sp.Rational(1, 2) * reserve - payment) == 0
    assert all((6 < cutoff(alpha)) == (alpha >= 10) for alpha in range(1000))

    report = {
        "marker": "PASS_EXACT_RANK6_THREE_HALVES_TO_PREFIX_ISO_BRIDGE",
        "dependency": (
            "RANK6_FOREST_THREE_HALVES_THEOREM_2026-08-13.md proves "
            "S6>=0 for every forest with alpha>=10"
        ),
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "definitions": {
            "S6": "12 p6^2-p5 p6-14 p5 p7",
            "ISO6": "6 p6^2+p5^2-7 p5 p7",
            "L(alpha)": "floor((2 alpha+1)/3)",
        },
        "bridge_identity": "ISO6=S6/2+p5^2+p5 p6/2",
        "cutoff_equivalence": "6<L(alpha) iff alpha>=10",
        "conclusion": (
            "Every forest satisfies ISO6 at every prefix-relevant rank-six "
            "cell.  Target ISO6 needs no FML induction; this does not remove "
            "internal D/N dependencies used by higher target ranks."
        ),
        "scope": (
            "Exact assembly from the cited dependency theorem; this script "
            "does not reprove that theorem or establish any rank r>=7."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
