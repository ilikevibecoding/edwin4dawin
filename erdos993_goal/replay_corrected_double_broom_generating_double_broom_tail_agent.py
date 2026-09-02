#!/usr/bin/env python3
"""Freeze the corrected uniform generating-operator reduction under new names."""

from __future__ import annotations

import json
from pathlib import Path

import derive_iso_double_broom_diagonal_gap_newton_generating_agent as producer
from prove_iso_double_broom_diagonal_gap_agent import sha256


HERE = Path(__file__).resolve().parent
CANONICAL = HERE / "iso_double_broom_diagonal_gap_newton_generating_exact_agent_20260829.json"
REPLAY = HERE / "double_broom_corrected_generating_replay_exact_double_broom_tail_agent_20260829.json"
AUDIT = HERE / "double_broom_corrected_generating_freeze_double_broom_tail_agent_20260829.json"


def main() -> None:
    producer.OUTPUT = REPLAY
    producer.main()
    canonical = json.loads(CANONICAL.read_text(encoding="utf-8"))
    replay = json.loads(REPLAY.read_text(encoding="utf-8"))
    assert replay == canonical
    assert replay["source_sha256"] == sha256(
        HERE / "derive_iso_double_broom_diagonal_gap_newton_generating_agent.py"
    )
    audit = {
        "marker": "PASS_EXACT_CORRECTED_DOUBLE_BROOM_GENERATING_OPERATOR_FREEZE_REPLAY",
        "replay_kind": "exact producer replay and field-for-field canonical comparison",
        "producer_marker": replay["marker"],
        "producer_source_sha256": replay["source_sha256"],
        "canonical_report_sha256": sha256(CANONICAL),
        "replay_report_sha256": sha256(REPLAY),
        "field_for_field_equality": True,
        "literal_coefficient_replays": replay["literal_coefficient_replays"],
        "operator_expression_hashes": replay["operators"],
        "remaining_obligation": replay["remaining_obligation"],
        "scope_guard": replay["scope_guard"],
        "audit_source_sha256": sha256(Path(__file__).resolve()),
    }
    AUDIT.write_text(json.dumps(audit, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({**audit, "audit_report_sha256": sha256(AUDIT)}, indent=2))


if __name__ == "__main__":
    main()
