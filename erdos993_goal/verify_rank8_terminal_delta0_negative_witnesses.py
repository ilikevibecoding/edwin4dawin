#!/usr/bin/env python3
"""Independent bit-mask replay of the four rank-eight Delta0 controls."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


WITNESSES = [
    (11, [0, 1, 2, 3, 3, 3, 1, 2, 3, 2, 3], 6, -448),
    (12, [0, 1, 2, 3, 2, 3, 1, 2, 3, 2, 2, 1], 1, -7168),
    (13, [0, 1, 2, 3, 2, 3, 2, 1, 2, 1, 2, 1, 2], 0, -204800),
    (14, [0, 1, 2, 3, 2, 3, 2, 3, 1, 2, 3, 2, 3, 1], 8, -10537632),
]


def adjacency(layout: list[int]) -> list[int]:
    masks = [0] * len(layout)
    stack: list[int] = []
    for vertex, level in enumerate(layout):
        if stack:
            while layout[stack[-1]] >= level:
                stack.pop()
            parent = stack[-1]
            masks[vertex] |= 1 << parent
            masks[parent] |= 1 << vertex
        stack.append(vertex)
    return masks


def independence_polynomial(masks: list[int], deleted: int | None = None) -> list[int]:
    n = len(masks)
    counts = [0] * (n + 1)
    for subset in range(1 << n):
        if deleted is not None and subset & (1 << deleted):
            continue
        if all(not (subset & (1 << v)) or not (subset & masks[v]) for v in range(n)):
            counts[subset.bit_count()] += 1
    while counts and counts[-1] == 0:
        counts.pop()
    return counts


def coefficient(values: list[int], rank: int) -> int:
    return values[rank] if rank < len(values) else 0


def smooth(values: list[int], rank: int, t: int) -> int:
    return sum(
        math.comb(t, j) * coefficient(values, rank - j)
        for j in range(min(rank, t) + 1)
    )


def residual(core: list[int], deleted: list[int], t: int) -> int:
    c7 = coefficient(core, 7)
    c8 = coefficient(core, 8)
    h6 = coefficient(deleted, 6)
    h7 = coefficient(deleted, 7)
    p7 = smooth(core, 7, t) + h6
    p8 = smooth(core, 8, t) + h7
    p9_open = sum(
        math.comb(t, j) * coefficient(core, 9 - j)
        for j in range(1, min(9, t) + 1)
    )
    return (
        8 * c7 * h6 * (16 * p8 * p8 - p7 * p8 - 18 * p7 * p9_open)
        - 8 * h6 * p7 * (16 * c8 * c8 - c7 * c8)
        - 9 * c7 * p7 * (14 * h7 * h7 - h6 * h7)
    )


def q8(values: list[int]) -> int:
    i7, i8, i9 = (coefficient(values, rank) for rank in (7, 8, 9))
    return 16 * i8 * i8 - i7 * i8 - 18 * i7 * i9


def q7(values: list[int]) -> int:
    i6, i7, i8 = (coefficient(values, rank) for rank in (6, 7, 8))
    return 14 * i7 * i7 - i6 * i7 - 16 * i6 * i8


def terminal_polynomial(core: list[int], deleted: list[int], t: int) -> list[int]:
    return [
        smooth(core, rank, t) + (coefficient(deleted, rank - 1) if rank else 0)
        for rank in range(10)
    ]


def forward_coefficients(values: list[int]) -> list[int]:
    out = [values[0]]
    while len(values) > 1:
        values = [right - left for left, right in zip(values, values[1:])]
        out.append(values[0])
    return out


def main() -> None:
    rows = []
    for order, layout, root, expected in WITNESSES:
        masks = adjacency(layout)
        assert sum(mask.bit_count() for mask in masks) == 2 * (order - 1)
        core = independence_polynomial(masks)
        deleted = independence_polynomial(masks, root)
        values = [residual(core, deleted, t) for t in range(1, 6)]
        deltas = [values[0]]
        for _ in range(4):
            values = [right - left for left, right in zip(values, values[1:])]
            deltas.append(values[0])
        assert deltas[0] == expected
        assert all(value > 0 for value in deltas[1:])
        alpha = len(core) - 1
        assert alpha <= order - 1 <= 13
        required_t = max(1, 14 - alpha)
        full_values = [
            q8(terminal_polynomial(core, deleted, t))
            for t in range(required_t, required_t + 17)
        ]
        shifted_full_deltas = forward_coefficients(full_values)
        while shifted_full_deltas and shifted_full_deltas[-1] == 0:
            shifted_full_deltas.pop()
        assert all(value > 0 for value in shifted_full_deltas)
        rows.append(
            {
                "order": order,
                "layout": layout,
                "root": root,
                "alpha_core": alpha,
                "core_polynomial": core,
                "deleted_polynomial": deleted,
                "Delta0_through_Delta4": deltas,
                "Q8_core": q8(core),
                "Q7_deleted": q7(deleted),
                "outside_required_Q8_range": alpha < 14,
                "first_required_sibling_count": required_t,
                "shifted_full_Q8_Newton_coefficients": shifted_full_deltas,
                "full_terminal_family_Q8_nonnegative_for_all_required_t": True,
            }
        )

    output = Path(__file__).with_name(
        "rank8_terminal_delta0_negative_witnesses_exact_20260820.json"
    )
    payload = {
        "status": "PASS_INDEPENDENT_RANK8_TERMINAL_DELTA0_NEGATIVE_WITNESSES",
        "method": "complete bit-mask independent-set enumeration; independent residual and forward-difference implementation",
        "rows": rows,
        "interpretation": "These are exact counterexamples to universal Delta0 residual positivity, but every core has alpha<14. Expanding the literal full Q8 terminal family at the first required sibling count gives only positive Newton coefficients for each control, so none is a counterexample to the proposed Q8 theorem.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
