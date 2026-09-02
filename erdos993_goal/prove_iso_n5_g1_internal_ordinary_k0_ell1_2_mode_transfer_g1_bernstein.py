#!/usr/bin/env python3
"""Exact mode transfer for the four literal internal-ordinary k=0 faces.

The two short child paths admit identities that are stronger than a cone
payment.  If F is the parent forest, p is its ordinary marked-for-deletion
vertex, and v is the surviving mark, write

    E=I(F), P=I(F-p), V=I(F-v), W=I(F-{p,v}).

For ell=1 the internal diagonal is exactly the singleton-endpoint coefficient
on the forest obtained by attaching the new marked leaf u to p.  For ell=2 it
is exactly the singleton-ordinary coefficient on the forest obtained by
attaching the path a-u-p and deleting the new unmarked leaf a.  These are raw
54-term polynomial identities and therefore do not depend on whether p and v
are adjacent, connected nonadjacent, or disconnected.

The source also reconstructs the general deletion-square polarization.  If
the four marked-row tuples are R00,R10,R01,R11 and

    Z = R00-R10-R01+R11,   H = R00-Z = R10+R01-R11,

then affine linearity of g1 in its second row tuple gives

    g1(R00,R11)+g1(R00,H)
      = g1(R00,R10)+g1(R00,R01).

No sign is assigned to the mixed bridge term in this identity; the proof of
the short faces uses the exact mode transfers instead.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    raw_coefficients,
)
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import (
    child_rows,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
OUTPUT = HERE / (
    "iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_exact_"
    "g1_bernstein_20260830.json"
)
MARKER = (
    "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_K0_ELL1_2_"
    "MODE_TRANSFER_G1_BERNSTEIN"
)

FILES = {
    "canonical_source":
        "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py",
    "child_source":
        "derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root.py",
    "endpoint_source":
        "assemble_iso_n5_g1_singleton_endpoint_all_placements_root.py",
    "endpoint_report":
        "iso_n5_g1_singleton_endpoint_all_placements_assembled_exact_root_20260830.json",
    "ordinary_source":
        "assemble_exact_iso_n5_bundle_g1_singleton_ordinary_all_forests_g1_bernstein.py",
    "ordinary_report":
        "iso_n5_bundle_g1_singleton_ordinary_all_forests_exact_g1_bernstein_20260830.json",
}

EXPECTED_HASHES = {
    "canonical_source":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
    "child_source":
        "8ED18D7C3116B83527A08471B0820319FFBB134E4FDA086070AB760F1F122E6B",
    "endpoint_source":
        "E8FEF64AC34D59A045733E4E66BB4F2B680E440B52D304B371343CDF1088FE42",
    "endpoint_report":
        "AE8035A52B0ED5B015768B90EB8F18AD5CC1411A940D59212B2A5A0A7BE8CE2B",
    "ordinary_source":
        "26BD9106A43BB34D24B0D0F79DFA6BDB3A2D2407F3C0517C1327BE45F1DBF172",
    "ordinary_report":
        "AE548CA6A14EEA4A16DED7F05B3F33A2CA7E9AB087E79476356773687EB0D5E9",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def add(*rows):
    return tuple(sp.expand(sum(at(row, rank) for row in rows)) for rank in range(7))


def subtract(left, *rights):
    return tuple(
        sp.expand(at(left, rank) - sum(at(row, rank) for row in rights))
        for rank in range(7)
    )


def shift(row, amount=1):
    return tuple(at(row, rank - amount) for rank in range(7))


def scale(row, scalar):
    return tuple(sp.expand(scalar * value) for value in row)


def specialize(expression, generic_c, generic_d, actual_c, actual_d):
    rules = {}
    for generic, actual in zip(generic_c + generic_d, actual_c + actual_d):
        rules.update(dict(zip(generic, actual)))
    return sp.expand(expression.subs(rules))


def polynomial_record(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    stream = "".join(
        f"{powers}:{coefficient};"
        for powers, coefficient in polynomial.terms()
    )
    return {
        "variables": len(variables),
        "monomials": len(polynomial.terms()),
        "term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }


def main() -> None:
    assert {label: sha256(HERE / name) for label, name in FILES.items()} == EXPECTED_HASHES

    endpoint = json.loads((HERE / FILES["endpoint_report"]).read_text(encoding="utf-8"))
    ordinary = json.loads((HERE / FILES["ordinary_report"]).read_text(encoding="utf-8"))
    assert endpoint["marker"] == "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_ALL_PLACEMENTS_ROOT"
    assert endpoint["source_sha256"] == EXPECTED_HASHES["endpoint_source"]
    endpoint_partition = endpoint["placement_partition"]
    assert endpoint_partition["exhaustive"] is True
    assert endpoint_partition["pairwise_disjoint"] is True
    assert {
        row["placement"] for row in endpoint_partition["truth_table"]
    } == {
        "adjacent_marks", "connected_nonadjacent_marks", "disconnected_marks"
    }
    assert ordinary["marker"] == (
        "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_ALL_FORESTS_G1_BERNSTEIN"
    )
    assert ordinary["source_sha256"] == EXPECTED_HASHES["ordinary_source"]
    assert ordinary["theorem"].startswith(
        "For every finite forest G and every ordered triple of distinct vertices"
    )

    generic_c, generic_d, raw_g1, _raw_g2 = raw_coefficients()
    variables = tuple(sorted(raw_g1.free_symbols, key=str))
    d_symbols = {symbol for row in generic_d for symbol in row}
    term_types = {"pure_C": 0, "C_times_D": 0}
    for powers, _coefficient in sp.Poly(raw_g1, *variables).terms():
        d_degree = sum(
            powers[index] for index, symbol in enumerate(variables)
            if symbol in d_symbols
        )
        assert d_degree in (0, 1)
        term_types["pure_C" if d_degree == 0 else "C_times_D"] += 1
    assert term_types == {"pure_C": 26, "C_times_D": 28}

    # Exact deletion-square polarization on four completely generic row tuples.
    r00 = tuple(tuple(sp.symbols(f"a{name}0:7")) for name in "EUVW")
    r10 = tuple(tuple(sp.symbols(f"b{name}0:7")) for name in "EUVW")
    r01 = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    r11 = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")
    mixed = tuple(
        subtract(r00[index], r10[index], r01[index], scale(r11[index], -1))
        for index in range(4)
    )
    # subtract(A,B,C,-D) = A-B-C+D.
    bridge = tuple(subtract(r00[index], mixed[index]) for index in range(4))
    assert bridge == tuple(
        subtract(add(r10[index], r01[index]), r11[index])
        for index in range(4)
    )
    square_identity = sp.expand(
        specialize(raw_g1, generic_c, generic_d, r00, r11)
        + specialize(raw_g1, generic_c, generic_d, r00, bridge)
        - specialize(raw_g1, generic_c, generic_d, r00, r10)
        - specialize(raw_g1, generic_c, generic_d, r00, r01)
    )
    assert square_identity == 0

    E = (sp.Integer(1), *sp.symbols("e1:7"))
    P = (sp.Integer(1), *sp.symbols("p1:7"))
    V = (sp.Integer(1), *sp.symbols("v1:7"))
    W = (sp.Integer(1), *sp.symbols("w1:7"))
    one_plus_x = lambda row: add(row, shift(row))
    one_plus_2x = lambda row: add(row, scale(shift(row), 2))

    literal_ell1 = child_rows(1, sp.Integer(0))
    literal_ell2 = child_rows(2, sp.Integer(0))
    unit = (sp.Integer(1),) + (sp.Integer(0),) * 6
    assert literal_ell1 == (add(unit, shift(unit)), unit, unit, unit)
    assert literal_ell2 == (
        add(unit, scale(shift(unit), 2)),
        add(unit, shift(unit)),
        add(unit, shift(unit)),
        unit,
    )

    # ell=1 original internal diagonal.
    target_c1 = (one_plus_x(E), E, one_plus_x(V), V)
    target_d1 = (P, P, W, W)
    target1 = specialize(raw_g1, generic_c, generic_d, target_c1, target_d1)

    # Transfer forest: attach a new marked leaf u to p and delete u.
    transfer_c1 = (add(E, shift(P)), E, add(V, shift(W)), V)
    transfer_d1 = (E, E, V, V)
    # This is literally the endpoint specialization after deleting marked u.
    assert transfer_d1 == (
        transfer_c1[1], transfer_c1[1], transfer_c1[3], transfer_c1[3]
    )
    transfer1 = specialize(raw_g1, generic_c, generic_d, transfer_c1, transfer_d1)
    assert sp.expand(target1 - transfer1) == 0

    # ell=2 original internal diagonal.
    target_c2 = (one_plus_2x(E), one_plus_x(E), one_plus_2x(V), one_plus_x(V))
    target_d2 = (one_plus_x(P), P, one_plus_x(W), W)
    target2 = specialize(raw_g1, generic_c, generic_d, target_c2, target_d2)

    # Transfer forest: attach the path a-u-p and delete the unmarked leaf a.
    transfer_c2 = (
        add(one_plus_x(E), shift(P)),
        one_plus_x(E),
        add(one_plus_x(V), shift(W)),
        one_plus_x(V),
    )
    transfer_d2 = (add(E, shift(P)), E, add(V, shift(W)), V)
    # The deleted vertex is the new leaf a.  Its closed neighborhood is
    # {a,u}, so C*=D*+x Q with Q=(E,E,V,V), an exact ordinary-vertex
    # deletion recurrence; a is distinct from both marks u and v.
    transfer_q2 = (E, E, V, V)
    assert transfer_c2 == tuple(
        add(transfer_d2[index], shift(transfer_q2[index]))
        for index in range(4)
    )
    transfer2 = specialize(raw_g1, generic_c, generic_d, transfer_c2, transfer_d2)
    assert sp.expand(target2 - transfer2) == 0

    records = {
        "ell1": polynomial_record(target1),
        "ell2": polynomial_record(target2),
    }
    report = {
        "marker": MARKER,
        "theorem": (
            "For every parent forest F, distinct ordinary vertex p and mark v, "
            "both literal internal-ordinary k=0 coefficients ell=1 and ell=2 "
            "are nonnegative.  The ell=1 coefficient transfers identically to "
            "singleton_endpoint on F with a new marked leaf u at p; the ell=2 "
            "coefficient transfers identically to singleton_ordinary on F with "
            "a new path a-u-p and deletion of a."
        ),
        "raw_g1_affine_structure": term_types,
        "deletion_square_polarization": (
            "Z=R00-R10-R01+R11, H=R00-Z; "
            "g1(R00,R11)+g1(R00,H)=g1(R00,R10)+g1(R00,R01)"
        ),
        "mode_transfers": {
            "ell1": {
                "original_C": "((1+x)E,E,(1+x)V,V)",
                "original_D": "(P,P,W,W)",
                "transfer_C": "(E+xP,E,V+xW,V)",
                "transfer_D": "(E,E,V,V)",
                "transfer_geometry": "new marked leaf u adjacent to p; delete u",
                "frozen_sign_theorem": "singleton_endpoint all placements",
                "raw_difference": 0,
                **records["ell1"],
            },
            "ell2": {
                "original_C": "((1+2x)E,(1+x)E,(1+2x)V,(1+x)V)",
                "original_D": "((1+x)P,P,(1+x)W,W)",
                "transfer_C": "((1+x)E+xP,(1+x)E,(1+x)V+xW,(1+x)V)",
                "transfer_D": "(E+xP,E,V+xW,V)",
                "transfer_geometry": "new path a-u-p with u marked; delete unmarked leaf a",
                "frozen_sign_theorem": "singleton_ordinary all forests",
                "raw_difference": 0,
                **records["ell2"],
            },
        },
        "parent_geometry_coverage": [
            "p adjacent to v",
            "p connected and nonadjacent to v",
            "p and v in distinct components",
        ],
        "applicability_guards": {
            "input_vertices": (
                "F is a forest; p and v are distinct vertices of F; the new "
                "vertices u (and a for ell=2) are distinct from V(F)."
            ),
            "forest_preservation": (
                "Attaching one new leaf u-p or one new path a-u-p at the single "
                "old vertex p preserves acyclicity for every forest F."
            ),
            "ell1_mode": (
                "The deletion vertex is the marked leaf u, and D*=(C*_U,C*_U,"
                "C*_W,C*_W) exactly; this is singleton_endpoint."
            ),
            "ell1_mark_placement": (
                "Since p!=v and u has only neighbor p, u and v are never "
                "adjacent. They are connected iff p and v are connected in F; "
                "both endpoint placements are in the exhaustive frozen theorem."
            ),
            "ell2_mode": (
                "The deletion vertex is the new unmarked leaf a, distinct from "
                "marks u,v, with exact recurrence C*=D*+x(E,E,V,V); this is "
                "singleton_ordinary on a forest."
            ),
            "parent_occupation_split": (
                "No identity uses the p-v adjacency indicator, so epsilon=0 "
                "and epsilon=1, including both connected and disconnected "
                "nonadjacent placements, are covered without a boundary case."
            ),
        },
        "closed_literal_faces": [
            {"ell": ell, "k": 0, "parent_geometry": geometry}
            for ell in (1, 2)
            for geometry in ("adjacent", "nonadjacent")
        ],
        "dependencies_sha256": EXPECTED_HASHES,
        "status": "exact all-order mode-transfer theorem",
        "scope": (
            "Exactly the four literal internal-ordinary rank-five g1 faces "
            "ell in {1,2}, k=0, for both parent occupation geometries.  This "
            "does not assert other Newton cells, internal-endpoint, g2, all N5, "
            "or Erdos Problem 993."
        ),
        "source_sha256": sha256(SOURCE),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "closed_literal_faces": report["closed_literal_faces"],
        "mode_transfers": report["mode_transfers"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
