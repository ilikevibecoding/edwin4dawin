#!/usr/bin/env python3
"""Independent literal-tree audit of both all-order e=4 bistar branch roots."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import time
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / "rank8_delta03_e4_bistar_branch_all_order_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta03_e4_bistar_branch_all_order_independent_audit_agent_20260823.json"
MAX_RANK = 8
SAMPLES = 29
DEGREE_BOUNDS = (28, 28, 27, 26)
ROOTS = ("quartic_branch", "cubic_branch")
EXPECTED = {
    "scan_rank8_delta03_e4_bistar_branch_all_order_agent.py":
        "163CEDBF016B7F2C08969C11BF40F69E4C17FB397294C893A283AC813BC31B1F",
    "rank8_delta03_e4_bistar_branch_all_order_exact_agent_20260823.json":
        "B89E22B84B7E457F5013761D0A35337F0046734868711F334EA3BF834810EC3F",
    "rank8_delta03_e4_bistar_branch_newton_reduction_exact_agent_20260823.json":
        "E6BEE445E8B7ABC6BC68C9F115F7D973B21C2F200E958EF4D833BAE835F6758A",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json":
        "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (MAX_RANK + 1)
    for i, a in enumerate(left):
        if a:
            for j, b in enumerate(right[: MAX_RANK + 1 - i]):
                if b:
                    out[i + j] += a * b
    return out


def forest_polynomial(adjacency: list[list[int]], removed: int | None = None) -> list[int]:
    seen = {removed} if removed is not None else set()

    def visit(vertex: int, parent: int):
        seen.add(vertex)
        absent = [1] + [0] * MAX_RANK
        present = [1] + [0] * MAX_RANK
        for neighbor in adjacency[vertex]:
            if neighbor == parent or neighbor == removed:
                continue
            child_absent, child_present = visit(neighbor, vertex)
            absent = multiply(absent, [a + b for a, b in zip(child_absent, child_present)])
            present = multiply(present, child_absent)
        return absent, [0] + present[:MAX_RANK]

    result = [1] + [0] * MAX_RANK
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        absent, present = visit(vertex, -1)
        result = multiply(result, [a + b for a, b in zip(absent, present)])
    return result


def residual(core: list[int], deleted: list[int], siblings: int) -> int:
    p7 = sum(math.comb(siblings, i) * core[7 - i] for i in range(8)) + deleted[6]
    p8 = sum(math.comb(siblings, i) * core[8 - i] for i in range(9)) + deleted[7]
    p9_open = sum(math.comb(siblings, i) * core[9 - i] for i in range(1, 10))
    q8 = 16 * p8 * p8 - p7 * p8 - 18 * p7 * p9_open
    core_q = 16 * core[8] * core[8] - core[7] * core[8]
    deleted_q = 14 * deleted[7] * deleted[7] - deleted[6] * deleted[7]
    return 8 * core[7] * deleted[6] * q8 - 8 * deleted[6] * p7 * core_q - 9 * core[7] * p7 * deleted_q


def deltas(core: list[int], deleted: list[int]) -> tuple[int, int, int, int]:
    rows = [residual(core, deleted, siblings) for siblings in range(1, 5)]
    return (
        rows[0],
        rows[1] - rows[0],
        rows[2] - 2 * rows[1] + rows[0],
        rows[3] - 3 * rows[2] + 3 * rows[1] - rows[0],
    )


def attach(adjacency: list[list[int]], start: int, length: int) -> int:
    previous = start
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    return previous


def literal_tree(lengths: tuple[int, int, int, int, int, int]):
    q1, q2, q3, c1, c2, spine = lengths
    adjacency: list[list[int]] = [[]]
    quartic = 0
    cubic = attach(adjacency, quartic, spine)
    for length in (q1, q2, q3):
        attach(adjacency, quartic, length)
    for length in (c1, c2):
        attach(adjacency, cubic, length)
    assert len(adjacency) == 1 + sum(lengths)
    assert sum(map(len, adjacency)) == 2 * (len(adjacency) - 1)
    return adjacency, (quartic, cubic)


def quotient_keys():
    arms = (*range(1, 7), "L")
    spines = (*range(1, 8), "L")
    qtriples = tuple(itertools.combinations_with_replacement(arms, 3))
    cpairs = tuple(itertools.combinations_with_replacement(arms, 2))
    for qarms in qtriples:
        for carms in cpairs:
            for spine in spines:
                flat = (*qarms, *carms, spine)
                flags = tuple(value == "L" for value in flat)
                yield (qarms, carms, spine), flat, flags


def base_lengths(flat: tuple[object, ...]) -> list[int]:
    return [(7 if i < 5 else 8) if value == "L" else int(value) for i, value in enumerate(flat)]


def ray_lengths(flat, flags, extra):
    out = base_lengths(flat)
    out[flags.index(True)] += extra
    return tuple(out)


def differences(values: list[int]) -> tuple[int, ...]:
    out = []
    row = values
    while row:
        out.append(row[0])
        row = [right - left for left, right in zip(row, row[1:])]
    return tuple(out)


def newton_value(coefficients: tuple[int, ...], sample: int) -> int:
    return sum(value * math.comb(sample, power) for power, value in enumerate(coefficients))


def stream_update(digest, record) -> None:
    digest.update(json.dumps(record, separators=(",", ":"), sort_keys=True).encode())
    digest.update(b"\n")


def update_minimum(stats: dict, field: str, value: int, witness: dict) -> None:
    if stats[field] is None or value < stats[field]:
        stats[field] = value
        stats[field + "_witness"] = witness


def evaluate_literal(lengths):
    adjacency, root_vertices = literal_tree(lengths)
    core = forest_polynomial(adjacency)
    return tuple(deltas(core, forest_polynomial(adjacency, root)) for root in root_vertices)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E4_BISTAR_BOTH_BRANCH_ROOTS_N27_PLUS"
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
    all_short = finite = mixed = all_long = rays = 0
    unseen_checks = 0
    literal_trees = 0
    zero_higher = 0

    for key, flat, flags in quotient_keys():
        if not any(flags):
            all_short += 1
            lengths = tuple(int(value) for value in flat)
            order = 1 + sum(lengths)
            if order < 27:
                continue
            root_values = evaluate_literal(lengths)
            literal_trees += 1
            for root_index, root in enumerate(ROOTS):
                values = root_values[root_index]
                assert min(values) > 0
                for rank, value in enumerate(values):
                    update_minimum(
                        minima[root][str(rank)], "finite", value,
                        {"key": key, "order": order, "value": value},
                    )
                stream_update(finite_digest, [root, key, order, values])
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
            root_values = evaluate_literal(ray_lengths(flat, flags, shift + sample))
            literal_trees += 1
            for root_index in range(2):
                for rank, value in enumerate(root_values[root_index]):
                    sampled[root_index][rank].append(value)
        coefficients_by_root = []
        for root_index, root in enumerate(ROOTS):
            coefficients = tuple(differences(values) for values in sampled[root_index])
            coefficients_by_root.append(coefficients)
            for rank, row in enumerate(coefficients):
                degree = DEGREE_BOUNDS[rank]
                assert row[0] > 0 and row[1] > 0 and min(row[2 : degree + 1]) >= 0
                assert all(value == 0 for value in row[degree + 1 :])
                stats = minima[root][str(rank)]
                witness = {"key": key, "baseline_order": baseline, "order_shift": shift}
                update_minimum(stats, "d0", row[0], {**witness, "power": 0, "value": row[0]})
                update_minimum(stats, "d1", row[1], {**witness, "power": 1, "value": row[1]})
                higher = min(row[2 : degree + 1])
                power = 2 + row[2 : degree + 1].index(higher)
                update_minimum(stats, "higher", higher, {**witness, "power": power, "value": higher})
                zero_higher += sum(value == 0 for value in row[2 : degree + 1])
            stream_update(coefficient_digest, [root, key, baseline, shift, coefficients])

        unseen = evaluate_literal(ray_lengths(flat, flags, shift + SAMPLES))
        literal_trees += 1
        for root_index in range(2):
            for rank in range(4):
                assert unseen[root_index][rank] == newton_value(coefficients_by_root[root_index][rank], SAMPLES)
                unseen_checks += 1
        rays += 1

    assert (all_short, finite, mixed, all_long, rays) == (8232, 1660, 10583, 1, 10584)
    assert coefficient_digest.hexdigest().upper() == primary["coefficient_stream_sha256"]
    assert finite_digest.hexdigest().upper() == primary["finite_value_stream_sha256"]
    normalized_minima = json.loads(json.dumps(minima))
    assert normalized_minima == primary["minimum_values_and_coefficients"]
    assert zero_higher == primary["zero_higher_coefficients"]
    payload = {
        "schema": "rank8-delta03-e4-bistar-branch-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_BISTAR_BOTH_BRANCH_ROOTS_N27_PLUS_AUDIT",
        "audit_claim": "An independent bridge-first literal tree builder, root-deletion forest DP, arbitrary-integer residual, finite-difference engine, and stream has reproduced every finite cell and every Newton sample for both branch roots.",
        "counts": {
            "all_short_total": all_short,
            "all_short_n27_plus": finite,
            "mixed_rays": mixed,
            "all_long_rays": all_long,
            "non_all_short_rays": rays,
            "literal_trees_evaluated": literal_trees,
            "unseen_S29_rank_root_checks": unseen_checks,
        },
        "matching_coefficient_stream_sha256": coefficient_digest.hexdigest().upper(),
        "matching_finite_value_stream_sha256": finite_digest.hexdigest().upper(),
        "matching_minimum_table": True,
        "matching_zero_higher_count": zero_higher,
        "immutable_input_hashes": actual,
        "runtime_seconds": time.perf_counter() - started,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only the two bistar branch-root orbits already claimed by the primary report.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", literal_trees, "UNSEEN_CHECKS", unseen_checks)
    print("COEFFICIENT_STREAM", payload["matching_coefficient_stream_sha256"])
    print("FINITE_STREAM", payload["matching_finite_value_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
