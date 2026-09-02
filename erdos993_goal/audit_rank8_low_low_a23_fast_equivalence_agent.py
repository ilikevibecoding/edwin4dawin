#!/usr/bin/env python3
"""Exact audit of the cached/polarized a2/a3 redistribution probe.

This audit is deliberately separate from the fast probe.  It checks the
affine factor-row decomposition against the original three-build probe,
checks the resulting quadratic auxiliary polynomials exactly on both axes,
and replays already sealed expansion-unit outputs byte-for-byte at the parsed
certificate level.
"""

from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

import probe_rank8_low_low_a23_redistribution_bernstein_cell_agent as baseline
import probe_rank8_low_low_a23_redistribution_bernstein_cell_fast_agent as fast
from probe_rank8_low_low_full_early_suffix45_cell_flint import add, scale


ROOT = Path(__file__).resolve().parent
BASELINE = ROOT / "probe_rank8_low_low_a23_redistribution_bernstein_cell_agent.py"
FAST = ROOT / "probe_rank8_low_low_a23_redistribution_bernstein_cell_fast_agent.py"
CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_cells_agent_checkpoint_20260822.json"
REPLAY = ROOT / "rank8_low_low_a23_probe_replay_agent_20260822.json"
REPORT = ROOT / "rank8_low_low_a23_fast_equivalence_agent_20260822.json"
EXPECTED = {
    BASELINE.name: "7C8E1703B6381789526B3421181D5148014874A3C6BDB45E95D908269EDCBEB1",
    FAST.name: "9EF1B74971804AE64647D74F6F5C9FCC6F3082B3CC2A2780D7B6D761BDF6CD46",
    REPLAY.name: "3E87855326EC347967856C8053A41404A782142F829C3CB762E5340BB47088CB",
}
COMPLETED_FAST_OUTPUTS = {
    (8, 8): ROOT / "rank8_a23_fast_agent_8_8_probe.tmp",
    (9, 7): ROOT / "rank8_a23_fast_agent_9_7_probe.tmp",
    (9, 0): ROOT / "rank8_a23_fast_agent_9_0_probe.tmp",
    (0, 8): ROOT / "rank8_a23_fast_agent_0_8_probe.tmp",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def affine_dictionary(base_part, direction_part, multiplier):
    return add(base_part, scale(direction_part, multiplier))


def exact_factor_row_audit():
    """Check R(m)=R(0)+m R' before any quadratic cell extraction."""
    context = fmpz_mpoly_ctx.get(baseline.INNER_NAMES, "degrevlex")
    variables = dict(zip(baseline.INNER_NAMES, context.gens()))
    one = context.constant(1)
    # A mixed, nontrivial truncation is enough here because the equality is
    # dictionary algebra before coefficient extraction; larger bounds do not
    # change the one-varying-ratio argument.
    target = (2, 2, 1, 1)
    base_row, direction_row = fast.build_cached_rows(variables, target, one)
    comparisons = 0
    for multiplier in (-3, -1, 0, 1, 3):
        actual = baseline.build_at(variables, multiplier, target, one)
        assert actual["capacity"] == base_row["capacity"]
        comparisons += 1
        for family in ("c", "v"):
            for rank in (7, 8, 9):
                expected = affine_dictionary(
                    base_row[family][rank], direction_row[family][rank], multiplier,
                )
                assert actual[family][rank] == expected
                comparisons += 1
    return {
        "outer_bound": list(target),
        "multipliers": [-3, -1, 0, 1, 3],
        "exact_dictionary_equalities": comparisons,
    }


def exact_axis_auxiliary_audit():
    """Compare the old endpoint formula and polarization as full polynomials."""
    context = fmpz_mpoly_ctx.get(baseline.INNER_NAMES, "degrevlex")
    variables = dict(zip(baseline.INNER_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    equalities = 0
    target_summaries = []
    # Use sparse high-support cells so this independent polynomial replay stays
    # cheap.  It includes both axes and two genuine two-dimensional cells.
    for p_exponent, q_exponent in ((9, 0), (0, 8), (8, 8), (9, 7)):
        outer_target = (p_exponent, q_exponent, 2, 2)
        old_rows = {
            multiplier: baseline.build_at(variables, multiplier, outer_target, one)
            for multiplier in (-1, 0, 1)
        }
        base_row, direction_row = fast.build_cached_rows(
            variables, outer_target, one,
        )
        for z_degree in range(3):
            for w_degree in range(3):
                target = (p_exponent, q_exponent, z_degree, w_degree)
                old = baseline.raw_power_cell(
                    old_rows, target, zero, variables["h"],
                )
                new = fast.quadratic_auxiliaries(
                    base_row, direction_row, target, zero, variables["h"],
                )
                assert set(old) == set(new) == set(baseline.LABELS)
                for label in baseline.LABELS:
                    assert old[label] == new[label]
                    equalities += 1
        target_summaries.append({
            "p_exponent": p_exponent,
            "q_exponent": q_exponent,
            "power_targets": 9,
            "labels": len(baseline.LABELS),
        })
    return {
        "targets": target_summaries,
        "exact_inner_polynomial_equalities": equalities,
    }


def completed_output_audit():
    checkpoint = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    saved = {
        (row["p_exponent"], row["q_exponent"]): row
        for row in checkpoint["rows"]
    }
    comparisons = []
    for cell, path in COMPLETED_FAST_OUTPUTS.items():
        candidate = ast.literal_eval(path.read_text(encoding="utf-8-sig"))
        reference = dict(saved[cell])
        elapsed = reference.pop("elapsed_seconds")
        assert candidate == reference
        comparisons.append({
            "cell": list(cell),
            "position_cells": candidate["position_count"],
            "baseline_elapsed_seconds": elapsed,
            "fast_output_sha256": sha256(path),
            "exact_parsed_output_match": True,
        })
    return comparisons


def main():
    observed = {path.name: sha256(path) for path in (BASELINE, FAST, REPLAY)}
    assert observed == EXPECTED
    replay = json.loads(REPLAY.read_text(encoding="utf-8"))
    assert replay["status"] == "PASS_INDEPENDENT_EXACT_A23_PROBE_REPLAY"
    factor_rows = exact_factor_row_audit()
    auxiliaries = exact_axis_auxiliary_audit()
    completed = completed_output_audit()
    payload = {
        "schema": "rank8-low-low-a23-fast-equivalence-agent-v1",
        "status": "PASS_EXACT_A23_FAST_PROBE_EQUIVALENCE_AUDIT",
        "meaning": (
            "The cached probe is the same exact certificate computation: the "
            "right factor row is affine in the endpoint multiplier, and each "
            "quadratic auxiliary is obtained by exact polarization."
        ),
        "algebra": {
            "factor_row": "R(m)=R0+m*R1",
            "quadratic": "Q(R0+mR1)=Q00+m*B01+m^2*Q11",
            "middle_times_4": "4*Q(0)+Q(1)-Q(-1)=4*Q00+2*B01",
            "far": "Q(1)=Q00+B01+Q11",
            "capacity_note": (
                "The strong-cell capacity is a left-row object and is "
                "independent of m, so its margin and derivative terms obey "
                "the same polarization identity."
            ),
        },
        "factor_row_audit": factor_rows,
        "axis_auxiliary_audit": auxiliaries,
        "sealed_output_replays": completed,
        "independent_Bernstein_replay": {
            "report": REPLAY.name,
            "sha256": EXPECTED[REPLAY.name],
            "status": replay["status"],
        },
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FACTOR_ROW_EQUALITIES", factor_rows["exact_dictionary_equalities"])
    print(
        "AUXILIARY_POLYNOMIAL_EQUALITIES",
        auxiliaries["exact_inner_polynomial_equalities"],
    )
    print("SEALED_OUTPUT_REPLAYS", len(completed))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
