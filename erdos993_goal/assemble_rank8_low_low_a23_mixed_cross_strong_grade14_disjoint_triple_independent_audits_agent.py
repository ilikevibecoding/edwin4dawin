#!/usr/bin/env python3
"""Combine two independently reconstructed 105-atom face audits fail-closed."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRODUCER_SOURCE = (
    "probe_rank8_low_low_a23_mixed_cross_strong_grade14_per_base_triple_stream_agent.py",
    "C742B0EE941D69542BFCEFAA22F38C92D67BC1DFA1B614DB1FC03C257C7903BB",
)
AUDITOR_SOURCE = (
    "audit_rank8_low_low_a23_mixed_cross_strong_grade14_disjoint_triple_reconstruction_agent.py",
    "8999B8AE23DA052CD8FEFDCF7539FB7DA99F214C5031F9EEC6AF94D9C57C5FA4",
)
SCOPE = (
    "rank8_low_low_a23_mixed_cross_strong_grade14_disjoint_triple_formula_scope_audit_agent_20260823.json",
    "0313F4DE9B6C558AD2E2417D1D2E4C85BDC97C41F1BBDA8049EA01E1F9A32704",
)
JOB = (
    "rank8_low_low_a23_mixed_cross_strong_grade14_per_base_triple_job_agent_20260823.json",
    "C1645490BD70B88720F7675E0ECFA4D795889448BBDBEA1DD4943F53A175C333",
)
FACE_AUDITS = {
    "01": (
        "rank8_low_low_a23_mixed_cross_face_01_strong_grade14_disjoint_triple_independent_audit_agent_20260823.json",
        "E18D031B0FD2A7672096F9516BA34CAEB609B4904AA0557C0F5C1AB22255D01D",
    ),
    "10": (
        "rank8_low_low_a23_mixed_cross_face_10_strong_grade14_disjoint_triple_independent_audit_agent_20260823.json",
        "9E81E71CAF73C7818D3EA88C3510E3F5E5EEEA7AB9F5B67418D64190781DF35A",
    ),
}
LABELS = ("strong_middle_times_4", "strong_far")


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def pinned(item):
    path = HERE / item[0]
    assert sha256(path) == item[1], (item[0], sha256(path), item[1])
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_json(path, payload):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def main():
    assert JOB[1] != "__PIN_AFTER_PRODUCER__"
    assert all(
        item[1] != f"__PIN_AFTER_FACE{token}_AUDIT__"
        for token, item in FACE_AUDITS.items()
    )
    assert sha256(HERE / PRODUCER_SOURCE[0]) == PRODUCER_SOURCE[1]
    assert sha256(HERE / AUDITOR_SOURCE[0]) == AUDITOR_SOURCE[1]
    scope = pinned(SCOPE)
    assert scope["status"] == (
        "PASS_CANONICAL_STRONG_GRADE14_FULL_C_TAIL_V_"
        "ALL_THREE_PIECES_DISJOINT_TRIPLE_SCOPE"
    )
    job = pinned(JOB)
    assert job["status"] == (
        "PASS_EXACT_DISTINCT_FACES_GRADE14_STRONG_"
        "ALL_THREE_PIECES_NONNEGATIVE"
    )
    assert job["source_sha256"] == PRODUCER_SOURCE[1]
    produced = {
        (item["face_token"], item["auxiliary"]): item
        for item in job["completed_cells"]
    }
    assert set(produced) == {
        (token, label) for token in FACE_AUDITS for label in LABELS
    }

    components = []
    cells = []
    atom_keys = set()
    for token, item in FACE_AUDITS.items():
        audit = pinned(item)
        assert audit["status"] == (
            f"PASS_INDEPENDENT_FACE_{token}_ALL_105_ATOMS_"
            "JET_DIRECT_ROW_RECONSTRUCTION_EXACT"
        )
        assert audit["source_sha256"] == AUDITOR_SOURCE[1]
        assert audit["producer_source"] == {
            "path": PRODUCER_SOURCE[0],
            "sha256": PRODUCER_SOURCE[1],
        }
        assert audit["formula_scope"] == {
            "path": SCOPE[0],
            "sha256": SCOPE[1],
        }
        assert audit["face_token"] == token
        assert audit["imports_producer"] is False
        assert audit["audited_atom_count"] == 105
        assert audit["all_rows_negative_terms"] == 0
        assert audit["checks"]["all_105_disjoint_atoms_for_this_face_replayed"] is True
        assert audit["checks"]["face_reconstructed_without_hash_reuse"] is True
        assert audit["checks"]["all_three_strong_pieces_reconstructed"] is True
        assert audit["checks"]["finished_rows_formed_directly_without_producer_heap_merge"] is True
        assert audit["checks"]["per_atom_per_outer_and_full_row_hashes_exact"] is True
        for atom in audit["audited_atoms"]:
            key = (
                atom["face_token"],
                atom["outer_exponent"],
                atom["base_triple_index"],
            )
            assert key not in atom_keys
            atom_keys.add(key)
            path = Path(atom["path"])
            assert sha256(path) == atom["sha256"]
        for cell in audit["cells"]:
            key = (token, cell["auxiliary"])
            producer = produced[key]
            assert cell["face_token"] == token and cell["face"] == producer["face"]
            assert cell["producer_manifest_sha256"] == producer["manifest_sha256"]
            assert Path(cell["producer_manifest"]).resolve() == Path(producer["manifest"]).resolve()
            assert cell["replayed_mixed_support_terms"] == producer["mixed_support_terms"]
            assert cell["replayed_negative_terms"] == producer["negative_terms"] == 0
            assert (
                cell["replayed_triple_major_ordered_coefficient_sha256"]
                == producer["ordered_coefficient_sha256"]
            )
            cells.append(cell)
        components.append(
            {
                "face_token": token,
                "path": item[0],
                "sha256": item[1],
                "source_sha256": AUDITOR_SOURCE[1],
            }
        )

    assert len(atom_keys) == 210 and len(cells) == 4
    replayed = {(item["face_token"], item["auxiliary"]): item for item in cells}
    assert set(replayed) == set(produced)
    for label in LABELS:
        assert (
            replayed[("01", label)][
                "replayed_triple_major_ordered_coefficient_sha256"
            ]
            != replayed[("10", label)][
                "replayed_triple_major_ordered_coefficient_sha256"
            ]
        )

    report = {
        "schema": (
            "rank8-low-low-a23-mixed-cross-strong-grade14-disjoint-"
            "triple-independent-combined-audit-agent-v1"
        ),
        "status": "PASS_INDEPENDENT_ALL_210_ATOMS_JET_DIRECT_ROW_RECONSTRUCTION_EXACT",
        "producer_job": {"path": JOB[0], "sha256": JOB[1]},
        "producer_job_sha256": JOB[1],
        "producer_source": {
            "path": PRODUCER_SOURCE[0],
            "sha256": PRODUCER_SOURCE[1],
        },
        "formula_scope": {"path": SCOPE[0], "sha256": SCOPE[1]},
        "imports_producer": False,
        "audit_method": (
            "two hash-pinned separately transcribed face replays, each one "
            "disjoint base-triple atom resident at a time"
        ),
        "component_face_audits": components,
        "audited_atom_count": 210,
        "cells": cells,
        "all_rows_negative_terms": 0,
        "checks": {
            "all_210_disjoint_atoms_replayed": True,
            "both_faces_reconstructed_separately": True,
            "all_three_strong_pieces_reconstructed": True,
            "finished_rows_formed_directly_without_producer_heap_merge": True,
            "per_atom_per_outer_and_full_row_hashes_exact": True,
            "face_hash_reuse": False,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    output = HERE / (
        "rank8_low_low_a23_mixed_cross_strong_grade14_disjoint_"
        "triple_independent_audit_agent_20260823.json"
    )
    print("PASS", output, atomic_json(output, report), flush=True)


if __name__ == "__main__":
    main()
