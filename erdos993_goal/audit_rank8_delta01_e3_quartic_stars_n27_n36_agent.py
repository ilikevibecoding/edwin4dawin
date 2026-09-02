#!/usr/bin/env python3
"""Independent literal-DP replay of the finite e=3 quartic-star census."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta01_e3_quartic_stars_n27_n36_exact_agent_20260822.json"
OUTPUT = ROOT / "rank8_delta01_e3_quartic_stars_n27_n36_independent_audit_agent_20260822.json"
EXPECTED = {
    "scan_rank8_delta01_e3_quartic_stars_n27_n36_agent.py":
        "12269BCEA8F1BDF1FEECAB00E8622D5FD4F5BE19BACAB5F6804032B91A10B416",
    PRIMARY.name:
        "0BD25498A6C35D33B4109D5AB674239A80426B2F1FC2E653F2E40B852E531879",
}
MAX_RANK = 8


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[int], right: list[int]) -> list[int]:
    return [
        (left[k] if k < len(left) else 0)
        + (right[k] if k < len(right) else 0)
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


def residual_value(c: list[int], h: list[int], t: int) -> int:
    def p(rank: int) -> int:
        return sum(comb(t, ell) * c[rank - ell] for ell in range(rank + 1)) + h[rank - 1]

    p7, p8 = p(7), p(8)
    p9_other = sum(comb(t, ell) * c[9 - ell] for ell in range(1, 10))
    return (
        8 * c[7] * h[6] * (16 * p8 * p8 - p7 * p8 - 18 * p7 * p9_other)
        - 8 * h[6] * p7 * (16 * c[8] * c[8] - c[7] * c[8])
        - 9 * c[7] * p7 * (14 * h[7] * h[7] - h[6] * h[7])
    )


def deltas(c: list[int], h: list[int]) -> tuple[int, int]:
    r1 = residual_value(c, h, 1)
    r2 = residual_value(c, h, 2)
    return r1, r2 - r1


def arm_partitions(order: int):
    total = order - 1
    for a in range(1, total + 1):
        for b in range(a, total + 1):
            for cc in range(b, total + 1):
                d = total - a - b - cc
                if d >= cc:
                    yield a, b, cc, d


def build_star(arms: tuple[int, int, int, int]):
    adjacency = [[]]
    descriptors = [("center",)]
    for arm_index, length in enumerate(arms):
        previous = 0
        for distance in range(1, length + 1):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            descriptors.append(("arm", arm_index, distance))
            previous = vertex
    return adjacency, descriptors


def main() -> None:
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STARS_ALL_ROOTS_N27_N36"
    replay_rows = []
    global_minima = {0: None, 1: None}
    global_witnesses = {0: None, 1: None}
    total_cores = total_roots = 0
    for expected_row in primary["orders"]:
        order = expected_row["order"]
        minima = {0: None, 1: None}
        witnesses = {0: None, 1: None}
        cores = roots = 0
        for arms in arm_partitions(order):
            adjacency, descriptors = build_star(arms)
            core = forest_polynomial(adjacency)
            cores += 1
            for root, descriptor in enumerate(descriptors):
                deletion = forest_polynomial(adjacency, root)
                values = deltas(core, deletion)
                roots += 1
                for rank, value in enumerate(values):
                    assert value > 0, (order, arms, descriptor, rank, value)
                    if minima[rank] is None or value < minima[rank]:
                        minima[rank] = value
                        witnesses[rank] = {
                            "arms": list(arms),
                            "root_descriptor": list(descriptor),
                            "value": value,
                        }
                    if global_minima[rank] is None or value < global_minima[rank]:
                        global_minima[rank] = value
                        global_witnesses[rank] = {
                            "order": order,
                            **witnesses[rank],
                        }
        assert cores == expected_row["canonical_cores"]
        assert roots == expected_row["rooted_rows"] == order * cores
        assert {str(rank): minima[rank] for rank in (0, 1)} == expected_row["minimum_values"]
        assert {str(rank): witnesses[rank] for rank in (0, 1)} == expected_row["minimum_witnesses"]
        replay_rows.append({
            "order": order,
            "canonical_cores": cores,
            "rooted_rows": roots,
            "minimum_values": {str(rank): minima[rank] for rank in (0, 1)},
        })
        total_cores += cores
        total_roots += roots
        print("AUDIT_ORDER_PASS", order, cores, roots, minima, flush=True)

    assert {"canonical_cores": total_cores, "rooted_rows": total_roots} == primary["totals"]
    assert {str(rank): global_minima[rank] for rank in (0, 1)} == primary["global_minimum_values"]
    assert {str(rank): global_witnesses[rank] for rank in (0, 1)} == primary["global_minimum_witnesses"]
    payload = {
        "schema": "rank8-delta01-e3-quartic-stars-n27-n36-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DP_RANK8_DELTA01_E3_QUARTIC_STARS_N27_N36",
        "method": (
            "independent truncated tree-DP for independence coefficients, "
            "followed by a separately transcribed R_t identity and "
            "Delta0=R1, Delta1=R2-R1"
        ),
        "orders": replay_rows,
        "totals": primary["totals"],
        "global_minimum_values": primary["global_minimum_values"],
        "global_minimum_witnesses": primary["global_minimum_witnesses"],
        "negative_rows": {"0": 0, "1": 0},
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Exact finite replay only; no all-order claim is inferred from the census.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
