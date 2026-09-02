#!/usr/bin/env python3
"""Solver-free exact replay for literal small-broom k=0, ell=3,...,7.

The former small-length wrapper substituted polynomial continuations of path
coefficients beyond their combinatorial support.  This theorem instead uses
the literal truncated rows from ``child_rows``.  For each of the five lengths
and both parent placements it replays the saved rational decomposition from
scratch, with no numerical optimizer imported or called.

The parent partition is

    W=A, P=A+xB, V=A+xC, E=A+xB+xC+epsilon*x^2D.

Here epsilon=0 is the adjacent p-v face and epsilon=1 the nonadjacent face.
All interval, forest-row, dominance, and global S/C5/N4 generators have
pinned all-order sign theorems.  Nonnegative rational weights and a literal
coefficientwise nonnegative remainder therefore prove each target.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_common_factor_product_rule_root import defect_form, nested
from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from derive_iso_nested_compact_operator_root import w as bw, z as bz
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k0_ell3_7_literal_all_parent_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_ELL3_7_LITERAL_ALL_PARENT_G1_NONADJACENT"
DISCOVERY_REPORT = (
    "iso_n5_g1_internal_ordinary_small_k0_cross_length_parent_cone_probe_"
    "g1_nonadjacent_20260830.json"
)

DEPENDENCIES = {
    "derive_iso_common_factor_product_rule_root.py":
        "11AFA5656137329D27760B1D64782F6FD4C0B50573F922283CC9155C3080D85E",
    "derive_iso_nested_compact_operator_root.py":
        "473357171AE9F1A9B75F84C37155E1AB580DC62F3F12CDA69EEEED58DA1CFEC9",
    "derive_iso_n5_g1_internal_ordinary_broom_factor_root.py":
        "183528806BCBEBC38C9C2D1830D86CE83BD5567FD4DA333CFFAEA8FE406C5605",
    "iso_n5_g1_internal_ordinary_broom_factor_root_20260830.json":
        "0FBB991352B7736DC4CE7A28932FB60CD8B3CA9ACBADB2F91F16C306F7DE4DF8",
    "derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root.py":
        "8ED18D7C3116B83527A08471B0820319FFBB134E4FDA086070AB760F1F122E6B",
    "iso_n5_g1_internal_ordinary_small_broom_parameters_exact_root_20260830.json":
        "62B4298DB9973653242530EE1F1D7209E98C4E1EE4217C73AB5C8328D375A4A3",
    "probe_iso_n5_g1_internal_ordinary_small_k0_cross_length_parent_cone_g1_nonadjacent.py":
        "0399A73F9C097B1E4DBBB2C2AAA70FA5FFF8B9CDC8B3A6134B91BC36A44C183D",
    DISCOVERY_REPORT:
        "72F16F941DA6CA1D67FAB28D8DDFC83D1C6D7A05D1202F54CCB40B5AD1FBC162",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent.py":
        "FCA5115C5D303352DBBC001B305207D583219335326BC48D0C4BFEEE90FB5C1B",
    "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json":
        "27E70D94ED97F659E62D63527365906D33123EFDB4E6F8168951061B83BFCCA1",
    "prove_iso_n5_g1_internal_endpoint_all_forest_root.py":
        "6AC88AE1DD91F9844A9E5E5D6782AD0FD8A566CE21F8BEB7BA0D2EF3E985319A",
    "iso_n5_g1_internal_endpoint_all_forest_exact_root_20260830.json":
        "8F30FB08E62709D3449B16F7E7B6DFC12241F7D810446D6CBBDD5BA439E0890E",
    "audit_iso_n5_g1_internal_endpoint_all_forest_independent_rank5_g2_alt.py":
        "4EDD7C1A3344E6F3BDED891C75F73879F531788F1695ED930722F7EB5494909A",
    "iso_n5_g1_internal_endpoint_all_forest_independent_audit_rank5_g2_alt_20260830.json":
        "FEAEF159A37BB5BBBBC90EDEEDEA711543595BBFF1A711E217FFC5233CE349C6",
    "assemble_iso_n5_s_all_marked_forests_root.py":
        "E56AA4AD8AF3FE936DAF8354A6D7BAD1BAC5AFDCCD6C4436FB198A0FC76D479E",
    "iso_n5_s_all_marked_forests_exact_root_20260830.json":
        "E4FDD1215C0924A40E2B6D47BAC9CF5BB54830686AAB6E5F1188D8F25F386CBE",
    "assemble_iso_n5_c5_all_marked_forests_root.py":
        "9C6E4B5C145378DDE7615A476158F4546F0687CCA910172B4735E2A62443FECA",
    "iso_n5_c5_all_marked_forests_exact_root_20260830.json":
        "F341C659D1B2DEC584D00AE4D86DA9BBCCA75EA91001179A95B30EB6CD584C02",
    "assemble_iso_all_forest_n4_bundle_induction_root.py":
        "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
    "iso_all_forest_n4_bundle_induction_exact_root_20260829.json":
        "28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
    "audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py":
        "E656BEE9BC8412B99ABB93CBFB484985C9B2EBEFB5FC575437385B7AD2B8B29B",
    "iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json":
        "0D341C165A35835F08DE48852540FBD3B83BC133CB0871F9930B862D0C3B1B21",
}

TARGET_HASHES = {
    (1, 0): "71FC2704E7F8B5E80AF42B4FEFFF96F1C9714F51F22CDBAA1ACC22A8776DB7B9",
    (1, 1): "C696025BB8A343DE7DA6978F4180EE2232721426429B32119B3FA8A85F67FC78",
    (2, 0): "44444A4C76DD9CBF8ACD578975AD4B1A524FD53EB8DA91014E1D6C440DDA7FA1",
    (2, 1): "C53392FE8FFA551115CE9825319F5B77009EF08AB8DBC9426BB764E360132D66",
    (3, 0): "01546358A631042F63E0CAE78D7F1F31B8EBCBFEC67C9C5E23907BD63CBE426E",
    (3, 1): "A47BC1C443184C08A4C1827C748E2F24A041A17332082BEAD7629877FD2B7A6F",
    (4, 0): "4AE6D4C9EDDE178712E3DDBB0C32E912221A0236C8D160E80AD99F90626E15B6",
    (4, 1): "C4EAAB66EEE8510163E52C88608492F6C9320BFFE9CCD27879C1FAA91FC88659",
    (5, 0): "9E6DED9420D303575DEF2FD0B1395D85A04AC23A6F00DDF7D5146FB4267E8AE7",
    (5, 1): "286363A166772B218820A917463B67A8FF1408CFFA20DB63751DE75B7C8BF52A",
    (6, 0): "D0897E6CC90A49EA53EE019991F445624F7E8BA3A1D819AD43848FFE7DD298FA",
    (6, 1): "C0B0BB5C229E90D8AD9F6734E02D787D98BF43B827F16C1FF6F37A39B2BB025E",
    (7, 0): "C2C9AF0EBF4CC344EF1A47EB806656FEF2374CD223CC163BD96690A1A9E2A456",
    (7, 1): "A7C938C9C2A1B997876CDE9F2C802287EA2B4B3F438AE963E93317B406C34A21",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def polynomial_tuple(row):
    pz = sum(value * bz**index for index, value in enumerate(row))
    pw = sum(value * bw**index for index, value in enumerate(row))
    return pz, pw, sp.diff(pz, bz), sp.diff(pw, bw)


def coefficient(expression, left, right):
    return sp.expand(expression).coeff(bz, left).coeff(bw, right)


def compact_forms(crows):
    tuples = tuple(polynomial_tuple(row) for row in crows)
    nvalue = nested(tuples)
    rvalue = defect_form(tuples)
    n4 = coefficient(nvalue, 4, 4)
    m5 = 2 * coefficient(nvalue, 4, 5)
    c5 = coefficient(rvalue, 4, 4) - coefficient(rvalue, 3, 5)
    return {
        "N4_C": sp.expand(n4),
        "C5_C": sp.expand(c5),
        "S_C": sp.expand(m5 + 3 * c5),
    }


def interval_basis(full, deleted, prefix):
    expressions = unique_expressions(interval_cells(P, H))[1:]
    mapping = {P[0]: 1, H[0]: 1}
    mapping.update({P[index]: full[index] for index in range(1, len(full))})
    mapping.update({H[index]: deleted[index] for index in range(1, len(deleted))})
    supported = set(mapping)
    return [
        (f"interval_{prefix}_{label}", sp.expand(expression.subs(mapping)))
        for label, expression in enumerate(expressions, 2)
        if expression.free_symbols.issubset(supported)
    ]


def universal_row_basis(row, prefix):
    result = []
    if len(row) > 5:
        result.append((f"HC_{prefix}", row[3] ** 2 - row[1] * row[5]))
    if len(row) > 4:
        result.extend([
            (f"Q3_{prefix}", 6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]),
            (f"two_step_{prefix}", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
        ])
    if len(row) > 3:
        result.append((
            f"rank2_companion_{prefix}",
            2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2],
        ))
    return [(label, sp.expand(value)) for label, value in result]


def row_difference(full, deleted):
    return tuple(sp.expand(left - right) for left, right in zip(full, deleted))


def bridge_row(child_full, child_deleted, parent_full, parent_deleted):
    product = convolve(child_full, parent_full)
    forbidden = convolve(
        row_difference(child_full, child_deleted),
        row_difference(parent_full, parent_deleted),
    )
    return tuple(sp.expand(value - removed) for value, removed in zip(product, forbidden))


def target_for_length(expression, rows, ell):
    actual = child_rows(ell, sp.Integer(0))
    rules = {
        rows[name][rank]: actual[index][rank]
        for index, name in enumerate(("X", "U", "Y", "Z"))
        for rank in range(1, 7)
    }
    return sp.expand(expression.subs(rules)), actual


def parent_chart(rows, epsilon):
    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    rules = {}
    for rank in range(1, 7):
        rules.update({
            rows["W"][rank]: at(a, rank),
            rows["P"][rank]: at(a, rank) + at(b, rank - 1),
            rows["V"][rank]: at(a, rank) + at(c, rank - 1),
            rows["E"][rank]: (
                at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                + epsilon * at(d, rank - 2)
            ),
        })
    active = (("A", a), ("B", b), ("C", c)) + (("D", d),) * epsilon
    variables = tuple(symbol for _name, row in active for symbol in row[1:])
    return rules, active, variables


def parent_basis(rows, child, partition_rules, active, variables, epsilon):
    x0, u0, y0, z0 = child
    e, p, vrow, wrow = (rows[name] for name in ("E", "P", "V", "W"))
    constants = {
        row[0]: 1
        for row in (rows["X"], rows["U"], rows["Y"], rows["Z"], e, p, vrow, wrow)
    }
    states = {
        "bridge_G": (
            bridge_row(x0, y0, e, p), bridge_row(u0, z0, e, p),
            bridge_row(x0, y0, vrow, wrow), bridge_row(u0, z0, vrow, wrow),
        ),
        "00_C": (
            convolve(x0, e), convolve(u0, e),
            convolve(x0, vrow), convolve(u0, vrow),
        ),
        "10_delete_a": (
            convolve(y0, e), convolve(z0, e),
            convolve(y0, vrow), convolve(z0, vrow),
        ),
        "01_delete_p": (
            convolve(x0, p), convolve(u0, p),
            convolve(x0, wrow), convolve(u0, wrow),
        ),
        "11_D": (
            convolve(y0, p), convolve(z0, p),
            convolve(y0, wrow), convolve(z0, wrow),
        ),
    }
    global_payments = []
    for state_name, state_rows in states.items():
        forms = compact_forms(state_rows)
        for form_name in ("S_C", "C5_C", "N4_C"):
            global_payments.append((
                f"global_ell_target_{form_name.replace('_C', '')}_{state_name}",
                sp.expand(forms[form_name].subs(constants)),
            ))

    a, b, c = (active[index][1] for index in range(3))
    d = active[3][1] if epsilon else None
    basis = interval_basis(a, b, "A_B") + interval_basis(a, c, "A_C")
    if epsilon:
        basis += interval_basis(b, d, "B_D") + interval_basis(c, d, "C_D")
    for name, row in active:
        basis.extend(universal_row_basis(row, name))
    basis.extend([
        (label, sp.expand(candidate.subs(partition_rules)))
        for label, candidate in global_payments
    ])

    multipliers = [("one", sp.Integer(1))] + [(str(symbol), symbol) for symbol in variables]
    deletion_pairs = [("A_B", a, b), ("A_C", a, c)]
    if epsilon:
        deletion_pairs.extend([("B_D", b, d), ("C_D", c, d)])
    for pair_name, full, deleted in deletion_pairs:
        for rank in range(1, min(len(full), len(deleted))):
            difference = full[rank] - deleted[rank]
            for multiplier_name, multiplier in multipliers:
                basis.append((
                    f"dominance_{pair_name}_{rank}_times_{multiplier_name}",
                    sp.expand(difference * multiplier),
                ))
    assert len(basis) == (464 if epsilon else 227)
    assert len({label for label, _value in basis}) == len(basis)
    return basis


def polynomial_stream(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    stream = "".join(
        f"{powers}:{value};" for powers, value in polynomial.terms()
    )
    return polynomial, hashlib.sha256(stream.encode()).hexdigest().upper()


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name

    factor = load("iso_n5_g1_internal_ordinary_broom_factor_root_20260830.json")
    parameters = load("iso_n5_g1_internal_ordinary_small_broom_parameters_exact_root_20260830.json")
    discovery = load(DISCOVERY_REPORT)
    componentwise = load("iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json")
    endpoint = load("iso_n5_g1_internal_endpoint_all_forest_exact_root_20260830.json")
    endpoint_audit = load("iso_n5_g1_internal_endpoint_all_forest_independent_audit_rank5_g2_alt_20260830.json")
    s_theorem = load("iso_n5_s_all_marked_forests_exact_root_20260830.json")
    c5_theorem = load("iso_n5_c5_all_marked_forests_exact_root_20260830.json")
    n4_theorem = load("iso_all_forest_n4_bundle_induction_exact_root_20260829.json")
    n4_audit = load("iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json")

    assert factor["marker"] == "DERIVED_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_BROOM_FACTOR_ROOT"
    assert parameters["marker"] == "DERIVED_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_BROOM_PARAMETERS_ROOT"
    assert discovery["marker"] == "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_CROSS_LENGTH_PARENT_CONE_G1_NONADJACENT"
    assert componentwise["marker"] == "PASS_EXACT_ISO_N5_DISCONNECTED_M5_ALL_COMPONENTWISE_G1_NONADJACENT"
    assert endpoint["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_ALL_FOREST_ROOT"
    assert endpoint_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_ALL_FOREST_AUDIT_RANK5_G2_ALT"
    assert s_theorem["marker"] == "PASS_EXACT_ISO_N5_S_ALL_MARKED_FORESTS_ROOT"
    assert c5_theorem["marker"] == "PASS_EXACT_ISO_N5_C5_ALL_MARKED_FORESTS_ROOT"
    assert n4_theorem["marker"] == "PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT"
    assert n4_audit["marker"] == "PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_AUDIT_BUNDLE_G12"
    assert set(endpoint["sign_generators"]) == {
        "C5_C", "HC", "Q3", "dominance", "interval_sums",
        "rank2_companion", "two_step",
    }

    saved_faces = {
        (face["ell"], face["epsilon"]): face
        for face in discovery["literal_faces"]
    }
    assert set(saved_faces) == set(TARGET_HASHES)
    for key, expected in TARGET_HASHES.items():
        assert saved_faces[key]["target_term_stream_sha256"] == expected
    assert all(not saved_faces[(ell, epsilon)]["exact_rational_certificate"] for ell in (1, 2) for epsilon in (0, 1))
    assert all(saved_faces[(ell, epsilon)]["exact_rational_certificate"] for ell in range(3, 8) for epsilon in (0, 1))

    expression, rows = ordinary_expression()
    replayed = []
    total_weights = 0
    total_residual_terms = 0
    for ell in range(3, 8):
        for epsilon in (0, 1):
            saved = saved_faces[(ell, epsilon)]
            target_raw, child = target_for_length(expression, rows, ell)
            partition_rules, active, variables = parent_chart(rows, epsilon)
            target = sp.expand(target_raw.subs(partition_rules))
            target_poly, target_hash = polynomial_stream(target, variables)
            assert target_hash == TARGET_HASHES[(ell, epsilon)]
            assert len(target_poly.terms()) == saved["target_monomials"]

            basis = parent_basis(
                rows, child, partition_rules, active, variables, epsilon
            )
            basis_map = dict(basis)
            weights = {
                label: sp.Rational(value)
                for label, value in saved["weights"].items()
            }
            assert weights and all(value >= 0 for value in weights.values())
            assert set(weights).issubset(basis_map)
            residual = sp.expand(target - sum(
                weight * basis_map[label] for label, weight in weights.items()
            ))
            residual_poly, residual_hash = polynomial_stream(residual, variables)
            coefficients = residual_poly.coeffs()
            assert coefficients and all(value >= 0 for value in coefficients)
            assert residual_hash == saved["residual_stream_sha256"]
            assert len(residual_poly.terms()) == saved["nonzero_residual_coefficients"]
            assert min(coefficients) > 0

            family_counts = {
                "interval": sum(label.startswith("interval_") for label in weights),
                "universal_row": sum(label.startswith(("HC_", "Q3_", "two_step_", "rank2_")) for label in weights),
                "global_payment": sum(label.startswith("global_") for label in weights),
                "dominance": sum(label.startswith("dominance_") for label in weights),
            }
            total_weights += len(weights)
            total_residual_terms += len(residual_poly.terms())
            replayed.append({
                "ell": ell,
                "epsilon": epsilon,
                "geometry": "nonadjacent" if epsilon else "adjacent",
                "target_monomials": len(target_poly.terms()),
                "target_term_stream_sha256": target_hash,
                "basis_size": len(basis),
                "nonzero_weights": len(weights),
                "weight_families": family_counts,
                "residual_terms": len(residual_poly.terms()),
                "minimum_positive_residual_coefficient": str(min(coefficients)),
                "residual_stream_sha256": residual_hash,
            })

    report = {
        "marker": MARKER,
        "theorem": (
            "For every internal-ordinary parent deletion square, collision count k=0, "
            "broom length ell in {3,4,5,6,7}, and either adjacent or nonadjacent "
            "ordinary-parent placement, the rank-five g1 Newton cell is nonnegative."
        ),
        "literal_child_rows": (
            "child_rows uses combinatorial path truncation: coefficients outside "
            "the independence-number support are exactly zero."
        ),
        "parent_partition": "W=A, P=A+xB, V=A+xC, E=A+xB+xC+epsilon*x^2D",
        "generator_signs": {
            "interval_sums": "all 2..16 by the pinned full componentwise-deletion M5 theorem",
            "forest_rows": "HC, Q3, two_step, rank2_companion by the pinned independently audited endpoint theorem inputs",
            "dominance": "every induced-deletion coefficient difference times a nonnegative coefficient",
            "global_payments": "S, C5, and N4 on genuine marked-forest states by their pinned all-order theorems",
        },
        "faces": replayed,
        "counts": {
            "lengths": 5,
            "geometries_per_length": 2,
            "exact_faces": len(replayed),
            "nonzero_rational_weights": total_weights,
            "positive_residual_terms": total_residual_terms,
        },
        "quarantined_old_continuation": (
            "No weight from the former remapped ell<8 polynomial-continuation probes is used."
        ),
        "remaining_k0_faces": [
            {"ell": ell, "geometry": geometry}
            for ell in (1, 2) for geometry in ("adjacent", "nonadjacent")
        ],
        "dependencies_sha256": DEPENDENCIES,
        "scope": (
            "Exactly internal-ordinary small-broom k=0 for ell=3..7 in both "
            "parent placements. Ell=1,2; k>=1; other canonical modes; g2; all N5; "
            "and Erdos Problem 993 are not claimed."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "counts": report["counts"],
        "remaining_k0_faces": report["remaining_k0_faces"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
