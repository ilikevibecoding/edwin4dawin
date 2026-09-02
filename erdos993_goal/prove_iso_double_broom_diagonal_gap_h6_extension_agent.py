#!/usr/bin/env python3
"""Exact h=6 extension of the double-broom universal diagonal certificate."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_double_broom_diagonal_gap_agent import (
    HERE,
    all_diagonal_values,
    cross_kernel,
    defect,
    kernel,
    literal_terminal,
    normalized_layer_certificate,
    operator_decomposition,
    p,
    sha256,
    symmetric_sp_form,
    w,
    z,
)


OUTPUT = HERE / "iso_double_broom_diagonal_gap_h6_extension_exact_agent_20260829.json"
SELECTED = [(0, 6), (1, 5), (2, 4), (3, 3)]


def main() -> None:
    stream = hashlib.sha256()
    layer_report = {}
    layer_count = 0

    for i, j in SELECTED:
        A, B, gap, operators = operator_decomposition(i, j)
        Az, Aw, dAz, dAw = A
        Bz, Bw, dBz, dBw = B
        ma, ra = operators["A"]
        mb, rb = operators["B"]
        mc, rc = operators["C"]
        f, q = operators["D"]
        determinant = Bz * Aw - Az * Bw
        determinant_difference = dBz * Aw - dAz * Bw - Bz * dAw + Az * dBw

        kernel_part = sp.expand(
            ma * kernel(A)
            + mb * kernel(B)
            + mc * cross_kernel(A, B)
            - defect
            * (ra * Az * Aw + rb * Bz * Bw + rc * (Az * Bw + Bz * Aw))
        )
        residual = sp.expand(gap - kernel_part)
        ca, cb = gap.coeff(dAz * Bw), gap.coeff(dBz * Aw)
        e = sp.cancel((ca - cb) / 2)
        x, y = residual.coeff(Az * Bw), residual.coeff(Bz * Aw)
        v = sp.cancel((y - x) / 2)
        assert sp.expand(residual - (v * determinant - e * determinant_difference)) == 0
        assert sp.expand(v * (z - w) - 2 * e - defect * f) == 0
        assert sp.expand(e - defect * q) == 0

        cell = {}
        for name, (multiplier, reserve) in operators.items():
            kind = "cd" if name == "D" else "kernel"
            certificates = normalized_layer_certificate(kind, multiplier, reserve)
            layer_count += len(certificates)
            for certificate in certificates:
                stream.update(
                    f"L,{i},{j},{name},{certificate['parity']},{certificate['layer']},"
                    f"{certificate['numerator']},{certificate['denominator']};".encode()
                )
            cell[name] = {
                "kind": kind,
                "multiplier_sp": str(symmetric_sp_form(multiplier)[1]),
                "reserve_or_derivative_sp": str(symmetric_sp_form(reserve)[1]),
                "normalized_layers": certificates,
            }
        layer_report[f"{i},{j}"] = cell

    base_terminal_cells = base_gap_cells = 0
    base_terminal_minimum = base_gap_minimum = None
    for i, j in SELECTED:
        for order in (2, 3):
            values = all_diagonal_values(literal_terminal(order, i, j))
            assert all(value >= 0 for value in values)
            for rank, value in enumerate(values):
                cell = (int(value), order, rank, i, j)
                base_terminal_minimum = cell if base_terminal_minimum is None or cell < base_terminal_minimum else base_terminal_minimum
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
                base_gap_minimum = cell if base_gap_minimum is None or cell < base_gap_minimum else base_gap_minimum
                base_gap_cells += 1
                stream.update(f"G,{order},{rank},{i},{j},{value};".encode())

    dependencies = {
        "h5_source": HERE / "prove_iso_double_broom_diagonal_gap_agent.py",
        "h5_report": HERE / "iso_double_broom_diagonal_gap_exact_agent_20260829.json",
        "h5_note": HERE / "ISO_DOUBLE_BROOM_DIAGONAL_GAP_NEWTON_COLLAR_H5_AGENT_2026-08-29.md",
    }
    report = {
        "marker": "PASS_EXACT_ALL_PATH_ORDER_DOUBLE_BROOM_DIAGONAL_GAP_NEWTON_COLLAR_H_LE_6_EXTENSION",
        "theorem": (
            "The universal four-operator diagonal certificate holds at total "
            "leaf-Newton degree i+j=6 for every path order and rank. Combined "
            "with the frozen h<=5 theorem, the exact collar is h<=6."
        ),
        "newton_pairs": SELECTED,
        "operator_layer_certificates": layer_report,
        "exact_replay": {
            "operator_layers": layer_count,
            "base_terminal_cells": base_terminal_cells,
            "base_terminal_minimum": base_terminal_minimum,
            "base_gap_cells": base_gap_cells,
            "base_gap_minimum": base_gap_minimum,
            "value_stream_sha256": stream.hexdigest().upper(),
        },
        "dependency_sha256": {name: sha256(path) for name, path in dependencies.items()},
        "source_sha256": sha256(Path(__file__).resolve()),
        "remaining_obligation": (
            "Prove the universal layers for i+j>=7 or produce an exact negative "
            "carrier-exponent cell."
        ),
        "scope_guard": (
            "This extends only the connected double-broom Newton collar. It is "
            "not the full double-broom theorem, arbitrary-forest ISO, or Erdős 993."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "marker": report["marker"],
                "operator_layers": layer_count,
                "base_terminal_cells": base_terminal_cells,
                "base_gap_cells": base_gap_cells,
                "value_stream_sha256": report["exact_replay"]["value_stream_sha256"],
                "source_sha256": report["source_sha256"],
                "report_sha256": sha256(OUTPUT),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
