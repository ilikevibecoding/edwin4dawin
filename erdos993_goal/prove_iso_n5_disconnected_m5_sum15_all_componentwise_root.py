#!/usr/bin/env python3
"""Fail-closed all-order componentwise-deletion theorem for unique sum15."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum15_q2_coarse_root import generic_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum15_all_componentwise_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_ALL_COMPONENTWISE_ROOT"

DEPENDENCIES = {
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "probe_iso_n5_disconnected_m5_sum15_q2_coarse_root.py":
        "702A53AB121AA2FC4609A5B2B030C6B30BA4F7E5BE2F9FA936B8712D612821D2",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":
        "D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
    "probe_iso_n5_disconnected_m5_sum15_componentwise_ratio_root.py":
        "A3C804770B1434A9651BBB8900140B2409E45AB2A34AA173B1ADBA7E9C79DCFF",
    "prove_iso_n5_disconnected_m5_sum15_small_edges_componentwise_root.py":
        "6656EFC49FE68AACBB4D02739E72AFB4B83FE39658B0010F92B01D78748B90A1",
    "probe_iso_n5_disconnected_m5_sum15_q0_componentwise_ratio_root.py":
        "6BDCB51C5B10F20510C8B2423F661E1A3ED060FB7FA6C02AC7F7425422B85B76",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
}

REPORTS = {
    "small": (
        "iso_n5_disconnected_m5_sum15_small_edges_componentwise_exact_root_20260830.json",
        "E311B7ACAF3C8B5A38F26712D252C07FAF4AF172228B6AD90AF492DDD33AE2AA",
        "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_SMALL_EDGES_COMPONENTWISE_ROOT",
        "prove_iso_n5_disconnected_m5_sum15_small_edges_componentwise_root.py",
    ),
    "positive_q": (
        "iso_n5_disconnected_m5_sum15_componentwise_ratio_probe_root_20260830.json",
        "158A99B4A9B0DC3AF90330A8FC39EB4659299986FEB66D9808298715F4D610C6",
        "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_COMPONENTWISE_RATIO_ROOT",
        "probe_iso_n5_disconnected_m5_sum15_componentwise_ratio_root.py",
    ),
    "zero_q": (
        "iso_n5_disconnected_m5_sum15_q0_componentwise_ratio_probe_root_20260830.json",
        "A78ABA472E53193E032EE6B624752560633C64A37C8F17CCCCC03AF71FE29449",
        "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_Q0_COMPONENTWISE_RATIO_ROOT",
        "probe_iso_n5_disconnected_m5_sum15_q0_componentwise_ratio_root.py",
    ),
}

EXPECTED = {
    "positive_q": {
        "high": [(187500, "16"), (126117, "16"), (26068, "8"), (3000, "20")],
        "low": [(562500, "16"), (252234, "16"), (52136, "8"), (6000, "20")],
    },
    "zero_q": {
        "high": [(1866, "16"), (1557, "16"), (532, "8"), (120, "20")],
        "low": [(5598, "16"), (3114, "16"), (1064, "8"), (240, "20")],
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name

    reports = {}
    for key, (name, expected_hash, marker, source) in REPORTS.items():
        assert sha256(HERE / name) == expected_hash, name
        report = load(name)
        assert report["marker"] == marker
        assert report["source_sha256"] == DEPENDENCIES[source]
        reports[key] = report

    small = reports["small"]
    assert small["total_distinct_base_coefficient_states"] == 1326
    assert small["total_literal_row_checks"] == 63648
    assert small["global_minimum_literal_values_R0_through_R5"] == [0, 0, 1, 15, 42, 30]
    assert small["global_minimum_common_isolate_binomial_coefficients_R0_through_R5"] == [0] * 6
    assert sorted(map(int, small["orders"])) == list(range(8))

    totals = {}
    for branch in ("positive_q", "zero_q"):
        total = 0
        for sector in ("high", "low"):
            rows = reports[branch][sector]
            assert len(rows) == 4
            for index, (row, expected) in enumerate(zip(rows, EXPECTED[branch][sector])):
                assert row["row"] == index
                assert (row["homogeneous_terms"], row["minimum"]) == expected
                assert sp.Rational(row["minimum"]) > 0
                total += row["homogeneous_terms"]
        totals[branch] = total
    assert totals == {"positive_q": 1215555, "zero_q": 14091}

    x, h, rows = generic_rows()
    assert len(rows) == 6
    expected_h_coefficients = [
        (3 * x[2], -5 * x[1]),
        (3 * x[1], sp.Integer(-5)),
        (sp.Integer(3), sp.Integer(0)),
        (sp.Integer(0), sp.Integer(0)),
    ]
    actual = [
        (sp.factor(row.coeff(h[3])), sp.factor(row.coeff(h[4])))
        for row in rows[:4]
    ]
    assert all(
        sp.expand(left - right) == 0
        for pair, expected_pair in zip(actual, expected_h_coefficients)
        for left, right in zip(pair, expected_pair)
    )

    E, b, k = sp.symbols("E b k", nonnegative=True)
    N = E + b + k
    terminal = [sp.factor(row.subs({
        x[1]: N,
        x[2]: choose(N, 2) - E,
        h[1]: E + b,
    })) for row in rows[4:]]
    assert sp.expand(terminal[0] - (35 * E + 30 * k + 25 * b + 42)) == 0
    assert terminal[1] == 30

    report = {
        "marker": MARKER,
        "theorem": (
            "Let P be a forest and S an independent set containing at most one "
            "vertex from each component, with H=P-S.  Then unique disconnected-M5 "
            "Psi interval sum15 is nonnegative, including arbitrary isolated "
            "selected and unselected components."
        ),
        "geometry": {
            "selected_isolate_extraction": "I(P)=(1+x)^t I(X), while H is unchanged",
            "parameters": (
                "E=e(X), k=number of nonisolated selected components, "
                "b=number of unselected components, q=sum selected degrees"
            ),
            "identities": [
                "N=|X|=E+k+b",
                "|H|=E+b",
                "e(H)=E-q",
                "b>=0 and either q=k=0 or 1<=k<=q<=E",
            ],
        },
        "newton_expansion": {
            "identity": "2*sum15=sum_(j=0)^5 R_j*binom(t,j)",
            "R0_through_R5": [str(sp.factor(row)) for row in rows],
            "terminal_rows": [str(value) for value in terminal],
            "terminal_sign": "R4=35E+30k+25b+42>0 and R5=30>0",
        },
        "exact_partition": {
            "small_edges": {
                "range": "0<=E<=7, all q,k,b",
                "argument": (
                    "All nontrivial selected rooted and unselected common tree "
                    "components are convolved exhaustively. Arbitrary common "
                    "isolates have a nonnegative exact binomial-in-r expansion."
                ),
                "states": 1326,
                "literal_row_checks": 63648,
            },
            "large_zero_q": {
                "range": "E>=8, q=k=0",
                "geometry": "X=H is an arbitrary forest with E edges and b components",
                "homogeneous_coefficients": totals["zero_q"],
                "negative_coefficients": 0,
            },
            "large_positive_q": {
                "range": "E>=8, b>=0, 1<=k<=q<=E",
                "parameterization": "q=1+v(E-1), k=1+w(q-1)",
                "deletion_bounds": [
                    "h3>=C(E+b,3)-(E-q)(E+b-2)",
                    "h4<=C(E+b,4)",
                ],
                "bound_direction": (
                    "In R0..R3 the h3 coefficient is nonnegative and the h4 "
                    "coefficient is nonpositive."
                ),
                "homogeneous_coefficients": totals["positive_q"],
                "negative_coefficients": 0,
            },
        },
        "ratio_cover": {
            "definition": "rho_j=2(j+1)x_(j+1)/x_j",
            "high": "delta1,delta2,delta3>=1 and rho4>=0",
            "low": "0<=delta1<=1, delta2>=2-delta1, delta3>=1 and rho4>=0",
            "applicability": (
                "E>=8 implies N>=9 in every realizable branch, so a forest has "
                "an independent 5-set and the rank-four forest ratio dichotomy applies."
            ),
            "positive_denominators": (
                "For q>0 the base is N=E+b+1+vw(E-1)>0; for q=0 it is N=E+b>0."
            ),
        },
        "coverage": (
            "The cases E<=7, E>=8 with q=0, and E>=8 with q>=1 are disjoint "
            "and exhaustive. Every Newton coefficient is nonnegative, hence so "
            "is sum15 for every number t of isolated selected components."
        ),
        "pinned_dependencies": DEPENDENCIES,
        "pinned_reports": {
            key: {"file": row[0], "sha256": row[1]}
            for key, row in REPORTS.items()
        },
        "scope": (
            "Exact componentwise-deletion theorem for unique sum15 only. It does "
            "not by itself prove the other interval sums, all disconnected M5, "
            "g1, g2, N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(raw, encoding="utf-8", newline="\n")
    os.replace(temporary, OUTPUT)
    print(json.dumps({
        "marker": MARKER,
        "small_states": 1326,
        "small_literal_row_checks": 63648,
        "large_homogeneous_coefficients": sum(totals.values()),
        "large_negative_coefficients": 0,
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
