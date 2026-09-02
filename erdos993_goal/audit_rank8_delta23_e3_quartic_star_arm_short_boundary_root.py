#!/usr/bin/env python3
"""Independent all-cell and second-engine audit of quartic arm Delta2/Delta3."""

from __future__ import annotations

import gc
import hashlib
import json
import time
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

import audit_rank8_delta01_e3_quartic_star_arm_short_boundary_agent as base
from audit_rank8_delta23_e3_cubic_mixed_newton_i256_root import residual


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta23_e3_quartic_star_arm_short_boundary_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta23_e3_quartic_star_arm_short_boundary_independent_audit_root_20260823.json"
RANKS = (2, 3)
EXPECTED = {
    PRIMARY.name: "342BEE0FF1F3BE709BA72037FE00240B557A2D5978D04EBF95D56D8756056115",
    "verify_rank8_delta23_e3_quartic_star_arm_short_boundary_root.py": "73ACB12F78BB6E9650C8B2310025F8B154CDD524FB5972E02CC630E81D38E4F8",
    "audit_rank8_delta01_e3_quartic_star_arm_short_boundary_agent.py": "46EEBDA2C449062D805F65989032B8337CDC5AC2874A8C955FC564DBB2AC2CE1",
    "audit_rank8_delta23_e3_cubic_mixed_newton_i256_root.py": "702244F51CBD3CEB500B4C935C06D10B8AA1AD5E0EC3BBF1EFB51015C8966B3E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def literal_delta23(core, deleted):
    r1 = residual(core, deleted, 1)
    r2 = residual(core, deleted, 2)
    r3 = residual(core, deleted, 3)
    r4 = residual(core, deleted, 4)
    return r3 - 2 * r2 + r1, r4 - 3 * r3 + 3 * r2 - r1


def configure_second_engine() -> None:
    base.RANKS = RANKS
    base.deltas = literal_delta23
    r1 = base.residual_at(1)
    r2 = base.residual_at(2)
    r3 = base.residual_at(3)
    r4 = base.residual_at(4)
    expressions = {
        2: sp.expand(r3 - 2 * r2 + r1),
        3: sp.expand(r4 - 3 * r3 + 3 * r2 - r1),
    }
    base.DELTA_TERMS = {
        rank: sp.Poly(expressions[rank], *base.AUDIT_SOURCE_SYMBOLS).terms()
        for rank in RANKS
    }


def main() -> None:
    started = time.perf_counter()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    configure_second_engine()
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_ARM_ALL_N37_PLUS"
    computed, inherited, pattern_counts, cover_counts = base.reconstruct_cover()
    expected_by_key = {row["key"]: row for row in computed}
    primary_by_key = {row["key"]: row for row in primary["cells"]}
    assert set(expected_by_key) == set(primary_by_key)
    assert primary["no_gap_cover"]["computed_shifted_cells"] == 3133
    assert primary["no_gap_cover"]["inherited_all_long_cells"] == 1
    assert primary["inherited_all_long_certificate"]["key"] == inherited["key"]

    minima = {rank: None for rank in RANKS}
    literal_digest = hashlib.sha256()
    for index, cell in enumerate(computed, 1):
        row = primary_by_key[cell["key"]]
        assert row["pattern"]["baseline_segment_sum"] == cell["baseline"]
        assert row["pattern"]["offset_total_needed"] == cell["demand"]
        assert row["shift"] == cell["shift"]
        values = base.literal_deltas(cell)
        for rank, value in zip(RANKS, values, strict=True):
            assert value > 0
            assert str(value) == row["ranks"][str(rank)]["constant_coefficient"]
            minima[rank] = value if minima[rank] is None else min(minima[rank], value)
            literal_digest.update(f"{cell['key']}|{rank}|{value}\n".encode("ascii"))
        if index % 500 == 0:
            print("LITERAL", index, flush=True)

    sample_by_shape = {}
    for cell in computed:
        row = primary_by_key[cell["key"]]
        sample_by_shape.setdefault(base.shape(cell, row), cell)
    assert len(sample_by_shape) == 25
    samples = []
    for signature, cell in sorted(sample_by_shape.items(), key=lambda item: str(item[0])):
        replay = base.symbolic_rows(cell)
        primary_row = primary_by_key[cell["key"]]
        for rank in RANKS:
            expected = primary_row["ranks"][str(rank)]
            actual_row = replay[str(rank)]
            assert actual_row["degrees"] == expected["degrees"]
            assert actual_row["terms"] == expected["terms"]
            assert actual_row["minimum_coefficient"] == expected["minimum_coefficient"]
            assert actual_row["constant_coefficient"] == expected["constant_coefficient"]
            assert actual_row["polynomial_sha256"] == expected["polynomial_sha256"]
        samples.append({
            "shape": [str(value) for value in signature],
            "key": cell["key"],
            "ranks": replay,
        })
        print("SYMPY", signature, flush=True)
        clear_cache(); gc.collect()

    sample_keys_hash = hashlib.sha256(
        ("\n".join(row["key"] for row in samples) + "\n").encode("ascii")
    ).hexdigest().upper()
    payload = {
        "schema": "rank8-delta23-e3-quartic-star-arm-short-boundary-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_ARM_ALL_N37_PLUS",
        "methods": [
            "independent no-gap enumeration and per-pattern integer pigeonhole inequalities",
            "literal tree DP and independently evaluated Delta2/Delta3 for all 3,133 cells",
            "SymPy full-polynomial reconstruction against FLINT hashes for all 25 algebraic shapes",
        ],
        "coverage": {
            "patterns_by_long_segments": {str(key): value for key, value in sorted(pattern_counts.items())},
            "computed_cells": len(computed),
            "inherited_cells": 1,
            "cover_cells_by_long_segments_and_representative": {
                f"{long_count}|{representative}": value
                for (long_count, representative), value in sorted(cover_counts.items())
            },
            "exact_key_set_match": True,
        },
        "all_cell_literal_dp": {
            "cells": len(computed),
            "rank_constants": 2 * len(computed),
            "exact_matches": 2 * len(computed),
            "negative_or_zero_values": 0,
            "minimum_values": {str(rank): minima[rank] for rank in RANKS},
            "transcript_sha256": literal_digest.hexdigest().upper(),
        },
        "second_engine_full_polynomials": {
            "engine": "SymPy QQ multivariate polynomials",
            "primary_engine": "python-flint fmpq_mpoly",
            "algebraic_shapes": len(sample_by_shape),
            "rank_polynomials": 2 * len(samples),
            "full_polynomial_hash_matches": 2 * len(samples),
            "sample_keys_sha256": sample_keys_hash,
            "samples": samples,
        },
        "runtime_seconds": time.perf_counter() - started,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This independently audits only quartic-star arm Delta2/Delta3 for n>=37; broader connected cases remain open.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
