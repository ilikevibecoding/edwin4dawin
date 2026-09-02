#!/usr/bin/env python3
"""Independent grouped-generating-function audit of the remaining-cell design."""

from __future__ import annotations

import csv
import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
DESIGN_SOURCE = ROOT / "design_rank8_exceptional_first_crossing_alpha8_alpha9_streaming_agent.py"
DESIGN = ROOT / "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_agent_20260823.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_independent_audit_agent_20260823.json"
THRESHOLD = 14
RAW_TARGET = 550_000
BASELINE = 32 * 1024**2
ABORT_LIMIT = 448 * 1024**2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def grouped_coefficients(type_counts: dict[int, int]) -> list[int]:
    coefficients = [0] * THRESHOLD
    coefficients[0] = 1
    for weight in sorted(type_counts):
        old = coefficients
        coefficients = [0] * THRESHOLD
        count = type_counts[weight]
        for alpha in range(THRESHOLD):
            coefficients[alpha] = sum(
                math.comb(count + multiplicity - 1, multiplicity)
                * old[alpha - multiplicity * weight]
                for multiplicity in range(alpha // weight + 1)
            )
    return coefficients


def main() -> int:
    design = json.loads(DESIGN.read_text(encoding="utf-8"))
    assert design["status"] == "PASS_EXACT_NO_GAP_RESOURCE_DESIGN_REMAINING_2159_EXCEPTIONAL_FIRST_CROSSING_CELLS_NO_SIGN_RUN"
    assert design["hashes"][DESIGN_SOURCE.name] == digest(DESIGN_SOURCE)
    assert design["hashes"][JETS.name] == digest(JETS)

    with JETS.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle, delimiter="\t"))
    by_alpha: dict[int, int] = {}
    for row in rows:
        alpha = int(row["alpha"])
        by_alpha[alpha] = by_alpha.get(alpha, 0) + 1
    assert by_alpha == {1: 2, 2: 2, 3: 5, 4: 15, 5: 48, 6: 175, 7: 700, 8: 253, 9: 15}

    lower_by_band = {
        8: grouped_coefficients({alpha: by_alpha[alpha] for alpha in range(1, 8)}),
        9: grouped_coefficients({alpha: by_alpha[alpha] for alpha in range(1, 9)}),
    }
    assert lower_by_band[8] == design["exact_reduction"]["through_alpha7_raw_coefficients_alpha0_13"]
    assert lower_by_band[9] == design["exact_reduction"]["through_alpha8_raw_coefficients_alpha0_13"]

    expected_band_scope = {8: (948, 1200, 6), 9: (1201, 1215, 5)}
    cells = 0
    raw_total = 0
    shards_total = 0
    maximum_fiber = 0
    maximum_projection = 0
    band_summary = {}
    for terminal_alpha, (type_start, type_stop, source_start) in expected_band_scope.items():
        band = design["bands"][str(terminal_alpha)]
        terminal_count = type_stop - type_start + 1
        assert band["terminal_type_indices"] == [type_start, type_stop]
        assert band["source_alpha_range"] == [source_start, 13]
        band_raw = 0
        band_shards = 0
        for source_alpha in range(source_start, 14):
            cell = band["source_cells"][str(source_alpha)]
            lower = lower_by_band[terminal_alpha]
            prefix_coefficient = lower[source_alpha - terminal_alpha] if source_alpha >= terminal_alpha else 0
            per_type = [lower[source_alpha] + relative * prefix_coefficient for relative in range(1, terminal_count + 1)]
            assert cell["per_relative_terminal_formula"] == f"{lower[source_alpha]} + L*{prefix_coefficient}"
            assert cell["raw_multiset_crossing_count"] == sum(per_type)
            assert cell["maximum_single_type_raw_count"] == max(per_type) <= RAW_TARGET
            expected_type = type_start
            reconstructed_raw = 0
            for shard in cell["shards"]:
                assert shard["terminal_type_index_start"] == expected_type
                assert shard["terminal_type_index_stop"] >= expected_type
                expected_type = shard["terminal_type_index_stop"] + 1
                relative_start = shard["relative_terminal_type_start"]
                relative_stop = shard["relative_terminal_type_stop"]
                assert shard["raw_multiset_count"] == sum(per_type[relative_start - 1 : relative_stop]) <= RAW_TARGET
                assert shard["projected_peak_private_bytes"] >= BASELINE
                assert shard["projection_below_abort_gate"] == (shard["projected_peak_private_bytes"] < ABORT_LIMIT)
                maximum_projection = max(maximum_projection, int(shard["projected_peak_private_bytes"]))
                reconstructed_raw += int(shard["raw_multiset_count"])
            assert expected_type == type_stop + 1
            assert reconstructed_raw == cell["raw_multiset_crossing_count"]
            band_raw += reconstructed_raw
            band_shards += len(cell["shards"])
            maximum_fiber = max(maximum_fiber, max(per_type))
        assert band_raw == band["raw_multisets_total"]
        assert band_shards == band["shard_count"]
        band_summary[str(terminal_alpha)] = {
            "source_type_cells": band["source_type_cells"],
            "raw_multisets": band_raw,
            "shards": band_shards,
        }
        cells += band["source_type_cells"]
        raw_total += band_raw
        shards_total += band_shards

    aggregate = design["aggregate"]
    assert cells == aggregate["remaining_source_type_cells"] == 2159
    assert raw_total == aggregate["raw_multisets_total"] == 214_127_795
    assert shards_total == aggregate["shard_count"]
    assert maximum_fiber == aggregate["maximum_single_type_raw_count"]
    assert maximum_projection == aggregate["maximum_projected_peak_private_bytes"]
    assert aggregate["all_design_projections_below_abort_gate"] is True

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha8-alpha9-streaming-design-agent-independent-audit-v1",
        "status": "PASS_INDEPENDENT_NO_GAP_RESOURCE_DESIGN_REMAINING_2159_EXCEPTIONAL_FIRST_CROSSING_CELLS_NO_SIGN_RUN",
        "method": "derive type multiplicities from TSV, compute lower coefficients by grouped (1-z^a)^(-m_a) expansions, reconstruct every linear terminal-prefix fiber and every consecutive shard union",
        "coverage": {
            "source_type_cells": cells,
            "terminal_type_indices": [948, 1215],
            "raw_multisets": raw_total,
            "shards": shards_total,
            "bands": band_summary,
            "gaps": 0,
            "overlaps": 0,
        },
        "resource_envelope": {
            "maximum_single_type_raw_count": maximum_fiber,
            "maximum_projected_peak_private_bytes": maximum_projection,
            "all_design_projections_below_abort_gate": True,
        },
        "scope_warning": "Independent audit of counts and shard design only; zero terminal-alpha8/9 Q8 signs are certified.",
        "hashes": {
            JETS.name: digest(JETS),
            DESIGN_SOURCE.name: digest(DESIGN_SOURCE),
            DESIGN.name: digest(DESIGN),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"cells={cells} raw={raw_total} shards={shards_total} max_fiber={maximum_fiber} gaps=0 overlaps=0")
    print(f"audit_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
