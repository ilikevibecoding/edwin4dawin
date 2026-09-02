#!/usr/bin/env python3
"""Exact regression audit for coefficient-only fast statistics."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_fast_agent_v3 import (
    fast_stats,
)
from probe_rank8_low_low_suffix3_gap0_outer_cell_flint import stats


ROOT = Path(__file__).resolve().parent
FAST = ROOT / "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_fast_agent_v3.py"
ORIGINAL_STATS = ROOT / "probe_rank8_low_low_suffix3_gap0_outer_cell_flint.py"
EXPECTED = {
    FAST.name: "72149062A17FF2A0FEB427BE2D15AD66E532387DDB138CB9E3C3C150615B8F89",
    ORIGINAL_STATS.name: "A97A572170EC70470F009ADDFED9F47E7336E88E3EB7DDF5BE6F58BA9E4D4E4B",
}
OUTPUT = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_stats_audit_20260822.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    actual = {path.name: sha256(path) for path in (FAST, ORIGINAL_STATS)}
    assert actual == EXPECTED
    context = fmpz_mpoly_ctx.get(("x", "y", "z"), "degrevlex")
    x, y, z = context.gens()
    cases = {
        "zero": context.constant(0),
        "positive": 17*x**8*y**3 + 2*x*y**9 + 91*z**6 + 4,
        "negative_leading": -13*x**9 + 7*x*y + 2,
        "negative_nonleading": 31*x**7*y**2 - 19*x**2*z**8 + 5*y + 1,
        "multiple_negative": 101*x**5 - 23*x**4*y - 17*z**9 + 3,
    }
    rows = []
    for label, polynomial in cases.items():
        original = stats(polynomial)
        fast = fast_stats(polynomial)
        assert fast == original
        rows.append({"case": label, "statistics": fast, "exact_match": True})
    report = {
        "schema": "rank8-low-low-suffix3-gap0-fast-agent-stats-audit-v1",
        "status": "PASS_EXACT_FAST_STATS_EQUIVALENCE",
        "cases": rows,
        "immutable_sources": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report), flush=True)


if __name__ == "__main__":
    main()
