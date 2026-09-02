#!/usr/bin/env python3
"""Streaming audit of every deterministic cubic boundary work universe.

The nested products use unique ordered state lists; unordered leaf pairs and
left/right modules use combinations with replacement in their canonical list
order.  The emitted state dictionary uniquely recovers those loop choices, so
the construction is injective.  This audit streams every selected key, pins an
ordered SHA-256 digest, and checks the exact counts from the independently
derived partition report without retaining the universe in memory.
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import verify_rank8_delta01_e3_cubic_short_boundary_batches_agent as scanner


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json"
EXPECTED = {
    "verify_rank8_delta01_e3_cubic_short_boundary_batches_agent.py":
        "94942334232FFA39B9D9BDBAE75CDBB80D6ACE293EE8CCCB30BF5BCCA3AA6363",
    "rank8_delta01_e3_cubic_short_boundary_partition_exact_agent_20260822.json":
        "2D9CA9AC3FD68B38939A8B92434C56CAB9C6502AA157926DF9016A5794F237E2",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    started = time.perf_counter()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    assert len(scanner.OUTER_PAIRS) == 36
    assert len(scanner.MODULES) == 360
    assert len(scanner.MODULE_PAIRS) == 64980
    assert len(set(scanner.OUTER_PAIRS)) == len(scanner.OUTER_PAIRS)
    assert len(set(scanner.MODULES)) == len(scanner.MODULES)
    assert len(set(scanner.MODULE_PAIRS)) == len(scanner.MODULE_PAIRS)
    rows = []
    for label in scanner.ROOTS:
        for mode in ("mixed", "all_short"):
            digest = hashlib.sha256()
            count = 0
            first = None
            last = None
            for index, states in enumerate(scanner.selected_patterns(label, mode)):
                key = scanner.pattern_key(label, states)
                if first is None:
                    first = key
                last = key
                digest.update(f"{index}:{key}\n".encode("ascii"))
                count += 1
            expected = scanner.EXPECTED_COUNTS[label][mode]
            assert count == expected
            rows.append({
                "root_location_orbit": label,
                "mode": mode,
                "cells": count,
                "ordered_key_sha256": digest.hexdigest().upper(),
                "first_key": first,
                "last_key": last,
            })
            print("UNIVERSE", label, mode, count, digest.hexdigest().upper(), flush=True)
    assert sum(row["cells"] for row in rows if row["mode"] == "mixed") == 20899091
    assert sum(row["cells"] for row in rows if row["mode"] == "all_short") == 4670546
    payload = {
        "schema": "rank8-delta01-e3-cubic-boundary-universe-audit-agent-v1",
        "status": "PASS_EXACT_DETERMINISTIC_NO_GAP_NO_DUPLICATE_WORK_UNIVERSES",
        "injectivity_argument": (
            "Every product coordinate is drawn from a duplicate-free ordered state list. "
            "Each quotient symmetry is represented once by combinations_with_replacement. "
            "The emitted named state tuple uniquely recovers the chosen factors/modules; "
            "filtering by long-count or order cannot introduce a duplicate."
        ),
        "universes": rows,
        "totals": {
            "mixed": 20899091,
            "all_short_n37_plus": 4670546,
            "remaining_boundary_cells": 25569637,
        },
        "runtime_seconds": time.perf_counter() - started,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This certifies the scanner work universes, not the signs of cells not yet executed.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
