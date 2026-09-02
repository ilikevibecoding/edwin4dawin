#!/usr/bin/env python3
"""Exact degree-28 Newton scan of every mixed branch-root e=2 ray."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import time
from functools import lru_cache
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23_independent import delta0, delta1
from scan_rank8_delta3_n28_e1_subdivided_claws import forest_poly


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta01_e2_branch_mixed_newton_exact_agent_20260823.json"
MAX_RANK = 8
SAMPLES = 29
EXPECTED = {
    "rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json":
        "EBAF3FED1DF2D7ACF82F4476CCC1E892131A6A8AF8B0DBFFA8BEBE689083426C",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json":
        "AD5AE4EEF6DEB576DD2B0EC46CAFA9EF8BC6AC2D4F08231C4837CFBC7991EC61",
    "rank8_delta01_e2_mixed_newton_reduction_exact_agent_20260823.json":
        "70A4A2425768F77376086B1F0E96925FF08CDB555E7D25653DD2BA904081C690",
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
    "scan_rank8_delta3_n28_e1_subdivided_claws.py":
        "F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A",
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


def add(*rows):
    return tuple(sum(row[k] for row in rows) for k in range(MAX_RANK + 1))


def convolve(*factors):
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


def shifted(row):
    return (0,) + row[:MAX_RANK]


@lru_cache(maxsize=None)
def pair_states(a: int, b: int):
    return convolve(path(a), path(b)), shifted(convolve(path(a - 1), path(b - 1)))


@lru_cache(maxsize=None)
def claw(a: int, b: int, c: int):
    return add(
        convolve(path(a), path(b), path(c)),
        shifted(convolve(path(a - 1), path(b - 1), path(c - 1))),
    )


def branch_polys(lengths):
    a, b, bridge, c, d = lengths
    left0, left1 = pair_states(a, b)
    right0, right1 = pair_states(c, d)
    core = add(
        convolve(left0, right0, path(bridge - 1)),
        convolve(left1, right0, path(bridge - 2)),
        convolve(left0, right1, path(bridge - 2)),
        convolve(left1, right1, path(bridge - 3)),
    )
    deleted = convolve(path(a), path(b), claw(c, d, bridge - 1))
    return core, deleted


def build_literal(lengths):
    a, b, bridge, c, d = lengths
    adjacency = [[], []]
    def attach(start, length):
        previous = start
        for _ in range(length):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
    attach(0, a)
    attach(0, b)
    previous = 0
    for _ in range(1, bridge):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    adjacency[previous].append(1)
    adjacency[1].append(previous)
    attach(1, c)
    attach(1, d)
    return adjacency


def keys():
    arm_states = (*range(1, 7), "L")
    bridge_states = (*range(1, 8), "L")
    pairs = tuple(itertools.combinations_with_replacement(arm_states, 2))
    for left, right, bridge in itertools.product(pairs, pairs, bridge_states):
        flat = (*left, *right, bridge)
        flags = tuple(value == "L" for value in flat)
        if any(flags) and not all(flags):
            yield (left, right, bridge), flat, flags


def ray_lengths(flat, flags, extra):
    values = [7 if index < 4 and value == "L" else 8 if index == 4 and value == "L" else value for index, value in enumerate(flat)]
    first = flags.index(True)
    values[first] += extra
    return values[0], values[1], values[4], values[2], values[3]


def differences(values):
    out = []
    row = list(values)
    while row:
        out.append(row[0])
        row = [row[i + 1] - row[i] for i in range(len(row) - 1)]
    return tuple(out)


def stream_line(key, baseline, shift, coefficients):
    return json.dumps([key, baseline, shift, coefficients[0], coefficients[1]], separators=(",", ":"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    started = time.perf_counter()
    minima = {
        str(rank): {"d0": None, "d1": None, "higher": None, "d0_witness": None, "d1_witness": None, "higher_witness": None}
        for rank in (0, 1)
    }
    count = 0
    zero_higher = 0
    lines = []
    self_checks = 0
    for key, flat, flags in keys():
        baseline = 1 + sum(7 if i < 4 and value == "L" else 8 if i == 4 and value == "L" else value for i, value in enumerate(flat))
        shift = max(0, 31 - baseline)
        sampled = [[], []]
        for s in range(SAMPLES):
            lengths = ray_lengths(flat, flags, shift + s)
            core, deleted = branch_polys(lengths)
            sampled[0].append(delta0(core, deleted))
            sampled[1].append(delta1(core, deleted))
            if self_checks < 64 and s in (0, 7, 28):
                adjacency = build_literal(lengths)
                assert tuple(forest_poly(adjacency)) == core
                assert tuple(forest_poly(adjacency, 0)) == deleted
                self_checks += 1
        coeffs = tuple(differences(row) for row in sampled)
        for rank in (0, 1):
            row = coeffs[rank]
            assert len(row) == SAMPLES
            assert row[0] > 0 and row[1] > 0 and min(row[2:]) >= 0, (key, rank, row)
            stats = minima[str(rank)]
            for field, value, witness_field, power in (
                ("d0", row[0], "d0_witness", 0),
                ("d1", row[1], "d1_witness", 1),
                ("higher", min(row[2:]), "higher_witness", 2 + row[2:].index(min(row[2:]))),
            ):
                if stats[field] is None or value < stats[field]:
                    stats[field] = value
                    stats[witness_field] = {"key": key, "baseline_order": baseline, "order_shift": shift, "power": power, "coefficient": value}
            zero_higher += sum(value == 0 for value in row[2:])
        lines.append(stream_line(key, baseline, shift, coeffs))
        count += 1

    assert count == 3184
    stream = hashlib.sha256(("\n".join(sorted(lines)) + "\n").encode()).hexdigest().upper()
    payload = {
        "schema": "rank8-delta01-e2-branch-mixed-newton-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E2_BRANCH_MIXED_ALL_RAYS",
        "theorem": "For every mixed short/long branch-root e=2 quotient key and every total long offset giving order n>=31, Delta0>0 and Delta1>0 (indeed both strictly increase along the offset ray).",
        "rays": count,
        "rank_rays": 2 * count,
        "samples_per_rank_ray": SAMPLES,
        "literal_values": 2 * count * SAMPLES,
        "newton_degree_bound": 28,
        "sign_gate": "d0>0,d1>0,d2..d28>=0",
        "minimum_coefficients": minima,
        "zero_higher_coefficients": zero_higher,
        "literal_formula_self_checks": self_checks,
        "coefficient_stream_sha256": stream,
        "immutable_input_hashes": actual,
        "runtime_seconds": time.perf_counter() - started,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Branch-root mixed e=2 only; pendant and bridge-internal mixed rays and all e>=4 remain separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("RAYS", count, "VALUES", payload["literal_values"], "ZEROS", zero_higher)
    print("MINIMA", json.dumps(minima, indent=2))
    print("STREAM", stream)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
