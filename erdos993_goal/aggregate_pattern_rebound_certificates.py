#!/usr/bin/env python3
"""Aggregate and validate the exact pattern-family rebound certificates."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CERTIFICATES = [
    "pattern_rebound_k1_n1-12_l15_m100_exact_20260726.json",
    "pattern_rebound_k2_n1-12_l15_m100_exact_20260726.json",
    "pattern_rebound_k3_n1-3_l15_m100_exact_20260726.json",
    "pattern_rebound_k3_n4-12_l15_m100_exact_20260725.json",
    "pattern_rebound_k4_n1-4_l15_m100_exact_20260726.json",
    "pattern_rebound_k4_n5-8_l15_m100_exact_20260726.json",
    "pattern_rebound_k4_n9_l15_m100_exact_20260726.json",
    "pattern_rebound_k4_n10_l15_m100_exact_20260726.json",
    "pattern_rebound_k4_n11_l15_m100_exact_20260726.json",
    "pattern_rebound_k4_n12_l15_m100_exact_20260726.json",
    "pattern_rebound_k5_n1-4_l15_m100_exact_20260726.json",
    "pattern_rebound_k5_n5-8_l15_m100_exact_20260726.json",
    "pattern_rebound_k5_n9_l15_m100_exact_20260726.json",
    "pattern_rebound_k5_n10_l15_m100_exact_20260726.json",
    "pattern_rebound_k5_n11_l15_m100_exact_20260726.json",
    "pattern_rebound_k5_n12_l15_m100_exact_20260726.json",
]
OUTPUT = ROOT / "pattern_rebound_k1-5_n1-12_l15_m100_manifest_20260726.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    expected = {
        (k, n, ell, m)
        for k in range(1, 6)
        for n in range(1, 13)
        for ell in range(16)
        for m in range(1, 101)
    }
    covered: set[tuple[int, int, int, int]] = set()
    total_tested = 0
    total_rebounds = 0
    total_prefix_rebounds = 0
    nearest = None
    entries = []

    for name in CERTIFICATES:
        path = ROOT / name
        payload = json.loads(path.read_text(encoding="utf-8"))
        assert payload["status"] == "no_counterexample", (name, payload["status"])
        assert payload["exact_arithmetic"] is True
        assert payload["prefix_rebound_count"] == 0
        ranges = payload["ranges"]
        k0, k1 = ranges["k"]
        n0, n1 = ranges["n"]
        ell0, ell1 = ranges["ell"]
        m0, m1 = ranges["m"]
        local = {
            (k, n, ell, m)
            for k in range(k0, k1 + 1)
            for n in range(n0, n1 + 1)
            for ell in range(ell0, ell1 + 1)
            for m in range(m0, m1 + 1)
        }
        assert not covered.intersection(local), name
        assert payload["tested"] == len(local), (
            name,
            payload["tested"],
            len(local),
        )
        covered.update(local)
        total_tested += payload["tested"]
        total_rebounds += payload["rebound_count"]
        total_prefix_rebounds += payload["prefix_rebound_count"]

        champion = payload["champion"]
        candidate = (
            champion["profile"]["prefix_rebound"]
            or champion["profile"]["closest_rebound"]
        )
        if candidate is not None:
            gap = candidate["index"] - champion["profile"]["tail_start"]
            record = {
                "gap_after_tail_start": gap,
                "parameters": champion["parameters"],
                "profile": champion["profile"],
                "source_certificate": name,
            }
            if nearest is None or gap < nearest["gap_after_tail_start"]:
                nearest = record

        entries.append(
            {
                "file": name,
                "sha256": sha256(path),
                "tested": payload["tested"],
                "rebound_count": payload["rebound_count"],
                "prefix_rebound_count": payload["prefix_rebound_count"],
                "ranges": ranges,
            }
        )

    assert covered == expected, {
        "missing": sorted(expected - covered)[:10],
        "extra": sorted(covered - expected)[:10],
    }
    assert total_tested == 96_000
    assert total_prefix_rebounds == 0
    assert nearest is not None
    assert nearest["gap_after_tail_start"] == 5

    report = {
        "status": "PASS_NOT_PROOF",
        "family": (
            "U(k,n,ell,m)=S_ell*T_(k,n)^m+"
            "x*(1+2x)^ell*S_n^(k*m)"
        ),
        "exact_arithmetic": True,
        "coverage": {
            "k": [1, 5],
            "n": [1, 12],
            "ell": [0, 15],
            "m": [1, 100],
            "parameter_tuples": len(expected),
        },
        "total_tested": total_tested,
        "total_ratio_rebounds": total_rebounds,
        "total_prefix_rebounds": total_prefix_rebounds,
        "counterexamples": 0,
        "nearest_rebound": nearest,
        "certificates": entries,
        "scanner": {
            "file": "pattern_family_rebound_frontier.py",
            "sha256": sha256(ROOT / "pattern_family_rebound_frontier.py"),
        },
    }
    OUTPUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "total_tested": total_tested,
                "total_ratio_rebounds": total_rebounds,
                "total_prefix_rebounds": total_prefix_rebounds,
                "nearest_gap": nearest["gap_after_tail_start"],
                "manifest": str(OUTPUT),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
