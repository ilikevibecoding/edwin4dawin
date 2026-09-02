#!/usr/bin/env python3
"""Independent literal-tree audit of the all-order e=4 bistar quartic leaf root."""

from __future__ import annotations

import hashlib
import itertools
import json
import time
from pathlib import Path

from audit_rank8_delta03_e4_bistar_cubic_leaf_all_order_agent import (
    deltas,
    differences,
    forest_polynomial,
    newton_value,
)


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / "rank8_delta03_e4_bistar_quartic_leaf_all_order_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta03_e4_bistar_quartic_leaf_all_order_independent_audit_agent_20260823.json"
SAMPLES = 29
DEGREE_BOUNDS = (28, 28, 27, 26)
EXPECTED = {
    "scan_rank8_delta03_e4_bistar_quartic_leaf_all_order_agent.py": "6603F6314DAC49B0EC70DA19C6E3DE334FFE08C20CFB241DEA883A441E4498EE",
    "rank8_delta03_e4_bistar_quartic_leaf_all_order_exact_agent_20260823.json": "10A9E13D6B3C170998BA1C19B128536372C806C6819540D2221A0F5F1E4F7182",
    "rank8_delta03_e4_bistar_quartic_leaf_newton_reduction_exact_agent_20260823.json": "253F89321D710013EBE0971887B52A18F6C2D6AB0DC416FC4C1AE121B38DC90A",
    "audit_rank8_delta03_e4_bistar_cubic_leaf_all_order_agent.py": "C1BE7A954DA43ED82D50077CC71C289BD1393AD1D4FF68026EE5026955864201",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
    q1, q2, incident, c1, c2, spine = lengths
    adjacency = [[]]
    quartic = 0
    cubic = attach(adjacency, quartic, spine)
    attach(adjacency, quartic, q1)
    attach(adjacency, quartic, q2)
    root = attach(adjacency, quartic, incident)
    attach(adjacency, cubic, c1)
    attach(adjacency, cubic, c2)
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
    pairs = tuple(itertools.combinations_with_replacement(ordinary, 2))
    for qpair in pairs:
        for root_arm in incident:
            for cpair in pairs:
                for spine in spines:
                    flat = (*qpair, root_arm, *cpair, spine)
                    flags = tuple(value == "L" for value in flat)
                    yield (qpair, root_arm, cpair, spine), flat, flags


def base_lengths(flat):
    bases = (7, 7, 8, 7, 7, 8)
    return [bases[i] if value == "L" else int(value) for i, value in enumerate(flat)]


def ray_lengths(flat, flags, extra):
    out = base_lengths(flat)
    out[flags.index(True)] += extra
    return tuple(out)


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
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E4_BISTAR_QUARTIC_LEAF_N27_PLUS"
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

    assert (all_short, finite, mixed, all_long, rays) == (21609, 4953, 28566, 1, 28567)
    assert coefficient_digest.hexdigest().upper() == primary["coefficient_stream_sha256"]
    assert finite_digest.hexdigest().upper() == primary["finite_value_stream_sha256"]
    assert json.loads(json.dumps(minima)) == primary["minimum_values_and_coefficients"]
    assert zero_higher == primary["zero_higher_coefficients"]
    payload = {
        "schema": "rank8-delta03-e4-bistar-quartic-leaf-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_BISTAR_QUARTIC_LEAF_N27_PLUS_AUDIT",
        "audit_claim": "Independent literal-tree/root-deletion DP and residual replay matched every primary stream value and every unseen S=29 extrapolation.",
        "counts": {"all_short_total": all_short, "all_short_n27_plus": finite, "mixed_rays": mixed, "all_long_rays": all_long, "non_all_short_rays": rays, "literal_trees": literal_trees, "unseen_S29_checks": unseen_checks},
        "matching_coefficient_stream_sha256": coefficient_digest.hexdigest().upper(),
        "matching_finite_value_stream_sha256": finite_digest.hexdigest().upper(),
        "matching_minima": True,
        "matching_zero_higher_count": zero_higher,
        "immutable_input_hashes": actual,
        "runtime_seconds": time.perf_counter() - started,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only quartic_cubic_bistar:quartic_leaf.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("LITERAL_TREES", literal_trees, "UNSEEN", unseen_checks)
    print("STREAM", payload["matching_coefficient_stream_sha256"], payload["matching_finite_value_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
