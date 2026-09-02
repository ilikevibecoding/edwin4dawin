#!/usr/bin/env python3
"""Exact no-go audit for repairing the raw bridge by degree elevation alone."""

from __future__ import annotations

import ast
import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FAILURE = ROOT / "rank8_a23_fast_agent_1_1_probe.tmp"
REPORT = ROOT / "rank8_low_low_a23_degree_elevation_nogo_agent_20260822.json"
EXPECTED_FAILURE = "DC88F3803FD1776087DD28C44C755BF6100D584E3D595D99C017D23CE3D6492B"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def elevation_weight(old_index, new_index, new_degree):
    """Weight of degree-2 Bernstein coefficient old_index at new_index."""
    remainder = new_index - old_index
    if not (0 <= old_index <= 2 and 0 <= remainder <= new_degree - 2):
        return Fraction(0)
    return Fraction(
        math.comb(2, old_index) * math.comb(new_degree - 2, remainder),
        math.comb(new_degree, new_index),
    )


def main():
    assert sha256(FAILURE) == EXPECTED_FAILURE
    captured = ast.literal_eval(FAILURE.read_text(encoding="utf-8-sig"))
    failing_positions = [
        [row["left_bernstein_index"], row["right_bernstein_index"]]
        for row in captured["positions"] if not row["pass"]
    ]
    assert failing_positions == [[0, 2], [2, 0]]
    trials = []
    for new_degree in range(2, 33):
        for old_position, new_position in (
            ((0, 2), (0, new_degree)),
            ((2, 0), (new_degree, 0)),
        ):
            left_weight = elevation_weight(
                old_position[0], new_position[0], new_degree,
            )
            right_weight = elevation_weight(
                old_position[1], new_position[1], new_degree,
            )
            assert left_weight == right_weight == 1
            assert all(
                elevation_weight(other, new_position[0], new_degree) == 0
                for other in range(3) if other != old_position[0]
            )
            assert all(
                elevation_weight(other, new_position[1], new_degree) == 0
                for other in range(3) if other != old_position[1]
            )
            trials.append({
                "old_position": list(old_position),
                "new_degree": new_degree,
                "new_position": list(new_position),
                "retained_weight": 1,
            })
    payload = {
        "schema": "rank8-low-low-a23-degree-elevation-nogo-agent-v1",
        "status": "PASS_EXACT_DEGREE_ELEVATION_NOGO_FOR_RAW_BRIDGE",
        "identity": (
            "For degree elevation 2->N, the coefficient at (0,N) is exactly "
            "the old coefficient at (0,2), and the coefficient at (N,0) is "
            "exactly the old coefficient at (2,0)."
        ),
        "formula": (
            "w(j,i)=C(2,j) C(N-2,i-j) / C(N,i), tensorized"
        ),
        "exact_finite_replays": len(trials),
        "trial_degree_range": [2, 32],
        "trials": trials,
        "mixed_faces": {
            "0,2": "z=0,w=1, equivalently a3=0,b2=0",
            "2,0": "z=1,w=0, equivalently a2=0,b3=0",
        },
        "failure_output_sha256": EXPECTED_FAILURE,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This rules out ordinary coordinate degree elevation as a repair "
            "of the raw coefficientwise certificate. It does not rule out a "
            "mixed-face payment/reserve or disprove the polynomial inequality."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("EXACT_ELEVATION_CORNER_REPLAYS", len(trials))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
