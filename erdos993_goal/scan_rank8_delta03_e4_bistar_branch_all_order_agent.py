#!/usr/bin/env python3
"""Exact Newton/finite scan for both e=4 quartic--cubic bistar branch roots.

The non-all-short quotient keys are one-dimensional stable-transfer rays.  We
evaluate every such ray at S=0,...,28 and certify the integer Newton signs.
The bounded all-short keys of order at least 27 are evaluated directly.
"""

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
OUTPUT = HERE / "rank8_delta03_e4_bistar_branch_all_order_exact_agent_20260823.json"
MAX_RANK = 8
SAMPLES = 29
DEGREE_BOUNDS = (28, 28, 27, 26)
DELTAS = (delta0, delta1, delta2, delta3)
ROOTS = ("quartic_branch", "cubic_branch")
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json":
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json":
        "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json":
        "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "rank8_delta03_e4_bistar_branch_newton_reduction_exact_agent_20260823.json":
        "E6BEE445E8B7ABC6BC68C9F115F7D973B21C2F200E958EF4D833BAE835F6758A",
    "certify_rank8_delta03_e4_bistar_branch_newton_reduction_agent.py":
        "80437371C9FACA52714C31EE452E5E0C80979117289DB43293AE101238A56155",
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
    return tuple(sum(row[k] for row in rows) for k in range(MAX_RANK + 1))


def convolve(*factors: tuple[int, ...]) -> tuple[int, ...]:
    out = [1] + [0] * MAX_RANK
    for factor in factors:
        new = [0] * (MAX_RANK + 1)
        for i, left in enumerate(out):
            if left:
                for j, right in enumerate(factor[: MAX_RANK + 1 - i]):
                    if right:
                        new[i + j] += left * right
        out = new
    return tuple(out)


