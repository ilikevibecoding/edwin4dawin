#!/usr/bin/env python3
"""Independent literal-tree audit of the opposite-half message quotient.

This audit deliberately does not import either the CUDA formula or the
certificate implementation.  For every canonical half state it constructs
the actual rooted tree (with the virtual selected-side parent excluded) and
uses a generic tree independent-set dynamic program through rank eight.
It reconstructs both canonical quotient maps, their multiplicities, and all
nine offset messages for every long half state.

The result certifies computational message reuse only.  It gives no orbit or
residual-sign credit, and it leaves the selected side entirely unquotiented.
"""

from __future__ import annotations

import hashlib
import json
import os
import struct
from collections import Counter
from functools import lru_cache
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CERTIFICATE_SOURCE = ROOT / (
    "certify_rank8_delta03_e5_five_cubic_path_opposite_half_message_"
    "quotient_agent.py"
)
CERTIFICATE_REPORT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_"
    "exact_agent_20260825.json"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_"
    "literal_audit_agent_20260825.json"
)
EXPECTED = {
    CERTIFICATE_SOURCE.name:
        "F72BF76B0C2A32BFFE15FDCF13E9F0CDD1AE61A541519A90FCF3E3DA6876695D",
    CERTIFICATE_REPORT.name:
        "E0E9C25CA2725C9C4A7B2FEBFAC7BB4D35BCB36FD12DBEF118430834CFB8FDAB",
    "verify_rank8_stable_path_offset_transfer_agent.py":
        "2EB0B6E4F073F0FC90FB023D2EC265D4C28CC58C5DF710EF45E17471085D578E",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
}
WIDTH = 9
MAXIMA = (8, 7, 8, 7, 7)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(a + b for a, b in zip(left, right))


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    result = [0] * WIDTH
    for left_rank, left_value in enumerate(left):
        if left_value == 0:
            continue
        for right_rank in range(WIDTH - left_rank):
            right_value = right[right_rank]
            if right_value:
                result[left_rank + right_rank] += left_value * right_value
    return tuple(result)


def append_chain(adjacency: list[list[int]], parent: int | None, length: int) -> int:
    """Append ``length`` literal vertices and return the last vertex."""
    assert length >= 1
    previous = parent
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        if previous is not None:
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
        previous = vertex
    assert previous is not None
    return previous


@lru_cache(maxsize=None)
def literal_message(state: tuple[int, int, int, int, int]) -> tuple[int, ...]:
    """Return free then blocked rank-0..8 messages from a literal half tree."""
    center_middle, middle_pendant, middle_outer, outer_low, outer_high = state
    assert all(value >= 1 for value in state)
    adjacency: list[list[int]] = []

    # The virtual selected-side parent is not a vertex here.  The first
    # center-middle chain vertex is its neighbor; the last is the middle
    # cubic vertex.  Coordinate sums therefore equal the literal vertex count.
    middle = append_chain(adjacency, None, center_middle)
    attachment = 0
    append_chain(adjacency, middle, middle_pendant)
    outer = append_chain(adjacency, middle, middle_outer)
    append_chain(adjacency, outer, outer_low)
    append_chain(adjacency, outer, outer_high)
    assert len(adjacency) == sum(state)
    assert sum(map(len, adjacency)) == 2 * (len(adjacency) - 1)

    parents = [-2] * len(adjacency)
    parents[attachment] = -1
    order = [attachment]
    for vertex in order:
        for neighbor in adjacency[vertex]:
            if neighbor == parents[vertex]:
                continue
            assert parents[neighbor] == -2
            parents[neighbor] = vertex
            order.append(neighbor)
    assert len(order) == len(adjacency)

    absent_by_vertex: list[tuple[int, ...] | None] = [None] * len(adjacency)
    present_by_vertex: list[tuple[int, ...] | None] = [None] * len(adjacency)
    empty = (1,) + (0,) * (WIDTH - 1)
    singleton = (0, 1) + (0,) * (WIDTH - 2)
    for vertex in reversed(order):
        absent = empty
        present = singleton
        for neighbor in adjacency[vertex]:
            if parents[neighbor] != vertex:
                continue
            child_absent = absent_by_vertex[neighbor]
            child_present = present_by_vertex[neighbor]
            assert child_absent is not None and child_present is not None
            absent = multiply(absent, add(child_absent, child_present))
            present = multiply(present, child_absent)
        absent_by_vertex[vertex] = absent
        present_by_vertex[vertex] = present

    root_absent = absent_by_vertex[attachment]
    root_present = present_by_vertex[attachment]
    assert root_absent is not None and root_present is not None
    free = add(root_absent, root_present)  # virtual parent absent
    blocked = root_absent                 # virtual parent present
    return (*free, *blocked)


def canonical_states() -> list[tuple[int, int, int, int, int]]:
    states = []
    for outer_low in range(1, 8):
        for outer_high in range(outer_low, 8):
            for middle_outer in range(1, 9):
                for middle_pendant in range(1, 8):
                    for center_middle in range(1, 9):
                        states.append((
                            center_middle,
                            middle_pendant,
                            middle_outer,
                            outer_low,
                            outer_high,
                        ))
    assert len(states) == 12_544
    return states


def first_long(state: tuple[int, ...]) -> int:
    return next(
        (
            index
            for index, (value, maximum) in enumerate(zip(state, MAXIMA))
            if value == maximum
        ),
        -1,
    )


def offset_curve(state: tuple[int, ...], varying: int) -> tuple[int, ...]:
    assert varying >= 0
    values: list[int] = []
    for offset in range(WIDTH):
        shifted = list(state)
        shifted[varying] += offset
        values.extend(literal_message(tuple(shifted)))
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


