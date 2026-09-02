#!/usr/bin/env python3
"""Independent symbolic audit of the finite rooted-star Delta2 values."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_stars_n28_n34_independent_audit_root_20260826.json"
EXPECTED = {
    "verify_rank8_delta2_stars_n28_n34_root.py":
        "5FB4264F1053873270D4A0642E9CF942A1DDFB820850EB2FACD470834D8B0A9D",
    "rank8_delta2_stars_n28_n34_exact_root_20260826.json":
        "E5A9FB4C3A6996E7EE61790C0F084882BCD17AF72FBFA9E367E882D79B53BAE0",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta2_stars_n28_n34_exact_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA2_ALL_ROOTED_STARS_N28_N34"
    claimed = {
        (row["order"], row["root_orbit"]): int(row["Delta2"])
        for row in primary["values"]
    }

    # Rebuild Delta2 from the canonical symbolic terminal residual rather than
    # importing the producer's direct integer recurrence.
    expression = newton_coefficients(residual())[2]
    checked = 0
    minimum = None
    for order in range(28, 35):
        coefficients = [1, order] + [math.comb(order - 1, k) for k in range(2, 9)]
        deletions = {
            "center": [math.comb(order - 1, k) for k in range(9)],
            "leaf": [1, order - 1]
                + [math.comb(order - 2, k) for k in range(2, 9)],
        }
        for orbit, deleted in deletions.items():
            substitutions = {
                **{c[k]: coefficients[k] for k in range(9)},
                h[6]: deleted[6], h[7]: deleted[7],
            }
            value = int(expression.subs(substitutions, simultaneous=True))
            assert value == claimed[(order, orbit)]
            assert value > 0
            minimum = value if minimum is None else min(minimum, value)
            checked += 1
    assert checked == 14 and minimum == int(primary["minimum"]["Delta2"])

    payload = {
        "schema": "rank8-delta2-stars-n28-n34-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA2_ALL_ROOTED_STARS_N28_N34_AUDIT",
        "verified": [
            "the canonical symbolic residual is independently differenced to Delta2",
            "all star and deletion coefficients are reconstructed from binomial formulas",
            "all 14 order/root-orbit values exactly match the primary report",
            "every value is strictly positive",
        ],
        "values_checked": checked,
        "minimum_delta2": str(minimum),
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
