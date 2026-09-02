#!/usr/bin/env python3
"""Literal exact sign census for distance-seven double-broom m=0 payments."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

from probe_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_sparse_root import (
    core_terms,
    fixed_coefficient,
)


DISTANCE = 7
HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance7_double_broom_literal_"
    "probe_root_20260831.json"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    cells = 0
    minimum = None
    negatives = []
    stream = hashlib.sha256()
    per_target = {}
    for small_int in range(1, 16):
        for large_int in range(small_int, 51):
            large = Fraction(large_int)
            small = Fraction(small_int)
            f_terms, z_terms = core_terms(DISTANCE, large, small)
            n = large_int + small_int
            order = n + DISTANCE + 1
            independent = [
                fixed_coefficient(f_terms, rank, large, small)
                for rank in range(order + 1)
            ]
            one_edge = [
                fixed_coefficient(z_terms, rank, large, small)
                for rank in range(order + 1)
            ]
            f2 = independent[2]
            p0 = independent[3] + 2 * f2 + order
            r0 = one_edge[4] + 2 * one_edge[3] + one_edge[2]
            c0 = one_edge[3] + 2 * f2
            determinant = p0 * c0 - f2 * r0
            assert determinant > 0
            for target in range(4, order + 1):
                fj = independent[target]
                if fj == 0:
                    continue
                value = (
                    (target + 1)
                    * f2
                    * determinant
                    * (
                        independent[target + 1]
                        + 2 * fj
                        + independent[target - 1]
                    )
                    + f2
                    * p0
                    * (
                        (target + 1) * fj * (c0 + r0)
                        - 3
                        * (p0 + f2)
                        * (one_edge[target + 1] + 2 * fj)
                    )
                )
                assert value.denominator == 1
                integer = value.numerator
                record = (integer, large_int, small_int, target)
                if minimum is None or record < minimum:
                    minimum = record
                if integer <= 0:
                    negatives.append(record)
                per_target[str(target)] = per_target.get(str(target), 0) + 1
                stream.update(
                    f"{large_int}|{small_int}|{target}|{integer}\n".encode()
                )
                cells += 1

    payload = {
        "status": "PASS_FINITE_PROBE" if not negatives else "NONPOSITIVE_FOUND",
        "scope": {
            "distance": DISTANCE,
            "small_side_maximum": 15,
            "large_side_maximum": 50,
            "targets": "every supported j>=4",
        },
        "cells": cells,
        "minimum": {
            "value": minimum[0],
            "large": minimum[1],
            "small": minimum[2],
            "j": minimum[3],
        },
        "nonpositive_count": len(negatives),
        "first_nonpositive": negatives[:20],
        "per_target": per_target,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": (
            "Finite exact evidence only; this is not an all-order theorem and "
            "does not close the distance-seven family."
        ),
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps(payload, indent=2, sort_keys=True))
    print("REPORT_SHA256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
