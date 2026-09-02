#!/usr/bin/env python3
"""Independent literal-tree audit of one exhaustive threaded mixed i256 unit report.

The exhaustive Rust scanner uses conditioned-path coefficient formulas and a
custom checked signed-i256 residual layer.  This audit instead rebuilds literal
subdivided trees, runs the separate vertex-level tree DP, independently forms
Delta0/Delta1 and forward differences, and checks S=30 outside interpolation.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import audit_rank8_delta01_e3_cubic_short_boundary_batch_agent as literal
import verify_rank8_delta01_e3_cubic_short_boundary_batches_agent as primary


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "verify_rank8_delta01_e3_cubic_mixed_newton_i256_thread_core_agent.rs":
        "2F136735EA196425CCE817D6FA3361C6DC0EF15A22B869DA4CFAE9FF877EB45A",
    "verify_rank8_delta01_e3_cubic_mixed_newton_i256_threaded_agent.rs":
        "43E2242DA10E44E66B00A15F1D52C47E767124D420EBF69B7F008440D07E232F",
    "verify_rank8_delta01_e3_cubic_short_boundary_batches_agent.py":
        "94942334232FFA39B9D9BDBAE75CDBB80D6ACE293EE8CCCB30BF5BCCA3AA6363",
    "probe_rank8_delta01_e3_cubic_mixed_univariate_cells_agent.py":
        "92C0D885106F7668FACC844CF4112659F1172E2C205DA76F2D4B9E69EE1DC156",
    "audit_rank8_delta01_e3_quartic_stars_n27_n36_agent.py":
        "94A14B56E224EEF5136B3756AD0C4652F0FECC1A68BB46E932FB3B949F56C201",
    "audit_rank8_delta01_e3_cubic_short_boundary_batch_agent.py":
        "06EE3504E118EACC7F0B8F97DBAFB8CCB9BBDF0334A5D1E5A642157DD2150210",
}

NAME_ORDER = {
    "outer_branch": ("a1", "a2", "m", "b1", "b2", "u", "v"),
    "middle_branch": ("m", "a1", "a2", "b1", "b2", "u", "v"),
    "outer_leaf": ("a1", "a2", "m", "b1", "b2", "u", "v"),
    "middle_leaf": ("m", "a1", "a2", "b1", "b2", "u", "v"),
    "outer_pendant_internal": ("near", "tail", "a2", "m", "b1", "b2", "u", "v"),
    "middle_pendant_internal": ("near", "tail", "a1", "a2", "b1", "b2", "u", "v"),
    "spine_internal": ("near", "tail", "a1", "a2", "m", "b1", "b2", "v"),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def long_kind(root: str, name: str) -> str:
    if name in {"u", "v"}:
        return "spine"
    if name == "near":
        return "near"
    if name == "tail":
        return "tail"
    if (root == "outer_leaf" and name == "a1") or (root == "middle_leaf" and name == "m"):
        return "incident"
    return "pendant"


def decode_witness(root: str, witness: dict) -> dict:
    names = NAME_ORDER[root]
    values = witness["values"]
    mask = witness["long_mask"]
    assert len(values) == len(names)
    assert 0 < mask < (1 << len(names)) - 1
    states = {}
    for index, (name, value) in enumerate(zip(names, values)):
        if mask & (1 << index):
            kind = long_kind(root, name)
            assert value == primary.algebra.LONG_BASE[kind]
            states[name] = kind
        else:
            states[name] = value
    return states


def forward(values: list[int]) -> list[int]:
    current = values[:]
    result = []
    while current:
        result.append(current[0])
        current = [current[index + 1] - current[index] for index in range(len(current) - 1)]
    return result


def exact_row(root: str, states: dict) -> dict:
    literal_values = {"0": [], "1": []}
    witness_s0 = None
    for offset in range(primary.DEGREE_BOUND + 2):
        values, core, deleted, root_vertex = literal.literal_deltas(root, states, offset)
        if offset == 0:
            adjacency, _ = literal.literal_tree(root, states, offset)
            witness_s0 = {
                "order": len(adjacency),
                "root_vertex": root_vertex,
                "core_coefficients": core,
                "deleted_coefficients": deleted,
            }
        for rank in (0, 1):
            literal_values[str(rank)].append(int(values[rank]))

    conditioned = primary.mixed_row(root, states)
    ranks = {}
    for rank in (0, 1):
        key = str(rank)
        first30 = literal_values[key][: primary.DEGREE_BOUND + 1]
        coefficients = forward(first30)
        assert first30 == conditioned["ranks"][key]["values"]
        assert coefficients == conditioned["ranks"][key]["newton_coefficients"]
        predicted30 = sum(
            coefficients[degree] * math.comb(primary.DEGREE_BOUND + 1, degree)
            for degree in range(primary.DEGREE_BOUND + 1)
        )
        assert predicted30 == literal_values[key][primary.DEGREE_BOUND + 1]
        ranks[key] = {
            "literal_values_sha256": hashlib.sha256(
                json.dumps(literal_values[key], separators=(",", ":")).encode("ascii")
            ).hexdigest().upper(),
            "newton_coefficients_sha256": hashlib.sha256(
                json.dumps(coefficients, separators=(",", ":")).encode("ascii")
            ).hexdigest().upper(),
            "base": coefficients[0],
            "first_difference": coefficients[1],
            "minimum_coefficient": min(coefficients),
            "max_value_bit_length": max(abs(value).bit_length() for value in literal_values[key]),
            "max_coefficient_bit_length": max(abs(value).bit_length() for value in coefficients),
            "value_exceeds_signed_i128": any(abs(value) >= 1 << 127 for value in literal_values[key]),
            "coefficient_exceeds_signed_i128": any(abs(value) >= 1 << 127 for value in coefficients),
            "unseen_S30_match": True,
        }
    return {
        "key": primary.pattern_key(root, states),
        "states": states,
        "ranks": ranks,
        "literal_witness_S0": witness_s0,
    }


def sample_indices(total: int, requested: int) -> list[int]:
    assert total > 0 and requested >= 2
    indices = {0, total - 1}
    for numerator in range(1, requested - 1):
        indices.add((total - 1) * numerator // (requested - 1))
    return sorted(indices)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", required=True)
    parser.add_argument("--report-sha256", required=True)
    parser.add_argument("--samples", type=int, default=7)
    args = parser.parse_args()
    assert args.samples >= 2

    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    report_path = ROOT / args.report
    assert sha256(report_path) == args.report_sha256.upper()
    report = json.loads(report_path.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_MIXED_NEWTON_I256_THREADED_FULL_UNIT"
    root = report["scope"]["root_orbit"]
    raw = report["raw_result"]
    assert raw["root"] == root
    assert raw["start"] == 0
    assert raw["stop"] == raw["processed"] == raw["universe"]
    assert raw["universe"] == primary.EXPECTED_COUNTS[root]["mixed"]
    assert raw["negative0"] == raw["negative1"] == 0
    assert int(raw["minimum_base0"]) > 0
    assert int(raw["minimum_base1"]) > 0
    assert int(raw["minimum_first0"]) > 0
    assert int(raw["minimum_first1"]) > 0

    minimum_specs = {
        "base0": ("witness_base0", "minimum_base0", "0", "base"),
        "base1": ("witness_base1", "minimum_base1", "1", "base"),
        "first0": ("witness_first0", "minimum_first0", "0", "first_difference"),
        "first1": ("witness_first1", "minimum_first1", "1", "first_difference"),
    }
    witness_rows = {}
    cache = {}
    for label, (witness_name, minimum_name, rank, field) in minimum_specs.items():
        states = decode_witness(root, raw[witness_name])
        key = primary.pattern_key(root, states)
        if key not in cache:
            cache[key] = exact_row(root, states)
        row = cache[key]
        assert row["ranks"][rank][field] == int(raw[minimum_name])
        witness_rows[label] = {
            "reported_minimum": int(raw[minimum_name]),
            "rank": int(rank),
            "coefficient": field,
            "literal_row_key": key,
            "match": True,
        }

    indices = sample_indices(raw["universe"], args.samples)
    wanted = set(indices)
    sampled = {}
    for index, states in enumerate(primary.selected_patterns(root, "mixed")):
        if index in wanted:
            sampled[index] = states
        if index >= indices[-1]:
            break
    assert set(sampled) == wanted
    sample_rows = [{"index": index, **exact_row(root, sampled[index])} for index in indices]

    payload = {
        "schema": "rank8_delta01_e3_cubic_mixed_i256_threaded_unit_independent_audit_agent_v1",
        "status": "PASS_INDEPENDENT_LITERAL_TREE_NEWTON_AND_I256_THREADED_UNIT_AUDIT",
        "root_location_orbit": root,
        "exhaustive_report": report_path.name,
        "exhaustive_report_sha256": sha256(report_path),
        "exhaustive_universe": raw["universe"],
        "reported_minimum_witness_replays": witness_rows,
        "spread_sample_indices": indices,
        "spread_samples": sample_rows,
        "methods": [
            "literal vertex-level subdivision tree construction",
            "separate independence-polynomial tree DP",
            "independently transcribed Delta0/Delta1 residual formulas",
            "conditioned-path FLINT implementation comparison",
            "independent Python-integer forward differences",
            "degree-29 Newton reconstruction at unseen S=30",
            "explicit coverage of values or coefficients beyond signed i128 whenever encountered",
        ],
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This validates arithmetic, formula equivalence, reported minima witnesses, and deterministic spread samples. Exhaustiveness is supplied only by the separately hash-pinned full-unit report.",
    }
    output = ROOT / f"rank8_delta01_e3_cubic_mixed_{root}_i256_threaded_independent_audit_agent_20260823.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(output))


if __name__ == "__main__":
    main()


