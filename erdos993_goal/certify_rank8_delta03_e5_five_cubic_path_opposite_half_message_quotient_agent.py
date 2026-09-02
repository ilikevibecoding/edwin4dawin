#!/usr/bin/env python3
"""Canonical exact quotient for the opposite five-cubic-path half.

The four still-open large path-internal CUDA layouts all contain one
unselected five-coordinate half in the canonical 12,544-state order.  The
residual formula sees that half only through its two rank-eight parent
messages.  This certificate groups states with identical full messages and,
when the first long coordinate lies in this half, verifies the entire offset
message curve by nine exact points (degree at most eight).

This is a computational quotient only.  It preserves each raw domain state
through an explicit representative map and multiplicity ledger; it does not
identify root orbits or prove a residual sign.
"""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter
from pathlib import Path

import numpy as np

import probe_rank8_delta03_e5_five_cubic_path_half_message_reuse_agent as message
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as center


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_"
    "exact_agent_20260825.json"
)
EXPECTED = {
    "probe_rank8_delta03_e5_five_cubic_path_half_message_reuse_agent.py":
        "FEAC36F2A48813EAA4A8CF32D9C40E4645AE89A04C4014F4A5DC403F1B5B6A2A",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "verify_rank8_stable_path_offset_transfer_agent.py":
        "2EB0B6E4F073F0FC90FB023D2EC265D4C28CC58C5DF710EF45E17471085D578E",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def signature(state: tuple[int, ...]) -> tuple[int, ...]:
    free, blocked = message.far_parts(*state)
    return (*free, *blocked)


def offset_signature(
    state: tuple[int, ...], varying: int
) -> tuple[int, ...]:
    values: list[int] = []
    for offset in range(message.WIDTH):
        shifted = list(state)
        shifted[varying] += offset
        values.extend(signature(tuple(shifted)))
    return tuple(values)


def canonical_map(
    signatures: list[tuple[int, ...] | None], eligible: list[bool]
) -> tuple[list[int], Counter[int]]:
    first: dict[tuple[int, ...], int] = {}
    representatives = [-1] * len(signatures)
    sizes: Counter[int] = Counter()
    for index, (key, allowed) in enumerate(zip(signatures, eligible)):
        if not allowed:
            assert key is None
            continue
        assert key is not None
        representative = first.setdefault(key, index)
        representatives[index] = representative
        sizes[representative] += 1
    return representatives, sizes


def mapping_digest(*rows: list[int]) -> str:
    body = b"".join(
        np.asarray(row, dtype="<i4").tobytes(order="C") for row in rows
    )
    return hashlib.sha256(body).hexdigest().upper()


def histogram(sizes: Counter[int]) -> dict[str, int]:
    values = Counter(sizes.values())
    return {str(size): count for size, count in sorted(values.items())}


def main() -> None:
    # The immutable-input drift guard below intentionally fails if any input
    # has drifted.  Compute before importing the quotient into a production
    # driver.
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    transfer = json.loads(
        (ROOT / "rank8_stable_path_offset_transfer_exact_agent_20260822.json")
        .read_text(encoding="utf-8")
    )
    assert transfer["status"] == "PASS_EXACT_RANK8_STABLE_PATH_OFFSET_TRANSFER"

    table, sums, masks = center.half_table()
    states = [tuple(map(int, row)) for row in table]
    assert len(states) == center.HALVES == 12_544
    maxima = (8, 7, 8, 7, 7)
    static_signatures = [signature(state) for state in states]
    static_map, static_sizes = canonical_map(
        static_signatures, [True] * len(states)
    )

    long_flags = [bool(mask) for mask in masks]
    first_long = [
        next(
            (
                index
                for index, (value, maximum) in enumerate(zip(state, maxima))
                if value == maximum
            ),
            -1,
        )
        for state in states
    ]
    assert [index >= 0 for index in first_long] == long_flags
    dynamic_signatures: list[tuple[int, ...] | None] = [None] * len(states)
    static_long_signatures: list[tuple[int, ...] | None] = [None] * len(states)
    for index, state in enumerate(states):
        if long_flags[index]:
            static_long_signatures[index] = static_signatures[index]
            dynamic_signatures[index] = offset_signature(
                state, first_long[index]
            )
    static_long_map, static_long_sizes = canonical_map(
        static_long_signatures, long_flags
    )
    dynamic_map, dynamic_sizes = canonical_map(
        dynamic_signatures, long_flags
    )
    # Exact equality of partitions: within the long-state subdomain a base
    # message collision is already an entire total-offset curve collision.
    assert dynamic_map == static_long_map
    assert dynamic_sizes == static_long_sizes

    for representatives, eligible in (
        (static_map, [True] * len(states)),
        (dynamic_map, long_flags),
    ):
        for index, allowed in enumerate(eligible):
            if not allowed:
                assert representatives[index] == -1
                continue
            representative = representatives[index]
            assert 0 <= representative <= index
            assert sums[representative] == sums[index]
            if representatives is static_map:
                assert static_signatures[representative] == static_signatures[index]
            else:
                assert dynamic_signatures[representative] == dynamic_signatures[index]

    static_class_sizes = [static_sizes[static_map[index]] for index in range(len(states))]
    dynamic_class_sizes = [
        dynamic_sizes[dynamic_map[index]] if long_flags[index] else 0
        for index in range(len(states))
    ]
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-opposite-half-message-"
            "quotient-agent-v1"
        ),
        "status": (
            "PASS_EXACT_CANONICAL_OPPOSITE_HALF_MESSAGE_QUOTIENT_"
            "NO_ORBIT_SIGN_CREDIT"
        ),
        "canonical_state_order": (
            "outer_low 1..7; outer_high outer_low..7; middle_outer "
            "1..8; middle_pendant 1..7; center_middle 1..8, matching "
            "center.half_table row order"
        ),
        "raw_half_states": len(states),
        "static_quotient": {
            "classes": len(static_sizes),
            "multiplicity_histogram": histogram(static_sizes),
            "largest_class": max(static_sizes.values()),
            "states_represented": sum(static_sizes.values()),
        },
        "long_state_offset_quotient": {
            "raw_long_states": sum(long_flags),
            "classes": len(dynamic_sizes),
            "multiplicity_histogram": histogram(dynamic_sizes),
            "largest_class": max(dynamic_sizes.values()),
            "states_represented": sum(dynamic_sizes.values()),
            "offset_samples_per_message_coefficient": message.WIDTH,
            "degree_bound": message.WIDTH - 1,
            "polynomial_identity_reason": (
                "At a long path base every rank-k path coefficient is a "
                "polynomial of offset degree at most k<=8. Equality at "
                "offsets 0..8 therefore proves equality for every "
                "nonnegative offset."
            ),
            "static_long_partition_equals_dynamic_curve_partition": True,
        },
        "coverage_guards": {
            "representative_is_first_state_in_canonical_order": True,
            "class_members_have_identical_stored_length_sum": True,
            "selected_side_coordinates_are_not_quotiented": True,
            "near_tail_or_root_gap_coordinates_are_not_quotiented": True,
            "raw_state_count_is_recovered_by_class_multiplicities": True,
        },
        "static_representative_by_half_index": static_map,
        "static_class_size_by_half_index": static_class_sizes,
        "dynamic_representative_by_half_index": dynamic_map,
        "dynamic_class_size_by_half_index": dynamic_class_sizes,
        "mapping_arrays_sha256": mapping_digest(
            static_map,
            static_class_sizes,
            dynamic_map,
            dynamic_class_sizes,
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Computational message reuse only. Every original raw row remains "
            "in scope through an explicit representative and multiplicity. "
            "No root-orbit symmetry or residual sign follows from this report."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("STATIC_CLASSES", len(static_sizes))
    print("DYNAMIC_CLASSES", len(dynamic_sizes))
    print("MAPPING", payload["mapping_arrays_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
