#!/usr/bin/env python3
"""Independent audit of the e=3 quartic-star all-long Delta0/Delta1 cells."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp

from probe_rank8_delta01_e3_quartic_star_all_long_compressed_agent import (
    four_arm_star,
    two_long_paths,
)
from probe_rank8_delta2_e1_symbolic_cell import path_count
from scan_rank8_delta23_e1_subdivided_claws_n23_n28 import evaluator
from scan_rank8_delta3_n28_e1_subdivided_claws import forest_poly


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_quartic_star_all_long_independent_audit_agent_20260822.json"
EXPECTED = {
    "probe_rank8_delta01_e3_quartic_star_all_long_compressed_agent.py":
        "E99684BB7F42C00DC797A60B430BC1CBABFE8E9903F5C6A5F47E212D756464D9",
    "rank8_delta01_e3_quartic_star_center_all_long_compressed_agent_20260822.json":
        "B85734614D101BB6E83B4BA73DDEFF782597DB755F33EE033BD035F1D09A95AD",
    "rank8_delta01_e3_quartic_star_arm_all_long_compressed_agent_20260822.json":
        "B4532D4B1D4B9714DC29D6454812D554B4721687338AD497B2DB6D7617770ED5",
    "probe_rank8_delta01_e3_quartic_star_all_long_agent.py":
        "1F02924BDAE8CFB0A70B1E563597689356B6688D536FD8E51894F9F140D17787",
    "rank8_delta01_e3_quartic_star_center_all_long_agent_20260822.json":
        "21500F81A31E0813DE86D77FEA56D778A6C985CDC68A53329E5DDFF0E43236B3",
    "probe_rank8_delta2_e1_symbolic_cell.py":
        "C04F538FB8AFDDC75088FDB89FF610806955CA5ADC316D53C604F3E2703D74F1",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "scan_rank8_delta23_e1_subdivided_claws_n23_n28.py":
        "0CB38CA50A03E84E1C7CBC73A303EC2A5882689D7FF8E5440AB87A44075F4E59",
    "scan_rank8_delta3_n28_e1_subdivided_claws.py":
        "F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def direct_two_paths(a: sp.Expr, b: sp.Expr, rank: int) -> sp.Expr:
    return sp.expand(
        sum(path_count(a, j) * path_count(b, rank - j) for j in range(rank + 1))
    )


def build_star(arms: tuple[int, ...]):
    adjacency = [[]]
    descriptors = {("center",): 0}
    for arm_index, length in enumerate(arms):
        previous = 0
        for distance in range(1, length + 1):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            descriptors[("arm", arm_index, distance)] = vertex
            previous = vertex
    return adjacency, descriptors


def literal_values(arms: tuple[int, ...], root_descriptor: tuple) -> dict[str, int]:
    adjacency, descriptors = build_star(arms)
    root = descriptors[root_descriptor]
    core = forest_poly(adjacency)
    deletion = forest_poly(adjacency, root)
    inputs = (*core[3:9], deletion[6], deletion[7])
    return {
        str(rank): evaluator(rank, len(adjacency))[0](inputs)
        for rank in (0, 1)
    }


def main() -> None:
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    center = load(
        "rank8_delta01_e3_quartic_star_center_all_long_compressed_agent_20260822.json"
    )
    arm = load(
        "rank8_delta01_e3_quartic_star_arm_all_long_compressed_agent_20260822.json"
    )
    direct_center = load(
        "rank8_delta01_e3_quartic_star_center_all_long_agent_20260822.json"
    )
    for report, cell, terms in ((center, "center", 406), (arm, "arm", 4060)):
        assert report["status"] == "PASS_EXACT_POSITIVE_COMPRESSED_COEFFICIENT_CELL"
        assert report["cell"] == cell
        assert report["degree_surplus"] == 3
        for rank in ("0", "1"):
            row = report["ranks"][rank]
            assert row["terms"] == terms
            assert row["negative_coefficients"] == 0
            assert row["zero_coefficients"] == 0
            assert row["positive_coefficients"] == terms
            assert sp.Rational(row["minimum_coefficient"]) > 0
            assert int(row["constant_coefficient"]) > 0

    # Rebuild the two-path total-order identity without using the cell builder.
    A, B = sp.symbols("A B", integer=True, nonnegative=True)
    pair_rows = []
    for rank in range(9):
        direct = direct_two_paths(A + 7, B + 7, rank)
        compressed = two_long_paths(A + B + 14, 8)[rank]
        direct_reduced = direct_two_paths(A + 6, B + 6, rank)
        compressed_reduced = two_long_paths(A + B + 12, 8)[rank]
        assert sp.expand(direct - compressed) == 0
        assert sp.expand(direct_reduced - compressed_reduced) == 0
        pair_rows.append({
            "rank": rank,
            "excluded_total_order_identity": True,
            "center_selected_reduced_identity": True,
        })

    # Rebuild the four-arm grouped construction from the pair formulas.
    SL, SR = sp.symbols("SL SR", integer=True, nonnegative=True)
    grouped = four_arm_star(SL + 14, SR + 14, 8)
    assert len(grouped) == 9
    assert all(sp.Poly(value, SL, SR).total_degree() == rank for rank, value in enumerate(grouped))

    # The uncompressed four-variable center expansion is an independent exact
    # cross-check of the compressed cell's sign/minimum/constant statistics.
    assert direct_center["status"] == "PASS_EXACT_POSITIVE_COEFFICIENT_CELL"
    for rank in ("0", "1"):
        assert direct_center["ranks"][rank]["negative_coefficients"] == 0
        assert direct_center["ranks"][rank]["zero_coefficients"] == 0
        assert direct_center["ranks"][rank]["minimum_coefficient"] == center["ranks"][rank]["minimum_coefficient"]
        assert direct_center["ranks"][rank]["constant_coefficient"] == center["ranks"][rank]["constant_coefficient"]

    # Literal graph-DP constants validate both root coordinate conventions.
    center_literal = literal_values((7, 7, 7, 7), ("center",))
    arm_literal = literal_values((15, 7, 7, 7), ("arm", 0, 8))
    for rank in ("0", "1"):
        assert center_literal[rank] == int(center["ranks"][rank]["constant_coefficient"])
        assert arm_literal[rank] == int(arm["ranks"][rank]["constant_coefficient"])

    center_graph, _ = build_star((7, 7, 7, 7))
    surplus = sum(comb(len(neighbors) - 1, 2) for neighbors in center_graph)
    assert surplus == 3
    # At e=3 the degree contributions can only be one degree-four vertex or
    # three degree-three vertices.  This theorem closes the former skeleton.
    assert comb(4 - 1, 2) == 3 and 3 * comb(3 - 1, 2) == 3

    payload = {
        "schema": "rank8-delta01-e3-quartic-star-all-long-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_ALL_LONG_AUDIT",
        "theorem_scope": {
            "degree_surplus": 3,
            "skeleton": "one degree-four center with four subdivided arms",
            "center_root": "all four arms have length at least seven",
            "arm_root": (
                "the root has at least seven vertices strictly toward the "
                "center and at least seven toward its leaf; the other three "
                "arms each have length at least seven"
            ),
            "conclusion": "Delta0>0 and Delta1>0",
        },
        "compression_replay": {
            "pair_ranks_checked": pair_rows,
            "center_compressed_variables": ["SL", "SR"],
            "arm_compressed_variables": ["X=N+B", "T", "SR=C+D"],
            "direct_center_coefficients_per_rank": 31465,
            "compressed_center_coefficients_per_rank": 406,
            "compressed_arm_coefficients_per_rank": 4060,
        },
        "literal_tree_dp_replay": {
            "center_order_29": center_literal,
            "arm_order_37": arm_literal,
            "degree_surplus": surplus,
        },
        "remaining_exact_e3_scope": [
            "all short-boundary quartic-star root cells",
            "the distinct e=3 skeleton with three degree-three vertices",
        ],
        "higher_surplus_remaining": "all e>=4 rooted cores",
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This is not a complete e=3, connected-Q8, forest-Q8, PGC, or Problem-993 theorem.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
