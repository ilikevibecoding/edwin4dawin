#!/usr/bin/env python3
"""Universal exactly-two-edge >=6-attachment adjacent/no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_one_edge_all_distributions_rank7_g5_finish import bernstein_tail_certificate


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
ONE_EDGE_SOURCE = HERE / "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_one_edge_all_distributions_rank7_g5_finish.py"
ONE_EDGE_SOURCE_SHA = "1DF08223EBECCBA9E5056BD52604D1342763E313D111CEF63568D4B285D6149E"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_two_edges_all_distributions_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_TWO_EDGES_ALL_DISTRIBUTIONS_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def matching_row(vertices, edges, rank):
    return sp.expand(sum(
        choose_poly(edges, chosen_edges) * 2**chosen_edges
        * choose_poly(vertices - 2 * edges, rank - chosen_edges)
        for chosen_edges in range(0, min(edges, rank) + 1)
    ))


def path3_row(vertices, rank):
    return sp.expand(
        choose_poly(vertices - 3, rank)
        + 3 * choose_poly(vertices - 3, rank - 1)
        + choose_poly(vertices - 3, rank - 2)
    )


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA
    assert sha256(ONE_EDGE_SOURCE) == ONE_EDGE_SOURCE_SHA
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    m, a, b = sp.symbols("m a b", nonnegative=True)
    W = {k: sp.Symbol(f"W{k}") for k in range(2, 9)}
    P = {k: sp.Symbol(f"P{k}") for k in range(2, 8)}
    Q = {k: sp.Symbol(f"Q{k}") for k in range(2, 8)}
    identity = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m, "a": a, "b": b,
        **{f"W{k}": W[k] for k in W},
        **{f"P{k}": P[k] for k in P},
        **{f"Q{k}": Q[k] for k in Q},
    }))
    root_tail, unrelated_isolates, split = sp.symbols("root_tail unrelated_isolates split", nonnegative=True)
    roots = root_tail + 6
    cases = []

    # Two disjoint K2 components.  x and y count edge components rooted on X,Y.
    for x_rooted in range(3):
        for y_rooted in range(3 - x_rooted):
            b_value = y_rooted + (roots / 2 - y_rooted) * split
            a_value = roots - b_value
            m_value = roots + unrelated_isolates + 4 - x_rooted - y_rooted
            w_rows = {k: matching_row(m, 2, k) for k in W}
            p_rows = {k: w_rows[k] - matching_row(m - b, 2 - y_rooted, k) for k in P}
            q_rows = {k: w_rows[k] - matching_row(m - a, 2 - x_rooted, k) for k in Q}
            cases.append({
                "label": f"matching_x{x_rooted}_y{y_rooted}",
                "core": "2K2",
                "m": m_value,
                "a": a_value,
                "b": b_value,
                "w": w_rows,
                "p": p_rows,
                "q": q_rows,
                "placement": {"X_rooted_edges": x_rooted, "Y_rooted_edges": y_rooted, "unrooted_edges": 2 - x_rooted - y_rooted},
            })

    # Connected P3 component: unrooted, or rooted at center/leaf on either side.
    for root_side, root_position in ((None, None), ("X", "center"), ("X", "leaf"), ("Y", "center"), ("Y", "leaf")):
        lower_b = 1 if root_side == "Y" else 0
        b_value = lower_b + (roots / 2 - lower_b) * split
        a_value = roots - b_value
        m_value = roots + unrelated_isolates + (3 if root_side is None else 2)
        w_rows = {k: path3_row(m, k) for k in W}
        if root_side == "Y":
            p_rows = {
                k: w_rows[k] - (
                    choose_poly(m - b, k)
                    if root_position == "center"
                    else matching_row(m - b, 1, k)
                )
                for k in P
            }
        else:
            p_rows = {k: w_rows[k] - path3_row(m - b, k) for k in P}
        if root_side == "X":
            q_rows = {
                k: w_rows[k] - (
                    choose_poly(m - a, k)
                    if root_position == "center"
                    else matching_row(m - a, 1, k)
                )
                for k in Q
            }
        else:
            q_rows = {k: w_rows[k] - path3_row(m - a, k) for k in Q}
        cases.append({
            "label": "path3_unrooted" if root_side is None else f"path3_{root_side.lower()}_{root_position}",
            "core": "P3",
            "m": m_value,
            "a": a_value,
            "b": b_value,
            "w": w_rows,
            "p": p_rows,
            "q": q_rows,
            "placement": {"root_side": root_side, "root_position": root_position},
        })

    certificates = {}
    for case in cases:
        exact_case = sp.expand(identity.subs({
            **{W[k]: case["w"][k] for k in W},
            **{P[k]: case["p"][k] for k in P},
            **{Q[k]: case["q"][k] for k in Q},
        }, simultaneous=True))
        specialized = sp.cancel(exact_case.subs({m: case["m"], a: case["a"], b: case["b"]}))
        certificate = bernstein_tail_certificate(specialized, split, (root_tail, unrelated_isolates))
        assert certificate["negative_tail_scalar_coefficients"] == 0, (case["label"], certificate["first_negative"])
        certificates[case["label"]] = {
            "core": case["core"],
            "placement": case["placement"],
            "parameterization": {"m": str(case["m"]), "a": str(case["a"]), "b": str(case["b"])},
            **certificate,
        }

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode, if W has exactly two edges and a+b>=6 attachment roots lie in distinct components, rank-seven G3 is nonnegative for every attachment distribution, root placement, and unrelated-isolate count.",
        "exhaustive_two_edge_forest_classifier": {
            "unlabeled_nontrivial_cores": ["2K2", "P3"],
            "matching_cases": 6,
            "path3_cases": 5,
            "case_labels": [case["label"] for case in cases],
            "proof": "Every two-edge forest is 2K2 or P3 plus isolates; an attachment-root set meets each nontrivial component in at most one vertex. P3 rooted positions are center or leaf.",
        },
        "certificates": certificates,
        "coverage_gap_within_two_edge_ge6_all_distributions": None,
        "remaining_ge6_scope": "Forests with at least three edges.",
        "dependencies_sha256": {INPUT.name: INPUT_SHA, ONE_EDGE_SOURCE.name: ONE_EDGE_SOURCE_SHA},
        "scope": "Exactly two edges in W; all >=6 attachment distributions, root placements, and unrelated-isolate counts.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "cases": len(cases),
        "minimum_coefficients": {key: value["minimum_tail_scalar_coefficient"] for key, value in certificates.items()},
        "coverage_gap_within_stated_branch": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
