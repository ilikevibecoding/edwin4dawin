#!/usr/bin/env python3
"""Exact finite Delta2/Delta3 census of every rooted e=3 quartic star."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

from scan_rank8_delta23_e1_subdivided_claws_n23_n28 import evaluator
from scan_rank8_delta3_n28_e1_subdivided_claws import forest_poly
from scan_rank8_delta01_e3_quartic_stars_n27_n36_agent import arm_partitions, build_star


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta23_e3_quartic_stars_n27_n36_exact_root_20260823.json"
RANKS = (2, 3)
EXPECTED = {
    "scan_rank8_delta23_e1_subdivided_claws_n23_n28.py": "0CB38CA50A03E84E1C7CBC73A303EC2A5882689D7FF8E5440AB87A44075F4E59",
    "scan_rank8_delta3_n28_e1_subdivided_claws.py": "F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A",
    "scan_rank8_delta01_e3_quartic_stars_n27_n36_agent.py": "12269BCEA8F1BDF1FEECAB00E8622D5FD4F5BE19BACAB5F6804032B91A10B416",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
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
            assert len(adjacency) == len(descriptors) == order
            assert sum(comb(len(neighbors) - 1, 2) for neighbors in adjacency) == 3
            core = forest_poly(adjacency)
            cores += 1
            for root, descriptor in enumerate(descriptors):
                deletion = forest_poly(adjacency, root)
                inputs = (*core[3:9], deletion[6], deletion[7])
                rooted_rows += 1
                for rank in RANKS:
                    value = evaluators[rank](inputs)
                    assert value > 0, (order, arms, descriptor, rank, value)
                    if minima[rank] is None or value < minima[rank]:
                        minima[rank] = value
                        witnesses[rank] = {
                            "arms": list(arms),
                            "root_descriptor": list(descriptor),
                            "root": root,
                            "core": core,
                            "deleted": deletion,
                            "value": value,
                        }
                    if global_minima[rank] is None or value < global_minima[rank]:
                        global_minima[rank] = value
                        global_witnesses[rank] = {"order": order, **witnesses[rank]}
        assert cores > 0 and rooted_rows == order * cores
        totals["canonical_cores"] += cores
        totals["rooted_rows"] += rooted_rows
        rows.append({
            "order": order,
            "canonical_cores": cores,
            "rooted_rows": rooted_rows,
            "minimum_values": {str(rank): minima[rank] for rank in RANKS},
            "minimum_witnesses": {str(rank): witnesses[rank] for rank in RANKS},
            "negative_or_zero_rows": {"2": 0, "3": 0},
        })
        print("PASS", order, cores, rooted_rows, flush=True)
    payload = {
        "schema": "rank8-delta23-e3-quartic-stars-n27-n36-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STARS_ALL_ROOTS_N27_N36",
        "theorem": "Delta2>0 and Delta3>0 for every root of every subdivided four-arm star of each order 27 through 36.",
        "orders": rows,
        "totals": totals,
        "global_minimum_values": {str(rank): global_minima[rank] for rank in RANKS},
        "global_minimum_witnesses": {str(rank): global_witnesses[rank] for rank in RANKS},
        "negative_or_zero_rows": {"2": 0, "3": 0},
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Finite quartic-star Delta2/Delta3 theorem only; all-order arms/center, cubic e=3, other connected cases, forest Q8, PGC, and Problem 993 are separate obligations.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TOTALS", totals)
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