def class_sizes_by_index(
    representatives: list[int], sizes: Counter[int], eligible: list[bool]
) -> list[int]:
    return [
        sizes[representatives[index]] if allowed else 0
        for index, allowed in enumerate(eligible)
    ]


def mapping_digest(*rows: list[int]) -> str:
    digest = hashlib.sha256()
    for row in rows:
        for value in row:
            digest.update(struct.pack("<i", value))
    return digest.hexdigest().upper()


def histogram(sizes: Counter[int]) -> dict[str, int]:
    counts = Counter(sizes.values())
    return {str(size): count for size, count in sorted(counts.items())}


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    certificate = json.loads(CERTIFICATE_REPORT.read_text(encoding="utf-8"))
    assert certificate["status"] == (
        "PASS_EXACT_CANONICAL_OPPOSITE_HALF_MESSAGE_QUOTIENT_"
        "NO_ORBIT_SIGN_CREDIT"
    )
    assert certificate["source_sha256"] == actual[CERTIFICATE_SOURCE.name]

    states = canonical_states()
    static_signatures = [literal_message(state) for state in states]
    eligible_all = [True] * len(states)
    static_map, static_sizes = canonical_map(static_signatures, eligible_all)

    varying = [first_long(state) for state in states]
    long_flags = [index >= 0 for index in varying]
    assert sum(long_flags) == 6_370
    dynamic_signatures: list[tuple[int, ...] | None] = [None] * len(states)
    static_long_signatures: list[tuple[int, ...] | None] = [None] * len(states)
    for index, state in enumerate(states):
        if long_flags[index]:
            static_long_signatures[index] = static_signatures[index]
            dynamic_signatures[index] = offset_curve(state, varying[index])
    static_long_map, static_long_sizes = canonical_map(
        static_long_signatures, long_flags
    )
    dynamic_map, dynamic_sizes = canonical_map(dynamic_signatures, long_flags)
    assert dynamic_map == static_long_map
    assert dynamic_sizes == static_long_sizes

    static_class_sizes = class_sizes_by_index(
        static_map, static_sizes, eligible_all
    )
    dynamic_class_sizes = class_sizes_by_index(
        dynamic_map, dynamic_sizes, long_flags
    )
    assert static_map == certificate["static_representative_by_half_index"]
    assert static_class_sizes == certificate["static_class_size_by_half_index"]
    assert dynamic_map == certificate["dynamic_representative_by_half_index"]
    assert dynamic_class_sizes == certificate["dynamic_class_size_by_half_index"]

    for representatives, signatures, eligible in (
        (static_map, static_signatures, eligible_all),
        (dynamic_map, dynamic_signatures, long_flags),
    ):
        for index, allowed in enumerate(eligible):
            if not allowed:
                assert representatives[index] == -1
                continue
            representative = representatives[index]
            assert 0 <= representative <= index
            assert signatures[representative] == signatures[index]
            assert sum(states[representative]) == sum(states[index])

    digest = mapping_digest(
        static_map,
        static_class_sizes,
        dynamic_map,
        dynamic_class_sizes,
    )
    assert digest == certificate["mapping_arrays_sha256"]
    assert len(static_sizes) == certificate["static_quotient"]["classes"] == 9_091
    assert sum(static_sizes.values()) == len(states) == 12_544
    assert histogram(static_sizes) == certificate["static_quotient"][
        "multiplicity_histogram"
    ]
    assert len(dynamic_sizes) == certificate[
        "long_state_offset_quotient"
    ]["classes"] == 4_075
    assert sum(dynamic_sizes.values()) == sum(long_flags) == 6_370
    assert histogram(dynamic_sizes) == certificate[
        "long_state_offset_quotient"
    ]["multiplicity_histogram"]

    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-opposite-half-message-"
            "quotient-literal-audit-agent-v1"
        ),
        "status": (
            "PASS_INDEPENDENT_LITERAL_TREE_DP_OPPOSITE_HALF_MESSAGE_"
            "QUOTIENT_NO_ORBIT_SIGN_CREDIT"
        ),
        "method": (
            "Literal rooted tree per canonical half state; generic include/"
            "exclude independent-set DP through rank eight; virtual parent "
            "excluded and imposed absent/present only as attachment boundary."
        ),
        "raw_half_states": len(states),
        "all_short_half_states": len(states) - sum(long_flags),
        "long_half_states": sum(long_flags),
        "static_classes": len(static_sizes),
        "dynamic_offset_curve_classes": len(dynamic_sizes),
        "offsets_checked_per_long_state": list(range(WIDTH)),
        "literal_messages_evaluated": literal_message.cache_info().currsize,
        "static_multiplicity_histogram": histogram(static_sizes),
        "dynamic_multiplicity_histogram": histogram(dynamic_sizes),
        "static_states_recovered_by_multiplicity": sum(static_sizes.values()),
        "dynamic_states_recovered_by_multiplicity": sum(dynamic_sizes.values()),
        "representative_arrays_match_certificate": True,
        "class_size_arrays_match_certificate": True,
        "static_long_partition_equals_dynamic_curve_partition": True,
        "class_members_have_identical_literal_vertex_count": True,
        "mapping_arrays_sha256": digest,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Independent audit of an opposite-half computational quotient "
            "only. Selected-side coordinates and orientation are untouched. "
            "No orbit identification or residual-sign proof credit."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("STATIC_CLASSES", payload["static_classes"])
    print("DYNAMIC_CLASSES", payload["dynamic_offset_curve_classes"])
    print("MESSAGES", payload["literal_messages_evaluated"])
    print("MAPPING", payload["mapping_arrays_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
