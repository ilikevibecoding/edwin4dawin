#!/usr/bin/env python3
"""Exact all-order Newton scan for the e=4 four-cubic-star center root."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import time
from functools import lru_cache
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23_independent import (
    delta0,
    delta1,
    delta2,
    delta3,
    forest_poly,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e4_four_cubic_star_center_branch_all_order_exact_root_20260823.json"
MAX_RANK = 8
SAMPLES = 29
DEGREE_BOUNDS = (28, 28, 27, 26)
DELTAS = (delta0, delta1, delta2, delta3)
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json":
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json":
        "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json":
        "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "certify_rank8_delta03_e4_four_cubic_star_center_branch_newton_reduction_root.py":
        "506896627104396D4B3F32005ACEFB5BB657881D02C23A7D36FDFA6C40473AFA",
    "rank8_delta03_e4_four_cubic_star_center_branch_newton_reduction_exact_root_20260823.json":
        "C9D3226634BE0292040BBB9A7B69AED1E32B33BA638295FECE04A5671855DAEE",
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


@lru_cache(maxsize=None)
def path(order: int) -> tuple[int, ...]:
    if order == -1:
        return (1,) + (0,) * MAX_RANK
    if order <= -2:
        return (0,) * (MAX_RANK + 1)
    return tuple(
        math.comb(order - rank + 1, rank)
        if order - rank + 1 >= rank else 0
        for rank in range(MAX_RANK + 1)
    )


def add(*rows: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(sum(row[rank] for row in rows) for rank in range(MAX_RANK + 1))


def convolve(*factors: tuple[int, ...]) -> tuple[int, ...]:
    out = [1] + [0] * MAX_RANK
    for factor in factors:
        new = [0] * (MAX_RANK + 1)
        for left_rank, left in enumerate(out):
            if not left:
                continue
            for right_rank, right in enumerate(factor[: MAX_RANK + 1 - left_rank]):
                if right:
                    new[left_rank + right_rank] += left * right
        out = new
    return tuple(out)


def shifted(row: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + row[:MAX_RANK]


@lru_cache(maxsize=None)
def module_poly(arm_a: int, arm_b: int, center_arm: int) -> tuple[int, ...]:
    """Outer cubic branch with two pendants and a center-facing arm.

    center_arm=-1 is the exact boundary state obtained when the center is
    selected and the center--outer spine has length one: the outer branch is
    then forced absent because path(-2)=0 in its selected state.
    """
    excluded = convolve(path(arm_a), path(arm_b), path(center_arm))
    included = shifted(convolve(path(arm_a - 1), path(arm_b - 1), path(center_arm - 1)))
    return add(excluded, included)


def polys(modules: tuple[tuple[int, int, int], ...]) -> tuple[tuple[int, ...], tuple[int, ...]]:
    # A center--outer path of length ``spine`` contributes ``spine - 1``
    # vertices on the outer branch's center-facing arm after the center is
    # deleted.  If the center is selected, its adjacent vertex is additionally
    # forced absent, leaving the exact ``spine - 2`` boundary state.
    free = tuple(module_poly(arm_a, arm_b, spine - 1) for arm_a, arm_b, spine in modules)
    blocked = tuple(module_poly(arm_a, arm_b, spine - 2) for arm_a, arm_b, spine in modules)
    deleted = convolve(*free)
    core = add(deleted, shifted(convolve(*blocked)))
    return core, deleted


def attach(adjacency: list[list[int]], start: int, length: int) -> int:
    previous = start
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    return previous


def literal_tree(modules: tuple[tuple[int, int, int], ...]) -> tuple[list[list[int]], int]:
    adjacency: list[list[int]] = [[]]
    center = 0
    for arm_a, arm_b, spine in modules:
        outer = attach(adjacency, center, spine)
        attach(adjacency, outer, arm_a)
        attach(adjacency, outer, arm_b)
    assert len(adjacency) == 1 + sum(sum(module) for module in modules)
    assert sum(map(len, adjacency)) == 2 * (len(adjacency) - 1)
    assert sorted(map(len, adjacency)).count(3) == 4
    return adjacency, center


def module_states() -> list[tuple[object, object, object]]:
    arms = (*range(1, 7), "L")
    spines = (*range(1, 8), "L")
    return [
        (arm_a, arm_b, spine)
        for arm_a, arm_b in itertools.combinations_with_replacement(arms, 2)
        for spine in spines
    ]


def keys():
    for modules in itertools.combinations_with_replacement(module_states(), 3):
        flat = tuple(value for module in modules for value in module)
        flags = tuple(value == "L" for value in flat)
        yield modules, flat, flags


def base_lengths(flat: tuple[object, ...]) -> list[int]:
    return [
        (8 if index % 3 == 2 else 7) if value == "L" else int(value)
        for index, value in enumerate(flat)
    ]


def lengths_to_modules(lengths: list[int]) -> tuple[tuple[int, int, int], ...]:
    return tuple(tuple(lengths[index:index + 3]) for index in range(0, 9, 3))


def ray_modules(flat: tuple[object, ...], flags: tuple[bool, ...], extra: int):
    lengths = base_lengths(flat)
    lengths[flags.index(True)] += extra
    return lengths_to_modules(lengths)


def differences(values: list[int]) -> tuple[int, ...]:
    out = []
    row = values
    while row:
        out.append(row[0])
        row = [right - left for left, right in zip(row, row[1:])]
    return tuple(out)


def stream_update(digest, record) -> None:
    digest.update(json.dumps(record, separators=(",", ":"), sort_keys=True).encode())
    digest.update(b"\n")


def update_min(stats, field: str, value: int, witness) -> None:
    if stats[field] is None or value < stats[field]:
        stats[field] = value
        stats[field + "_witness"] = witness


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    started = time.perf_counter()
    minima = {str(rank): {field: None for field in (
        "finite", "finite_witness", "d0", "d0_witness", "d1", "d1_witness", "higher", "higher_witness"
    )} for rank in range(4)}
    coefficient_digest = hashlib.sha256()
    finite_digest = hashlib.sha256()
    all_short = finite = mixed = all_long = rays = zero_higher = literal_checks = 0

    for key, flat, flags in keys():
        if not any(flags):
            all_short += 1
            lengths = [int(value) for value in flat]
            modules = lengths_to_modules(lengths)
            order = 1 + sum(lengths)
            if order < 27:
                continue
            core, deleted = polys(modules)
            values = tuple(delta(core, deleted) for delta in DELTAS)
            assert min(values) > 0, (key, values)
            for rank, value in enumerate(values):
                update_min(minima[str(rank)], "finite", value, {"key": key, "order": order, "value": value})
            stream_update(finite_digest, [key, order, values])
            if finite < 128:
                adjacency, root = literal_tree(modules)
                assert tuple(forest_poly(adjacency)) == core
                assert tuple(forest_poly(adjacency, root)) == deleted
                literal_checks += 1
            finite += 1
            continue

        if all(flags):
            all_long += 1
        else:
            mixed += 1
        baseline = 1 + sum(base_lengths(flat))
        shift = max(0, 27 - baseline)
        sampled = [[] for _ in range(4)]
        for sample in range(SAMPLES):
            modules = ray_modules(flat, flags, shift + sample)
            core, deleted = polys(modules)
            for rank, delta in enumerate(DELTAS):
                sampled[rank].append(delta(core, deleted))
            if literal_checks < 320 and sample in (0, 13, 28):
                adjacency, root = literal_tree(modules)
                assert tuple(forest_poly(adjacency)) == core
                assert tuple(forest_poly(adjacency, root)) == deleted
                literal_checks += 1
        coefficients = tuple(differences(row) for row in sampled)
        for rank, row in enumerate(coefficients):
            degree = DEGREE_BOUNDS[rank]
            assert row[0] > 0 and row[1] > 0 and min(row[2:degree + 1]) >= 0, (key, rank, row)
            assert all(value == 0 for value in row[degree + 1:])
            witness = {"key": key, "baseline_order": baseline, "order_shift": shift}
            stats = minima[str(rank)]
            update_min(stats, "d0", row[0], {**witness, "power": 0, "value": row[0]})
            update_min(stats, "d1", row[1], {**witness, "power": 1, "value": row[1]})
            higher = min(row[2:degree + 1])
            power = 2 + row[2:degree + 1].index(higher)
            update_min(stats, "higher", higher, {**witness, "power": power, "value": higher})
            zero_higher += sum(value == 0 for value in row[2:degree + 1])
        stream_update(coefficient_digest, [key, baseline, shift, coefficients])
        rays += 1

    assert (all_short, finite, mixed, all_long, rays) == (540274, 488801, 1358125, 1, 1358126)
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-star-center-branch-all-order-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_CENTER_BRANCH_N27_PLUS",
        "theorem": "For the center branch root in every four-cubic-star e=4 subdivision and every n>=27, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "four_cubic_star:center_branch",
        "quotient_counts": {"all_short_total": all_short, "all_short_n27_plus": finite, "mixed_rays": mixed, "all_long_rays": all_long, "non_all_short_rays": rays},
        "rank_ray_samples": rays * 4 * SAMPLES,
        "samples_per_rank_ray": SAMPLES,
        "degree_bounds": {str(index): value for index, value in enumerate(DEGREE_BOUNDS)},
        "newton_gate": "d0>0,d1>0,d2..d_degree>=0 and coefficients above the exact degree vanish",
        "minimum_values_and_coefficients": minima,
        "zero_higher_coefficients": zero_higher,
        "coefficient_stream_sha256": coefficient_digest.hexdigest().upper(),
        "finite_value_stream_sha256": finite_digest.hexdigest().upper(),
        "literal_formula_self_checks": literal_checks,
        "immutable_input_hashes": actual,
        "runtime_seconds": time.perf_counter() - started,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly the four_cubic_star:center_branch root orbit; every other not-yet-closed e=4 root orbit remains separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", finite, "RAYS", rays, "RANK_SAMPLES", payload["rank_ray_samples"])
    print("STREAM", payload["coefficient_stream_sha256"], payload["finite_value_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
