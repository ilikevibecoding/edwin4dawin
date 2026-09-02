#!/usr/bin/env python3
"""Fail-closed assembly of unique disconnected-M5 sum15 for active roots.

Remove the isolated selected components from P=T-u and write

    I(P;x)=(1+x)^t I(X;x).

If k is the number of remaining selected vertices, e=|H|, and q is the
sum of their degrees, then X has N=e+k vertices and e edges while H has e
vertices and e-q edges, with 1<=k<=q<=e.  Twice unique sum15 has the
exact Newton expansion

    2 sum15 = sum_{j=0}^5 R_j binom(t,j).

This assembler pins and checks three exhaustive pieces: |H|<=7 by literal
rooted-component convolution; e>=8 and q<e by exact forest-ratio cones;
and q=e by the exact star-boundary theorem.  It also derives the two
elementary terminal Newton rows directly.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum15_q2_coarse_root import generic_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum15_all_active_roots_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_ALL_ACTIVE_ROOTS_ROOT"

DEPENDENCIES = {
    "probe_iso_n5_disconnected_m5_sum15_q2_coarse_root.py":
        "702A53AB121AA2FC4609A5B2B030C6B30BA4F7E5BE2F9FA936B8712D612821D2",
    "prove_iso_n5_disconnected_m5_sum15_small_h_root.py":
        "7FBCEEF13FB0AB00B7C45DDB3F6D93D15EA1DECA2511D99D2D522CA5D23AF909",
    "probe_iso_n5_disconnected_m5_sum15_general_q_ratio_root.py":
        "668CB433FB853756678528B1A92FE6166261392C540E42FF949D0E42CF941F29",
    "prove_iso_n5_disconnected_m5_qeq_star_boundary_g1_nonadjacent.py":
        "DB2CDBFAF42E56DC7F7902145CC38603B54567404E73DE02068E7AC12695C6C8",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
}

REPORTS = {
    "small": (
        "iso_n5_disconnected_m5_sum15_small_h_exact_root_20260830.json",
        "6FBF021EACF808B4FFBAB7CB1ADCD934EBF7468F441A0A52F51630756EC2342C",
        "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_SMALL_H_ROOT",
    ),
    "interior": (
        "iso_n5_disconnected_m5_sum15_general_q_ratio_probe_root_20260830.json",
        "C1D3C6B2C7F9EFB25B03CAEA4F02A6790D669D6EAEEC8A2F4250496CFC6B9D0B",
        "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_GENERAL_Q_RATIO_ROOT",
    ),
    "boundary": (
        "iso_n5_disconnected_m5_qeq_star_boundary_exact_g1_nonadjacent_20260830.json",
        "DC94064EC7745823F9516ECB78E70BCB3E3C2867122D431835EFF6FD8E247E65",
        "PASS_EXACT_ISO_N5_DISCONNECTED_M5_QEQ_STAR_BOUNDARY_G1_NONADJACENT",
    ),
}

EXPECTED_INTERIOR = {
    "high": [(34500, "16"), (25353, "16"), (6664, "8"), (1100, "20")],
    "low": [(103500, "16"), (50706, "16"), (13328, "8"), (2200, "20")],
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name

    loaded = {}
    for key, (name, expected_hash, marker) in REPORTS.items():
        path = HERE / name
        assert sha256(path) == expected_hash, name
        loaded[key] = load(path)
        assert loaded[key]["marker"] == marker

    small = loaded["small"]
    assert small["source_sha256"] == DEPENDENCIES[
        "prove_iso_n5_disconnected_m5_sum15_small_h_root.py"
    ]
    assert small["total_distinct_coefficient_states"] == 531
    assert small["total_newton_row_checks"] == 3186
    assert small["global_minimum_R0_through_R5"] == [0, 6, 48, 117, 107, 30]
    assert sorted(map(int, small["orders"])) == list(range(1, 8))

    interior = loaded["interior"]
    assert interior["source_sha256"] == DEPENDENCIES[
        "probe_iso_n5_disconnected_m5_sum15_general_q_ratio_root.py"
    ]
    assert interior["geometry"] == {
        "H_order_edges": "e vertices and e-q edges",
        "base_edges": "e",
        "base_order": "N=e+k",
        "coupling": "h3>=C(e,3)-(e-q)(e-2), h4<=C(e,4)",
        "domain": "e>=8, 1<=k<=q<=e-1; q=e is a separate exact boundary",
        "parameterization": "q=1+v(e-2), k=1+w(q-1)",
    }
    total_terms = 0
    for sector, expected_rows in EXPECTED_INTERIOR.items():
        rows = interior[sector]
        assert len(rows) == 4
        for index, (row, expected) in enumerate(zip(rows, expected_rows)):
            assert row["row"] == index
            assert (row["homogeneous_terms"], row["minimum"]) == expected
            assert sp.Rational(row["minimum"]) > 0
            # The denominator base is N=e+k=e+1+vw(e-2), hence is
            # strictly positive throughout e>=8 and the unit cube.
            assert "e*v*w + e - 2*v*w + 1" in row["positive_denominator"]
            total_terms += row["homogeneous_terms"]
    assert total_terms == 237351

    boundary = loaded["boundary"]
    assert boundary["source_sha256"] == DEPENDENCIES[
        "prove_iso_n5_disconnected_m5_qeq_star_boundary_g1_nonadjacent.py"
    ]
    assert 15 in boundary["open_unique_expression_indices_one_based"]
    assert boundary["geometry"]["boundary"] == (
        "q=sum_{v in S}deg_P(v)=e(P)"
    )

    x, h, rows = generic_rows()
    assert len(rows) == 6
    expected_h_coefficients = [
        (3 * x[2], -5 * x[1]),
        (3 * x[1], sp.Integer(-5)),
        (sp.Integer(3), sp.Integer(0)),
        (sp.Integer(0), sp.Integer(0)),
    ]
    actual_h_coefficients = [
        (sp.factor(row.coeff(h[3])), sp.factor(row.coeff(h[4])))
        for row in rows[:4]
    ]
    assert all(
        sp.expand(left - right) == 0
        for actual, expected in zip(actual_h_coefficients, expected_h_coefficients)
        for left, right in zip(actual, expected)
    )
    assert all(first >= 0 and second <= 0 for first, second in (
        (3, -5), (3, -5), (3, 0), (0, 0)
    ))

    e, k = sp.symbols("e k", integer=True, nonnegative=True)
    N = e + k
    terminal_substitutions = {
        x[1]: N,
        x[2]: choose(N, 2) - e,
        h[1]: e,
    }
    terminal_rows = [sp.factor(row.subs(terminal_substitutions)) for row in rows[4:]]
    assert sp.expand(terminal_rows[0] - (30 * N + 5 * e + 42)) == 0
    assert terminal_rows[1] == 30

    report = {
        "marker": MARKER,
        "theorem": (
            "For every active rooted-tree pair P=T-u, H=T-N[u], unique "
            "disconnected-M5 Psi interval sum15 is nonnegative at every order."
        ),
        "active_core_geometry": {
            "isolate_extraction": (
                "Remove t isolated selected P-components; "
                "I(P)=(1+x)^t I(X)."
            ),
            "parameters": (
                "k=number of nonisolated selected components, e=|H|, "
                "q=sum of selected degrees, N=|X|=e+k"
            ),
            "identities": ["e(X)=e", "e(H)=e-q", "1<=k<=q<=e"],
            "component_exhaustion": (
                "Each X-component is an arbitrary rooted tree C with its "
                "selected root; it contributes I(C) to X and I(C-root) to H."
            ),
        },
        "newton_expansion": {
            "identity": "2*sum15=sum_{j=0}^5 R_j*binom(t,j)",
            "R0_through_R5": [str(sp.factor(row)) for row in rows],
            "terminal_rows_after_geometry": [str(value) for value in terminal_rows],
            "terminal_sign_argument": (
                "R4=30N+5e+42>0 and R5=30>0."
            ),
        },
        "exact_cover": {
            "q_equals_e": {
                "range": "e>=0, including the empty active core",
                "certificate": REPORTS["boundary"][0],
                "argument": (
                    "Every edge is incident to the selected vertex of its "
                    "component, so X is a product of rooted stars."
                ),
            },
            "small_interior": {
                "range": "1<=e<=7, 1<=k<=q<e",
                "certificate": REPORTS["small"][0],
                "distinct_coefficient_states": 531,
                "newton_row_checks": 3186,
                "minimum_R0_through_R5": small["global_minimum_R0_through_R5"],
            },
            "large_interior": {
                "range": "e>=8, 1<=k<=q<=e-1",
                "certificate": REPORTS["interior"][0],
                "deletion_bounds": {
                    "h3_lower": "C(e,3)-(e-q)(e-2)",
                    "h4_upper": "C(e,4)",
                    "signs": (
                        "In R0..R3 the h3 coefficient is nonnegative and "
                        "the h4 coefficient is nonpositive."
                    ),
                },
                "forest_ratio_cover": {
                    "definition": "rho_j=2(j+1)x_(j+1)/x_j",
                    "high": "delta1,delta2,delta3>=1; rho4>=0",
                    "low": (
                        "delta1=alpha in [0,1], delta2>=2-alpha, "
                        "delta3>=1; rho4>=0"
                    ),
                    "why_applicable": (
                        "N=e+k>=9, so every forest X has an independent "
                        "5-set and all displayed ratios are defined."
                    ),
                },
                "homogeneous_coefficients": total_terms,
                "negative_coefficients": 0,
                "minimum_coefficients": {
                    sector: [row["minimum"] for row in interior[sector]]
                    for sector in ("high", "low")
                },
                "positive_denominator_base": (
                    "N=e+1+vw(e-2)>0 for e>=8 and 0<=v,w<=1"
                ),
            },
        },
        "coverage": (
            "The three ranges q=e; q<e with e<=7; and q<e with e>=8 are "
            "disjoint and exhaustive.  Every exact Newton row is nonnegative, "
            "and every binom(t,j) is nonnegative, hence sum15>=0."
        ),
        "pinned_dependencies": DEPENDENCIES,
        "pinned_reports": {
            key: {"file": row[0], "sha256": row[1]}
            for key, row in REPORTS.items()
        },
        "scope": (
            "Exact active-root theorem for unique sum15 only.  It does not by "
            "itself transport arbitrary common unmarked components, prove all "
            "disconnected M5, connected-nonadjacent M5, g1, N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(raw, encoding="utf-8", newline="\n")
    os.replace(temporary, OUTPUT)
    print(json.dumps({
        "marker": MARKER,
        "small_newton_row_checks": 3186,
        "large_homogeneous_coefficients": total_terms,
        "large_negative_coefficients": 0,
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
