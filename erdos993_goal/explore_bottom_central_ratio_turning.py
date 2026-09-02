#!/usr/bin/env python3
"""Map turning points of row ratios in the central inverse-M-matrix.

For rows a<b and columns u<v with u>=b, a 2-minor has the sign of

    K[a,u]/K[b,u] - K[a,v]/K[b,v].

The adjacent signs therefore reveal whether each row-ratio sequence has a
simple one-turn shape, which would reduce all order-two signs to a threshold.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks


OUT = Path("bottom_central_ratio_turning_20260803.json")


def sign_word(values) -> str:
    return "".join("+" if value > 0 else "-" if value < 0 else "0" for value in values)


def variations(word: str) -> int:
    clean = [character for character in word if character != "0"]
    return sum(left != right for left, right in zip(clean, clean[1:]))


def main() -> None:
    records = []
    maximum_variations = 0

    for d in range(4, 31):
        K = central_inverse_from_blocks(d).inv()
        local = []
        for a in range(d - 2):
            for b in range(a + 1, d - 1):
                adjacent = []
                for u in range(b, d - 2):
                    adjacent.append(
                        sp.cancel(
                            K[a, u] * K[b, u + 1]
                            - K[a, u + 1] * K[b, u]
                        )
                    )
                word = sign_word(adjacent)
                count = variations(word)
                maximum_variations = max(maximum_variations, count)
                local.append(
                    {
                        "a": a,
                        "b": b,
                        "sign_word": word,
                        "variations": count,
                        "first_nonnegative": next(
                            (b + index for index, value in enumerate(adjacent) if value >= 0),
                            None,
                        ),
                    }
                )
        bad = [item for item in local if item["variations"] > 1]
        print(
            f"d={d} max_variations={max((item['variations'] for item in local), default=0)} "
            f"bad={len(bad)}",
            flush=True,
        )
        records.append({"d": d, "pairs": local})

    report = {
        "kind": "bottom_central_row_ratio_turning_audit",
        "status": "PASS_ONE_TURN" if maximum_variations <= 1 else "FAIL_ONE_TURN",
        "d_range": [4, 30],
        "maximum_adjacent_sign_variations": maximum_variations,
        "interpretation": (
            "Adjacent two-minor signs encode successive differences of each "
            "row-ratio sequence.  At most one variation means each ratio is "
            "unimodal, but does not alone classify non-adjacent differences."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
