#!/usr/bin/env python3
"""Independent literal-tree audit of the three fast internal-root reports."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import verify_rank8_delta01_e3_cubic_short_boundary_batches_agent as universe
from audit_rank8_delta01_e3_cubic_short_boundary_batch_agent import literal_deltas


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_cubic_all_short_internal_fast_independent_audit_agent_20260823.json"
ROOTS = ("outer_pendant_internal", "middle_pendant_internal", "spine_internal")
EXPECTED = {
    "verify_rank8_delta01_e3_cubic_all_short_fast_agent.rs": "A614ED04B160C695FFAA66176CC851A2AB8BCA9CB571407DEC1AD62E28813209",
    "run_rank8_delta01_e3_cubic_all_short_fast_agent.py": "8B39163FA17F5D46136D38DFCCC554967037DD738AD0667534EE93B91A67B305",
    "rank8_delta01_e3_cubic_all_short_fast_equivalence_audit_agent_20260823.json": "11FD4727643609369684F79CBAB55E0BD6494F5F0972E59B37A86B2663BAF5C4",
    "audit_rank8_delta01_e3_cubic_short_boundary_batch_agent.py": "06EE3504E118EACC7F0B8F97DBAFB8CCB9BBDF0334A5D1E5A642157DD2150210",
    "rank8_delta01_e3_cubic_all_short_outer_pendant_internal_fast_exact_agent_20260823.json": "54497680965E28E7AA28BC65E657E11C2E34E02297644CA103B6E57396F77038",
    "rank8_delta01_e3_cubic_all_short_middle_pendant_internal_fast_exact_agent_20260823.json": "8ED1E87EDECB5987711021D224839E805EC237359B8F6EE2025CE8909A07A368",
    "rank8_delta01_e3_cubic_all_short_spine_internal_fast_exact_agent_20260823.json": "D48E4ADCC66F1D2D55585C5105E5E92954486B01F92ADC36D6C36E41766B838D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def witness_states(label: str, values: list[int]):
    if label == "outer_pendant_internal":
        names = ("near", "tail", "a2", "m", "b1", "b2", "u", "v")
    elif label == "middle_pendant_internal":
        names = ("near", "tail", "u", "a1", "a2", "v", "b1", "b2")
    elif label == "spine_internal":
        names = ("near", "tail", "a1", "a2", "m", "v", "b1", "b2")
    else:
        raise ValueError(label)
    return dict(zip(names, values))


def main():
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    equivalence = load("rank8_delta01_e3_cubic_all_short_fast_equivalence_audit_agent_20260823.json")
    assert equivalence["status"] == "PASS_EXACT_FULL_REPORT_EQUIVALENCE_FAST_VS_PYTHON_FLINT"
    rows = []
    for label in ROOTS:
        report = load(f"rank8_delta01_e3_cubic_all_short_{label}_fast_exact_agent_20260823.json")
        assert report["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_ALL_SHORT_FINITE_BAND_FAST"
        result = report["result"]
        witness_rows = []
        for rank in (0, 1):
            states = witness_states(label, result[f"witness{rank}"])
            values, core, deleted, root = literal_deltas(label, states, 0)
            assert int(values[rank]) == int(result[f"minimum{rank}"])
            witness_rows.append({
                "rank": rank, "states": states, "root": root,
                "core": core, "deleted": deleted, "value": int(values[rank]),
            })
        count = result["processed"]
        indices = sorted({0, count // 6, count // 3, count // 2, 2 * count // 3, 5 * count // 6, count - 1})
        wanted = set(indices)
        samples = []
        for index, states in enumerate(universe.selected_patterns(label, "all_short")):
            if index in wanted:
                primary = universe.literal_row(label, states)
                values, _, _, root = literal_deltas(label, states, 0)
                assert primary["ranks"] == {"0": int(values[0]), "1": int(values[1])}
                assert values[0] > 0 and values[1] > 0
                samples.append({"index": index, "key": primary["key"], "root": root, "ranks": primary["ranks"]})
            if index >= indices[-1]:
                break
        assert len(samples) == len(indices)
        rows.append({
            "root_location_orbit": label,
            "cells": count,
            "minimum_witness_replays": witness_rows,
            "spread_sample_replays": samples,
        })
        print("AUDIT", label, count, flush=True)
    payload = {
        "schema": "rank8-delta01-e3-cubic-all-short-internal-fast-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_LITERAL_TREE_AUDIT_ALL_SHORT_INTERNAL_FAST",
        "root_orbits": rows,
        "totals": {"root_orbits": len(rows), "cells": sum(row["cells"] for row in rows)},
        "methods": [
            "full-engine equivalence on all 356,779 previously completed cells",
            "independent vertex-level tree DP replay of every new global minimum witness",
            "seven deterministic spread samples per new internal-root universe",
        ],
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This audits the all-short sector only; mixed Newton cells remain separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
