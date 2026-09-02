#!/usr/bin/env python3
"""Exact joint-jet/root-floor refinement of the open mask-3 small-m boxes.

This is deliberately a refinement only.  For every exact coefficient jet of
F=A-N[v] in a coarse-open branch, it keeps f5/f6 compatible and uses the
independent root set R=N(v) in D=A-v to bound d6 from below.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import networkx as nx

import prove_rank8_forest16_f5_f6_ratio_agent as forest
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_floor_exact_agent_20260823.json"
COARSE = HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_exact_agent_20260823.json"
CATALOG = HERE / "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_m0_15_agent.py":
        "111DFEEC2DCEC290A2AD876170AE083835D88E2B1E2834EC1F80DBE18467C475",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_exact_agent_20260823.json":
        "1F771FEB9338055E961045A8C557C184E92FBED45BBA02C5A6CFDC5377CC212D",
    "prove_rank8_forest6_15_component_jet_bounds_agent.py":
        "D0E0E18E2E2D3BB6BEEF080BB360FC61EA8129EE415E447DAEF5A448A80519E5",
    "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json":
        "5416988DAB946AF2A9F0A24B41096AC4D0B6D8D508780D3098AA673E7BAF61A1",
    "audit_rank8_forest6_15_component_jet_bounds_agent.py":
        "1D896071A729A8614B32518344006F588E05A0C3D50D212990BB625A8DDF4F08",
    "rank8_forest6_15_component_jet_bounds_independent_audit_agent_20260823.json":
        "0F3967E97751D44F42E854FA71D4F29B4F8E7BFDADDC95EE44D6B28E3472683E",
    "prove_rank8_forest16_f5_f6_ratio_agent.py":
        "D2D9E23E930904B3C55EF5BB2B75D5CBB5D389A39B0A0F1AE7CA1B3A61BFDB21",
    "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py":
        "817AD03F7B5DB8DDC1FF6D829F785A9255B89C8C36A0FB96A718549321FEDD8A",
    "rank8_delta0_new_leaf_mask3_selected_boundary_agent_20260823.json":
        "C955863A48FDB178D769762EE9AF8C01D7CB51087D6A0F5B0836E4BD1BFEDFC5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def linear_bernstein_controls(
    lower: Fraction, upper: Fraction, exponent: int, degree: int
) -> tuple[Fraction, ...]:
    """Degree-raised Bernstein controls of (lower+(upper-lower)t)^exponent."""
    slope = upper - lower
    answer = []
    for target in range(degree + 1):
        value = Fraction(0)
        for source in range(min(exponent, target) + 1):
            power = (
                Fraction(math.comb(exponent, source))
                * lower ** (exponent - source)
                * slope**source
            )
            value += power * Fraction(
                math.comb(target, source), math.comb(degree, source)
            )
        answer.append(value)
    return tuple(answer)


def collapsed_coefficients(base_terms, inverse_t: Fraction):
    """Substitute z=inverse_t*y and collect by powers of x and y."""
    answer: dict[tuple[int, int], Fraction] = {}
    for (np, xp, yp, zp), coefficient in base_terms:
        assert np == 0
        key = (xp, yp + zp)
        answer[key] = answer.get(key, Fraction(0)) + Fraction(
            int(coefficient)
        ) * inverse_t**zp
    return {key: value for key, value in answer.items() if value}


def rectangle_controls(
    base_terms,
    inverse_t: Fraction,
    x_lower: Fraction,
    x_upper: Fraction,
    y_lower: Fraction,
    y_upper: Fraction,
):
    """All exact degree-(4,5) Bernstein controls on the X,Y rectangle."""
    assert x_lower <= x_upper and y_lower <= y_upper
    x_controls = {
        exponent: linear_bernstein_controls(x_lower, x_upper, exponent, 4)
        for exponent in range(5)
    }
    y_controls = {
        exponent: linear_bernstein_controls(y_lower, y_upper, exponent, 5)
        for exponent in range(6)
    }
    collapsed = collapsed_coefficients(base_terms, inverse_t)
    controls = {}
    for i, j in itertools.product(range(5), range(6)):
        controls[(i, j)] = sum(
            coefficient * x_controls[xp][i] * y_controls[yp][j]
            for (xp, yp), coefficient in collapsed.items()
        )
    return controls


def component_gap(jet: tuple[int, ...], components: int, r: int) -> int:
    return sum(
        jet[j] * choose(r - min(j, components), 5 - j)
        for j in range(5)
    )


def sparse_hash(rows) -> str:
    digest = hashlib.sha256()
    for (order, components), jets in rows:
        digest.update(f"({order}, {components}):".encode())
        for jet in sorted(jets):
            digest.update(",".join(str(value) for value in jet).encode())
            digest.update(b";")
        digest.update(b"\n")
    return digest.hexdigest().upper()


def build_forest_jets():
    tree_types = {1: {(1, 1, 0, 0, 0, 0, 0)}}
    tree_counts = [0, 1]
    peak = forest.gate()
    for order in range(2, 16):
        trees = list(nx.nonisomorphic_trees(order))
        tree_counts.append(len(trees))
        tree_types[order] = {forest.tree_jet(tree) for tree in trees}
        peak = max(peak, forest.gate())
    assert tree_counts == [
        0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741
    ]

    unit = (1, 0, 0, 0, 0, 0, 0)
    forests = {(0, 0): {unit}}
    for total in range(1, 16):
        for component_order in range(1, total + 1):
            remainder = total - component_order
            sources = [
                (components, values)
                for (order, components), values in forests.items()
                if order == remainder
            ]
            for components, old_values in sources:
                target = forests.setdefault((total, components + 1), set())
                for old in old_values:
                    for component in tree_types[component_order]:
                        target.add(forest.multiply(old, component))
        peak = max(peak, forest.gate())
    return forests, peak


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    coarse = json.loads(COARSE.read_text(encoding="utf-8"))
    targets = [tuple(row[:3]) for row in coarse["open_subboxes"]]
    assert len(targets) == 80 and len(targets) == len(set(targets))
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    expected_counts = {
        (row["order"], row["components"]): row["distinct_coefficient_jets"]
        for row in catalog["component_rows"]
    }

    forests, peak = build_forest_jets()
    for key, expected in expected_counts.items():
        assert len(forests[key]) == expected, (key, len(forests[key]), expected)
    fingerprint = sparse_hash(
        ((order, components), forests[(order, components)])
        for order in range(6, 16)
        for components in range(1, order + 1)
    )
    assert fingerprint == catalog["enumeration"]["component_jet_sparse_sha256"]

    base_terms = base_polynomial().terms()
    rows = []
    residuals = []
    jet_boxes = 0
    controls_checked = 0
    empty_boxes = 0
    overall_minimum = None
    overall_witness = None
    for N, m, branch in targets:
        r = N - m
        selected = N * N - 15 * N + 10
        x_lower = Fraction(6, N - 5)
        x_upper = Fraction(6 * N, selected)
        d6_upper = choose(N - 1, 6) + choose(r - 1, 5)
        root_floor = choose(r, 6)
        assert root_floor > 0
        branch_jets = []
        for components in range(0 if m == 0 else 1, m + 1):
            jets = forests.get((m, components), set())
            for jet in jets:
                if (branch == "f6_zero") != (jet[6] == 0):
                    continue
                branch_jets.append((components, jet))
        assert branch_jets

        negative_jets = 0
        branch_minimum = None
        branch_witness = None
        for components, jet in sorted(branch_jets):
            current_gap = component_gap(jet, components, r)
            f5, f6 = jet[5], jet[6]
            if f5 == 0:
                assert f6 == 0
                y_lower = y_upper = Fraction(0)
                inverse_t = Fraction(0)
            else:
                y_lower = Fraction(f5, d6_upper)
                y_upper = min(
                    Fraction(f5, root_floor),
                    x_upper - Fraction(current_gap, d6_upper),
                )
                inverse_t = Fraction(f6, f5)
            if y_upper < y_lower:
                # The three independently proved universal inequalities have
                # empty intersection for this abstract forest jet.  Hence it
                # cannot arise from a structural D in this (N,r) cell.
                empty_boxes += 1
                jet_boxes += 1
                continue
            controls = rectangle_controls(
                base_terms, inverse_t, x_lower, x_upper, y_lower, y_upper
            )
            minimum_index, minimum_value = min(controls.items(), key=lambda item: item[1])
            negatives = [list(index) for index, value in sorted(controls.items()) if value < 0]
            witness = {
                "components": components,
                "jet_f0_to_f6": list(jet),
                "component_gap": current_gap,
                "f6_over_f5": str(inverse_t),
                "x_interval": [str(x_lower), str(x_upper)],
                "y_interval": [str(y_lower), str(y_upper)],
                "bernstein_index": list(minimum_index),
                "minimum_control": str(minimum_value),
            }
            if branch_minimum is None or minimum_value < branch_minimum:
                branch_minimum = minimum_value
                branch_witness = witness
            if overall_minimum is None or minimum_value < overall_minimum:
                overall_minimum = minimum_value
                overall_witness = {"N": N, "m": m, "r": r, "branch": branch, **witness}
            if negatives:
                negative_jets += 1
                residuals.append(
                    {
                        "N": N,
                        "m": m,
                        "r": r,
                        "branch": branch,
                        **witness,
                        "negative_indices": negatives,
                    }
                )
            jet_boxes += 1
            controls_checked += len(controls)
        rows.append(
            {
                "N": N,
                "m": m,
                "r": r,
                "branch": branch,
                "joint_jet_boxes": len(branch_jets),
                "negative_joint_jet_boxes": negative_jets,
                "status": "SEALED" if negative_jets == 0 else "OPEN_JOINT_JET_ROOT_FLOOR_METHOD",
                "minimum_control": str(branch_minimum) if branch_minimum is not None else None,
                "minimum_witness": branch_witness,
            }
        )
        peak = max(peak, forest.gate())

    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-m0-15-joint-jet-floor-v1",
        "status": (
            "PASS_EXACT_MASK3_SMALL_M_ALL_80_OPEN_BRANCHES_JOINT_JET_FLOOR_CLOSURE"
            if not residuals
            else "PASS_EXACT_PARTIAL_MASK3_SMALL_M_JOINT_JET_FLOOR_WITH_OPEN"
        ),
        "scope": (
            "Exactly the 80 coarse-open logical branches among 26<=N<=39, "
            "0<=m<=15, r=N-m, Delta0/new-leaf/selected-lower mask3."
        ),
        "method": (
            "Every exact coefficient jet of F is retained.  Its exact f6/f5 "
            "couples z to y.  The r neighbors of v are an independent set in "
            "D=A-v, giving d6>=C(r,6); edge concentration gives the pinned "
            "d6 upper bound; the exact component gap gives a second y ceiling. "
            "All rational degree-(4,5) Bernstein controls are then checked."
        ),
        "rows": rows,
        "residual_joint_jet_boxes": residuals,
        "counts": {
            "logical_branches": len(rows),
            "joint_jet_boxes": jet_boxes,
            "empty_by_joint_universal_bounds": empty_boxes,
            "bernstein_controls": controls_checked,
            "open_joint_jet_boxes": len(residuals),
            "sealed_logical_branches": sum(row["status"] == "SEALED" for row in rows),
        },
        "forest6_15_component_jet_sparse_sha256": fingerprint,
        "overall_minimum_control": str(overall_minimum),
        "overall_minimum_witness": overall_witness,
        "hashes": hashes,
        "resources": {
            "abort_private_bytes": forest.ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "proof_boundary": (
            "Only logical branches with no residual joint-jet box, and only "
            "after independent geng/deletion replay, receive credit.  Negative "
            "controls are method obstructions, not graph counterexamples.  The "
            "224-cell wing, full mask3, leaf extension, and Problem 993 remain separate."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("BRANCHES", len(rows), "JETS", jet_boxes, "CONTROLS", controls_checked)
    print("SEALED", payload["counts"]["sealed_logical_branches"], "OPEN_JETS", len(residuals))
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
