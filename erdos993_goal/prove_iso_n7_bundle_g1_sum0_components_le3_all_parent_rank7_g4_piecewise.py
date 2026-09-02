#!/usr/bin/env python3
"""Fail-closed G1 theorem for isolated marks over K1/K2/P3 forests.

The unmarked forest W may have arbitrarily many isolated vertices, edges, and
three-vertex path components.  All canonical parent cases are reconstructed
from the literal thirteen-node bundle definition and certified on an exact
two-parameter component simplex with rational Bernstein power inversion.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import (
    reconstruct_coefficients,
)
from probe_iso_n7_bundle_g1_sum0_components_le3_rank7_g4_piecewise import (
    component_row,
)
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_components_le3_all_parent_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_COMPONENTS_LE3_ALL_PARENT_RANK7_G4_PIECEWISE"
THRESHOLD_N = 11
THRESHOLD_M = THRESHOLD_N-2
FILES = {
    "reconstruction_source": "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
    "bernstein_source": "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py",
    "parent_source": "derive_iso_n7_bundle_g1_parent_modes_rank7_g4_piecewise.py",
    "parent_report": "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "base_probe_source": "probe_iso_n7_bundle_g1_sum0_components_le3_rank7_g4_piecewise.py",
    "base_probe_report": "iso_n7_bundle_g1_sum0_components_le3_probe_rank7_g4_piecewise_20260831.json",
    "ordinary_probe_source": "probe_iso_n7_bundle_g1_sum0_components_le3_ordinary_rank7_g4_piecewise.py",
    "ordinary_probe_report": "iso_n7_bundle_g1_sum0_components_le3_ordinary_probe_rank7_g4_piecewise_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "bernstein_source": "6B3106BCEE7F7ECA68C4C5B6861EF018E7E2023DFD8BA091CDAC1EA1FB0085A6",
    "parent_source": "3C4F8170E28763B85028C5B812B2305CCBC3DD3777258199D9A9AA51CE96AE8D",
    "parent_report": "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490",
    "base_probe_source": "DC76795FFAD897EC00B7C038BB4FB8917985CD86B13835E278EDE06536B280D2",
    "base_probe_report": "641C48A1A46B79A4D36AABE5F916117B15608E0662D7B7B3BF684A1CB17472D2",
    "ordinary_probe_source": "1406C356E9B1295028E559B3C898FDCD20A5A0D174AEBFB876802D0F40434C22",
    "ordinary_probe_report": "01F082349CC2FB9D175DABE3432414C1207BBD39641A6EAA8E4FC13404FEDF11",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def four_rows(core, maximum=8):
    def at(rank):
        return core.get(rank, sp.Integer(0))
    return {
        "E": {rank: at(rank)+2*at(rank-1)+at(rank-2) for rank in range(maximum+1)},
        "U": {rank: at(rank)+at(rank-1) for rank in range(maximum+1)},
        "V": {rank: at(rank)+at(rank-1) for rank in range(maximum+1)},
        "W": {rank: at(rank) for rank in range(maximum+1)},
    }


def one_mark_rows(core, missing: str, maximum=8):
    def at(rank):
        return core.get(rank, sp.Integer(0))
    with_mark = {rank: at(rank)+at(rank-1) for rank in range(maximum+1)}
    without_mark = {rank: at(rank) for rank in range(maximum+1)}
    if missing == "u":
        return {"E": with_mark, "U": with_mark, "V": without_mark, "W": without_mark}
    if missing == "v":
        return {"E": with_mark, "U": without_mark, "V": with_mark, "W": without_mark}
    raise AssertionError(missing)


def substitute_rows(expression, crows, drows):
    substitutions = {
        sp.Symbol(f"{prefix}{family}{rank}"): rows[family][rank]
        for prefix, rows in (("c", crows), ("d", drows))
        for family in "EUVW" for rank in range(9)
    }
    return sp.factor(expression.subs(substitutions, simultaneous=True))


def core_rows(r, t, s):
    return {rank: component_row(r, t, s, rank) for rank in range(9)}


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    base_probe = json.loads(
        (HERE/FILES["base_probe_report"]).read_text(encoding="utf-8")
    )
    ordinary_probe = json.loads(
        (HERE/FILES["ordinary_probe_report"]).read_text(encoding="utf-8")
    )
    finite = json.loads((HERE/FILES["finite_report"]).read_text(encoding="utf-8"))
    assert all(value == 0 for value in base_probe["negative_counts"].values())
    assert all(value == 0 for value in ordinary_probe["negative_counts"].values())
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0

    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    generic = coefficients[1]
    m, tail, wedge_parameter, edge_parameter = sp.symbols(
        "m tail wedge_parameter edge_parameter", nonnegative=True
    )

    cases = {}
    # All cores, no parent and the two endpoint parents.
    s = m*wedge_parameter/3
    t = (m-3*s)*edge_parameter/2
    r = m-3*s-2*t
    core = core_rows(r, t, s)
    crows = four_rows(core)
    cases["no_parent"] = substitute_rows(generic, crows, crows)
    cases["endpoint_u"] = substitute_rows(generic, crows, one_mark_rows(core, "u"))
    cases["endpoint_v"] = substitute_rows(generic, crows, one_mark_rows(core, "v"))

    # Ordinary isolate: reserve one K1; deleting it removes that K1.
    available = m-1
    s = available*wedge_parameter/3
    t = (available-3*s)*edge_parameter/2
    r = m-3*s-2*t
    cases["ordinary_parent_is_isolate"] = substitute_rows(
        generic, four_rows(core_rows(r, t, s)), four_rows(core_rows(r-1, t, s))
    )

    # Ordinary K2 endpoint: reserve one K2; deletion leaves its mate isolated.
    available = m-2
    s = available*wedge_parameter/3
    t = 1+(available-3*s)*edge_parameter/2
    r = m-3*s-2*t
    cases["ordinary_parent_is_K2_endpoint"] = substitute_rows(
        generic, four_rows(core_rows(r, t, s)), four_rows(core_rows(r+1, t-1, s))
    )

    # Ordinary P3 vertex: reserve one P3. Deleting its center leaves two K1;
    # deleting a leaf turns that P3 into one K2.
    available = m-3
    s = 1+available*wedge_parameter/3
    t = (available-3*(s-1))*edge_parameter/2
    r = m-3*s-2*t
    base = four_rows(core_rows(r, t, s))
    cases["ordinary_parent_is_P3_center"] = substitute_rows(
        generic, base, four_rows(core_rows(r+2, t, s-1))
    )
    cases["ordinary_parent_is_P3_leaf"] = substitute_rows(
        generic, base, four_rows(core_rows(r, t+1, s-1))
    )

    variables = (wedge_parameter, edge_parameter)
    certificates = {}
    for label, value in cases.items():
        shifted = sp.expand(value.subs(m, tail+THRESHOLD_M))
        certificate = certify_bernstein(shifted, variables, tail=tail)
        assert sp.Rational(certificate["minimum_tail_power_coefficient"]) >= 0
        certificates[label] = {"exact_expression": str(value), **certificate}

    # Independent direct-D reconstruction agrees with both marked-partition probes.
    for label in ("no_parent", "endpoint_u"):
        assert sp.cancel(
            cases[label]-sp.sympify(
                base_probe["expressions"][label],
                locals={
                    "m": m, "wedge_parameter": wedge_parameter,
                    "edge_parameter": edge_parameter,
                },
            )
        ) == 0
    assert sp.cancel(cases["endpoint_u"]-cases["endpoint_v"]) == 0
    for label in (
        "ordinary_parent_is_isolate", "ordinary_parent_is_K2_endpoint",
        "ordinary_parent_is_P3_center", "ordinary_parent_is_P3_leaf",
    ):
        assert sp.cancel(
            cases[label]-sp.sympify(
                ordinary_probe["expressions"][label],
                locals={
                    "m": m, "wedge_parameter": wedge_parameter,
                    "edge_parameter": edge_parameter,
                },
            )
        ) == 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "If C consists of two isolated marked vertices and an unmarked "
            "forest W whose components all have order at most three, then for "
            "every canonical parent mode the exact rank-seven bundle G1 is "
            "nonnegative."
        ),
        "coverage": [
            {
                "orders": "2<=n<=10",
                "method": "pinned exhaustive all-forest/all-parent finite certificate",
            },
            {
                "orders": "n>=11",
                "method": (
                    "literal reconstruction plus exact two-variable rational "
                    "Bernstein certificates for seven exhaustive parent cases"
                ),
            },
            {"orders": "n<=1", "method": "vacuous: no distinct marked pair"},
        ],
        "certificates": certificates,
        "case_exhaustion": {
            "core_components": ["K1", "K2", "P3"],
            "ordinary_parent_positions": ["K1", "K2 endpoint", "P3 center", "P3 leaf"],
        },
        "exact_power_inversion": True,
        "coverage_gap_within_sum0_components_le3_G1": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Rank-seven G1 only, both marks isolated, with every W component "
            "of order at most three. Cores containing a component of order "
            "four or another marked geometry remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_sum0_components_le3_G1": None,
        "minimum_tail_power_coefficients": {
            key: value["minimum_tail_power_coefficient"]
            for key, value in certificates.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
