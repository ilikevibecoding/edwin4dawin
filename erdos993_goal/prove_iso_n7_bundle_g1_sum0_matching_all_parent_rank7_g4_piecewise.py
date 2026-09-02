#!/usr/bin/env python3
"""Fail-closed rank-seven G1 theorem for isolated marks over a matching core.

Let C consist of two isolated marked vertices and an unmarked forest W whose
components have order at most two.  The literal G1 coefficient is independently
reconstructed for every parent mode.  The matching edge count is normalized
over its exact interval, and every rational Bernstein control (including all
tail coefficients) is nonnegative with exact power-basis inversion.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import (
    reconstruct_coefficients,
)
from probe_iso_n7_bundle_g1_sum0_matching_rank7_g4_piecewise import (
    matching_row,
)
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_matching_all_parent_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_MATCHING_ALL_PARENT_RANK7_G4_PIECEWISE"
THRESHOLD_N = 11
THRESHOLD_M = THRESHOLD_N-2
FILES = {
    "reconstruction_source": "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py",
    "bernstein_source": "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py",
    "parent_source": "derive_iso_n7_bundle_g1_parent_modes_rank7_g4_piecewise.py",
    "parent_report": "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "matching_probe_source": "probe_iso_n7_bundle_g1_sum0_matching_rank7_g4_piecewise.py",
    "matching_probe_report": "iso_n7_bundle_g1_sum0_matching_probe_rank7_g4_piecewise_20260831.json",
    "ordinary_probe_source": "probe_iso_n7_bundle_g1_sum0_matching_ordinary_rank7_g4_piecewise.py",
    "ordinary_probe_report": "iso_n7_bundle_g1_sum0_matching_ordinary_probe_rank7_g4_piecewise_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "bernstein_source": "6B3106BCEE7F7ECA68C4C5B6861EF018E7E2023DFD8BA091CDAC1EA1FB0085A6",
    "parent_source": "3C4F8170E28763B85028C5B812B2305CCBC3DD3777258199D9A9AA51CE96AE8D",
    "parent_report": "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490",
    "matching_probe_source": "4BCDBCAA0F359E750FCAFFD35FD35A5547E7E609D53AAB214776007C6926C5B3",
    "matching_probe_report": "D9BB7950DDDFD50CD9011578136B0AA4D5748629441222B391EEF65FA04F0E4D",
    "ordinary_probe_source": "93460DE714796E89AE946625FCFABDA0141E62FEDC8B48FBBA776C35D0EFECE2",
    "ordinary_probe_report": "802875AF3FC57089EFD55DBA557C584D888D1F0CB2BC1CCED445557BEEC3B7E7",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def four_rows(core, maximum=8):
    """Rows after adjoining both, only v, only u, or neither isolated mark."""
    def at(rank):
        return core.get(rank, sp.Integer(0))
    return {
        "E": {rank: at(rank)+2*at(rank-1)+at(rank-2) for rank in range(maximum+1)},
        "U": {rank: at(rank)+at(rank-1) for rank in range(maximum+1)},
        "V": {rank: at(rank)+at(rank-1) for rank in range(maximum+1)},
        "W": {rank: at(rank) for rank in range(maximum+1)},
    }


def one_mark_rows(core, missing: str, maximum=8):
    """D rows when one marked endpoint is deleted and the other is isolated."""
    def at(rank):
        return core.get(rank, sp.Integer(0))
    both = {rank: at(rank)+at(rank-1) for rank in range(maximum+1)}
    neither = {rank: at(rank) for rank in range(maximum+1)}
    if missing == "u":
        return {"E": both, "U": both, "V": neither, "W": neither}
    if missing == "v":
        return {"E": both, "U": neither, "V": both, "W": neither}
    raise AssertionError(missing)


def substitute_rows(expression, crows, drows):
    substitutions = {}
    for family in "EUVW":
        for rank in range(9):
            substitutions[sp.Symbol(f"c{family}{rank}")] = crows[family][rank]
            substitutions[sp.Symbol(f"d{family}{rank}")] = drows[family][rank]
    return sp.factor(expression.subs(substitutions, simultaneous=True))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    matching_probe = json.loads(
        (HERE/FILES["matching_probe_report"]).read_text(encoding="utf-8")
    )
    ordinary_probe = json.loads(
        (HERE/FILES["ordinary_probe_report"]).read_text(encoding="utf-8")
    )
    finite = json.loads((HERE/FILES["finite_report"]).read_text(encoding="utf-8"))
    assert all(value == 0 for value in matching_probe["negative_counts"].values())
    assert all(value == 0 for value in ordinary_probe["negative_counts"].values())
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0

    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    generic = coefficients[1]
    m, tail, edge_parameter = sp.symbols(
        "m tail edge_parameter", nonnegative=True
    )

    cases = {}
    # No parent and each endpoint parent: 0<=t<=m/2.
    edge = m*edge_parameter/2
    core = {rank: matching_row(m, edge, rank) for rank in range(9)}
    crows = four_rows(core)
    cases["no_parent"] = substitute_rows(generic, crows, crows)
    cases["endpoint_u"] = substitute_rows(generic, crows, one_mark_rows(core, "u"))
    cases["endpoint_v"] = substitute_rows(generic, crows, one_mark_rows(core, "v"))

    # Ordinary p isolated: 0<=t<=(m-1)/2 and W-p is matching(m-1,t).
    edge_isolate = (m-1)*edge_parameter/2
    core_isolate = {
        rank: matching_row(m, edge_isolate, rank) for rank in range(9)
    }
    deleted_isolate = {
        rank: matching_row(m-1, edge_isolate, rank) for rank in range(9)
    }
    cases["ordinary_parent_is_isolate"] = substitute_rows(
        generic, four_rows(core_isolate), four_rows(deleted_isolate)
    )

    # Ordinary p matched: 1<=t<=m/2 and W-p is matching(m-1,t-1).
    edge_matched = 1+(m-2)*edge_parameter/2
    core_matched = {
        rank: matching_row(m, edge_matched, rank) for rank in range(9)
    }
    deleted_matched = {
        rank: matching_row(m-1, edge_matched-1, rank) for rank in range(9)
    }
    cases["ordinary_parent_is_matched"] = substitute_rows(
        generic, four_rows(core_matched), four_rows(deleted_matched)
    )

    certificates = {}
    for label, value in cases.items():
        shifted = sp.expand(value.subs(m, tail+THRESHOLD_M))
        certificate = certify_bernstein(
            shifted, (edge_parameter,), tail=tail
        )
        assert certificate["minimum_tail_power_coefficient"] is not None
        assert sp.Rational(certificate["minimum_tail_power_coefficient"]) >= 0
        certificates[label] = {
            "exact_expression": str(value),
            **certificate,
        }

    # Independent reconstruction agrees exactly with both earlier probes.
    assert sp.cancel(
        cases["no_parent"]
        - sp.sympify(matching_probe["expressions"]["no_parent"], locals={"m": m, "edge_parameter": edge_parameter})
    ) == 0
    assert sp.cancel(
        cases["endpoint_u"]
        - sp.sympify(matching_probe["expressions"]["endpoint_u"], locals={"m": m, "edge_parameter": edge_parameter})
    ) == 0
    assert sp.cancel(cases["endpoint_u"]-cases["endpoint_v"]) == 0
    for label in ("ordinary_parent_is_isolate", "ordinary_parent_is_matched"):
        assert sp.cancel(
            cases[label]
            - sp.sympify(ordinary_probe["expressions"][label], locals={"m": m, "edge_parameter": edge_parameter})
        ) == 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "If C consists of two isolated marked vertices and an unmarked "
            "matching W (with any number of isolated vertices), then for every "
            "canonical parent mode the exact rank-seven bundle coefficient G1 "
            "is nonnegative."
        ),
        "coverage": [
            {
                "orders": "2<=n<=10",
                "method": "pinned exhaustive all-forest/all-parent finite certificate",
            },
            {
                "orders": "n>=11",
                "method": (
                    "literal reconstruction plus exact one-variable rational "
                    "Bernstein certificates over every parent case"
                ),
            },
            {"orders": "n<=1", "method": "vacuous: no distinct marked pair"},
        ],
        "certificates": certificates,
        "case_exhaustion": {
            "no_parent": "0<=t<=m/2",
            "endpoint_u_v": "0<=t<=m/2, endpoint symmetry replayed directly",
            "ordinary_parent": (
                "Every ordinary vertex of a matching-plus-isolates core is "
                "either isolated or incident to its unique matching edge."
            ),
        },
        "exact_power_inversion": True,
        "coverage_gap_within_sum0_matching_G1": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Rank-seven G1 only, with both marks isolated and W of maximum "
            "degree at most one. Other marked geometries or W containing a "
            "path of length two remain open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_sum0_matching_G1": None,
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
