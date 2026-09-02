#!/usr/bin/env python3
"""Independent literal/interpolation audit of stable cubic Delta2/Delta3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_rank8_delta01_e3_quartic_stars_n27_n36_agent import forest_polynomial
from audit_rank8_delta23_e3_cubic_mixed_newton_i256_root import residual


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta23_e3_cubic_stable_edge_extension_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta23_e3_cubic_stable_edge_extension_independent_audit_root_20260823.json"
EXPECTED = {
    PRIMARY.name: "A9C34636FE0EC6DDCD8F9A4A251BFCC0A349F1D568105B83667FC3E1641FB2F6",
    "verify_rank8_delta23_e3_cubic_stable_edge_extension_root.py": "C01467A1C80DFCB6C9971063AF85498FCD9A2934537444A710343B53500D2493",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json": "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "audit_rank8_delta01_e3_quartic_stars_n27_n36_agent.py": "94A14B56E224EEF5136B3756AD0C4652F0FECC1A68BB46E932FB3B949F56C201",
    "audit_rank8_delta23_e3_cubic_mixed_newton_i256_root.py": "702244F51CBD3CEB500B4C935C06D10B8AA1AD5E0EC3BBF1EFB51015C8966B3E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def subdivision_with_keys(lengths):
    edges = ((0, 1), (1, 2), (0, 3), (0, 4), (1, 5), (2, 6), (2, 7))
    adjacency = [[] for _ in range(1 + sum(lengths))]
    keys = [("branch", vertex) for vertex in range(8)]
    next_vertex = 8
    for edge_index, ((left, right), length) in enumerate(zip(edges, lengths, strict=True)):
        previous = left
        for step in range(1, length):
            vertex = next_vertex
            next_vertex += 1
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
            keys.append(("edge", edge_index, step))
        adjacency[previous].append(right)
        adjacency[right].append(previous)
    assert next_vertex == len(adjacency) == len(keys)
    return adjacency, keys


def values23(lengths, root_key):
    adjacency, keys = subdivision_with_keys(lengths)
    root = keys.index(root_key)
    core = forest_polynomial(adjacency)
    deleted = forest_polynomial(adjacency, root)
    r1 = residual(core, deleted, 1)
    r2 = residual(core, deleted, 2)
    r3 = residual(core, deleted, 3)
    r4 = residual(core, deleted, 4)
    return r3 - 2 * r2 + r1, r4 - 3 * r3 + 3 * r2 - r1


def profile(label: str, offset: int):
    # Length order u,v,a1,a2,m,b1,b2.
    if label in ("outer_branch", "middle_branch"):
        lengths = (10 + offset, 10, 8, 8, 8, 8, 8)
        root = ("branch", 0 if label == "outer_branch" else 1)
        new_lengths, new_root = (11 + offset, *lengths[1:]), root
    elif label == "outer_leaf":
        lengths = (10 + offset, 10, 9, 8, 8, 8, 8)
        root = ("branch", 3)
        new_lengths, new_root = (11 + offset, *lengths[1:]), root
    elif label == "middle_leaf":
        lengths = (10 + offset, 10, 8, 8, 9, 8, 8)
        root = ("branch", 5)
        new_lengths, new_root = (11 + offset, *lengths[1:]), root
    elif label == "outer_pendant_internal":
        lengths = (10 + offset, 10, 16, 8, 8, 8, 8)
        root = ("edge", 2, 9)
        new_lengths, new_root = (11 + offset, *lengths[1:]), root
    elif label == "middle_pendant_internal":
        lengths = (10 + offset, 10, 8, 8, 16, 8, 8)
        root = ("edge", 4, 9)
        new_lengths, new_root = (11 + offset, *lengths[1:]), root
    elif label == "spine_internal":
        lengths = (18 + offset, 10, 8, 8, 8, 8, 8)
        root = ("edge", 0, 9 + offset)
        new_lengths = (19 + offset, *lengths[1:])
        new_root = ("edge", 0, 10 + offset)
    else:
        raise ValueError(label)
    old = values23(lengths, root)
    new = values23(new_lengths, new_root)
    return new[0] - old[0], new[1] - old[1]


def polynomial_digest(polynomial: sp.Poly) -> str:
    body = "".join(
        f"{','.join(map(str, powers))}:{coefficient}\n"
        for powers, coefficient in sorted(polynomial.terms())
    )
    return hashlib.sha256(body.encode("ascii")).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_STABLE_EDGE_EXTENSION_ALL_ROOT_ORBITS"
    by_label = {row["root_location_orbit"]: row for row in primary["root_location_cells"]}
    assert len(by_label) == 7

    literal_rows = []
    for label, row in by_label.items():
        literal = profile(label, 0)
        for rank in (2, 3):
            assert str(literal[rank - 2]) == row["ranks"][str(rank)]["constant_coefficient"]
            assert literal[rank - 2] > 0
        literal_rows.append({
            "root_location_orbit": label,
            "Delta2_increment": literal[0],
            "Delta3_increment": literal[1],
        })

    variable = sp.symbols("S")
    representatives = {
        "branch": "outer_branch",
        "leaf": "outer_leaf",
        "internal": "outer_pendant_internal",
    }
    interpolation_rows = []
    for profile_type, label in representatives.items():
        samples = [profile(label, offset) for offset in range(26)]
        rank_rows = {}
        for rank in (2, 3):
            polynomial = sp.Poly(
                sp.interpolate([(offset, samples[offset][rank - 2]) for offset in range(26)], variable),
                variable, domain=sp.QQ,
            )
            primary_row = by_label[label]["ranks"][str(rank)]
            coefficients = polynomial.coeffs()
            assert polynomial.degree() == primary_row["degree"]
            assert len(polynomial.terms()) == primary_row["terms"]
            assert all(coefficient > 0 for coefficient in coefficients)
            assert str(min(coefficients)) == primary_row["minimum_coefficient"]
            assert str(polynomial.coeff_monomial((0,))) == primary_row["constant_coefficient"]
            assert polynomial_digest(polynomial) == primary_row["polynomial_sha256"]
            rank_rows[str(rank)] = {
                "degree": polynomial.degree(),
                "terms": len(polynomial.terms()),
                "minimum_coefficient": str(min(coefficients)),
                "polynomial_sha256": polynomial_digest(polynomial),
            }
        interpolation_rows.append({
            "root_profile": profile_type,
            "representative": label,
            "literal_offsets": [0, 25],
            "samples_per_rank": 26,
            "ranks": rank_rows,
        })
        print("PASS", profile_type, flush=True)

    assert by_label["outer_branch"]["ranks"] == by_label["middle_branch"]["ranks"]
    assert by_label["outer_leaf"]["ranks"] == by_label["middle_leaf"]["ranks"]
    assert by_label["outer_pendant_internal"]["ranks"] == by_label["middle_pendant_internal"]["ranks"] == by_label["spine_internal"]["ranks"]

    payload = {
        "schema": "rank8-delta23-e3-cubic-stable-edge-extension-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA23_E3_CUBIC_STABLE_EDGE_EXTENSION_AUDIT",
        "methods": [
            "literal tree-DP replay of Delta2 and Delta3 increments in all seven root cells",
            "26-point exact SymPy interpolation for each rank in three profile classes",
            "canonical full-polynomial hash comparison against the FLINT certificate",
        ],
        "literal_constant_replays": literal_rows,
        "second_engine_interpolations": interpolation_rows,
        "exact_profile_equalities": [
            "outer branch = middle branch",
            "outer leaf = middle leaf",
            "outer pendant internal = middle pendant internal = spine internal",
        ],
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Stable all-long cubic Delta2/Delta3 interior only; other cubic and connected sectors remain separately gated.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
