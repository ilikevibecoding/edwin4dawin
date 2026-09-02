#!/usr/bin/env python3
"""All-parent G1 cutoff when a common0/sum0 forest has e<=m/10 edges.

This refines the universal star-cluster cutoff by retaining the edge-density
factor in every row error, P4 charge, degree moment, and leading high-degree
bound.  The result is a synchronized cutoff for all five parent entries.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_all_parent_edge_density_tenth_cutoff_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_ALL_PARENT_EDGE_DENSITY_TENTH_CUTOFF_RANK7_G4_PIECEWISE"
EDGE_CAP = sp.Rational(1, 10)
FILES = {
    "no_parent_source": "prove_iso_n7_bundle_g1_sum0_no_parent_finite_order_cutoff_rank7_g4_piecewise.py",
    "no_parent_report": "iso_n7_bundle_g1_sum0_no_parent_finite_order_cutoff_exact_rank7_g4_piecewise_20260831.json",
    "endpoint_source": "prove_iso_n7_bundle_g1_sum0_endpoint_finite_order_cutoff_rank7_g4_piecewise.py",
    "endpoint_report": "iso_n7_bundle_g1_sum0_endpoint_finite_order_cutoff_exact_rank7_g4_piecewise_20260831.json",
    "ordinary_source": "prove_iso_n7_bundle_g1_sum0_ordinary_finite_order_cutoff_rank7_g4_piecewise.py",
    "ordinary_report": "iso_n7_bundle_g1_sum0_ordinary_finite_order_cutoff_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "no_parent_source": "DB751F95D1CC016869C219355446C057A107EA070CCA1BCAC431F019FDFC2C4E",
    "no_parent_report": "01175F2ED7439C79E08F06D3A7457131E8755EE132DB1303AF2AA729CCCEF05F",
    "endpoint_source": "070F5E6CEC61E16BA55D9AC9ACE98AD74CAC1B095EC2685AE4DCE3617BCE1B51",
    "endpoint_report": "D111AEACC17847A35A5BA1EAD74A3A84E2404691A3FD21FBBAE5DBE71B0EB605",
    "ordinary_source": "887E66D38BBC12773BA06427C9A54E096AC9A3A11A7EE742D288D0F2651F571D",
    "ordinary_report": "57847F795F12C9052FD4868F93AB56274176CF088B4F31A73B4DDB14A285A1E6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(value-offset for offset in range(rank))/sp.factorial(rank)


def abs_coefficient_sum(expression, variable):
    return sum(
        abs(coefficient)
        for _, coefficient in sp.Poly(sp.expand(expression), variable).terms()
    )


def quadratic_terms(expression, rows):
    variables = tuple(rows[k] for k in range(3, 9))
    result = []
    for powers, coefficient in sp.Poly(expression, *variables).terms():
        indices = []
        for offset, power in enumerate(powers):
            indices.extend([offset+3]*power)
        assert len(indices) == 2
        result.append((indices[0], indices[1], coefficient))
    return result


def mode_budget(terms, row_error, b_bound, row_size_bound):
    lower_order = sp.Integer(0)
    perturbation = sp.Integer(0)
    for i, j, coefficient in terms:
        total = i+j
        if total <= 9:
            lower_order += abs(coefficient)*row_size_bound[i]*row_size_bound[j]
        elif total == 10:
            lower_order += abs(coefficient)*(
                b_bound[j]/sp.factorial(i)+b_bound[i]/sp.factorial(j)
                +b_bound[i]*b_bound[j]
            )
        elif total == 11:
            lower_order += abs(coefficient)*b_bound[i]*b_bound[j]
        else:
            raise AssertionError(total)
        perturbation += abs(coefficient)*(
            row_error[i]*row_size_bound[j]+row_size_bound[i]*row_error[j]
            +row_error[i]*row_error[j]
        )
    return sp.factor(lower_order), sp.factor(perturbation)


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    no_parent = json.loads(
        (HERE/FILES["no_parent_report"]).read_text(encoding="utf-8")
    )
    endpoint = json.loads(
        (HERE/FILES["endpoint_report"]).read_text(encoding="utf-8")
    )
    ordinary = json.loads(
        (HERE/FILES["ordinary_report"]).read_text(encoding="utf-8")
    )
    assert no_parent["coverage_gap_within_cutoff_scope"] is None
    assert endpoint["coverage_gap_within_cutoff_scope"] is None
    assert ordinary["coverage_gap_within_cutoff_scope"] is None

    m = sp.Symbol("m", positive=True)
    rows = {k: sp.Symbol(f"W{k}") for k in range(3, 9)}
    locals_w = {str(value): value for value in rows.values()}
    q_no_parent = sp.expand(sp.sympify(
        no_parent["literal_reduced_expression"], locals=locals_w
    ))
    q_endpoint = sp.expand(sp.sympify(
        endpoint["literal_reduced_expression"], locals=locals_w
    ))
    assert endpoint["endpoint_symmetry_checked"] is True

    row_error = {}
    b_bound = {}
    row_size_bound = {}
    row_error_parts = {}
    for k in range(3, 9):
        binomial_remainder = sp.expand(
            choose_poly(m, k)-(
                m**k/sp.factorial(k)
                -sp.Rational(k-1, 2*sp.factorial(k-1))*m**(k-1)
            )
        )
        binomial_constant = abs_coefficient_sum(binomial_remainder, m)
        edge_remainder = sp.expand(
            choose_poly(m-2, k-2)-m**(k-2)/sp.factorial(k-2)
        )
        edge_constant = EDGE_CAP*abs_coefficient_sum(edge_remainder, m)
        star_constant = sum(
            EDGE_CAP**q
            *abs_coefficient_sum(sp.expand(
                choose_poly(m-q-1, k-q-1)
                -m**(k-q-1)/sp.factorial(k-q-1)
            ), m)/sp.factorial(q)
            for q in range(2, k)
        )
        # A P4 injects into its pair of end edges, so P4<=C(e,2).
        connected_nonstar = sum(
            EDGE_CAP**(q-1)*sp.Rational(
                1, 2*sp.factorial(q-3)*sp.factorial(k-q-1)
            )
            for q in range(3, k)
        )
        disconnected = sum(
            EDGE_CAP**q*sp.Rational(
                1, sp.factorial(q)*sp.factorial(k-q-2)
            )
            for q in range(2, k-1)
        )
        row_error_parts[k] = {
            "binomial": binomial_constant,
            "single_edge": edge_constant,
            "star": star_constant,
            "connected_nonstar": connected_nonstar,
            "disconnected": disconnected,
        }
        row_error[k] = sp.factor(sum(row_error_parts[k].values()))
        b_bound[k] = sp.factor(
            sp.Rational(k-1, 2*sp.factorial(k-1))
            +EDGE_CAP/sp.factorial(k-2)
            +sum(
                EDGE_CAP**q*sp.Rational(
                    1, sp.factorial(q)*sp.factorial(k-q-1)
                )
                for q in range(2, k)
            )
        )
        row_size_bound[k] = sp.factor(
            sp.Rational(1, sp.factorial(k))+b_bound[k]
        )
    assert row_error == {
        3: sp.Rational(8, 15),
        4: sp.Rational(77, 60),
        5: sp.Rational(3901, 2000),
        6: sp.Rational(116141, 45000),
        7: sp.Rational(68827811, 21000000),
        8: sp.Rational(20621352331, 5040000000),
    }
    assert b_bound == {
        3: sp.Rational(121, 200),
        4: sp.Rational(1831, 6000),
        5: sp.Rational(24641, 240000),
        6: sp.Rational(311051, 12000000),
        7: sp.Rational(1257187, 240000000),
        8: sp.Rational(4943019, 5600000000),
    }

    no_low, no_perturb = mode_budget(
        quadratic_terms(q_no_parent, rows), row_error, b_bound, row_size_bound
    )
    end_low, end_perturb = mode_budget(
        quadratic_terms(q_endpoint, rows), row_error, b_bound, row_size_bound
    )
    assert no_low == sp.Rational(70937663268881, 2160000000000)
    assert no_perturb == sp.Rational(15735383304421, 9450000000)
    assert end_low == sp.Rational(15889470872827, 720000000000)
    assert end_perturb == sp.Rational(2196482588471, 1575000000)

    base = sp.Rational(209, 302400)
    kappa = sp.Rational(29, 60480)
    star_correction = sp.Rational(26951, 3024)
    leading_margin = sp.factor(base-kappa*EDGE_CAP)
    assert leading_margin == sp.Rational(389, 604800)
    # With e<=m/10, at most three vertices have d_v/m>1/20.
    # Their degree sum is at most e+e(A)<=m/10+2.
    shared_leading_error = sp.factor(
        2*kappa+EDGE_CAP*star_correction
    )
    assert shared_leading_error == sp.Rational(1349, 1512)
    ordinary_correction = sp.Rational(1952, 945)
    assert ordinary["error_budget"]["ordinary_correction_m9_coefficient"] == str(
        ordinary_correction
    )

    totals = {
        "no_parent": sp.factor(shared_leading_error+no_low+no_perturb),
        "endpoint_u": sp.factor(shared_leading_error+end_low+end_perturb),
        "endpoint_v": sp.factor(shared_leading_error+end_low+end_perturb),
        "ordinary_parent_is_isolate": sp.factor(
            shared_leading_error+no_low+no_perturb+ordinary_correction
        ),
        "ordinary_parent_in_nonisolated_core": sp.factor(
            shared_leading_error+no_low+no_perturb+ordinary_correction
        ),
    }
    assert totals == {
        "no_parent": sp.Rational(25686666929955767, 15120000000000),
        "endpoint_u": sp.Rational(21433401737650967, 15120000000000),
        "endpoint_v": sp.Rational(21433401737650967, 15120000000000),
        "ordinary_parent_is_isolate": sp.Rational(
            25717898929955767, 15120000000000
        ),
        "ordinary_parent_in_nonisolated_core": sp.Rational(
            25717898929955767, 15120000000000
        ),
    }
    cutoffs = {
        mode: int(sp.ceiling(total/leading_margin))
        for mode, total in totals.items()
    }
    assert cutoffs == {
        "no_parent": 2641303,
        "endpoint_u": 2203949,
        "endpoint_v": 2203949,
        "ordinary_parent_is_isolate": 2644515,
        "ordinary_parent_in_nonisolated_core": 2644515,
    }
    shared_cutoff = max(cutoffs.values())
    assert shared_cutoff == 2644515
    shared_slack = sp.factor(
        shared_cutoff*leading_margin
        -totals["ordinary_parent_is_isolate"]
    )
    assert shared_slack == sp.Rational(9445044233, 15120000000000)

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let W be a forest of order m with at most m/10 edges. For "
            "m>=2644515, the rank-seven G1 common0/sum0 bundle is nonnegative "
            "for every canonical parent mode."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "edge_condition": "e(W)<=|W|/10",
        "shared_unmarked_order_cutoff": shared_cutoff,
        "shared_total_order_cutoff": shared_cutoff+2,
        "mode_cutoffs": cutoffs,
        "mode_error_constants": {key: str(value) for key, value in totals.items()},
        "leading_certificate": {
            "margin": str(leading_margin),
            "high_degree_threshold": "d_v/m>1/20",
            "high_degree_vertex_count_at_most": 3,
            "high_degree_sum_bound": "sum_A d_v<=m/10+2",
            "shared_m9_error": str(shared_leading_error),
        },
        "edge_scaled_cluster_certificate": {
            "row_error_constants": {
                str(k): str(value) for k, value in row_error.items()
            },
            "retained_row_bounds": {
                str(k): str(value) for k, value in b_bound.items()
            },
            "P4_bound": "number of P4 subtrees<=C(e,2)",
            "ordinary_correction": str(ordinary_correction),
        },
        "parent_modes": list(totals),
        "shared_cutoff_slack": str(shared_slack),
        "coverage_gap_within_edge_cap_cutoff_scope": None,
        "finite_residual": (
            "Cells with e(W)<=|W|/10 and |W|<2644515, outside separately "
            "pinned dense-isolate/finite regions."
        ),
        "scope": (
            "Rank-seven G1 only, common0/sum0 only, under e(W)<=|W|/10. "
            "The explicit finite residual and denser edge regimes remain separate."
        ),
        "dependencies_sha256": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "edge_cap": str(EDGE_CAP),
        "shared_unmarked_order_cutoff": shared_cutoff,
        "parent_modes": len(totals),
        "leading_margin": str(leading_margin),
        "shared_cutoff_slack": str(shared_slack),
        "coverage_gap_within_edge_cap_cutoff_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
