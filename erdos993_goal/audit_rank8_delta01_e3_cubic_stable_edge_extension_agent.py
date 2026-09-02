#!/usr/bin/env python3
"""Independent literal-interpolation audit of the stable cubic extension theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_rank8_delta01_e3_quartic_stars_n27_n36_agent import (
    deltas,
    forest_polynomial,
)


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta01_e3_cubic_stable_edge_extension_exact_agent_20260822.json"
OUTPUT = ROOT / "rank8_delta01_e3_cubic_stable_edge_extension_independent_audit_agent_20260822.json"
EXPECTED = {
    "verify_rank8_stable_path_offset_transfer_agent.py":
        "2EB0B6E4F073F0FC90FB023D2EC265D4C28CC58C5DF710EF45E17471085D578E",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "verify_rank8_delta01_e3_cubic_stable_edge_extension_agent.py":
        "9BE0F22130E3CB20707AE610DB594A5DE073ACB27381C2B92087122A5B655F5D",
    PRIMARY.name:
        "49219FCD8766B4E584FEAC0281B491A0F0B70C5B85E4977BC2E1BB722A3CD7F7",
    "audit_rank8_delta01_e3_quartic_stars_n27_n36_agent.py":
        "94A14B56E224EEF5136B3756AD0C4652F0FECC1A68BB46E932FB3B949F56C201",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def subdivision_with_keys(lengths):
    edges = ((0, 1), (1, 2), (0, 3), (0, 4), (1, 5), (2, 6), (2, 7))
    adjacency = [[] for _ in range(1 + sum(lengths))]
    keys = [("branch", vertex) for vertex in range(8)]
    next_vertex = 8
    for edge_index, ((left, right), length) in enumerate(zip(edges, lengths)):
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


def values(lengths, root_key):
    adjacency, keys = subdivision_with_keys(lengths)
    root = keys.index(root_key)
    return deltas(forest_polynomial(adjacency), forest_polynomial(adjacency, root))


def profile(label: str, offset: int):
    # Length order is u,v,a1,a2,m,b1,b2.
    if label in ("outer_branch", "middle_branch"):
        lengths = (10 + offset, 10, 8, 8, 8, 8, 8)
        root = ("branch", 0 if label == "outer_branch" else 1)
        new_lengths = (11 + offset, *lengths[1:])
        new_root = root
    elif label == "outer_leaf":
        lengths = (10 + offset, 10, 9, 8, 8, 8, 8)
        root = ("branch", 3)
        new_lengths = (11 + offset, *lengths[1:])
        new_root = root
    elif label == "middle_leaf":
        lengths = (10 + offset, 10, 8, 8, 9, 8, 8)
        root = ("branch", 5)
        new_lengths = (11 + offset, *lengths[1:])
        new_root = root
    elif label == "outer_pendant_internal":
        lengths = (10 + offset, 10, 16, 8, 8, 8, 8)
        root = ("edge", 2, 9)
        new_lengths = (11 + offset, *lengths[1:])
        new_root = root
    elif label == "middle_pendant_internal":
        lengths = (10 + offset, 10, 8, 8, 16, 8, 8)
        root = ("edge", 4, 9)
        new_lengths = (11 + offset, *lengths[1:])
        new_root = root
    elif label == "spine_internal":
        lengths = (18 + offset, 10, 8, 8, 8, 8, 8)
        root = ("edge", 0, 9 + offset)
        new_lengths = (19 + offset, *lengths[1:])
        new_root = ("edge", 0, 10 + offset)
    else:
        raise ValueError(label)
    old = values(lengths, root)
    new = values(new_lengths, new_root)
    return tuple(new[rank] - old[rank] for rank in (0, 1))


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
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_STABLE_EDGE_EXTENSION_ALL_ROOT_ORBITS"
    by_label = {row["root_location_orbit"]: row for row in primary["root_location_cells"]}
    assert set(by_label) == {
        "outer_branch", "middle_branch", "outer_leaf", "middle_leaf",
        "outer_pendant_internal", "middle_pendant_internal", "spine_internal",
    }

    literal_rows = []
    for label, row in by_label.items():
        literal = profile(label, 0)
        for rank in (0, 1):
            assert str(literal[rank]) == row["ranks"][str(rank)]["constant_coefficient"]
            assert literal[rank] > 0
        literal_rows.append({"root_location_orbit": label, "Delta0_increment": literal[0], "Delta1_increment": literal[1]})

    representatives = {
        "branch": "outer_branch",
        "leaf": "outer_leaf",
        "internal": "outer_pendant_internal",
    }
    variable = sp.symbols("S")
    interpolation_rows = []
    for profile_type, label in representatives.items():
        samples = [profile(label, offset) for offset in range(27)]
        rank_rows = {}
        for rank in (0, 1):
            polynomial = sp.Poly(
                sp.interpolate([(offset, samples[offset][rank]) for offset in range(27)], variable),
                variable,
                domain=sp.QQ,
            )
            coefficients = polynomial.coeffs()
            primary_row = by_label[label]["ranks"][str(rank)]
            assert polynomial.degree() == primary_row["degree"] == 26
            assert len(polynomial.terms()) == primary_row["terms"] == 27
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
            "literal_offsets": [0, 26],
            "samples_per_rank": 27,
            "ranks": rank_rows,
        })
        print("INTERPOLATION_PASS", profile_type, label, flush=True)

    # The primary hashes show exact equality within each root-degree profile.
    assert by_label["outer_branch"]["ranks"] == by_label["middle_branch"]["ranks"]
    assert by_label["outer_leaf"]["ranks"] == by_label["middle_leaf"]["ranks"]
    assert by_label["outer_pendant_internal"]["ranks"] == by_label["middle_pendant_internal"]["ranks"] == by_label["spine_internal"]["ranks"]

    payload = {
        "schema": "rank8-delta01-e3-cubic-stable-edge-extension-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_STABLE_EDGE_EXTENSION_AUDIT",
        "methods": [
            "literal Python tree-DP replay of both rank increments in all seven root-location cells",
            "27-point exact interpolation for Delta0 and Delta1 in each of the three distinct root profiles",
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
        "scope_warning": "Stable interior audit only; short-boundary extension cells remain open.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
