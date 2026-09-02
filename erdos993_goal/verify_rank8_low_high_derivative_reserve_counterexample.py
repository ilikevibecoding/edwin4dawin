#!/usr/bin/env python3
"""Exact counterexample to the proposed derivative-reserve inequality R>=0.

The full strong auxiliary H remains positive.  Hence this is a proof-method
obstruction only, not a low/high cone or graph counterexample.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_derivative_reserve_counterexample_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficients(ratios: list[int]) -> list[int]:
    out = [1]
    for ratio in ratios:
        out.append(out[-1] * ratio)
    return out


def convolution(left: list[int], right: list[int], rank: int) -> int:
    return sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    )


def main() -> None:
    h = 1
    left_ratios = [9, 7, 6, 5, 4, 3, 2, 1, 0]
    right_ratios = [1009, 1007, 1006, 1005, 1004, 1003, 1002, 1001, 1000]
    left, right = coefficients(left_ratios), coefficients(right_ratios)
    tail = [0] * 3 + left[3:]
    c7, c8, c9 = (convolution(left, right, rank) for rank in (7, 8, 9))
    v7, v8, v9 = (convolution(tail, right, rank) for rank in (7, 8, 9))
    margin = c8 * c8 - c7 * c9 - h * c7 * c8
    derivative = 2 * c8 * v8 - v7 * c9 - c7 * v9
    derivative -= h * (v7 * c8 + c7 * v8)
    kernel = 196 * right[6] ** 2 - 168 * right[5] * right[7]
    target = left[1] * left[2] * kernel
    C = left_ratios[2]
    payment = margin - h * target
    reserve = derivative + C * target
    strong = C * margin + h * derivative
    assert margin == 10221635324013410102196885813757121906304000
    assert derivative == -2948130178562995665302039011360069000636800
    assert target == 17091098363051665209062314825385591827200
    assert payment == 10204544225650358436987823498931736314476800
    assert reserve == -2845583588384685674047665122407755449673600
    assert strong == 58381681765517464947879275871182662437187200
    assert strong == C * payment + h * reserve
    assert margin > 0 and payment > 0 and strong > 0 and reserve < 0

    payload = {
        "schema": "rank8-low-high-derivative-reserve-counterexample-v1",
        "status": "EXACT_DERIVATIVE_RESERVE_COUNTEREXAMPLE_NOT_CONE_COUNTEREXAMPLE",
        "h": h,
        "left_ratios": left_ratios,
        "right_ratios": right_ratios,
        "C": C,
        "M0": margin,
        "d": derivative,
        "T": target,
        "P_equals_M0_minus_hT": payment,
        "R_equals_d_plus_CT": reserve,
        "H_equals_CM0_plus_hd": strong,
        "identity": "H=C*P+h*R",
        "identity_remainder": strong - (C * payment + h * reserve),
        "classification": (
            "R<0 disproves the proposed separate derivative-reserve theorem. "
            "M0,P,H are all positive, so the row is not a low/high cone, tree, "
            "forest, PGC, or Problem 993 counterexample.  A direct joint proof of H is required."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("R", reserve, "H", strong)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
