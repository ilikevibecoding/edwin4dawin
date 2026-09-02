#!/usr/bin/env python3
"""Exact obstruction to replacing the canonical H row by one path.

The frozen H-graft tangent remains valid.  This script only disproves the
extra scalarization that replaces the canonical S-vertex linear-forest row by
P_S before paying the negative K term with the matching ceiling.
"""

from __future__ import annotations

import hashlib
import json
import os
from fractions import Fraction
from math import comb
from pathlib import Path

from audit_terminal_q3_m0_d1_lowblock_tangent_reduction_adversary import (
    block_data,
    coefficient,
    h_lower,
    tangent_ratio,
)
from prove_d1_spider_quantitative_qgap_cap_adversary import h_concentrated_row


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "d1_path_h_matching_scalarization_obstruction_exact_adversary_20260829.json"
NOTE = ROOT / "D1_PATH_H_MATCHING_SCALARIZATION_OBSTRUCTION_2026-08-29.md"
PINS = {
    "audit_terminal_q3_m0_d1_lowblock_tangent_reduction_adversary.py": "93B3B2438FCFB37BFF6567A0FAA2729FC2FB3F1DC90A115066597F98888C9171",
    "terminal_q3_m0_d1_lowblock_tangent_reduction_exact_adversary_20260829.json": "3E770AF53F614654C515F6856EB85BDA12CCFED9825C88DE394FDFC11796D25A",
    "prove_balanced_subdivided_star_m0_row_correlation_adversary.py": "D9D4F8F7B7F3609C886B8FF354862DE9A5E15FBD7550A693ED3B3121B1BBD73E",
    "balanced_subdivided_star_m0_row_correlation_exact_adversary_20260829.json": "A7F2CD73425A74B26ADB20847DDDB2E87F44100D6438D62D0F612D21727164C7",
    "prove_linear_forest_matching_coefficient_ceiling_adversary.py": "715E50A1903A4293F2EF92C56B60574416142F94F0366A1D3C04B4C1B22346BE",
    "linear_forest_matching_coefficient_ceiling_exact_adversary_20260829.json": "CE85E81366D0B36797FB40E1F01E304189F3227786939BFA830E319E7322C594",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def path_coefficient(vertices: int, rank: int) -> int:
    return C(vertices + 1 - rank, rank)


def matching_coefficient(T: int, Y: int, rank: int) -> int:
    matching = (T - Y + 1) // 2
    isolates = T - 2 * matching
    return sum(
        C(matching, selected) * 2**selected * C(isolates, rank - selected)
        for selected in range(rank + 1)
    )


def exact_obstruction() -> dict[str, object]:
    N, rank, R, T, Y = 31, 5, 29, 1, 1
    S = R + T
    data = block_data(N, rank, R, T, Y)
    lead, BH, BK = data["lead"], data["BH"], data["BK"]
    assert (data["uH"], data["uI"]) == (Fraction(1, 32), Fraction(0))
    assert (lead, BH, BK) == (
        Fraction(26_156_010),
        Fraction(-1_244_072_127, 16),
        Fraction(-12_128_274),
    )

    canonical = h_concentrated_row(R, T, Y)
    canonical_value = (
        lead
        * (coefficient(canonical, rank - 1) + coefficient(canonical, rank + 1))
        + BH * coefficient(canonical, rank)
    )
    exact_h_lower, h_common = h_lower(R, T, Y, rank, lead, BH)
    assert canonical_value == exact_h_lower == Fraction(39_011_191_001_055, 8)
    assert h_common == Fraction(30_257_303_403, 176) > 0

    path_value = (
        lead
        * (path_coefficient(S, rank - 1) + path_coefficient(S, rank + 1))
        + BH * path_coefficient(S, rank)
    )
    matching = matching_coefficient(T, Y, rank - 1)
    rho = tangent_ratio(T, rank - 1)
    k_common = lead * rho + BK
    paid_path_value = path_value + (k_common * matching if k_common < 0 else 0)
    assert rho == 0 and matching == 0 and k_common == BK < 0
    assert path_value == paid_path_value == Fraction(-93_696_742_515, 4)

    sigma = Fraction((S - 2 * rank) * (S - 2 * rank + 1), (rank - 1) * (S - rank - 1))
    join_slope = lead * sigma + BH
    assert sigma == Fraction(35, 8)
    assert join_slope == Fraction(586_848_573, 16) > 0
    return {
        "parameters": {"N": N, "S": S, "j": rank, "R": R, "T": T, "Y": Y},
        "caps": {"uH": str(data["uH"]), "uI": str(data["uI"])},
        "lead": str(lead),
        "BH": str(BH),
        "BK": str(BK),
        "path_join_sigma": str(sigma),
        "path_join_slope": str(join_slope),
        "matching_ceiling_at_j_minus_1": matching,
        "path_scalarized_value": str(path_value),
        "paid_path_scalarized_value": str(paid_path_value),
        "exact_canonical_H_lower": str(exact_h_lower),
        "consequence": (
            "The path-joining comparison is valid at this cell, but the path "
            "endpoint itself is negative.  Replacing the exact canonical H row "
            "by P_S therefore cannot prove the all-order payment cone."
        ),
    }


def bounded_audit() -> dict[str, object]:
    """Replay the scalarization in a lexicographic box using frozen formulas."""
    checks = negatives = 0
    first_negative = None
    stream = hashlib.sha256()
    for S in range(14, 31):
        N = S + 1
        for R in range(1, S):
            T = S - R
            for Y in range(1, min(R, T) + 1):
                for rank in range(5, min(30, S) + 1):
                    data = block_data(N, rank, R, T, Y)
                    lead, BH, BK = data["lead"], data["BH"], data["BK"]
                    path_value = (
                        lead
                        * (
                            path_coefficient(S, rank - 1)
                            + path_coefficient(S, rank + 1)
                        )
                        + BH * path_coefficient(S, rank)
                    )
                    rho = tangent_ratio(T, rank - 1)
                    common = lead * rho + BK
                    matching = matching_coefficient(T, Y, rank - 1)
                    paid = path_value + (common * matching if common < 0 else 0)
                    record = (paid, N, rank, R, T, Y)
                    if paid < 0:
                        negatives += 1
                        if first_negative is None:
                            first_negative = record
                    stream.update(f"{N}:{rank}:{R}:{T}:{Y}:{paid}\n".encode())
                    checks += 1
    expected = (Fraction(-93_696_742_515, 4), 31, 5, 29, 1, 1)
    assert first_negative == expected
    return {
        "box": {"S": [14, 30], "j": [5, 30]},
        "exact_cells": checks,
        "negative_scalarized_cells": negatives,
        "first_lexicographic_negative": [str(value) for value in first_negative],
        "ordered_scalarized_stream_sha256": stream.hexdigest().upper(),
    }


def note_text() -> str:
    return """# Obstruction to the d=1 path-H/matching scalarization

Date: 2026-08-29

The exact canonical `H` row cannot be replaced globally by the single path
row `P_S` in the terminal-`m=0`, `d=1` payment lower.  The first cell in the
exact audit ordered by `(S,R,Y,j)` is

```text
(N,S,j,R,T,Y)=(31,30,5,29,1,1).
```

At this cell the path-joining slope is positive,
`586848573/16`, so the frozen joining direction is not at fault.  However the
scalarized path functional equals `-93696742515/4`.  The matching ceiling at
rank `j-1=4` is zero, so there is no matching payment.  In contrast, the
exact canonical-H tangent lower is `39011191001055/8 > 0`.

This is only an obstruction to the extra path scalarization.  It is not a
negative terminal cell, not a counterexample to terminal Newton `m=0`, and
not a counterexample to Erdős Problem #993.  The exact canonical-H versus
matching coefficient cone remains open.
"""


def main() -> None:
    for filename, expected in PINS.items():
        actual = sha256(ROOT / filename)
        assert actual == expected, (filename, actual, expected)
    obstruction = exact_obstruction()
    audit = bounded_audit()
    NOTE.write_text(note_text(), encoding="utf-8")
    payload = {
        "schema": "d1-path-h-matching-scalarization-obstruction-exact-adversary-v1",
        "status": "FAIL_EXACT_D1_PATH_H_MATCHING_SCALARIZATION",
        "dependency_sha256": PINS,
        "exact_obstruction": obstruction,
        "bounded_audit": audit,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This falsifies only the path-H scalarization. The exact canonical "
            "H lower is positive at the obstruction."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("obstruction", obstruction)
    print("audit", audit)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
