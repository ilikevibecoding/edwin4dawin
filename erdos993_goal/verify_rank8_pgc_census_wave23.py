#!/usr/bin/env python3
"""Verify the two byte-identical rank-eight finite pendant-census reports."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_pgc_census_wave23_exact_20260817.json"
REPLAY = ROOT / "rank8_pgc_census_wave23_fresh_replay_20260817.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert PRIMARY.read_bytes() == REPLAY.read_bytes()
    report = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_FINITE_RANK8_PGC_CENSUS_THROUGH_ORDER_18_NOT_THEOREM"
    assert report["scope"]["polynomial_complete"] is True
    pendant = report["pendant_pairs_with_common_factors"]
    assert pendant["product_instances"] == 2_276_138
    assert pendant["required_instances_alpha_P_at_least_13"] == 215_323
    assert pendant["required_distinct_Q8_negative_full_rows"] == 0
    assert pendant["required_distinct_V8_negative_reduced_rows"] == 0
    assert pendant["required_distinct_coupled_negative_pairs"] == 0
    assert pendant["global_minimum"]["margin"]["numerator"] == 15_765_688
    assert pendant["global_minimum"]["margin"]["denominator"] == 1_725

    by_alpha = {row["alpha_P"]: row for row in pendant["by_alpha_P"]}
    assert {alpha: by_alpha[alpha]["instances"] for alpha in by_alpha} == {
        13: 175_255,
        14: 35_230,
        15: 4_460,
        16: 361,
        17: 17,
    }
    assert all(row["coupled_negative_instances"] == 0 for row in by_alpha.values())
    assert all(row["Q8_negative_instances"] == 0 for row in by_alpha.values())
    assert all(row["V8_negative_instances"] == 0 for row in by_alpha.values())

    functionals = report["forest_functionals"]
    assert functionals["negative_required_rows"] == {
        "Q8_alpha_at_least_14": 0,
        "V8_alpha_at_least_14": 0,
    }
    assert functionals["required_minima"]["Q8_alpha_at_least_14"]["value"] == 8_726_265
    assert functionals["required_minima"]["V8_alpha_at_least_14"]["value"] == 175_207_032

    print("PASS_EXACT_FINITE_RANK8_PGC_CENSUS_WAVE23_REPLAY")
    print("primary_sha256", sha256(PRIMARY))
    print("replay_sha256", sha256(REPLAY))
    print("generator_sha256", sha256(ROOT / "replay_rank8_pgc_census_wave23.py"))


if __name__ == "__main__":
    main()
