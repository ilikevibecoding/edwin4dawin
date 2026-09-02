#!/usr/bin/env python3
"""Exact all-order disconnected-mark M5 theorem.

For marks in distinct forest components, absorb every unmarked component
into either rooted pair and write each pair as X=P+xH, where H is obtained
from the forest P by deleting at most one vertex per component.  The exact
factorization is

    N = Phi_1 Psi_2 + Phi_2 Psi_1,
    Psi = L - zw Phi/2.

Every fixed-total slice of Phi is nonnegative and centrally unimodal by the
pinned disconnected C5 theorem.  Decomposing such a slice into centered
interval layers reduces 2[z^4 w^5]N=M5 to 19 left-centered interval sums of
Psi, representing 16 distinct polynomials.  This replay proves all sixteen:

* sums 1--8 by elementary forest bounds;
* sums 9--14 and 16 by a complete N<=12 componentwise-deletion census and
  exact rank-truncated high/low forest-ratio cones for N>=13;
* sum 15 by the pinned all-componentwise theorem.

No finite evidence is extrapolated.  Every large-order branch is an exact
tensor-Bernstein/simplex coefficient certificate.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_all_intervals_componentwise_transport_g1_nonadjacent import (
    generic_rows,
)
from probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent import (
    FINITE_SUMS,
    exact_row,
    finite_certificate,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    at,
    bernstein_coefficients,
    choose,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_ALL_COMPONENTWISE_G1_NONADJACENT"

DEPENDENCIES = {
    "derive_iso_n5_disconnected_mark_factorization_g1_nonadjacent.py":
        "E2670AD49B1888880D375199A8B4B15A1FEE502E18B81DCF5D28A44AE406CAD3",
    "iso_n5_disconnected_mark_factorization_exact_g1_nonadjacent_20260830.json":
        "3BBFFE3FECD019A3D093A3FEE646A75003AAF6C950F76E55B3C4521B0A98A964",
    "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py":
        "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05",
    "iso_n5_c5_disconnected_nonadjacent_exact_g1_nonadjacent_20260830.json":
        "51636F0BB3B599BCCF5251C0AAE8DD7D0C7689AFDFDC09E41A9B9312257A3BFD",
    "prove_iso_n5_disconnected_m5_sum15_all_componentwise_root.py":
        "F9C59F4D6E7FACC3056AF4AD11104FB86F94D1FFABDDBB37AD43B623F43E1E78",
    "iso_n5_disconnected_m5_sum15_all_componentwise_exact_root_20260830.json":
        "B8F72A3C68313AFFA81EBC4098BBE141A4EFFB720F64C7C9CA42D05C7CFD02B9",
    "probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent.py":
        "72795F07C3C0A30CF0B6E05C2980AA97367763EEC6AC8B43514F873AA23D6CFF",
    "probe_iso_n5_disconnected_m5_all_intervals_componentwise_transport_g1_nonadjacent.py":
        "BC59D3D234DE363978AD00328D428EC103A3DA2778764E3036DBC0436DF0FCF5",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":
        "D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
}

EXPECTED_AGGREGATES = {
    (9, "high"): (1734, 46, sp.Integer(2), 414),
    (9, "low"): (1387, 87, sp.Integer(5), 317),
    (10, "high"): (1955, 55, sp.Integer(6), 419),
    (10, "low"): (1549, 105, sp.Integer(9), 330),
    (11, "high"): (1955, 55, sp.Integer(2), 421),
    (11, "low"): (1549, 105, sp.Integer(2), 332),
    (12, "high"): (13787, 96, sp.Integer(4), 2601),
    (12, "low"): (12177, 187, sp.Integer(16), 2154),
    (13, "high"): (14093, 105, sp.Integer(16), 2733),
    (13, "low"): (12501, 205, sp.Integer(16), 2258),
    (14, "high"): (138405, 797, sp.Rational(16, 5), 21978),
    (14, "low"): (156743, 1949, sp.Rational(16, 5), 16699),
    (16, "high"): (309077, 1229, sp.Rational(4, 5), 56602),
    (16, "low"): (353297, 3245, sp.Rational(4, 5), 41637),
}

ENDPOINT_DIRECTIONS = {
    9: {3: "lower"},
    10: {3: "upper"},
    11: {3: "upper"},
    12: {3: "lower", 4: "upper"},
    13: {3: "upper", 4: "upper"},
    14: {3: "lower", 4: "upper", 5: "upper"},
    16: {3: "lower", 4: "upper", 5: "upper"},
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pinned_marker(filename: str, expected: str) -> dict:
    data = json.loads((HERE / filename).read_text(encoding="utf-8"))
    assert data["marker"] == expected
    return data


def low_eight_certificate(expressions):
    """Independent exact termwise proof using only the k=2 forest floor."""
    n, m, r = sp.symbols("n m r", nonnegative=True)
    coefficient_variables = (*P[2:], *H[2:])
    lower = {variable: sp.Integer(0) for variable in coefficient_variables}
    lower[P[2]] = choose(n - 1, 2)
    upper = {P[rank]: choose(n, rank) for rank in range(2, 8)}
    upper.update({H[rank]: choose(m, rank) for rank in range(2, 7)})

    bounds = []
    audits = []
    for one_based, expression in enumerate(expressions[:8], 1):
        exact = sp.expand(expression.subs({P[0]: 1, H[0]: 1, P[1]: n, H[1]: m}))
        polynomial = sp.Poly(exact, n, m, *coefficient_variables)
        bound = 0
        for monomial, coefficient in polynomial.terms():
            term = coefficient * n**monomial[0] * m**monomial[1]
            endpoints = lower if coefficient > 0 else upper
            for variable, exponent in zip(coefficient_variables, monomial[2:]):
                term *= endpoints[variable] ** exponent
            bound += term
        bound = sp.factor(bound)
        rows = bernstein_coefficients(sp.expand(bound.subs(m, r * n)), r)
        power_coefficients = [
            value
            for row in rows
            for value in sp.Poly(row, n).coeffs()
        ]
        assert all(value >= 0 for value in power_coefficients)
        bounds.append(bound)
        audits.append({
            "unique_sum": one_based,
            "lower_bound": str(bound),
            "m_equals_rn_bernstein_rows": len(rows),
            "minimum_n_power_coefficient": str(
                min(power_coefficients) if power_coefficients else 0
            ),
        })

    expected = [
        0,
        sp.Rational(3, 2),
        1,
        (m + 3 * n + 2) / 2,
        (m + 3 * n + 1) / 2,
        2 * n + 1,
        (n**2 + n + 4) / 2,
        (m + 1) * (4 * n + 2 - m) / 2,
    ]
    assert all(sp.expand(left - right) == 0 for left, right in zip(bounds, expected))
    return {
        "unique_sums": [1, 8],
        "only_nonzero_positive_coefficient_floor": "p2>=C(n-1,2)",
        "ceilings": "p_k<=C(n,k), h_k<=C(m,k)",
        "domain": "0<=m<=n, parameterized by m=rn with 0<=r<=1",
        "rows": audits,
    }


def newton_and_endpoint_audit(expressions):
    """Rederive every Newton identity and validate every bound direction."""
    result = {}
    t = sp.symbols("t", integer=True, nonnegative=True)
    x = sp.symbols("x0:8", nonnegative=True)
    h = sp.symbols("h0:7", nonnegative=True)
    p = tuple(sp.expand(sum(
        sp.binomial(t, j) * at(x, rank - j)
        for j in range(rank + 1)
    )) for rank in range(8))

    for unique_sum in FINITE_SUMS:
        expression = expressions[unique_sum - 1]
        twice = sp.expand(sp.expand_func(
            (2 * expression)
            .subs({P[rank]: p[rank] for rank in range(8)})
            .subs({H[rank]: h[rank] for rank in range(7)})
            .subs({x[0]: 1, h[0]: 1})
        ))
        expected_x, expected_h, expected_rows = generic_rows(unique_sum - 1)
        symbol_map = {
            **dict(zip(expected_x, x)),
            **dict(zip(expected_h, h)),
        }
        expected_rows = [sp.expand(row.subs(symbol_map)) for row in expected_rows]
        reconstructed = sp.expand(sum(
            expected_rows[rank] * sp.binomial(t, rank)
            for rank in range(len(expected_rows))
        ))
        assert sp.expand(sp.expand_func(reconstructed) - twice) == 0

        sign_rows = []
        for row_index, row in enumerate(expected_rows):
            signs = {}
            for h_rank, direction in ENDPOINT_DIRECTIONS[unique_sum].items():
                coefficient = sp.factor(row.coeff(h[h_rank]))
                scalars = sp.Poly(coefficient, *x).coeffs()
                if direction == "lower":
                    assert all(value >= 0 for value in scalars)
                else:
                    assert all(value <= 0 for value in scalars)
                signs[f"h{h_rank}"] = {
                    "coefficient": str(coefficient),
                    "endpoint": direction,
                }
            sign_rows.append({"newton_row": row_index, "signs": signs})
        result[str(unique_sum)] = {
            "identity": f"2*sum{unique_sum}=sum_j R_j*C(t,j)",
            "newton_rows": [str(sp.factor(row)) for row in expected_rows],
            "endpoint_signs": sign_rows,
        }
    return result


def large_order_certificate():
    rows = []
    aggregates = {}
    for unique_sum in FINITE_SUMS:
        row_count = len(generic_rows(unique_sum - 1)[2])
        for sector in ("high", "low"):
            branch = [exact_row(unique_sum - 1, sector, index) for index in range(row_count)]
            actual = (
                sum(row["homogeneous_terms"] for row in branch),
                sum(row["cube_bernstein_rows"] for row in branch),
                min(sp.Rational(row["minimum"]) for row in branch),
                sum(row["power_terms"] for row in branch),
            )
            assert actual == EXPECTED_AGGREGATES[(unique_sum, sector)], (
                unique_sum, sector, actual,
            )
            aggregates[f"sum{unique_sum}_{sector}"] = {
                "homogeneous_terms": actual[0],
                "cube_bernstein_rows": actual[1],
                "minimum": str(actual[2]),
                "power_terms": actual[3],
            }
            rows.extend(branch)
            print("EXACT", unique_sum, sector, aggregates[f"sum{unique_sum}_{sector}"], flush=True)
    assert len(rows) == 70
    assert sum(row["homogeneous_terms"] for row in rows) == 1020209
    return {
        "N_range": "N>=13",
        "exact_branches": len(rows),
        "cube_bernstein_rows": sum(row["cube_bernstein_rows"] for row in rows),
        "homogeneous_coefficients": sum(row["homogeneous_terms"] for row in rows),
        "negative_coefficients": 0,
        "aggregates": aggregates,
        "rows": rows,
    }


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    factorization = pinned_marker(
        "iso_n5_disconnected_mark_factorization_exact_g1_nonadjacent_20260830.json",
        "DERIVED_EXACT_ISO_N5_DISCONNECTED_MARK_FACTORIZATION_G1_NONADJACENT",
    )
    phi_theorem = pinned_marker(
        "iso_n5_c5_disconnected_nonadjacent_exact_g1_nonadjacent_20260830.json",
        "PASS_EXACT_ISO_N5_C5_DISCONNECTED_NONADJACENT_G1_NONADJACENT",
    )
    sum15 = pinned_marker(
        "iso_n5_disconnected_m5_sum15_all_componentwise_exact_root_20260830.json",
        "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_ALL_COMPONENTWISE_ROOT",
    )

    cells = interval_cells(P, H)
    expressions = unique_expressions(cells)
    assert len(cells) == 19 and len(expressions) == 16
    mapping = [{
        "phi_degree": cell["phi_degree"],
        "psi_degree": cell["psi_degree"],
        "phi_centered_interval_layer": cell["layer"],
        "psi_interval": cell["interval"],
        "unique_sum": expressions.index(cell["expression"]) + 1,
    } for cell in cells]
    assert {row["unique_sum"] for row in mapping} == set(range(1, 17))

    low = low_eight_certificate(expressions)
    identities = newton_and_endpoint_audit(expressions)
    finite = finite_certificate()
    assert finite["unlabeled_forests"] == 2949
    assert finite["reduced_componentwise_deletion_patterns"] == 75549
    assert finite["newton_row_checks"] == 2644215
    assert finite["global_minimum_newton_rows_by_unique_sum"] == {
        9: [0, 4, 8, 5],
        10: [0, 4, 11, 9],
        11: [0, 2, 7, 4],
        12: [0, 0, 10, 24, 16],
        13: [0, 0, 8, 28, 20],
        14: [0, 0, 2, 28, 73, 48],
        16: [0, 0, 0, 10, 76, 160, 98],
    }
    large = large_order_certificate()

    report = {
        "marker": MARKER,
        "theorem": (
            "For every forest whose two marks lie in distinct components, "
            "the disconnected-mark block M5 is nonnegative."
        ),
        "exact_algebra": {
            "four_rows": factorization["four_rows"],
            "factorization": "N=Phi1*Psi2+Phi2*Psi1, Psi=L-zw*Phi/2",
            "target": "M5=2*[z^4w^5]N",
            "common_factor_handling": (
                "Absorb every unmarked component into one rooted pair; this "
                "turns H into a componentwise deletion of P."
            ),
        },
        "phi_input": {
            "marker": phi_theorem["marker"],
            "consequence": (
                "Every needed fixed-total Phi slice is nonnegative, symmetric, "
                "and centrally unimodal for arbitrary componentwise deletion."
            ),
        },
        "centered_interval_reduction": {
            "argument": (
                "A nonnegative symmetric centrally-unimodal Phi slice is a "
                "nonnegative sum of uniform centered interval layers.  Its "
                "contribution to [z4w5](Phi*Psi) is the corresponding "
                "left-centered interval sum of Psi."
            ),
            "cells": len(cells),
            "distinct_interval_sums": len(expressions),
            "mapping": mapping,
        },
        "componentwise_geometry": {
            "reduced_core": (
                "Extract t isolated selected components: I(P)=(1+x)^t I(P0). "
                "In P0 select a positive-degree independent set S with at most "
                "one vertex per component; H=P0-S."
            ),
            "parameters": (
                "N=|P0|, a=|S|, b=unselected components, c=a+b, "
                "e=|H|=N-a, q=sum_{v in S}deg(v)"
            ),
            "identities": [
                "e(P0)=N-c",
                "e(H)=N-c-q",
                "0<=a<=q<=N-c",
                "2a+b<=N",
            ],
            "continuous_box": (
                "a=NA/2, b=BN(1-A), q=a+QN(1-A)(1-B), "
                "0<=A,B,Q<=1"
            ),
            "coefficient_data": [
                "p2=C(N,2)-(N-c)",
                "h2=C(N-a,2)-(N-c-q)",
                "h3>=C(N-a,3)-(N-c-q)(N-a-2)",
                "d4=p4-h4>=C(a,4)+(N-a)C(a,3)-qC(a-1,2)",
                "d5=p5-h5>=C(a,5)+(N-a)C(a,4)-qC(a-1,3)",
            ],
        },
        "unique_sums_1_through_8": low,
        "unique_sums_9_through_14_and_16": {
            "newton_identities_and_bound_directions": identities,
            "finite_N_at_most_12": finite,
            "large_N_at_least_13": large,
        },
        "unique_sum_15_pinned_input": {
            "marker": sum15["marker"],
            "coverage": sum15["coverage"],
        },
        "coverage": (
            "All 16 distinct Psi interval sums, hence all 19 centered-layer "
            "cells, are nonnegative for both rooted factors.  The exact "
            "factorization therefore gives [z4w5]N>=0 and M5>=0."
        ),
        "scope": (
            "Exact theorem for M5 when the marks lie in distinct forest "
            "components.  It does not by itself prove the connected mark cases, "
            "all g1/N5, or Erdos Problem 993."
        ),
        "pinned_dependencies": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(raw, encoding="utf-8", newline="\n")
    os.replace(temporary, OUTPUT)
    print(json.dumps({
        "marker": MARKER,
        "finite_patterns": finite["reduced_componentwise_deletion_patterns"],
        "finite_newton_checks": finite["newton_row_checks"],
        "large_exact_branches": large["exact_branches"],
        "large_homogeneous_coefficients": large["homogeneous_coefficients"],
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