def shifted(row: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + row[:MAX_RANK]


@lru_cache(maxsize=None)
def branch_states(arms: tuple[int, ...]) -> tuple[tuple[int, ...], tuple[int, ...]]:
    excluded = convolve(*(path(arm) for arm in arms))
    included = shifted(convolve(*(path(arm - 1) for arm in arms)))
    return excluded, included


@lru_cache(maxsize=None)
def star(arms: tuple[int, ...]) -> tuple[int, ...]:
    excluded, included = branch_states(arms)
    return add(excluded, included)


def bistar_polys(lengths: tuple[int, int, int, int, int, int]):
    q1, q2, q3, c1, c2, spine = lengths
    q0, qx = branch_states((q1, q2, q3))
    c0, cx = branch_states((c1, c2))
    core = add(
        convolve(q0, c0, path(spine - 1)),
        convolve(qx, c0, path(spine - 2)),
        convolve(q0, cx, path(spine - 2)),
        convolve(qx, cx, path(spine - 3)),
    )
    delete_q = convolve(path(q1), path(q2), path(q3), star((c1, c2, spine - 1)))
    delete_c = convolve(path(c1), path(c2), star((q1, q2, q3, spine - 1)))
    return core, (delete_q, delete_c)


def attach(adjacency: list[list[int]], start: int, length: int) -> int:
    previous = start
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    return previous


def build_literal(lengths: tuple[int, int, int, int, int, int]):
    q1, q2, q3, c1, c2, spine = lengths
    adjacency: list[list[int]] = [[]]
    quartic = 0
    cubic = attach(adjacency, quartic, spine)
    for arm in (q1, q2, q3):
        attach(adjacency, quartic, arm)
    for arm in (c1, c2):
        attach(adjacency, cubic, arm)
    assert len(adjacency) == 1 + sum(lengths)
    assert sum(map(len, adjacency)) == 2 * (len(adjacency) - 1)
    assert sorted(map(len, adjacency)).count(4) == 1
    assert sorted(map(len, adjacency)).count(3) == 1
    return adjacency, (quartic, cubic)


def quotient_keys():
    arms = (*range(1, 7), "L")
    spines = (*range(1, 8), "L")
    for qarms, carms, spine in itertools.product(
        itertools.combinations_with_replacement(arms, 3),
        itertools.combinations_with_replacement(arms, 2),
        spines,
    ):
        flat = (*qarms, *carms, spine)
        flags = tuple(value == "L" for value in flat)
        yield (qarms, carms, spine), flat, flags


def base_lengths(flat: tuple[object, ...]) -> list[int]:
    return [
        (7 if index < 5 else 8) if value == "L" else int(value)
        for index, value in enumerate(flat)
    ]


def ray_lengths(flat: tuple[object, ...], flags: tuple[bool, ...], extra: int):
    values = base_lengths(flat)
    values[flags.index(True)] += extra
    return tuple(values)


def differences(values: list[int]) -> tuple[int, ...]:
    out = []
    row = values
    while row:
        out.append(row[0])
        row = [row[i + 1] - row[i] for i in range(len(row) - 1)]
    return tuple(out)


def update_minimum(stats: dict, field: str, value: int, witness: dict) -> None:
    if stats[field] is None or value < stats[field]:
        stats[field] = value
        stats[field + "_witness"] = witness


def stream_update(digest, record) -> None:
    digest.update(json.dumps(record, separators=(",", ":"), sort_keys=True).encode())
    digest.update(b"\n")


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    started = time.perf_counter()
    minima = {
        root: {
            str(rank): {
                "finite": None,
                "finite_witness": None,
                "d0": None,
                "d0_witness": None,
                "d1": None,
                "d1_witness": None,
                "higher": None,
                "higher_witness": None,
            }
            for rank in range(4)
        }
        for root in ROOTS
    }
    coefficient_digest = hashlib.sha256()
    finite_digest = hashlib.sha256()
    rays = 0
    finite = 0
    all_short = 0
    mixed = 0
    all_long = 0
    literal_formula_checks = 0
    zero_higher = 0

    for key, flat, flags in quotient_keys():
        if not any(flags):
            all_short += 1
            lengths = tuple(int(value) for value in flat)
            order = 1 + sum(lengths)
            if order < 27:
                continue
            core, deleted = bistar_polys(lengths)
            for root_index, root in enumerate(ROOTS):
                values = tuple(delta(core, deleted[root_index]) for delta in DELTAS)
                assert min(values) > 0, (key, root, values)
                for rank, value in enumerate(values):
                    update_minimum(
                        minima[root][str(rank)],
                        "finite",
                        value,
                        {"key": key, "order": order, "value": value},
                    )
                stream_update(finite_digest, [root, key, order, values])
            if finite < 96:
                adjacency, root_vertices = build_literal(lengths)
                assert tuple(forest_poly(adjacency)) == core
                for root_index, vertex in enumerate(root_vertices):
                    assert tuple(forest_poly(adjacency, vertex)) == deleted[root_index]
                literal_formula_checks += 1
            finite += 1
            continue

        if all(flags):
            all_long += 1
        else:
            mixed += 1
        baseline = 1 + sum(base_lengths(flat))
        shift = max(0, 27 - baseline)
        sampled = [[[] for _ in range(4)] for _ in ROOTS]
        for sample in range(SAMPLES):
            lengths = ray_lengths(flat, flags, shift + sample)
            core, deleted = bistar_polys(lengths)
            for root_index in range(2):
                for rank, delta in enumerate(DELTAS):
                    sampled[root_index][rank].append(delta(core, deleted[root_index]))
            if literal_formula_checks < 192 and sample in (0, 13, 28):
                adjacency, root_vertices = build_literal(lengths)
                assert tuple(forest_poly(adjacency)) == core
                for root_index, vertex in enumerate(root_vertices):
                    assert tuple(forest_poly(adjacency, vertex)) == deleted[root_index]
                literal_formula_checks += 1

        for root_index, root in enumerate(ROOTS):
            coefficients = tuple(differences(values) for values in sampled[root_index])
            for rank, row in enumerate(coefficients):
                degree = DEGREE_BOUNDS[rank]
                assert row[0] > 0 and row[1] > 0 and min(row[2 : degree + 1]) >= 0, (key, root, rank, row)
                assert all(value == 0 for value in row[degree + 1 :]), (key, root, rank, row)
                stats = minima[root][str(rank)]
                witness = {"key": key, "baseline_order": baseline, "order_shift": shift}
                update_minimum(stats, "d0", row[0], {**witness, "power": 0, "value": row[0]})
                update_minimum(stats, "d1", row[1], {**witness, "power": 1, "value": row[1]})
                higher = min(row[2 : degree + 1])
                power = 2 + row[2 : degree + 1].index(higher)
                update_minimum(stats, "higher", higher, {**witness, "power": power, "value": higher})
                zero_higher += sum(value == 0 for value in row[2 : degree + 1])
            stream_update(coefficient_digest, [root, key, baseline, shift, coefficients])
        rays += 1

    assert all_short == 8232 and mixed == 10583 and all_long == 1
    assert finite == 1660 and rays == 10584
    payload = {
        "schema": "rank8-delta03-e4-bistar-branch-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_BISTAR_BOTH_BRANCH_ROOTS_N27_PLUS",
        "theorem": "For either branch vertex as root in every quartic--cubic e=4 bistar subdivision and every n>=27, Delta0, Delta1, Delta2, and Delta3 are strictly positive.",
        "root_orbits": ["quartic_cubic_bistar:" + root for root in ROOTS],
        "quotient_counts_per_root": {
            "all_short_total": all_short,
            "all_short_n27_plus_finite": finite,
            "mixed_rays": mixed,
            "all_long_rays": all_long,
            "non_all_short_rays": rays,
        },
        "certified_root_cells": 2 * finite,
        "certified_root_rays": 2 * rays,
        "rank_ray_samples": 2 * rays * 4 * SAMPLES,
        "samples_per_rank_ray": SAMPLES,
        "degree_bounds": {str(rank): degree for rank, degree in enumerate(DEGREE_BOUNDS)},
        "newton_gate": "d0>0,d1>0,d2..d_degree>=0, and all sampled coefficients above the proven degree bound equal zero",
        "minimum_values_and_coefficients": minima,
        "zero_higher_coefficients": zero_higher,
        "coefficient_stream_sha256": coefficient_digest.hexdigest().upper(),
        "finite_value_stream_sha256": finite_digest.hexdigest().upper(),
        "literal_formula_self_checks": literal_formula_checks,
        "immutable_input_hashes": actual,
        "runtime_seconds": time.perf_counter() - started,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly 2 of the 20 e=4 rooted skeleton orbits. The other 18 e=4 root orbits, all e>=5, forests, and the full conjecture remain separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", finite, "RAYS", rays, "RANK_SAMPLES", payload["rank_ray_samples"])
    print("LITERAL_CHECKS", literal_formula_checks, "ZERO_HIGHER", zero_higher)
    print("COEFFICIENT_STREAM", payload["coefficient_stream_sha256"])
    print("FINITE_STREAM", payload["finite_value_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
