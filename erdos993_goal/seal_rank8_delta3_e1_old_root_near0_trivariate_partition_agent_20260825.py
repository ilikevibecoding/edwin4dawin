#!/usr/bin/env python3
"""Hash-seal the exact no-gap proof of the tail>=19 trivariate cell."""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_e1_old_root_near0_trivariate_partition_exact_agent_20260825.json"
PROBE = HERE / "rank8_delta3_e1_old_root_near0_trivariate_partition_probe_agent_20260825.json"
PINNED = {
    "probe_rank8_delta3_e1_old_root_near0_trivariate_partition_agent_20260825.py":
        "E36870C886CA7EED1D80BD124AE2623B67592E7A74BB8996520C84D362FB0CA3",
    "rank8_delta3_e1_old_root_near0_trivariate_partition_probe_agent_20260825.json":
        "1682DE8796B348A077D6CC1BA3570AB139B84BD43A6B7938B80571065A498E55",
    "certify_rank8_e1_new_leaf_newton_cell.py":
        "2FE6FD3C9CE46F46795238903D8264FD42629A5DCEA9F0CCB1A4D576C72DB218",
    "certify_rank8_e1_old_root_increment_ordered_near_cell.py":
        "EFD0D13515248BC9F9FDC88969A1DA2C8306D15F4F5DC53F27728CDDC3F8ED2D",
    "scan_rank8_delta3_n28_e1_subdivided_claws.py":
        "F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)
    probe = json.loads(PROBE.read_text(encoding="utf-8"))
    assert probe["status"] == "PASS_EXACT_NO_GAP_PARTITION"
    assert probe["partition"] == [
        "short>=5,difference>=0",
        "short=0..4,difference>=5",
        "short=0..4,difference=0..4",
    ]
    rows = probe["rows"]
    assert len(rows) == 93
    counts = Counter(row["extension"] for row in rows)
    assert counts == Counter({"root": 31, "short": 31, "long": 31})
    for extension in counts:
        selected = [row for row in rows if row["extension"] == extension]
        bulk = [row for row in selected if row["region"] == "short>=5,difference>=0"]
        tails = [row for row in selected if "difference>=5" in row["region"]]
        points = [row for row in selected if "difference=" in row["region"] and "difference>=5" not in row["region"]]
        assert len(bulk) == 1 and bulk[0]["newton"]["shape"] == [27, 27, 27]
        assert len(tails) == 5 and all(row["newton"]["shape"] == [27, 27] for row in tails)
        assert len(points) == 25 and all(row["newton"]["shape"] == [27] for row in points)
    assert all(row["newton"]["negative"] == 0 for row in rows)
    assert all(int(row["minimum_sampled_increment"]) > 0 for row in rows)
    aggregate = {
        "regions": len(rows),
        "coefficients": sum(row["newton"]["coefficients"] for row in rows),
        "negative": sum(row["newton"]["negative"] for row in rows),
        "zero": sum(row["newton"]["zero"] for row in rows),
        "positive": sum(row["newton"]["positive"] for row in rows),
        "minimum_sampled_increment": str(min(int(row["minimum_sampled_increment"]) for row in rows)),
    }
    payload = {
        "schema": "rank8-delta3-e1-old-root-near0-trivariate-partition-agent-v1",
        "status": "PASS_EXACT_DELTA3_NEAR0_TAIL19_TRIVARIATE_CELL_ALL_EXTENSIONS",
        "theorem": (
            "For an old arm root with near=0 in a subdivided claw, the Delta3 "
            "increment is strictly positive throughout the original tail>=19 "
            "cell, for root-, shorter-other-, and longer-other-arm extension."
        ),
        "original_cell": "tail>=19, short>=0, difference>=0",
        "no_gap_partition": probe["partition"],
        "degree_bound_each_active_axis": 26,
        "extensions": ["root", "short", "long"],
        "aggregate": aggregate,
        "row_digests": rows,
        "dependency_sha256": actual,
        "proof_boundary": (
            "This closes exactly the single tail>=19 cell in each of the three "
            "near=0 Delta3 extension orbits.  Completion of the whole near=0 "
            "partition also requires the separately sealed original 101 cells "
            "and the univariate and bivariate refinements."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("REGIONS", aggregate["regions"], "COEFFICIENTS", aggregate["coefficients"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
