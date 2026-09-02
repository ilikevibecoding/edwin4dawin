#!/usr/bin/env python3
"""Exact central-support obstruction to the path-H scalarization.

This is deliberately a fail-closed relaxation audit.  The exact canonical-H
payment is positive at the obstruction, so no terminal theorem counterexample
is asserted.
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
OUTPUT = ROOT / "d1_central_path_matching_scalarization_obstruction_exact_adversary_20260829.json"
NOTE = ROOT / "D1_CENTRAL_PATH_MATCHING_SCALARIZATION_OBSTRUCTION_2026-08-29.md"
PINS = {
    "audit_terminal_q3_m0_d1_lowblock_tangent_reduction_adversary.py": "93B3B2438FCFB37BFF6567A0FAA2729FC2FB3F1DC90A115066597F98888C9171",
    "terminal_q3_m0_d1_lowblock_tangent_reduction_exact_adversary_20260829.json": "3E770AF53F614654C515F6856EB85BDA12CCFED9825C88DE394FDFC11796D25A",
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


def scalarized_value(S: int, rank: int, R: int, T: int, Y: int) -> Fraction:
    data = block_data(S + 1, rank, R, T, Y)
    lead, BH, BK = data["lead"], data["BH"], data["BK"]
    path_h = (
        lead
        * (path_coefficient(S, rank - 1) + path_coefficient(S, rank + 1))
        + BH * path_coefficient(S, rank)
    )
    common = lead * tangent_ratio(T, rank - 1) + BK
    matching = matching_coefficient(T, Y, rank - 1)
    return path_h + (common * matching if common < 0 else 0)


def exact_obstruction() -> dict[str, object]:
    N, S, rank, R, T, Y = 73, 72, 33, 23, 49, 23
    assert S >= 2 * rank + 1 and T + Y >= 2 * rank - 2
    data = block_data(N, rank, R, T, Y)
    lead, BH, BK = data["lead"], data["BH"], data["BK"]
    rho = tangent_ratio(T, rank - 1)
    common = lead * rho + BK
    matching = matching_coefficient(T, Y, rank - 1)
    path_h = (
        lead
        * (path_coefficient(S, rank - 1) + path_coefficient(S, rank + 1))
        + BH * path_coefficient(S, rank)
    )
    paid = path_h + common * matching
    assert (data["H_cap_branch"], data["K_cap_branch"]) == ("empty", "empty")
    assert (lead, BH, BK, rho, matching) == (
        Fraction(7_468_208_494),
        Fraction(8_521_350_076_753, 62),
        Fraction(-141_362_231_662, 5),
        Fraction(0),
        214_359_552,
    )
    assert path_h == Fraction(160_677_049_217_817_333_448, 31)
    assert paid == Fraction(-135_987_438_023_295_930_904, 155) < 0

    canonical = h_concentrated_row(R, T, Y)
    canonical_h = (
        lead
        * (coefficient(canonical, rank - 1) + coefficient(canonical, rank + 1))
        + BH * coefficient(canonical, rank)
    )
    exact_h_lower, h_common = h_lower(R, T, Y, rank, lead, BH)
    assert canonical_h == exact_h_lower == Fraction(
        3_315_469_591_309_835_642_077_184, 31
    )
    canonical_paid = exact_h_lower + common * matching
    assert canonical_paid == Fraction(
        16_576_408_583_865_065_827_787_776, 155
    ) > 0
    assert h_common == Fraction(192_135_527_037_742, 1_395) > 0

    sigma = Fraction(
        (S - 2 * rank) * (S - 2 * rank + 1),
        (rank - 1) * (S - rank - 1),
    )
    join_slope = lead * sigma + BH
    assert sigma == Fraction(21, 608)
    assert join_slope == Fraction(1_297_676_113_531_253, 9_424) > 0
    return {
        "parameters": {"N": N, "S": S, "j": rank, "R": R, "T": T, "Y": Y},
        "central_support_guards": {
            "S>=2j+1": True,
            "T+Y>=2j-2": True,
            "matching_ceiling_positive": matching > 0,
            "path_join_sigma_positive": sigma > 0,
        },
        "cap_branches": {"H": data["H_cap_branch"], "K": data["K_cap_branch"]},
        "lead": str(lead),
        "BH": str(BH),
        "BK": str(BK),
        "K_tangent_rho": str(rho),
        "K_common": str(common),
        "matching_ceiling": matching,
        "path_join_sigma": str(sigma),
        "path_join_slope": str(join_slope),
        "path_H_value": str(path_h),
        "path_scalarized_paid_value": str(paid),
        "exact_canonical_H_value": str(exact_h_lower),
        "exact_canonical_paid_value": str(canonical_paid),
    }


def bounded_audit() -> dict[str, object]:
    checks = negatives = 0
    first_negative = None
    stream = hashlib.sha256()
    for S in range(71, 73):
        for R in range(1, S):
            T = S - R
            for Y in range(1, min(R, T) + 1):
                for rank in range(5, min(45, (S - 1) // 2) + 1):
                    if T + Y < 2 * rank - 2:
                        continue
                    value = scalarized_value(S, rank, R, T, Y)
                    record = (value, S, rank, R, T, Y)
                    if value < 0:
                        negatives += 1
                        if first_negative is None:
                            first_negative = record
                    stream.update(f"{S}:{rank}:{R}:{T}:{Y}:{value}\n".encode())
                    checks += 1
    expected = (
        Fraction(-135_987_438_023_295_930_904, 155),
        72,
        33,
        23,
        49,
        23,
    )
    assert checks == 53_072
    assert negatives == 9
    assert first_negative == expected
    return {
        "box": {"S": [71, 72], "j": [5, 35]},
        "central_exact_cells": checks,
        "negative_scalarized_cells": negatives,
        "first_lexicographic_negative": [str(value) for value in first_negative],
        "ordered_scalarized_stream_sha256": stream.hexdigest().upper(),
    }


def note_text() -> str:
    return """# Central-support obstruction to path-H/matching scalarization

Date: 2026-08-29

The proposed central block retained the guards `S>=2j+1` and
`T+Y>=2j-2`, so both the path-join ratio and the matching coefficient are
supported.  It is nevertheless false.  The first negative in the exact
`S=71,72` audit is

```text
(N,S,j,R,T,Y)=(73,72,33,23,49,23).
```

The path-scalarized payment is
`-135987438023295930904/155`.  Both structural guards are strict, and the
path-joining slope itself is positive.  The failure is the extra replacement
of the canonical H row by `P_S`.

The exact canonical-H payment at the same cell is
`16576408583865065827787776/155 > 0`.  Thus this is not a negative terminal
cell, not a terminal-`m=0` counterexample, and not a counterexample to Erdős
Problem #993.  It only proves that no all-order central PF/Bonferroni block
based on the path scalarization can close the cone.
"""


def main() -> None:
    for filename, expected in PINS.items():
        actual = sha256(ROOT / filename)
        assert actual == expected, (filename, actual, expected)
    obstruction = exact_obstruction()
    audit = bounded_audit()
    NOTE.write_text(note_text(), encoding="utf-8")
    payload = {
        "schema": "d1-central-path-matching-scalarization-obstruction-exact-adversary-v1",
        "status": "FAIL_EXACT_D1_CENTRAL_PATH_MATCHING_SCALARIZATION",
        "dependency_sha256": PINS,
        "exact_obstruction": obstruction,
        "bounded_audit": audit,
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This falsifies only the central path-H scalarization. The exact "
            "canonical-H payment is positive at the obstruction."
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
