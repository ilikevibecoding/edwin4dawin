#!/usr/bin/env python3
"""Exact n=28 Delta2 certificate for every realizable nonstar surplus >=40.

The degree surplus of a tree is integral.  The pinned branch-weight theorem
enumerates exactly the realizable nonstar surplus values at order 28 and gives
an exact upper bound for tau at each value.  For each such value this script
uses the strong order-through-28 Q5 bound V<=24/25 and certifies the remaining
four-dimensional rational polynomial by tensor Bernstein coefficients.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path

import certify_rank8_delta2_n28_low_surplus_strong_q5_root as low


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_n28_high_surplus_strong_q5_exact_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    started = time.perf_counter()
    cache, source_terms, tau_table = low.load_inputs()
    possible = sorted(excess for excess in tau_table if 40 <= excess <= 300)
    assert len(tau_table) == 207
    assert possible[0] == 40 and possible[-1] == 300
    assert len(possible) == 168
    assert 325 not in tau_table

    rows = [
        low.certify_excess(excess, tau_table[excess], source_terms)
        for excess in possible
    ]
    assert [row["degree_surplus"] for row in rows] == possible
    impossible = sorted(set(range(40, 325)) - set(possible))
    assert impossible and min(impossible) >= 40 and max(impossible) <= 324

    payload = {
        "schema": "rank8-delta2-n28-high-surplus-strong-q5-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_N28_ALL_REALIZABLE_NONSTAR_SURPLUS_40_TO_300_STRONG_Q5",
        "theorem": (
            "The k=1 lower-cross Delta2 source is nonnegative at order 28 "
            "for every nonstar tree whose degree surplus is at least 40."
        ),
        "coverage": {
            "order": 28,
            "realizable_nonstar_surpluses": possible,
            "realizable_cells": len(rows),
            "minimum": possible[0],
            "maximum": possible[-1],
            "impossible_integer_surpluses_40_through_324": impossible,
            "star_surplus": 325,
        },
        "reason_no_continuous_surplus_interpolation_is_needed": (
            "Degree surplus is an integer.  The branch-weight theorem's exact "
            "order-28 table lists all and only 207 realizable nonstar values; "
            "the 168 values at least 40 are certified individually here."
        ),
        "positive_multiplier": "D^12*Q^12*25^8*16^2",
        "source_denominator_factor": cache["positive_denominator_factor"],
        "cells": rows,
        "total_certified_Bernstein_coefficients": sum(
            row["certified_Bernstein_coefficients"] for row in rows
        ),
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "dependencies": {
            low.CACHE.name: sha256(low.CACHE),
            low.TAU_REPORT.name: sha256(low.TAU_REPORT),
            Path(low.__file__).name: sha256(Path(low.__file__)),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Surpluses below 40, the star, the strong-Q5 theorem assembly, and "
            "the other live rank-8 tensors are separate proof components."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("CELLS", len(rows), flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
