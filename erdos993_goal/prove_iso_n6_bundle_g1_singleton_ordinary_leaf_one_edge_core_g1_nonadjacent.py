#!/usr/bin/env python3
"""Exact all-order one-edge-core singleton-ordinary G1 leaf theorem.

For a deepest ordinary support choose one leaf and let t be its remaining
sibling-leaf count.  Suppose that the post-support core R has exactly one
edge.  Up to the marked-vertex symmetries there are four edge orbits when
p=q and seven when p!=q.  This producer rebuilds the complete rank-six G1
leaf increment in every orbit and proves it nonnegative for every t by an
exact shifted power-basis certificate.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import isolate_multiply


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_exact_"
    "g1_nonadjacent_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_ONE_EDGE_"
    "CORE_G1_NONADJACENT"
)
PINNED = {
    "leaf_expression_source": (
        "census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent.py",
        "2474323FFAB6D3FBFAC99926E298C698F4C93398D5E0FC7467F18E97F8363126",
    ),
    "binomial_algebra_source": (
        "derive_iso_n4_bundle_polynomial_root.py",
        "F312FB481C76129380823CFC5E1FA6BB2B7D794846136A14477FCC9245D8870E",
    ),
    "canonical_occupation_source": (
        "derive_iso_n6_bundle_g1_singleton_ordinary_leaf_complete_occupation_g1_nonadjacent.py",
        "9D02C3AD011A6A175AC632E6786598691C9D2AAF52456CC2C2832476A1D54954",
    ),
    "canonical_occupation_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_complete_occupation_exact_g1_nonadjacent_20260831.json",
        "2AC2037F0D5F2F33B306ED325B7573C7F2D3CEBA062CC0335A5FE06187262C4A",
    ),
    "edgeless_core_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_edgeless_core_g1_nonadjacent.py",
        "2AE1DB53A3D85C0D3EF13D28B3026DF3BDE85E48310D85F432A4C34374E26D32",
    ),
    "edgeless_core_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_edgeless_core_exact_g1_nonadjacent_20260831.json",
        "352DE79587FBC11F4341440EA44D5313F1216975C83169946A69201D82381EC6",
    ),
}

EXPECTED = {
    "collision": {
        "p_u": {
            "first_order": 3, "terms": 35, "minimum": sp.Rational(17, 120),
            "raw_sha256": "01AA7162125ECD546351B0F02C14037577604425E653AACA6980A00DF5D60663",
            "shifted_sha256": "494D73DB0134E00A133924DBD08E63CD23239D9ED3B96B33DE0D4B92DE9BBA0E",
        },
        "p_a": {
            "first_order": 4, "terms": 36, "minimum": sp.Rational(17, 120),
            "raw_sha256": "85D552718FF20C6D6739B6C5476CFFFCC4A6E465E3CBDE62C2CE1889BB23BD7D",
            "shifted_sha256": "AB44FB4DF6FDC3DAC6F35B5DCCF975FAF4244F24B74A89D1AE9B7AD1D597C2D6",
        },
        "u_a": {
            "first_order": 4, "terms": 36, "minimum": sp.Rational(17, 120),
            "raw_sha256": "FBE8929C0B0E48A745176B91B30DA62ACE470D92F12ACC4D4F7D02E2DC4504A5",
            "shifted_sha256": "EF556E92C54D7361FB3B30FB99F43026D2F09AA70D30ADAAD93BE5344F665EE6",
        },
        "a_b": {
            "first_order": 5, "terms": 36, "minimum": sp.Rational(17, 120),
            "raw_sha256": "C1547E4763BFBE2FAFC36C7CA11119E96AF08B52FDCEB4C7439F86CA6C05A951",
            "shifted_sha256": "7FE91447F9FCA1978E609C4362CE6F1413D3FF5D63114E7A048D331BBFA6D22B",
        },
    },
    "distinct": {
        "p_u": {
            "first_order": 4, "terms": 36, "minimum": sp.Rational(17, 120),
            "raw_sha256": "2CF6F2C010ED9BF9209760AA202DDE148FFF662E23AD48FF385A66F0A7D62BFB",
            "shifted_sha256": "6D788134DEE1D034C0F50690898161C6D44A4F244C64F307B32EE0640F39D5BB",
        },
        "q_u": {
            "first_order": 4, "terms": 36, "minimum": sp.Rational(17, 120),
            "raw_sha256": "FBE8929C0B0E48A745176B91B30DA62ACE470D92F12ACC4D4F7D02E2DC4504A5",
            "shifted_sha256": "EF556E92C54D7361FB3B30FB99F43026D2F09AA70D30ADAAD93BE5344F665EE6",
        },
        "p_q": {
            "first_order": 4, "terms": 36, "minimum": sp.Rational(17, 120),
            "raw_sha256": "11CB08247EC545CB6813B8509CC93726BBBAD448F97BECD1DB066CBA62000545",
            "shifted_sha256": "7251713165AC6BC22A1D023235C67A64736E1460CE09F6B3A2DDE7C041F249D8",
        },
        "u_a": {
            "first_order": 5, "terms": 36, "minimum": sp.Rational(17, 120),
            "raw_sha256": "4CB0A81C31639478ADC78EC4FB5B9632134824E62FE4CC83EC4ACED24E4823C8",
            "shifted_sha256": "D20359118C061C62FBD05F94E783F1DCF8C8C762A57CCFC9D4A329DAF9A3C212",
        },
        "p_a": {
            "first_order": 5, "terms": 36, "minimum": sp.Rational(17, 120),
            "raw_sha256": "C830371F1A3D85C77416FCFF53ECA36CCF35E544798FB660AAC2A20EDB855F97",
            "shifted_sha256": "D5100CFE936919B6EDADB32C921C6F73DA51B9267D8293BCCAB2D9E9B6E2F3F2",
        },
        "q_a": {
            "first_order": 5, "terms": 36, "minimum": sp.Rational(17, 120),
            "raw_sha256": "1D74ED2B323C5D052502B551DB73B43C536379C8CA9E8A3FF163F2C53B19DD23",
            "shifted_sha256": "1BEDA9F01CE11719ADE048822BCD269158C062E97A797D04E628FD8A38D4F9E1",
        },
        "a_b": {
            "first_order": 6, "terms": 36, "minimum": sp.Rational(17, 120),
            "raw_sha256": "E827C3B307F8A600FB26AAD4B11E40E56BCA8ED3EA90603B1092C777F06427ED",
            "shifted_sha256": "B93A3172C1F34E0F2BFECACC25CFF1334CA5C463DE82D2A8D370AB67FE943476",
        },
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def expression_sha256(expression: sp.Expr) -> str:
    return hashlib.sha256(
        sp.srepr(sp.expand(expression)).encode()
    ).hexdigest().upper()


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    return sp.expand(
        sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)
    )


def replace_rows(expression, **blocks):
    rules = {}
    for prefix, actual in blocks.items():
        generic = symbolic_rows(prefix)
        for generic_row, actual_row in zip(generic, actual):
            rules.update(dict(zip(generic_row, actual_row)))
    return sp.expand(expression.subs(rules))


def structural(rows, order):
    e, u, v, w = rows
    return {
        e[0]: 1, u[0]: 1, v[0]: 1, w[0]: 1,
        e[1]: order, u[1]: order - 1,
        v[1]: order - 1, w[1]: order - 2,
    }


def one_edge_rules(rows, order, predeleted, edge):
    """Exact independence rows of a one-edge graph after marked deletions."""
    rules = {}
    for row, deleted_marks in zip(
        rows, (set(), {"u"}, {"v"}, {"u", "v"})
    ):
        deleted = set(predeleted) | deleted_marks
        edge_survives = not (set(edge) & deleted)
        row_order = order - len(deleted_marks)
        for rank in range(2, 8):
            rules[row[rank]] = sp.expand(
                choose(row_order, rank)
                - (choose(row_order - 2, rank - 2) if edge_survives else 0)
            )
    return rules


def main():
    for _label, (name, expected) in PINNED.items():
        assert sha256(HERE / name) == expected

    t = sp.Symbol("t", integer=True, nonnegative=True)
    n = sp.Symbol("n", integer=True, positive=True)
    h = sp.Symbol("h", nonnegative=True)
    components = build_expressions()
    assert set(components) == {"g2", "F", "QHL", "QHJ", "QKJ", "T"}
    complete = sp.expand(
        components["g2"] + components["F"] + components["QHL"]
        + components["QHJ"] + components["QKJ"] + components["T"]
    )
    rrows, srows, xrows, yrows = (
        symbolic_rows(prefix) for prefix in "RSXY"
    )

    collision = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(srows, t, 7), L=srows,
    )
    collision = sp.expand(collision.subs(
        structural(rrows, n) | structural(srows, n - 1)
    ))
    distinct = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(xrows, t, 7), L=yrows,
    )
    distinct = sp.expand(distinct.subs(
        structural(rrows, n) | structural(srows, n - 1)
        | structural(xrows, n - 1) | structural(yrows, n - 2)
    ))

    # The marks u,v are nonadjacent.  Anonymous vertices are interchangeable,
    # and u/v reflection identifies the omitted mirror representatives.
    orbit_edges = {
        "collision": {
            "p_u": ("p", "u"),
            "p_a": ("p", "a"),
            "u_a": ("u", "a"),
            "a_b": ("a", "b"),
        },
        "distinct": {
            "p_u": ("p", "u"),
            "q_u": ("q", "u"),
            "p_q": ("p", "q"),
            "u_a": ("u", "a"),
            "p_a": ("p", "a"),
            "q_a": ("q", "a"),
            "a_b": ("a", "b"),
        },
    }
    assert tuple(orbit_edges["collision"]) == ("p_u", "p_a", "u_a", "a_b")
    assert tuple(orbit_edges["distinct"]) == (
        "p_u", "q_u", "p_q", "u_a", "p_a", "q_a", "a_b"
    )

    certificates = {}
    for mode, expression in (("collision", collision), ("distinct", distinct)):
        mode_records = {}
        for label, edge in orbit_edges[mode].items():
            expected = EXPECTED[mode][label]
            rules = one_edge_rules(rrows, n, set(), edge)
            rules |= one_edge_rules(
                srows, n - 1, {"p" if mode == "collision" else "q"}, edge
            )
            if mode == "distinct":
                rules |= one_edge_rules(xrows, n - 1, {"p"}, edge)
                rules |= one_edge_rules(yrows, n - 2, {"p", "q"}, edge)
            value = sp.expand(expression.subs(rules))
            shifted_expression = sp.expand(
                value.subs(n, expected["first_order"] + h)
            )
            polynomial = sp.Poly(shifted_expression, h, t)
            coefficients = polynomial.coeffs()
            assert expression_sha256(value) == expected["raw_sha256"]
            assert expression_sha256(shifted_expression) == expected["shifted_sha256"]
            assert len(polynomial.terms()) == expected["terms"]
            assert all(coefficient >= 0 for coefficient in coefficients)
            assert min(coefficients) == expected["minimum"]
            mode_records[label] = {
                "edge_representative": list(edge),
                "core_order": (
                    f"n>={expected['first_order']}; "
                    f"n={expected['first_order']}+h"
                ),
                "sibling_count": "t>=0",
                "raw_polynomial_sha256": expected["raw_sha256"],
                "shifted_polynomial_sha256": expected["shifted_sha256"],
                "shifted_power_terms": expected["terms"],
                "negative_shifted_coefficients": 0,
                "minimum_shifted_coefficient": str(expected["minimum"]),
            }
        certificates[mode] = mode_records

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "singleton_ordinary ordinary-leaf reduction",
        "geometry": {
            "core": "R has exactly one edge",
            "sibling_parameter": "H=(1+x)^t R, where t>=0",
            "collision": "p=q; K=L=R-p and J=(1+x)^t(R-p)",
            "distinct": "p!=q; K=R-q, J=(1+x)^t(R-p), L=R-{p,q}",
            "nonadjacent_marks": "the u-v edge is forbidden",
            "orbit_policy": (
                "anonymous vertices are interchangeable; u/v reflection supplies "
                "the omitted mirror representatives"
            ),
            "collision_edge_orbits": list(orbit_edges["collision"]),
            "distinct_edge_orbits": list(orbit_edges["distinct"]),
        },
        "certificates": certificates,
        "checks": {
            "all_eleven_exact_expression_hashes_match": True,
            "all_eleven_shifted_expression_hashes_match": True,
            "all_eleven_orbit_polynomials_coefficientwise_nonnegative": True,
            "all_eleven_minimum_coefficients_equal_17_over_120": True,
            "four_collision_orbits_exhausted": True,
            "seven_distinct_orbits_exhausted": True,
        },
        "theorem": (
            "For every canonical nonadjacent singleton-ordinary deepest-support "
            "leaf configuration whose post-support core R has exactly one edge, "
            "the complete rank-six g1 leaf increment is nonnegative for every "
            "sibling count t>=0, in both p=q and p!=q cases."
        ),
        "combined_with_edgeless_certificate": (
            "The complete leaf increment is nonnegative for every t>=0 whenever "
            "the post-support core has at most one edge."
        ),
        "remaining_obligation": (
            "Cores with at least two edges in the complementary low-sibling region "
            "10t<11n, plus the other canonical rank-six g1 modes."
        ),
        "scope_guard": (
            "This does not prove the universal ordinary-leaf lemma, singleton-"
            "ordinary g1, all-five-mode rank-six g1, N6, or Problem 993."
        ),
        "pinned_dependencies": {
            label: {"file": name, "sha256": expected}
            for label, (name, expected) in PINNED.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "checks": report["checks"],
        "remaining_obligation": report["remaining_obligation"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
