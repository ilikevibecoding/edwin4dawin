#!/usr/bin/env python3
"""Prove the factored payment restricts exactly to the sealed suffix payment."""

from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path

from probe_rank8_low_low_full_early_suffix45_cell_flint import PAYMENT_MASKS


ROOT = Path(__file__).resolve().parent
FACTORED = ROOT / "rank8_low_low_full_early_core_factored_amgm_exact_20260822.json"
CURVATURE = ROOT / "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json"
STRONG = ROOT / "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json"
NEW_PROBE = ROOT / "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_flint.py"
OLD_PROBE = ROOT / "probe_rank8_low_low_suffix3_gap0_outer_cell_flint.py"
REPORT = ROOT / "rank8_low_low_suffix3_gap0_factored_suffix_face_identity_exact_20260822.json"
EXPECTED = {
    FACTORED.name: "36673C44864659E3DAB2CC99071DAE2C306830B8B672A8C7F3E41ED5A2AFCFF6",
    CURVATURE.name: "E90CD40EDDE350EFAF23DB9738964146C0C5358CB2893560313772D1A9CB1C4C",
    STRONG.name: "8C390F8C24F663B551B63D0E80FA9DF8894A2759D06DE5EA181CFB1E26636911",
    NEW_PROBE.name: "00288AAF49B4A002240AD1DB153DA9195FDC763B84AA8BDDBCA036F70A1A8870",
    OLD_PROBE.name: "A97A572170EC70470F009ADDFED9F47E7336E88E3EB7DDF5BE6F58BA9E4D4E4B",
}
ROWS = (
    ("curvature_far", "curvature_far", 1, (0, 3)),
    ("strong_middle_times_4", "middle_times_2", 2, (63, 0)),
    ("strong_far", "far", 1, (693, 330)),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def normalize(allocation, scale):
    def monomial(values):
        assert values[3:] == [0, 0, 0, 0]
        return values[:3]

    return {
        "negative_monomial": monomial(allocation["negative_monomial"]),
        "demand": allocation["demand"] // scale,
        "source_low": {
            "monomial": monomial(allocation["source_low"]["monomial"]),
            "capacity": allocation["source_low"]["capacity"] // scale,
        },
        "source_high": {
            "monomial": monomial(allocation["source_high"]["monomial"]),
            "capacity": allocation["source_high"]["capacity"] // scale,
        },
        "four_product": allocation["four_product"] // (scale * scale),
        "demand_squared": allocation["demand_squared"] // (scale * scale),
        "slack": allocation["slack"] // (scale * scale),
    }


def main() -> None:
    assert {
        path.name: sha256(path)
        for path in (FACTORED, CURVATURE, STRONG, NEW_PROBE, OLD_PROBE)
    } == EXPECTED
    factored = json.loads(FACTORED.read_text(encoding="utf-8"))
    curvature = json.loads(CURVATURE.read_text(encoding="utf-8"))
    strong = json.loads(STRONG.read_text(encoding="utf-8"))
    factored_rows = {row["bernstein_target"]: row for row in factored["rows"]}
    zero_rows = {
        "curvature_far": curvature,
        **{row["bernstein_coefficient"]: row for row in strong["rows"]},
    }

    source_tree = ast.parse(NEW_PROBE.read_text(encoding="utf-8"))
    imported_build_at = any(
        isinstance(node, ast.ImportFrom)
        and node.module == "probe_rank8_low_low_suffix3_gap0_outer_cell_flint"
        and any(alias.name == "build_at" for alias in node.names)
        for node in source_tree.body
    )
    assert imported_build_at

    rows = []
    for factored_label, zero_label, scale, zero_masks in ROWS:
        allocations = factored_rows[factored_label]["allocations"]
        zero_indices = [
            index for index, allocation in enumerate(allocations)
            if allocation["negative_monomial"][3:] == [0, 0, 0, 0]
        ]
        expected_allocations = zero_rows[zero_label]["allocations"]
        assert len(zero_indices) == len(expected_allocations)
        for zero_index, (factored_index, expected_allocation) in enumerate(
            zip(zero_indices, expected_allocations)
        ):
            allocation = allocations[factored_index]
            assert normalize(allocation, scale) == expected_allocation
            assert bool(PAYMENT_MASKS[factored_label]["left"] & (1 << factored_index)) == bool(
                zero_masks[0] & (1 << zero_index)
            )
            assert bool(PAYMENT_MASKS[factored_label]["right"] & (1 << factored_index)) == bool(
                zero_masks[1] & (1 << zero_index)
            )
        positive_groups = 0
        for allocation in allocations:
            early = allocation["negative_monomial"][3:]
            assert allocation["source_low"]["monomial"][3:] == early
            assert allocation["source_high"]["monomial"][3:] == early
            if early != [0, 0, 0, 0]:
                positive_groups += 1
        rows.append({
            "factored_label": factored_label,
            "zero_slack_label": zero_label,
            "coefficient_scale": scale,
            "zero_group_indices": zero_indices,
            "zero_group_allocations": len(zero_indices),
            "positive_early_support_allocations_vanishing_on_suffix_face": positive_groups,
            "allocations_identical": True,
            "directional_masks_identical": True,
        })

    payload = {
        "schema": "rank8-low-low-suffix3-gap0-factored-suffix-face-identity-v1",
        "status": "PASS_EXACT_FACTORED_PAYMENT_SUFFIX_FACE_IDENTITY",
        "theorem": (
            "At a0=a2=b0=b2=0, every positive-early-support factored block "
            "vanishes and the remaining zero group is exactly the immutable "
            "suffix-only payment with identical masks and scaling. The raw "
            "auxiliary builder is imported unchanged, so the complete factored "
            "probe restricts identically to the sealed suffix-3 probe for all "
            "a3,b3 and suffix-4 through suffix-7 slacks."
        ),
        "raw_builder_imported_unchanged": True,
        "rows": rows,
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
