#!/usr/bin/env python3
"""Exact degree-28 Newton scan of every mixed pendant-root e=2 ray."""

from __future__ import annotations

import hashlib
import itertools
import json
import time
from pathlib import Path

from scan_rank8_delta01_e2_branch_mixed_newton_agent import (
    add, convolve, delta0, delta1, differences, pair_states, path,
)
from scan_rank8_delta3_n28_e1_subdivided_claws import forest_poly


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta01_e2_pendant_mixed_newton_exact_agent_20260823.json"
SAMPLES = 29
EXPECTED = {
    "rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json":
        "EBAF3FED1DF2D7ACF82F4476CCC1E892131A6A8AF8B0DBFFA8BEBE689083426C",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json":
        "AD5AE4EEF6DEB576DD2B0EC46CAFA9EF8BC6AC2D4F08231C4837CFBC7991EC61",
    "rank8_delta01_e2_mixed_newton_reduction_exact_agent_20260823.json":
        "70A4A2425768F77376086B1F0E96925FF08CDB555E7D25653DD2BA904081C690",
    "scan_rank8_delta01_e2_branch_mixed_newton_agent.py":
        "672267A98E3575CB75ACF2492BBEA922F5CE402BA35BC5B42CA231F2481D4641",
    "scan_rank8_delta3_n28_e1_subdivided_claws.py":
        "F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def double_core(a, b, bridge, c, d):
    left0, left1 = pair_states(a, b)
    right0, right1 = pair_states(c, d)
    return add(
        convolve(left0, right0, path(bridge - 1)),
        convolve(left1, right0, path(bridge - 2)),
        convolve(left0, right1, path(bridge - 2)),
        convolve(left1, right1, path(bridge - 3)),
    )


def pendant_polys(values):
    near, tail, sibling, c, d, bridge = values
    core = double_core(near + tail + 1, sibling, bridge, c, d)
    deleted = convolve(path(tail), double_core(near, sibling, bridge, c, d))
    return core, deleted


def keys():
    gap_states = (*range(0, 7), "L")
    arm_states = (*range(1, 7), "L")
    bridge_states = (*range(1, 8), "L")
    far_pairs = tuple(itertools.combinations_with_replacement(arm_states, 2))
    for near, tail, sibling, far, bridge in itertools.product(gap_states, gap_states, arm_states, far_pairs, bridge_states):
        flat = (near, tail, sibling, *far, bridge)
        flags = tuple(value == "L" for value in flat)
        if any(flags) and not all(flags):
            yield (near, tail, sibling, far, bridge), flat, flags


def resolved(flat, flags, extra):
    values = [8 if index == 5 and value == "L" else 7 if value == "L" else value for index, value in enumerate(flat)]
    values[flags.index(True)] += extra
    return tuple(values)


def literal_graph(values):
    near, tail, sibling, c, d, bridge = values
    selected = near + tail + 1
    adjacency = [[]]
    previous = 0
    for _ in range(bridge):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    right = previous
    selected_vertices = []
    for start, length, capture in ((0, selected, True), (0, sibling, False), (right, c, False), (right, d, False)):
        previous = start
        for _ in range(length):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
            if capture:
                selected_vertices.append(vertex)
    return adjacency, selected_vertices[near]


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    started = time.perf_counter()
    minima = {str(rank): {"d0": None, "d1": None, "higher": None, "d0_witness": None, "d1_witness": None, "higher_witness": None} for rank in (0, 1)}
    count = 0
    zero_higher = 0
    self_checks = 0
    stream = hashlib.sha256()
    for key, flat, flags in keys():
        baseline = 2 + sum(8 if i == 5 and value == "L" else 7 if value == "L" else value for i, value in enumerate(flat))
        shift = max(0, 31 - baseline)
        sampled = [[], []]
        for s in range(SAMPLES):
            values = resolved(flat, flags, shift + s)
            core, deleted = pendant_polys(values)
            sampled[0].append(delta0(core, deleted))
            sampled[1].append(delta1(core, deleted))
            if self_checks < 64 and s in (0, 11, 28):
                adjacency, root = literal_graph(values)
                assert tuple(forest_poly(adjacency)) == core
                assert tuple(forest_poly(adjacency, root)) == deleted
                self_checks += 1
        coeffs = tuple(differences(row) for row in sampled)
        for rank in (0, 1):
            row = coeffs[rank]
            assert row[0] > 0 and row[1] > 0 and min(row[2:]) >= 0, (key, rank, row)
            stats = minima[str(rank)]
            candidates = (
                ("d0", row[0], "d0_witness", 0),
                ("d1", row[1], "d1_witness", 1),
                ("higher", min(row[2:]), "higher_witness", 2 + row[2:].index(min(row[2:]))),
            )
            for field, value, witness, power in candidates:
                if stats[field] is None or value < stats[field]:
                    stats[field] = value
                    stats[witness] = {"key": key, "baseline_order": baseline, "order_shift": shift, "power": power, "coefficient": value}
            zero_higher += sum(value == 0 for value in row[2:])
        line = json.dumps([key, baseline, shift, coeffs[0], coeffs[1]], separators=(",", ":")) + "\n"
        stream.update(line.encode())
        count += 1
        if count % 10000 == 0:
            print("PROGRESS", count, flush=True)
    assert count == 57133
    stream_hex = stream.hexdigest().upper()
    payload = {
        "schema": "rank8-delta01-e2-pendant-mixed-newton-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E2_PENDANT_MIXED_ALL_RAYS",
        "theorem": "For every mixed short/long pendant-root e=2 quotient key and every total long offset giving n>=31, Delta0>0 and Delta1>0, strictly increasing along the ray.",
        "rays": count,
        "rank_rays": 2 * count,
        "samples_per_rank_ray": SAMPLES,
        "literal_values": 2 * count * SAMPLES,
        "newton_degree_bound": 28,
        "minimum_coefficients": minima,
        "zero_higher_coefficients": zero_higher,
        "literal_formula_self_checks": self_checks,
        "coefficient_stream_order": "near,tail,sibling,far_pair,bridge in declared state order; one newline per ray",
        "coefficient_stream_sha256": stream_hex,
        "immutable_input_hashes": actual,
        "runtime_seconds": time.perf_counter() - started,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Pendant mixed e=2 only; all e>=4 remain separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("RAYS", count, "VALUES", payload["literal_values"], "ZEROS", zero_higher)
    print("MINIMA", json.dumps(minima, indent=2))
    print("STREAM", stream_hex)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
