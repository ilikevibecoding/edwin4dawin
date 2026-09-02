#!/usr/bin/env python3
"""Fail-closed integrity and scope audit for the 2026-08-20 literature refresh."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REFRESH = ROOT / "LITERATURE_STATUS_REFRESH_2026-08-20.md"
EXPECTED = {
    "LITERATURE_STATUS_REFRESH_2026-08-20.md": "9E16855CD2FA8E99F9DFAA9F93B30C6FFC7D932718A21E8FB42B29BC819A78C7",
    "FINAL_ROUTE_LITERATURE_AND_SCHUR_LIFT_AUDIT_2026-08-13.md": "23574B116CE9D52D037432EEA872BB66FFFE9B221601624F3A645B7D7FBF8E05",
    "final_route_literature_schur_lift_exact_20260813.json": "86EB6EBB230C51917ED46A7C09390D73264F66FE2D541BFF20CFA39D06AB3359",
    "replay_final_route_literature_schur_lift.py": "C35122BF99A2A00AF754BB5B5F20C153EB8D9EC75B69FFCFD60E815C91D3C25E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    prior = json.loads((ROOT / "final_route_literature_schur_lift_exact_20260813.json").read_text(encoding="utf-8"))
    assert prior["status"] == "PASS_EXACT_NOT_PROOF"
    assert prior["nested_pf_abstract_nogo"]["forest_realizable"] is False

    text = REFRESH.read_text(encoding="utf-8")
    required = (
        "Date checked: 2026-08-20",
        "no prior complete proof and no finite non-unimodal tree or forest was\nlocated",
        "https://www.erdosproblems.com/993",
        "https://zenodo.org/records/19100781",
        "https://arxiv.org/abs/2101.06744",
        "https://arxiv.org/abs/2305.01784",
        "https://arxiv.org/abs/2510.18826",
        "https://arxiv.org/abs/2603.03025",
        "https://arxiv.org/abs/2604.18824",
        "10.1007/s00373-026-03054-4",
        "examples refute\n   the stronger log-concavity conjecture",
        "do not refute unimodality",
        "targeted literature audit, not a proof of absence",
        "rerun immediately before any public claim of resolution",
    )
    for phrase in required:
        assert phrase in text, phrase

    payload = {
        "status": "PASS_LITERATURE_STATUS_REFRESH_2026_08_20_INTEGRITY_AND_SCOPE_AUDIT",
        "date_checked": "2026-08-20",
        "public_status": "OPEN",
        "prior_complete_proof_located": False,
        "finite_nonunimodal_tree_or_forest_located": False,
        "log_concavity_counterexamples_are_unimodality_counterexamples": False,
        "search_is_proof_of_absence": False,
        "fresh_refresh_required_before_public_resolution_claim": True,
        "immutable_inputs": actual,
    }
    output = ROOT / "literature_status_refresh_20260820_audit_exact.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
