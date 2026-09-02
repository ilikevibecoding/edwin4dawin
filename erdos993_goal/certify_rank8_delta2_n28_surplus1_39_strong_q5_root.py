#!/usr/bin/env python3
"""Exact n=28 Delta2 certificate for every positive surplus 1 through 39."""

from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path

import certify_rank8_delta2_n28_low_surplus_strong_q5_root as engine


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_n28_surplus1_39_strong_q5_exact_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    started = time.perf_counter()
    cache, terms, tau_table = engine.load_inputs()
    assert all(excess in tau_table for excess in range(1, 40))
    rows = [engine.certify_excess(excess, tau_table[excess], terms) for excess in range(1, 40)]
    assert all(row["terminal_patches"] == 1 for row in rows)
    assert all(int(row["terminal_minimum"].split("/")[0]) > 0 for row in rows)
    payload = {
        "schema": "rank8-delta2-n28-surplus1-39-strong-q5-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_N28_SURPLUS_1_TO_39_STRONG_Q5",
        "theorem": (
            "The k=1 lower-cross Delta2 source is positive at order 28 "
            "for every tree with integer degree surplus 1 through 39."
        ),
        "coverage": {
            "order": 28,
            "degree_surpluses": [1, 39],
            "cells": 39,
            "missing_integer_surpluses": [],
        },
        "positive_multiplier": "D^12*Q^12*25^8*16^2",
        "source_denominator_factor": cache["positive_denominator_factor"],
        "cells": rows,
        "total_certified_Bernstein_coefficients": sum(
            row["certified_Bernstein_coefficients"] for row in rows
        ),
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "dependencies": {
            engine.CACHE.name: sha256(engine.CACHE),
            engine.TAU_REPORT.name: sha256(engine.TAU_REPORT),
            Path(engine.__file__).name: sha256(Path(engine.__file__)),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "The path surplus 0, surplus at least 40, the star, the strong-Q5 "
            "assembly, and the other live tensors are separate components."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("CELLS", len(rows))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
