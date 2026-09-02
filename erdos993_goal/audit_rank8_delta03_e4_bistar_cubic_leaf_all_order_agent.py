#!/usr/bin/env python3
"""Independent literal-tree audit of the all-order e=4 bistar cubic leaf root."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import time
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / "rank8_delta03_e4_bistar_cubic_leaf_all_order_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta03_e4_bistar_cubic_leaf_all_order_independent_audit_agent_20260823.json"
MAX_RANK = 8
SAMPLES = 29
DEGREE_BOUNDS = (28, 28, 27, 26)
EXPECTED = {
    "scan_rank8_delta03_e4_bistar_cubic_leaf_all_order_agent.py": "4CA73FA77FA5A1318DF682C0412E74C25B98342F51B45B3C0D14211D80762D80",
    "rank8_delta03_e4_bistar_cubic_leaf_all_order_exact_agent_20260823.json": "8B97C2E5F1FAEE4853A960A40FFA678061623C5FE54810D990F5F38A88AC9F60",
    "rank8_delta03_e4_bistar_cubic_leaf_newton_reduction_exact_agent_20260823.json": "E6DF06BA4055AE0AE862BD1A9D90514094B291DFF08D9FE626C0D40108FF4E6C",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def multiply(left, right):
    out = [0] * (MAX_RANK + 1)
    for i, a in enumerate(left):
        if a:
            for j, b in enumerate(right[: MAX_RANK + 1 - i]):
                if b:
                    out[i + j] += a * b
    return out


def forest_polynomial(adjacency, removed=None):
    seen = {removed} if removed is not None else set()

    def visit(vertex, parent):
        seen.add(vertex)
        absent = [1] + [0] * MAX_RANK
        present = [1] + [0] * MAX_RANK
        for neighbor in adjacency[vertex]:
            if neighbor == parent or neighbor == removed:
                continue
            child0, child1 = visit(neighbor, vertex)
            absent = multiply(absent, [a + b for a, b in zip(child0, child1)])
            present = multiply(present, child0)
        return absent, [0] + present[:MAX_RANK]

    out = [1] + [0] * MAX_RANK
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        absent, present = visit(vertex, -1)
        out = multiply(out, [a + b for a, b in zip(absent, present)])
    return out


def residual(core, deleted, siblings):
    p7 = sum(math.comb(siblings, i) * core[7 - i] for i in range(8)) + deleted[6]
    p8 = sum(math.comb(siblings, i) * core[8 - i] for i in range(9)) + deleted[7]
    p9_open = sum(math.comb(siblings, i) * core[9 - i] for i in range(1, 10))
    q8 = 16 * p8 * p8 - p7 * p8 - 18 * p7 * p9_open
    core_q = 16 * core[8] * core[8] - core[7] * core[8]
    deleted_q = 14 * deleted[7] * deleted[7] - deleted[6] * deleted[7]
    return 8 * core[7] * deleted[6] * q8 - 8 * deleted[6] * p7 * core_q - 9 * core[7] * p7 * deleted_q


def deltas(core, deleted):
    rows = [residual(core, deleted, siblings) for siblings in range(1, 5)]
    return (
        rows[0], rows[1] - rows[0], rows[2] - 2 * rows[1] + rows[0],
        rows[3] - 3 * rows[2] + 3 * rows[1] - rows[0],
    )


def attach(adjacency, start, length):
    previous = start
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    return previous


def literal_tree(lengths):
    q1, q2, q3, other, incident, spine = lengths
    adjacency = [[]]
    quartic = 0
    cubic = attach(adjacency, quartic, spine)
    for length in (q1, q2, q3):
        attach(adjacency, quartic, length)
    attach(adjacency, cubic, other)
    root = attach(adjacency, cubic, incident)
    assert len(adjacency) == 1 + sum(lengths)
    assert sum(map(len, adjacency)) == 2 * (len(adjacency) - 1)
    return adjacency, root


def evaluate(lengths):
    adjacency, root = literal_tree(lengths)
    return deltas(forest_polynomial(adjacency), forest_polynomial(adjacency, root))


def keys():
    ordinary = (*range(1, 7), "L")
    incident = (*range(1, 8), "L")
    spines = (*range(1, 8), "L")
    for qarms in itertools.combinations_with_replacement(ordinary, 3):
        for other in ordinary:
            for root_arm in incident:
                for spine in spines:
                    flat = (*qarms, other, root_arm, spine)
                    flags = tuple(value == "L" for value in flat)
                    yield (qarms, other, root_arm, spine), flat, flags


def base_lengths(flat):
    return [((7 if i < 4 else 8) if value == "L" else int(value)) for i, value in enumerate(flat)]


def ray_lengths(flat, flags, extra):
    out = base_lengths(flat)
    out[flags.index(True)] += extra
    return tuple(out)


def differences(values):
    out = []
    row = values
    while row:
        out.append(row[0])
        row = [right - left for left, right in zip(row, row[1:])]
    return tuple(out)


def newton_value(coefficients, sample):
    return sum(value * math.comb(sample, power) for power, value in enumerate(coefficients))


def stream_update(digest, record):
    digest.update(json.dumps(record, separators=(",", ":"), sort_keys=True).encode())
    digest.update(b"\n")


def update_min(stats, field, value, witness):
    if stats[field] is None or value < stats[field]:
        stats[field] = value
        stats[field + "_witness"] = witness


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E4_BISTAR_CUBIC_LEAF_N27_PLUS"
    started = time.perf_counter()
    minima = {str(rank): {field: None for field in (
        "finite", "finite_witness", "d0", "d0_witness", "d1", "d1_witness", "higher", "higher_witness"
    )} for rank in range(4)}
    coefficient_digest = hashlib.sha256()
    finite_digest = hashlib.sha256()
    all_short = finite = mixed = all_long = rays = zero_higher = literal_trees = unseen_checks = 0

    for key, flat, flags in keys():
        if not any(flags):
            all_short += 1
            lengths = tuple(int(value) for value in flat)
            order = 1 + sum(lengths)
            if order < 27:
                continue
            values = evaluate(lengths)
            literal_trees += 1
            assert min(values) > 0
            for rank, value in enumerate(values):
                update_min(minima[str(rank)], "finite", value, {"key": key, "order": order, "value": value})
            stream_update(finite_digest, [key, order, values])
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
            values = evaluate(ray_lengths(flat, flags, shift + sample))
            literal_trees += 1
            for rank, value in enumerate(values):
                sampled[rank].append(value)
        coefficients = tuple(differences(row) for row in sampled)
        for rank, row in enumerate(coefficients):
            degree = DEGREE_BOUNDS[rank]
            assert row[0] > 0 and row[1] > 0 and min(row[2 : degree + 1]) >= 0
            assert all(value == 0 for value in row[degree + 1 :])
            witness = {"key": key, "baseline_order": baseline, "order_shift": shift}
            stats = minima[str(rank)]
            update_min(stats, "d0", row[0], {**witness, "power": 0, "value": row[0]})
            update_min(stats, "d1", row[1], {**witness, "power": 1, "value": row[1]})
            higher = min(row[2 : degree + 1])
            power = 2 + row[2 : degree + 1].index(higher)
            update_min(stats, "higher", higher, {**witness, "power": power, "value": higher})
            zero_higher += sum(value == 0 for value in row[2 : degree + 1])
        stream_update(coefficient_digest, [key, baseline, shift, coefficients])
        unseen = evaluate(ray_lengths(flat, flags, shift + SAMPLES))
        literal_trees += 1
        for rank in range(4):
            assert unseen[rank] == newton_value(coefficients[rank], SAMPLES)
            unseen_checks += 1
        rays += 1

    assert (all_short, finite, mixed, all_long, rays) == (16464, 3850, 21167, 1, 21168)
    assert coefficient_digest.hexdigest().upper() == primary["coefficient_stream_sha256"]
    assert finite_digest.hexdigest().upper() == primary["finite_value_stream_sha256"]
    assert json.loads(json.dumps(minima)) == primary["minimum_values_and_coefficients"]
    assert zero_higher == primary["zero_higher_coefficients"]
    payload = {
        "schema": "rank8-delta03-e4-bistar-cubic-leaf-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_BISTAR_CUBIC_LEAF_N27_PLUS_AUDIT",
        "audit_claim": "Independent literal-tree construction, root deletion, arbitrary-integer forest DP/residual, finite differences, and an unseen S=29 extrapolation reproduced the primary certificate.",
        "counts": {"all_short_total": all_short, "all_short_n27_plus": finite, "mixed_rays": mixed, "all_long_rays": all_long, "non_all_short_rays": rays, "literal_trees": literal_trees, "unseen_S29_checks": unseen_checks},
        "matching_coefficient_stream_sha256": coefficient_digest.hexdigest().upper(),
        "matching_finite_value_stream_sha256": finite_digest.hexdigest().upper(),
        "matching_minima": True,
        "matching_zero_higher_count": zero_higher,
        "immutable_input_hashes": actual,
        "runtime_seconds": time.perf_counter() - started,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only quartic_cubic_bistar:cubic_leaf.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", literal_trees, "UNSEEN", unseen_checks)
    print("STREAM", payload["matching_coefficient_stream_sha256"], payload["matching_finite_value_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
