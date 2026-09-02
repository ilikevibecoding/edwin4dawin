#!/usr/bin/env python3
"""Core-fraction/edge-density piecewise cutoffs for common0/sum0 G1.

The >=90%-isolate theorem supplies the core-fraction face.  On its complement,
the star-cluster error calculation is retained at edge caps j/10, j=1,...,9;
the universal tail supplies cap one.  All five parent entries share one cutoff
inside each edge-density bin.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_n7_bundle_g1_sum0_all_parent_edge_density_tenth_cutoff_rank7_g4_piecewise import (
    abs_coefficient_sum,
    choose_poly,
    mode_budget,
    quadratic_terms,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_core_edge_piecewise_cutoffs_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CORE_EDGE_PIECEWISE_CUTOFFS_RANK7_G4_PIECEWISE"
FILES = {
    "dense_source": "assemble_iso_n7_bundle_g1_sum0_dense_isolates_all_parent_rank7_g4_piecewise.py",
    "dense_report": "iso_n7_bundle_g1_sum0_dense_isolates_all_parent_assembled_exact_rank7_g4_piecewise_20260831.json",
    "tenth_source": "prove_iso_n7_bundle_g1_sum0_all_parent_edge_density_tenth_cutoff_rank7_g4_piecewise.py",
    "tenth_report": "iso_n7_bundle_g1_sum0_all_parent_edge_density_tenth_cutoff_exact_rank7_g4_piecewise_20260831.json",
    "base_no_parent_report": "iso_n7_bundle_g1_sum0_no_parent_finite_order_cutoff_exact_rank7_g4_piecewise_20260831.json",
    "base_endpoint_report": "iso_n7_bundle_g1_sum0_endpoint_finite_order_cutoff_exact_rank7_g4_piecewise_20260831.json",
    "universal_tail_source": "assemble_iso_n7_bundle_g1_sum0_all_parent_finite_order_cutoff_rank7_g4_piecewise.py",
    "universal_tail_report": "iso_n7_bundle_g1_sum0_all_parent_finite_order_cutoff_assembled_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "dense_source": "25B9D84D9ACCB4EF636E6591D249B1FBC6FEF87710C5C997285CCE1DB09124E6",
    "dense_report": "C907900091602DF033DE0CCC3FE35E19897CBCF3087F2275F3655E5E8EB28728",
    "tenth_source": "3EFB0F58A4FE7C799C5202EFCE65EF36BEAB58B32C6E4F668D94952FFDEE0FC7",
    "tenth_report": "C87D4DFC804455448EF8F09B25C9BC9DE5B91C81AC6E0C744A5D58811CB07C37",
    "base_no_parent_report": "01175F2ED7439C79E08F06D3A7457131E8755EE132DB1303AF2AA729CCCEF05F",
    "base_endpoint_report": "D111AEACC17847A35A5BA1EAD74A3A84E2404691A3FD21FBBAE5DBE71B0EB605",
    "universal_tail_source": "0205B7C355028551885013A64E7FB3230BAA2F59460E83F00FF6B57D24221195",
    "universal_tail_report": "795B27F76D39A9CFBC4C8160C2EEB705A138F6DBCD72640C68014EDA96A3349A",
}
EXPECTED_SYNCHRONIZED_CUTOFFS = {
    "1/10": 2644515,
    "1/5": 6281639,
    "3/10": 12511671,
    "2/5": 22617820,
    "1/2": 38524335,
    "3/5": 63189344,
    "7/10": 101316647,
    "4/5": 160734587,
    "9/10": 255304630,
    "1": 411785737,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    dense = json.loads((HERE/FILES["dense_report"]).read_text(encoding="utf-8"))
    tenth = json.loads((HERE/FILES["tenth_report"]).read_text(encoding="utf-8"))
    universal = json.loads(
        (HERE/FILES["universal_tail_report"]).read_text(encoding="utf-8")
    )
    assert dense["coverage_gap_within_common0_sum0_dense_isolate_G1"] is None
    assert tenth["coverage_gap_within_edge_cap_cutoff_scope"] is None
    assert universal["coverage_gap_within_shared_cutoff_scope"] is None

    m = sp.Symbol("m", positive=True)
    rows = {k: sp.Symbol(f"W{k}") for k in range(3, 9)}
    locals_w = {str(value): value for value in rows.values()}
    # The tenth producer pins and audits the literal no-parent/endpoint forms.
    no_parent_report = json.loads(
        (HERE/FILES["base_no_parent_report"]).read_text(encoding="utf-8")
    )
    endpoint_report = json.loads(
        (HERE/FILES["base_endpoint_report"]).read_text(encoding="utf-8")
    )
    q_no_parent = sp.expand(sp.sympify(
        no_parent_report["literal_reduced_expression"], locals=locals_w
    ))
    q_endpoint = sp.expand(sp.sympify(
        endpoint_report["literal_reduced_expression"], locals=locals_w
    ))
    no_terms = quadratic_terms(q_no_parent, rows)
    endpoint_terms = quadratic_terms(q_endpoint, rows)

    # Cap-independent falling-polynomial constants.
    base_parts = {}
    for k in range(3, 9):
        binomial_constant = abs_coefficient_sum(sp.expand(
            choose_poly(m, k)-(
                m**k/sp.factorial(k)
                -sp.Rational(k-1, 2*sp.factorial(k-1))*m**(k-1)
            )
        ), m)
        edge_constant = abs_coefficient_sum(sp.expand(
            choose_poly(m-2, k-2)-m**(k-2)/sp.factorial(k-2)
        ), m)
        star_constants = {
            q: abs_coefficient_sum(sp.expand(
                choose_poly(m-q-1, k-q-1)
                -m**(k-q-1)/sp.factorial(k-q-1)
            ), m)/sp.factorial(q)
            for q in range(2, k)
        }
        base_parts[k] = {
            "binomial": binomial_constant,
            "edge": edge_constant,
            "star": star_constants,
        }

    base = sp.Rational(209, 302400)
    kappa = sp.Rational(29, 60480)
    star_correction = sp.Rational(26951, 3024)
    ordinary_correction = sp.Rational(1952, 945)
    table = []
    for numerator in range(1, 10):
        cap = sp.Rational(numerator, 10)
        row_error = {}
        b_bound = {}
        row_size_bound = {}
        for k in range(3, 9):
            row_error[k] = sp.factor(
                base_parts[k]["binomial"]
                +cap*base_parts[k]["edge"]
                +sum(
                    cap**q*value
                    for q, value in base_parts[k]["star"].items()
                )
                +sum(
                    cap**(q-1)*sp.Rational(
                        1, 2*sp.factorial(q-3)*sp.factorial(k-q-1)
                    )
                    for q in range(3, k)
                )
                +sum(
                    cap**q*sp.Rational(
                        1, sp.factorial(q)*sp.factorial(k-q-2)
                    )
                    for q in range(2, k-1)
                )
            )
            b_bound[k] = sp.factor(
                sp.Rational(k-1, 2*sp.factorial(k-1))
                +cap/sp.factorial(k-2)
                +sum(
                    cap**q*sp.Rational(
                        1, sp.factorial(q)*sp.factorial(k-q-1)
                    )
                    for q in range(2, k)
                )
            )
            row_size_bound[k] = sp.factor(
                sp.Rational(1, sp.factorial(k))+b_bound[k]
            )
        no_low, no_perturb = mode_budget(
            no_terms, row_error, b_bound, row_size_bound
        )
        end_low, end_perturb = mode_budget(
            endpoint_terms, row_error, b_bound, row_size_bound
        )
        # If d_v/m>1/20 and e<=cap*m, strictly fewer than 40*cap
        # vertices are high.  For decimal caps this gives 4*numerator-1.
        high_count = 4*numerator-1
        shared_leading_error = sp.factor(
            (high_count-1)*kappa+cap*star_correction
        )
        leading_margin = sp.factor(base-kappa*cap)
        totals = {
            "no_parent": sp.factor(
                shared_leading_error+no_low+no_perturb
            ),
            "endpoint_u": sp.factor(
                shared_leading_error+end_low+end_perturb
            ),
            "endpoint_v": sp.factor(
                shared_leading_error+end_low+end_perturb
            ),
            "ordinary_parent_is_isolate": sp.factor(
                shared_leading_error+no_low+no_perturb+ordinary_correction
            ),
            "ordinary_parent_in_nonisolated_core": sp.factor(
                shared_leading_error+no_low+no_perturb+ordinary_correction
            ),
        }
        mode_cutoffs = {
            mode: int(sp.ceiling(total/leading_margin))
            for mode, total in totals.items()
        }
        synchronized = max(mode_cutoffs.values())
        synchronized_slack = sp.factor(
            synchronized*leading_margin
            -totals["ordinary_parent_is_isolate"]
        )
        assert synchronized_slack > 0
        table.append({
            "edge_density_cap": str(cap),
            "high_degree_vertex_count_at_most": high_count,
            "leading_margin": str(leading_margin),
            "mode_cutoffs": mode_cutoffs,
            "synchronized_cutoff": synchronized,
            "synchronized_slack": str(synchronized_slack),
        })
    assert {
        row["edge_density_cap"]: row["synchronized_cutoff"] for row in table
    } == {key: value for key, value in EXPECTED_SYNCHRONIZED_CUTOFFS.items() if key != "1"}
    assert table[0]["synchronized_cutoff"] == tenth[
        "shared_unmarked_order_cutoff"
    ]
    universal_cutoff = universal["shared_unmarked_order_cutoff"]
    assert universal_cutoff == EXPECTED_SYNCHRONIZED_CUTOFFS["1"]
    table.append({
        "edge_density_cap": "1",
        "high_degree_vertex_count_at_most": 39,
        "leading_margin": "1/4725",
        "mode_cutoffs": universal["component_cutoffs"],
        "synchronized_cutoff": universal_cutoff,
        "synchronized_slack": "imported mode-specific exact slack",
    })
    assert all(
        left["synchronized_cutoff"] < right["synchronized_cutoff"]
        for left, right in zip(table, table[1:])
    )

    residual_bins = []
    previous = sp.Integer(0)
    for row in table:
        cap = sp.Rational(row["edge_density_cap"])
        residual_bins.append({
            "edge_density": f"{previous}<e(W)/|W|<={cap}",
            "remaining_orders": f"|W|<{row['synchronized_cutoff']}",
        })
        previous = cap
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For rank-seven G1 in common0/sum0, all five canonical parent "
            "entries are nonnegative if either at least 90 percent of W is "
            "isolated, or if the edge density e(W)/|W| lies below one of the "
            "listed caps and |W| meets that cap's synchronized cutoff."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "core_fraction_face": {
            "condition": "nonisolated_vertices(W)<=|W|/10",
            "orders": "all",
            "dependency": "dense_report",
        },
        "edge_density_cutoff_table": table,
        "parent_modes": [
            "no_parent", "endpoint_u", "endpoint_v",
            "ordinary_parent_is_isolate",
            "ordinary_parent_in_nonisolated_core",
        ],
        "overlap_fact": (
            "Outside the core-fraction face, a forest has h>|W|/10 "
            "nonisolated vertices and hence e>=h/2>|W|/20."
        ),
        "exact_remaining_bins_outside_core_face": residual_bins,
        "coverage_gap_within_each_listed_closed_region": None,
        "scope": (
            "Rank-seven G1 only, common0/sum0 only. Each table row is a proved "
            "closed region; the explicitly listed finite bins below their "
            "cutoffs and other marked geometries remain outside scope."
        ),
        "dependencies_sha256": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "edge_bins": len(table),
        "parent_modes": len(report["parent_modes"]),
        "first_cutoff": table[0]["synchronized_cutoff"],
        "last_cutoff": table[-1]["synchronized_cutoff"],
        "coverage_gap_within_each_listed_closed_region": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
