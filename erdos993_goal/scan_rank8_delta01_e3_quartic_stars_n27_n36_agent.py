#!/usr/bin/env python3
"""Exact finite Delta0/Delta1 census of every rooted e=3 quartic star, n=27..36."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

from scan_rank8_delta23_e1_subdivided_claws_n23_n28 import evaluator
from scan_rank8_delta3_n28_e1_subdivided_claws import forest_poly


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_quartic_stars_n27_n36_exact_agent_20260822.json"
RANKS = (0, 1)
EXPECTED = {
    "scan_rank8_delta23_e1_subdivided_claws_n23_n28.py":
        "0CB38CA50A03E84E1C7CBC73A303EC2A5882689D7FF8E5440AB87A44075F4E59",
    "scan_rank8_delta3_n28_e1_subdivided_claws.py":
        "F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def arm_partitions(order: int):
    total = order - 1
    for a in range(1, total + 1):
        for b in range(a, total + 1):
            for c in range(b, total + 1):
                d = total - a - b - c
                if d < c:
                    continue
                yield a, b, c, d


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
    rows = []
    totals = {"canonical_cores": 0, "rooted_rows": 0}
    global_minima = {rank: None for rank in RANKS}
    global_witnesses = {rank: None for rank in RANKS}
    for order in range(27, 37):
        evaluators = {rank: evaluator(rank, order)[0] for rank in RANKS}
        minima = {rank: None for rank in RANKS}
        witnesses = {rank: None for rank in RANKS}
        cores = rooted_rows = 0
        for arms in arm_partitions(order):
            adjacency, descriptors = build_star(arms)
            assert len(adjacency) == order
            assert len(descriptors) == order
            surplus = sum(comb(len(neighbors) - 1, 2) for neighbors in adjacency)
            assert surplus == 3
            core = forest_poly(adjacency)
            cores += 1
            for root, descriptor in enumerate(descriptors):
                deletion = forest_poly(adjacency, root)
                inputs = (*core[3:9], deletion[6], deletion[7])
                rooted_rows += 1
                for rank in RANKS:
                    value = evaluators[rank](inputs)
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
        assert cores > 0 and rooted_rows == order * cores
        assert all(minima[rank] > 0 for rank in RANKS), (order, minima, witnesses)
        totals["canonical_cores"] += cores
        totals["rooted_rows"] += rooted_rows
        rows.append({
            "order": order,
            "canonical_cores": cores,
            "rooted_rows": rooted_rows,
            "minimum_values": {str(rank): minima[rank] for rank in RANKS},
            "minimum_witnesses": {str(rank): witnesses[rank] for rank in RANKS},
            "negative_rows": {"0": 0, "1": 0},
        })
        print("ORDER_PASS", order, cores, rooted_rows, minima, flush=True)

    payload = {
        "schema": "rank8-delta01-e3-quartic-stars-n27-n36-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STARS_ALL_ROOTS_N27_N36",
        "theorem": (
            "Delta0>0 and Delta1>0 for every root of every subdivided "
            "four-arm star of each order 27 through 36."
        ),
        "classification": (
            "The e=3 skeleton with one degree-four vertex is exactly a "
            "subdivision of the four-arm star; sorted positive arm lengths "
            "give a no-gap isomorphism list."
        ),
        "orders": rows,
        "totals": totals,
        "global_minimum_values": {
            str(rank): global_minima[rank] for rank in RANKS
        },
        "global_minimum_witnesses": {
            str(rank): global_witnesses[rank] for rank in RANKS
        },
        "negative_rows": {"0": 0, "1": 0},
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is an exact finite theorem for one e=3 skeleton. It is not "
            "an all-order quartic-star, complete e=3, or connected-Q8 theorem."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TOTALS", totals)
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
