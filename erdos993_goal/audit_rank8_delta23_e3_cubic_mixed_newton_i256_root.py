#!/usr/bin/env python3
"""Independent literal-tree audit of the root Delta2/Delta3 Newton probe.

The Rust probe uses conditioned path products.  This auditor instead builds
the literal subdivided tree vertex by vertex, computes its independence
vectors with a generic rooted-forest DP, and checks every reported extremal
witness through S=30.  The unseen S=30 value also audits the degree-29 Newton
reconstruction used by the exhaustive route.
"""

from __future__ import annotations

import hashlib
import json
import math
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXE = ROOT / "probe_rank8_delta23_e3_cubic_mixed_newton_i256_root.exe"
OUTPUT = ROOT / "rank8_delta23_e3_cubic_mixed_newton_i256_root_independent_audit_20260823.json"
MAX_RANK = 8
SAMPLE_CELLS = 1000

EXPECTED_COUNTS = {
    "outer_branch": 592_271,
    "middle_branch": 296_693,
    "outer_leaf": 1_184_543,
    "middle_leaf": 329_795,
    "outer_pendant_internal": 10_365_407,
    "middle_pendant_internal": 2_893_391,
    "spine_internal": 5_236_991,
}

FIELDS = {
    "outer_branch": ("a1", "a2", "m", "b1", "b2", "u", "v"),
    "middle_branch": ("m", "a1", "a2", "b1", "b2", "u", "v"),
    "outer_leaf": ("a1", "a2", "m", "b1", "b2", "u", "v"),
    "middle_leaf": ("m", "a1", "a2", "b1", "b2", "u", "v"),
    "outer_pendant_internal": ("near", "tail", "a2", "m", "b1", "b2", "u", "v"),
    "middle_pendant_internal": ("near", "tail", "a1", "a2", "b1", "b2", "u", "v"),
    "spine_internal": ("near", "tail", "a1", "a2", "m", "b1", "b2", "v"),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[int], right: list[int]) -> list[int]:
    return [
        (left[k] if k < len(left) else 0) + (right[k] if k < len(right) else 0)
        for k in range(min(MAX_RANK, max(len(left), len(right)) - 1) + 1)
    ]


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (min(MAX_RANK, len(left) + len(right) - 2) + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= MAX_RANK:
                out[i + j] += a * b
    return out


def forest_polynomial(adjacency: list[list[int]], removed: int | None = None) -> list[int]:
    visited = {removed} if removed is not None else set()

    def rooted(vertex: int, parent: int | None):
        visited.add(vertex)
        excluded = [1]
        included = [0, 1]
        for child in adjacency[vertex]:
            if child == parent or child == removed:
                continue
            child_excluded, child_included = rooted(child, vertex)
            excluded = multiply(excluded, add(child_excluded, child_included))
            included = multiply(included, child_excluded)
        return excluded, included

    result = [1]
    for vertex in range(len(adjacency)):
        if vertex in visited:
            continue
        excluded, included = rooted(vertex, None)
        result = multiply(result, add(excluded, included))
    result.extend([0] * (MAX_RANK + 1 - len(result)))
    return result


def subdivision_with_paths(lengths: dict[str, int]):
    edges = [
        ("u", 0, 1), ("v", 1, 2),
        ("a1", 0, 3), ("a2", 0, 4), ("m", 1, 5),
        ("b1", 2, 6), ("b2", 2, 7),
    ]
    order = 1 + sum(lengths[name] for name, _, _ in edges)
    adjacency = [[] for _ in range(order)]
    paths: dict[str, list[int]] = {}
    next_vertex = 8
    for name, left, right in edges:
        path = [left]
        previous = left
        for _ in range(1, lengths[name]):
            vertex = next_vertex
            next_vertex += 1
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
            path.append(vertex)
        adjacency[previous].append(right)
        adjacency[right].append(previous)
        path.append(right)
        paths[name] = path
    assert next_vertex == order
    return adjacency, paths


def literal_tree(label: str, values: list[int], long_mask: int, offset: int):
    names = FIELDS[label]
    first_long = next(index for index in range(len(values)) if long_mask & (1 << index))
    shifted = values[:]
    shifted[first_long] += offset
    raw = dict(zip(names, shifted, strict=True))
    if label == "outer_pendant_internal":
        lengths = {**raw, "a1": raw["near"] + raw["tail"] + 1}
    elif label == "middle_pendant_internal":
        lengths = {**raw, "m": raw["near"] + raw["tail"] + 1}
    elif label == "spine_internal":
        lengths = {**raw, "u": raw["near"] + raw["tail"] + 2}
    else:
        lengths = raw
    adjacency, paths = subdivision_with_paths(lengths)
    if label == "outer_branch":
        root = 0
    elif label == "middle_branch":
        root = 1
    elif label == "outer_leaf":
        root = 3
    elif label == "middle_leaf":
        root = 5
    elif label == "outer_pendant_internal":
        root = paths["a1"][raw["near"] + 1]
    elif label == "middle_pendant_internal":
        root = paths["m"][raw["near"] + 1]
    elif label == "spine_internal":
        root = paths["u"][raw["near"] + 1]
    else:
        raise AssertionError(label)
    return adjacency, root


def residual(c: list[int], h: list[int], siblings: int) -> int:
    def p(rank: int) -> int:
        return sum(
            math.comb(siblings, ell) * c[rank - ell]
            for ell in range(rank + 1)
        ) + h[rank - 1]

    p7, p8 = p(7), p(8)
    p9_open = sum(
        math.comb(siblings, ell) * c[9 - ell]
        for ell in range(1, 10)
    )
    return (
        8 * c[7] * h[6] * (16 * p8 * p8 - p7 * p8 - 18 * p7 * p9_open)
        - 8 * h[6] * p7 * (16 * c[8] * c[8] - c[7] * c[8])
        - 9 * c[7] * p7 * (14 * h[7] * h[7] - h[6] * h[7])
    )


def literal_delta23(label: str, values: list[int], long_mask: int, offset: int):
    adjacency, root = literal_tree(label, values, long_mask, offset)
    c = forest_polynomial(adjacency)
    h = forest_polynomial(adjacency, root)
    r1 = residual(c, h, 1)
    r2 = residual(c, h, 2)
    r3 = residual(c, h, 3)
    r4 = residual(c, h, 4)
    return r3 - 2 * r2 + r1, r4 - 3 * r3 + 3 * r2 - r1, len(adjacency), root


def forward(values: list[int]) -> list[int]:
    current = values[:]
    out = []
    while current:
        out.append(current[0])
        current = [current[i + 1] - current[i] for i in range(len(current) - 1)]
    return out


def audit_witness(label: str, metric: str, witness: dict, expected: int):
    values = witness["values"]
    long_mask = witness["long_mask"]
    assert 0 < long_mask < (1 << len(values)) - 1
    samples2, samples3 = [], []
    order0 = root0 = None
    for offset in range(31):
        d2, d3, order, root = literal_delta23(label, values, long_mask, offset)
        if offset == 0:
            order0, root0 = order, root
        samples2.append(d2)
        samples3.append(d3)
    coefficients2 = forward(samples2[:30])
    coefficients3 = forward(samples3[:30])
    assert coefficients2[0] > 0 and coefficients2[1] > 0
    assert coefficients3[0] > 0 and coefficients3[1] > 0
    assert all(value >= 0 for value in coefficients2)
    assert all(value >= 0 for value in coefficients3)
    predicted2 = sum(coefficients2[k] * math.comb(30, k) for k in range(30))
    predicted3 = sum(coefficients3[k] * math.comb(30, k) for k in range(30))
    assert predicted2 == samples2[30]
    assert predicted3 == samples3[30]
    selected = {
        "minimum_base2": coefficients2[0],
        "minimum_base3": coefficients3[0],
        "minimum_first2": coefficients2[1],
        "minimum_first3": coefficients3[1],
    }[metric]
    assert selected == expected
    return {
        "metric": metric,
        "values": values,
        "long_mask": long_mask,
        "literal_order_S0": order0,
        "literal_root": root0,
        "expected_and_replayed_value": expected,
        "delta2_newton_sha256": hashlib.sha256(json.dumps(coefficients2).encode("ascii")).hexdigest().upper(),
        "delta3_newton_sha256": hashlib.sha256(json.dumps(coefficients3).encode("ascii")).hexdigest().upper(),
        "unseen_S30_match": True,
    }


def main() -> None:
    reports = []
    for label, expected_universe in EXPECTED_COUNTS.items():
        completed = subprocess.run(
            [str(EXE), label, "0", str(SAMPLE_CELLS)],
            check=True, capture_output=True, text=True,
        )
        scan = json.loads(completed.stdout.strip().splitlines()[-1])
        assert scan["status"] == "PASS_EXACT_DELTA23_MIXED_NEWTON_I256_CHUNK"
        assert scan["processed"] == SAMPLE_CELLS
        assert scan["universe"] == expected_universe
        assert scan["negative2"] == scan["negative3"] == 0
        witnesses = []
        for metric in ("minimum_base2", "minimum_base3", "minimum_first2", "minimum_first3"):
            witness_name = "witness_" + metric.removeprefix("minimum_")
            witnesses.append(audit_witness(
                label, metric, scan[witness_name], int(scan[metric]),
            ))
        reports.append({
            "root_location_orbit": label,
            "sampled_prefix_cells": SAMPLE_CELLS,
            "full_universe_count_replayed": expected_universe,
            "negative2": scan["negative2"],
            "negative3": scan["negative3"],
            "zero_higher": scan["zero_higher"],
            "witness_audits": witnesses,
        })
        print("PASS", label, flush=True)

    payload = {
        "schema": "rank8-delta23-e3-cubic-mixed-newton-i256-root-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_TREE_DELTA23_I256_ROUTE_AUDIT",
        "scope": "Diagnostic validation of 1,000-ray prefixes and all four reported extrema per root orbit; not exhaustive closure.",
        "root_orbits": reports,
        "totals": {
            "sampled_prefix_cells": len(reports) * SAMPLE_CELLS,
            "literal_extremal_witnesses": len(reports) * 4,
            "unseen_S30_checks": len(reports) * 4,
        },
        "methods": [
            "literal vertex-by-vertex subdivided-tree construction",
            "generic rooted-forest independence-polynomial DP",
            "independently transcribed residual and Delta2/Delta3 differences",
            "independent Newton transform and unseen S=30 reconstruction",
        ],
        "immutable_inputs": {
            EXE.name: sha256(EXE),
            "probe_rank8_delta23_e3_cubic_mixed_newton_i256_root.rs": sha256(ROOT / "probe_rank8_delta23_e3_cubic_mixed_newton_i256_root.rs"),
            "rank8_delta03_e3_cubic_exact_i256_core_root.rs": sha256(ROOT / "rank8_delta03_e3_cubic_exact_i256_core_root.rs"),
            "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": sha256(ROOT / "rank8_delta01_e3_cubic_exact_i256_core_agent.rs"),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This validates the new arithmetic route but does not replace the pending exhaustive 20,899,091-ray scan or its final independent audit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
