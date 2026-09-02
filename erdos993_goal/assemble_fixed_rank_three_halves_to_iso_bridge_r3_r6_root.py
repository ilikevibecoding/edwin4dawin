#!/usr/bin/env python3
"""Bridge proved fixed-rank three-halves reserves to the ISO quantities.

For every rank r,

  S_r = 2r p_r^2-p_(r-1)p_r-2(r+1)p_(r-1)p_(r+1),
  ISO_r = r p_r^2+p_(r-1)^2-(r+1)p_(r-1)p_(r+1),

and ISO_r=S_r/2+p_(r-1)^2+p_(r-1)p_r/2.
The dependency theorems currently cover every prefix-relevant forest at
ranks 3, 4, 5, and 6 (with the unique order-nine rank-five boundary checked
directly here).
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "fixed_rank_three_halves_to_iso_bridge_r3_r6_root_20260829.json"


def cutoff(alpha: int) -> int:
    return (2 * alpha + 1) // 3


def required_alpha(rank: int) -> int:
    return math.ceil((3 * rank + 2) / 2)


def main() -> None:
    r, a, b, c = sp.symbols("r a b c", integer=True, positive=True)
    reserve = 2 * r * b**2 - a * b - 2 * (r + 1) * a * c
    iso = r * b**2 + a**2 - (r + 1) * a * c
    payment = a**2 + sp.Rational(1, 2) * a * b
    assert sp.expand(iso - sp.Rational(1, 2) * reserve - payment) == 0

    thresholds = {rank: required_alpha(rank) for rank in range(3, 7)}
    assert thresholds == {3: 6, 4: 7, 5: 9, 6: 10}
    for rank, threshold in thresholds.items():
        assert all(
            (rank < cutoff(alpha)) == (alpha >= threshold)
            for alpha in range(0, 1000)
        )

    # The rank-five forest theorem is stated for order at least ten.  If a
    # prefix-relevant forest has alpha>=9 and order nine, it must be 9K1.
    p4, p5, p6 = math.comb(9, 4), math.comb(9, 5), math.comb(9, 6)
    reserve5_edgeless9 = 10 * p5 * p5 - p4 * p5 - 12 * p4 * p6
    iso5_edgeless9 = 5 * p5 * p5 + p4 * p4 - 6 * p4 * p6
    assert (p4, p5, p6) == (126, 126, 84)
    assert reserve5_edgeless9 == 15876
    assert iso5_edgeless9 == 31752
    assert 2 * iso5_edgeless9 == reserve5_edgeless9 + 2 * p4 * p4 + p4 * p5

    report = {
        "marker": "PASS_EXACT_FIXED_RANK_THREE_HALVES_TO_ISO_BRIDGE_R3_R6",
        "identity": (
            "ISO_r=S_r/2+p_(r-1)^2+p_(r-1)p_r/2, where "
            "S_r=2r p_r^2-p_(r-1)p_r-2(r+1)p_(r-1)p_(r+1)"
        ),
        "prefix_thresholds": {str(key): value for key, value in thresholds.items()},
        "dependencies": {
            "r=3": "proved rank-three three-halves forest certificate",
            "r=4": "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md, alpha>=7",
            "r=5": "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md, order>=10",
            "r=6": "RANK6_FOREST_THREE_HALVES_THEOREM_2026-08-13.md, alpha>=10",
        },
        "rank5_order9_boundary": {
            "reason": "alpha>=9 and order=9 forces the edgeless forest 9K1",
            "coefficients_p4_p5_p6": [p4, p5, p6],
            "S5": reserve5_edgeless9,
            "ISO5": iso5_edgeless9,
        },
        "conclusion": (
            "Once the listed reserve certificates are accepted, required ISO "
            "is strict at every prefix-relevant cell of ranks 3 through 6."
        ),
        "scope": (
            "This is an exact assembly from dependency theorems. It does not "
            "prove those theorems, any D/N auxiliary sign, or any rank r>=7."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
