#!/usr/bin/env python3
"""Fresh exact replay/freeze of the connected double-broom h=11 certificate.

This is deliberately a producer replay, not an independent derivation.  It
reconstructs the complete canonical report in memory, compares it field for
field with the frozen h11 JSON, and writes only a uniquely named audit record.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_double_broom_diagonal_gap_agent import (
    HERE,
    all_diagonal_values,
    literal_terminal,
    p,
    sha256,
)
from prove_iso_double_broom_diagonal_gap_fixed_total_agent import certify_cell


TOTAL = 11
CANONICAL = HERE / "iso_double_broom_diagonal_gap_h11_exact_agent_20260829.json"
OUTPUT = HERE / "double_broom_h11_freeze_replay_exact_double_broom_tail_agent_20260829.json"


def main() -> None:
    selected = [(i, TOTAL - i) for i in range(TOTAL // 2 + 1)]
    stream = hashlib.sha256()
    layer_report = {}
    layer_count = 0
    for i, j in selected:
        cell, count = certify_cell(i, j, stream)
        layer_report[f"{i},{j}"] = cell
        layer_count += count

    base_terminal_cells = base_gap_cells = 0
    base_terminal_minimum = base_gap_minimum = None
    for i, j in selected:
        for order in (2, 3):
            values = all_diagonal_values(literal_terminal(order, i, j))
            assert all(value >= 0 for value in values)
            for rank, value in enumerate(values):
                cell = (int(value), order, rank, i, j)
                if base_terminal_minimum is None or cell < base_terminal_minimum:
                    base_terminal_minimum = cell
                base_terminal_cells += 1
                stream.update(f"B,{order},{rank},{i},{j},{value};".encode())
        for order in (4, 5):
            gap = sp.expand(
                literal_terminal(order, i, j)
                - literal_terminal(order - 1, i, j)
                - p * literal_terminal(order - 2, i, j)
            )
            values = all_diagonal_values(gap)
            assert all(value >= 0 for value in values)
            for rank, value in enumerate(values):
                cell = (int(value), order, rank, i, j)
                if base_gap_minimum is None or cell < base_gap_minimum:
                    base_gap_minimum = cell
                base_gap_cells += 1
                stream.update(f"G,{order},{rank},{i},{j},{value};".encode())

    dependencies = {
        "universal_source": HERE / "prove_iso_double_broom_diagonal_gap_agent.py",
        "h5_report": HERE / "iso_double_broom_diagonal_gap_exact_agent_20260829.json",
        "h6_report": HERE / "iso_double_broom_diagonal_gap_h6_extension_exact_agent_20260829.json",
    }
    reconstructed = {
        "marker": "PASS_EXACT_ALL_PATH_ORDER_DOUBLE_BROOM_DIAGONAL_GAP_NEWTON_TOTAL_H_11",
        "theorem": (
            "The universal four-operator diagonal certificate holds at total "
            "leaf-Newton degree i+j=11 for every path order and rank."
        ),
        "newton_pairs": selected,
        "operator_layer_certificates": layer_report,
        "exact_replay": {
            "operator_layers": layer_count,
            "base_terminal_cells": base_terminal_cells,
            "base_terminal_minimum": base_terminal_minimum,
            "base_gap_cells": base_gap_cells,
            "base_gap_minimum": base_gap_minimum,
            "value_stream_sha256": stream.hexdigest().upper(),
        },
        "dependency_sha256": {
            name: sha256(path) for name, path in dependencies.items() if path.exists()
        },
        "source_sha256": sha256(
            HERE / "prove_iso_double_broom_diagonal_gap_fixed_total_agent.py"
        ),
        "remaining_obligation": (
            "This exact fixed-total theorem does not establish any untested total h>11; "
            "a uniform all-h proof or exact obstruction remains required."
        ),
        "scope_guard": (
            "This is an exact connected-double-broom fixed-Newton-total theorem, "
            "not arbitrary-forest ISO or Erdős Problem 993."
        ),
    }
    canonical = json.loads(CANONICAL.read_text(encoding="utf-8"))
    reconstructed_json = json.loads(json.dumps(reconstructed))
    assert reconstructed_json == canonical

    replay = {
        "marker": "PASS_EXACT_FRESH_REPLAY_FREEZE_DOUBLE_BROOM_NEWTON_TOTAL_H_11",
        "replay_kind": "complete producer replay; not an independent derivation",
        "canonical_marker": canonical["marker"],
        "canonical_report_sha256": sha256(CANONICAL),
        "canonical_source_sha256": canonical["source_sha256"],
        "canonical_value_stream_sha256": canonical["exact_replay"]["value_stream_sha256"],
        "newton_pairs": canonical["newton_pairs"],
        "operator_layers": canonical["exact_replay"]["operator_layers"],
        "base_terminal_cells": canonical["exact_replay"]["base_terminal_cells"],
        "base_gap_cells": canonical["exact_replay"]["base_gap_cells"],
        "field_for_field_equality": True,
        "scope_guard": canonical["scope_guard"],
        "remaining_obligation": canonical["remaining_obligation"],
        "replay_source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(json.dumps(replay, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({**replay, "replay_report_sha256": sha256(OUTPUT)}, indent=2))


if __name__ == "__main__":
    main()
