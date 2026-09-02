#!/usr/bin/env python3
"""Four-shard exact sizing probe for the residual order-23 G1 cell."""

from __future__ import annotations

import concurrent.futures
import hashlib
import json
import subprocess
from pathlib import Path

import prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n21_22_gentree_census_rank7_g4_piecewise as frozen


HERE = Path(__file__).resolve().parent
ORDER = 23
SHARDS = 4
OUTPUT = HERE / (
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n23_"
    "gentree_shards_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_NO_PARENT_"
    "N23_GENTREE_SHARDS_RANK7_G4_PIECEWISE"
)
EXPECTED_TOTAL = 14_828_074


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_array(text: str) -> list[int]:
    assert text.startswith("[") and text.endswith("]")
    return [int(value.strip()) for value in text[1:-1].split(",")]


def evaluate_shard(shard: int) -> dict[str, object]:
    generator = subprocess.Popen(
        [str(frozen.GENERATOR), "-q", "-p", str(ORDER), f"{shard}/{SHARDS}"],
        cwd=HERE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert generator.stdout is not None
    evaluator = subprocess.run(
        [str(frozen.EVALUATOR), str(ORDER)],
        cwd=HERE,
        stdin=generator.stdout,
        capture_output=True,
        text=True,
        check=True,
    )
    generator.stdout.close()
    generator_stderr = generator.stderr.read().decode() if generator.stderr else ""
    assert generator.wait() == 0
    assert generator_stderr == ""
    assert evaluator.stderr == ""
    raw = {}
    for line in evaluator.stdout.splitlines():
        key, value = line.split(" ", 1)
        raw[key.lower()] = value
    assert int(raw["order"]) == ORDER
    return {
        "shard": shard,
        "modulus": SHARDS,
        "total": int(raw["total"]),
        "eligible": int(raw["eligible"]),
        "negative": int(raw["negative"]),
        "crosschecks": int(raw["crosschecks"]),
        "minimum_value": int(raw["minimum_value"]),
        "minimum_index_within_shard": int(raw["minimum_index"]),
        "minimum_parent": raw["minimum_parent"],
        "minimum_degrees": parse_array(raw["minimum_degrees"]),
        "minimum_row": parse_array(raw["minimum_row"]),
        "ordered_stream_sha256": raw["ordered_stream_sha256"],
    }


def main() -> None:
    assert frozen.sha256(frozen.HERE / Path(frozen.OUTPUT).name) == (
        "FC9E6DD4C64C57C06FE0C3FFFCCC25CF7C463D0740961A89E287FD7F75132E2B"
    )
    with concurrent.futures.ThreadPoolExecutor(max_workers=SHARDS) as executor:
        shards = list(executor.map(evaluate_shard, range(SHARDS)))
    assert [item["shard"] for item in shards] == list(range(SHARDS))
    assert sum(item["total"] for item in shards) == EXPECTED_TOTAL
    assert all(item["crosschecks"] == item["eligible"] // 4096 for item in shards)
    minimum = min(shards, key=lambda item: (item["minimum_value"], item["shard"]))
    report = {
        "marker": MARKER,
        "status": "exact sizing probe; shard streams not yet frozen",
        "scope": (
            "Actual connected trees of order 23, common0/sum0 no-parent, "
            "maximum degree>=4, and at least three branching vertices."
        ),
        "partition": "gentreeg canonical generation subsets res/4, res=0,1,2,3",
        "order": ORDER,
        "shards": shards,
        "totals": {
            "free_trees": sum(item["total"] for item in shards),
            "eligible_trees": sum(item["eligible"] for item in shards),
            "negative": sum(item["negative"] for item in shards),
            "crosschecks": sum(item["crosschecks"] for item in shards),
        },
        "global_minimum": minimum,
        "dependencies_sha256": {
            frozen.EVALUATOR_SOURCE.name: sha256(frozen.EVALUATOR_SOURCE),
            frozen.EVALUATOR.name: sha256(frozen.EVALUATOR),
            str(frozen.GENERATOR.relative_to(HERE)).replace("\\", "/"): sha256(frozen.GENERATOR),
            Path(frozen.OUTPUT).name: sha256(frozen.OUTPUT),
        },
        "scope_guard": "Probe only; no theorem promoted before a pinned full replay.",
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "totals": report["totals"],
        "minimum_G1": minimum["minimum_value"],
        "minimum_shard": minimum["shard"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
