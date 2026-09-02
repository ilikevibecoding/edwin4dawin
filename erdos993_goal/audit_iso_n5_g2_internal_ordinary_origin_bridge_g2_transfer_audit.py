#!/usr/bin/env python3
"""Independent solver-free audit of the internal-ordinary g2 origin bridge.

This source reconstructs the ell=8, collision-Newton-index zero target directly
from the raw 70-term g2 functional.  It independently rebuilds the five genuine
marked-forest states, the exact parent occupation partition, and only the sign
generators carrying nonzero weights in the producer certificate.  The saved
rational weights are replayed without importing the producer implementation or
calling a numerical optimizer.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    binomial_polynomial,
    convolve,
    nested,
    raw_coefficients,
)
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H as INTERVAL_H,
    P as INTERVAL_P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
PRODUCER_REPORT = (
    "iso_n5_g2_internal_ordinary_ell8_k0_bridge_cone_probe_"
    "rank5_g2_alt_20260830.json"
)
OUTPUT = HERE / (
    "iso_n5_g2_internal_ordinary_origin_bridge_independent_audit_exact_"
    "g2_transfer_audit_20260830.json"
)
MARKER = (
    "PASS_INDEPENDENT_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ORIGIN_"
    "BRIDGE_G2_TRANSFER_AUDIT"
)

FILES = {
    "canonical_source":
        "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py",
    "child_source":
        "derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root.py",
    "componentwise_source":
        "prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent.py",
    "componentwise_report":
        "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json",
    "two_step_source":
        "verify_two_step_factorial_drop_forest_certificate.py",
    "n4_source":
        "assemble_iso_all_forest_n4_bundle_induction_root.py",
    "n4_report":
        "iso_all_forest_n4_bundle_induction_exact_root_20260829.json",
    "no_parent_source":
        "prove_iso_n5_g2_no_parent_k0_all_forest_rank5_g2_alt.py",
    "no_parent_report":
        "iso_n5_g2_no_parent_k0_all_forest_exact_rank5_g2_alt_20260830.json",
    "endpoint_source":
        "assemble_iso_n5_g2_singleton_endpoint_all_forest_rank5_g2_alt.py",
    "endpoint_report":
        "iso_n5_g2_singleton_endpoint_all_forest_assembled_exact_rank5_g2_alt_20260830.json",
    "producer_source":
        "probe_iso_n5_g2_internal_ordinary_origin_bridge_cone_rank5_g2_alt.py",
    "producer_report": PRODUCER_REPORT,
}

EXPECTED_HASHES = {
    "canonical_source":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
    "child_source":
        "8ED18D7C3116B83527A08471B0820319FFBB134E4FDA086070AB760F1F122E6B",
    "componentwise_source":
        "FCA5115C5D303352DBBC001B305207D583219335326BC48D0C4BFEEE90FB5C1B",
    "componentwise_report":
        "27E70D94ED97F659E62D63527365906D33123EFDB4E6F8168951061B83BFCCA1",
    "two_step_source":
        "C9EE3DE3E13499FC9863649481D98413E4BA7B7FEE231DC371DC518FB15B6EF6",
    "n4_source":
        "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
    "n4_report":
        "28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
    "no_parent_source":
        "A8B04ACED34B1A9C5E2B504FE292FEC9F950EB4E22C68AEBFEE38D436DEEFB7F",
    "no_parent_report":
        "F1573D4E391CB51DFBCBE3A78A14EFA22264D46EE64046E8D2C66C7B88F385BF",
    "endpoint_source":
        "1E8494EBC450B1750644A8B6C75FA91EE3BA46659979F02BF393A6281A15B5CE",
    "endpoint_report":
        "577E3ECB64138663D9A31FD682F963E07B9BC08EBAB6F2D61E49635BE9E24228",
    "producer_source":
        "7203D941660EAC630037ADBA6647581A8A668486FCB2D728641E8F1A0B3750E7",
    "producer_report":
        "0BFEDAFB659AEE0A751556096A89C766BC88F99ABFA56FD3C9A2FB1175BBEBA4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def row_add(left, right):
    return tuple(sp.expand(a + b) for a, b in zip(left, right))


def row_subtract(left, right):
    return tuple(sp.expand(a - b) for a, b in zip(left, right))


def bridge_row(child_full, child_deleted, parent_full, parent_deleted):
    """I((child disjoint parent)+attachment edge)."""
    product = convolve(child_full, parent_full)
    forbidden = convolve(
        row_subtract(child_full, child_deleted),
        row_subtract(parent_full, parent_deleted),
    )
    return row_subtract(product, forbidden)


def specialize(expression, generic_c, generic_d, crows, drows):
    rules = {
        symbol: value
        for generic, actual in zip(generic_c + generic_d, crows + drows)
        for symbol, value in zip(generic, actual)
    }
    return sp.expand(expression.subs(rules))


def interval_basis(full, deleted, prefix):
    expressions = unique_expressions(interval_cells(INTERVAL_P, INTERVAL_H))[1:]
    mapping = {INTERVAL_P[0]: 1, INTERVAL_H[0]: 1}
    mapping.update({INTERVAL_P[index]: full[index] for index in range(1, len(full))})
    mapping.update({INTERVAL_H[index]: deleted[index] for index in range(1, len(deleted))})
    supported = set(mapping)
    return {
        f"interval_{prefix}_{label}": sp.expand(expression.subs(mapping))
        for label, expression in enumerate(expressions, 2)
        if expression.free_symbols.issubset(supported)
    }


def universal_row_basis(row, prefix):
    result = {}
    if len(row) > 5:
        result[f"HC_{prefix}"] = sp.expand(row[3] ** 2 - row[1] * row[5])
    if len(row) > 4:
        result[f"Q3_{prefix}"] = sp.expand(
            6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]
        )
        result[f"two_step_{prefix}"] = sp.expand(
            2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]
        )
    if len(row) > 3:
        result[f"rank2_companion_{prefix}"] = sp.expand(
            2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]
        )
    return result


def parent_order_box_basis(e, p, v, w, n0, shift=13):
    """Independently rebuild the producer's valid large-parent row boxes."""
    rows = {"E": e, "P": p, "V": v, "W": w}
    orders = {
        "E": n0 + shift,
        "P": n0 + shift - 1,
        "V": n0 + shift - 1,
        "W": n0 + shift - 2,
    }
    order_rules = {rows[name][1]: order for name, order in orders.items()}
    variables = (n0,) + tuple(
        rows[name][rank] for name in ("E", "P", "V", "W") for rank in range(2, 7)
    )
    multipliers = [("one", sp.Integer(1))] + [
        (str(symbol), symbol) for symbol in variables
    ]
    basis = {}
    for name in ("E", "P", "V", "W"):
        order = orders[name]
        for rank in range(2, 7):
            value = rows[name][rank]
            floor = binomial_polynomial(order - rank + 1, rank)
            ceiling = binomial_polynomial(order, rank)
            for bound_name, gap in (
                ("path_floor", sp.expand(value - floor)),
                ("edgeless_ceiling", sp.expand(ceiling - value)),
            ):
                for multiplier_name, multiplier in multipliers:
                    basis[
                        f"{name}_{rank}_{bound_name}_times_{multiplier_name}"
                    ] = sp.expand(gap * multiplier)
    return basis, order_rules


def polynomial_stream(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    stream = "".join(
        f"{powers}:{coefficient};"
        for powers, coefficient in polynomial.terms()
        if coefficient
    )
    return polynomial, hashlib.sha256(stream.encode()).hexdigest().upper()


def main() -> None:
    assert {label: sha256(HERE / name) for label, name in FILES.items()} == EXPECTED_HASHES
    producer = json.loads((HERE / PRODUCER_REPORT).read_text(encoding="utf-8"))
    assert producer["marker"] == (
        "PROBE_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ORIGIN_BRIDGE_CONE_RANK5_G2_ALT"
    )
    assert producer["cell"] == {"ell": 8, "k_index": 0}
    assert producer["status"] == "exact theorem certificate"
    assert len(producer["faces"]) == 2
    assert all(face["exact_rational_certificate"] for face in producer["faces"])

    componentwise = json.loads(
        (HERE / FILES["componentwise_report"]).read_text(encoding="utf-8")
    )
    n4 = json.loads((HERE / FILES["n4_report"]).read_text(encoding="utf-8"))
    no_parent = json.loads(
        (HERE / FILES["no_parent_report"]).read_text(encoding="utf-8")
    )
    endpoint = json.loads(
        (HERE / FILES["endpoint_report"]).read_text(encoding="utf-8")
    )
    assert componentwise["marker"] == (
        "PASS_EXACT_ISO_N5_DISCONNECTED_M5_ALL_COMPONENTWISE_G1_NONADJACENT"
    )
    assert n4["marker"] == "PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT"
    assert no_parent["marker"] == "PASS_EXACT_ISO_N5_G2_NO_PARENT_K0_ALL_FOREST_RANK5_G2_ALT"
    assert endpoint["marker"] == "PASS_EXACT_ISO_N5_G2_SINGLETON_ENDPOINT_ALL_FOREST_RANK5_G2_ALT"
    assert n4["source_sha256"] == EXPECTED_HASHES["n4_source"]
    assert no_parent["source_sha256"] == EXPECTED_HASHES["no_parent_source"]
    assert endpoint["source_sha256"] == EXPECTED_HASHES["endpoint_source"]

    generic_c, generic_d, _raw_g1, raw_g2 = raw_coefficients()
    X, U, Y, Z = child_rows(8, sp.Integer(0))
    E = (sp.Integer(1), *sp.symbols("e1:7"))
    P = (sp.Integer(1), *sp.symbols("p1:7"))
    V = (sp.Integer(1), *sp.symbols("v1:7"))
    W = (sp.Integer(1), *sp.symbols("w1:7"))

    states = {
        "00_C": (
            convolve(X, E), convolve(U, E),
            convolve(X, V), convolve(U, V),
        ),
        "10_delete_a": (
            convolve(Y, E), convolve(Z, E),
            convolve(Y, V), convolve(Z, V),
        ),
        "01_delete_p": (
            convolve(X, P), convolve(U, P),
            convolve(X, W), convolve(U, W),
        ),
        "11_D": (
            convolve(Y, P), convolve(Z, P),
            convolve(Y, W), convolve(Z, W),
        ),
        "bridge_G": (
            bridge_row(X, Y, E, P), bridge_row(U, Z, E, P),
            bridge_row(X, Y, V, W), bridge_row(U, Z, V, W),
        ),
    }
    target = specialize(
        raw_g2, generic_c, generic_d, states["00_C"], states["11_D"]
    )
    n0 = sp.symbols("n0", integer=True, nonnegative=True)
    parent_boxes, _parent_order_rules = parent_order_box_basis(
        E, P, V, W, n0, shift=13
    )

    # Exact row identities for the two ordinary deletions and their square.
    assert states["10_delete_a"][0] == convolve(Y, E)
    assert states["01_delete_p"][0] == convolve(X, P)
    assert states["11_D"][0] == convolve(Y, P)
    assert states["bridge_G"][0] == row_subtract(
        convolve(X, E), convolve(row_subtract(X, Y), row_subtract(E, P))
    )

    global_payments = {}
    for state_name, rows in states.items():
        global_payments[f"global_N4_{state_name}"] = sp.expand(nested(rows, 4))
        global_payments[f"global_g2_no_parent_{state_name}"] = specialize(
            raw_g2, generic_c, generic_d, rows, rows
        )
        # Reconstruct both endpoint specializations even when their saved
        # weights vanish, auditing that every advertised global state supports
        # the frozen endpoint theorem.
        se, su, sv, sw = rows
        global_payments[f"global_g2_endpoint_first_{state_name}"] = specialize(
            raw_g2, generic_c, generic_d, rows, (su, su, sw, sw)
        )
        global_payments[f"global_g2_endpoint_second_{state_name}"] = specialize(
            raw_g2, generic_c, generic_d, rows, (sv, sw, sv, sw)
        )

    replayed = []
    for face in sorted(producer["faces"], key=lambda row: row["epsilon"]):
        epsilon = face["epsilon"]
        a = (sp.Integer(1), *sp.symbols("a1:7"))
        b = (sp.Integer(1), *sp.symbols("b1:6"))
        c = (sp.Integer(1), *sp.symbols("c1:6"))
        d = (sp.Integer(1), *sp.symbols("d1:5"))
        parent_rules = {}
        for rank in range(1, 7):
            parent_rules.update({
                W[rank]: at(a, rank),
                P[rank]: at(a, rank) + at(b, rank - 1),
                V[rank]: at(a, rank) + at(c, rank - 1),
                E[rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        active = (("A", a), ("B", b), ("C", c)) + (("D", d),) * epsilon
        # The parent has order at least 13.  Since W is the common row after
        # deleting both marked vertices, |W|=n0+11 and the other three row
        # orders are forced by the occupation partition.
        a_order_rule = {a[1]: n0 + 11}
        variables = (n0,) + tuple(
            symbol for _name, row in active for symbol in row[1:]
            if symbol != a[1]
        )

        basis = {}
        basis.update({
            label: sp.expand(value.subs(a_order_rule))
            for label, value in interval_basis(a, b, "A_B").items()
        })
        basis.update({
            label: sp.expand(value.subs(a_order_rule))
            for label, value in interval_basis(a, c, "A_C").items()
        })
        if epsilon:
            basis.update({
                label: sp.expand(value.subs(a_order_rule))
                for label, value in interval_basis(b, d, "B_D").items()
            })
            basis.update({
                label: sp.expand(value.subs(a_order_rule))
                for label, value in interval_basis(c, d, "C_D").items()
            })
        for name, row in active:
            basis.update({
                label: sp.expand(value.subs(a_order_rule))
                for label, value in universal_row_basis(row, name).items()
            })
        basis.update({
            label: sp.expand(value.subs(parent_rules).subs(a_order_rule))
            for label, value in global_payments.items()
        })
        basis.update({
            f"parent_box_{label}": sp.expand(
                value.subs(parent_rules).subs(a_order_rule)
            )
            for label, value in parent_boxes.items()
        })
        multipliers = [("one", sp.Integer(1))] + [
            (str(symbol), symbol) for symbol in variables
        ]
        pairs = [("A_B", a, b), ("A_C", a, c)]
        if epsilon:
            pairs.extend((("B_D", b, d), ("C_D", c, d)))
        for pair_name, full, deleted in pairs:
            for rank in range(1, min(len(full), len(deleted))):
                difference = full[rank] - deleted[rank]
                for multiplier_name, multiplier in multipliers:
                    basis[
                        f"dominance_{pair_name}_{rank}_times_{multiplier_name}"
                    ] = sp.expand((difference * multiplier).subs(a_order_rule))

        weights = {
            label: sp.Rational(value) for label, value in face["weights"].items()
        }
        assert weights and all(value > 0 for value in weights.values())
        assert set(weights).issubset(basis)
        reduced_target = sp.expand(target.subs(parent_rules).subs(a_order_rule))
        target_poly = sp.Poly(reduced_target, *variables)
        assert len(target_poly.terms()) == face["target_monomials"]
        residual = sp.expand(
            reduced_target
            - sum(weight * basis[label] for label, weight in weights.items())
        )
        residual_poly, residual_hash = polynomial_stream(residual, variables)
        assert residual_poly.terms()
        assert all(coefficient >= 0 for coefficient in residual_poly.coeffs())
        assert len(residual_poly.terms()) == face["nonzero_residual_coefficients"]
        assert residual_hash == face["residual_stream_sha256"]

        families = {
            "interval": sum(label.startswith("interval_") for label in weights),
            "dominance": sum(label.startswith("dominance_") for label in weights),
            "parent_box": sum(label.startswith("parent_box_") for label in weights),
            "two_step": sum(label.startswith("two_step_") for label in weights),
            "rank2_companion": sum(
                label.startswith("rank2_companion_") for label in weights
            ),
            "N4": sum(label.startswith("global_N4_") for label in weights),
            "g2_no_parent": sum(
                label.startswith("global_g2_no_parent_") for label in weights
            ),
            "g2_endpoint": sum(
                label.startswith("global_g2_endpoint_") for label in weights
            ),
        }
        assert sum(families.values()) == len(weights)
        replayed.append({
            "epsilon": epsilon,
            "geometry": face["geometry"],
            "target_monomials": len(target_poly.terms()),
            "nonzero_weights": len(weights),
            "weight_families": families,
            "residual_terms": len(residual_poly.terms()),
            "minimum_positive_residual_coefficient": str(min(residual_poly.coeffs())),
            "residual_stream_sha256": residual_hash,
        })

    assert [row["epsilon"] for row in replayed] == [0, 1]
    report = {
        "marker": MARKER,
        "theorem_audited": (
            "The stable internal-ordinary rank-five g2 Newton origin ell=8, "
            "k-index zero is nonnegative for both parent occupation faces."
        ),
        "state_geometry": {
            "00_C": "A disjoint F with both attachment vertices a,p retained",
            "10_delete_a": "induced deletion of ordinary a; marks u,v survive",
            "01_delete_p": "induced deletion of ordinary p; marks u,v survive",
            "11_D": "induced deletion of both a,p; marks u,v survive",
            "bridge_G": (
                "add the single edge ap between the disjoint child and parent "
                "components; forbidden independent sets are exactly "
                "(X-Y)(E-P) rowwise, so the result remains a forest"
            ),
        },
        "generator_applicability": {
            "intervals": (
                "A->B, A->C, and on epsilon=1 B->D,C->D delete at most one "
                "neighbor-root from each component after p,v are removed; these "
                "are genuine componentwise deletions in a forest"
            ),
            "dominance": "induced-deletion coefficient differences times nonnegative coefficients",
            "two_step": "pinned exact factorial-drop theorem on a genuine forest row",
            "rank2_companion": (
                "the exact two-step rank-2 factorial-drop companion on a genuine "
                "forest row"
            ),
            "parent_boxes": (
                "the parent rows have forced orders n0+13,n0+12,n0+12,n0+11; "
                "the path lower bounds and edgeless upper bounds are exact for "
                "every forest of the corresponding order, and are multiplied "
                "only by nonnegative coefficient variables"
            ),
            "N4": "pinned all-marked-forest N4 theorem on each genuine state",
            "g2_no_parent": "pinned no_parent_k0 g2 theorem on each genuine state",
            "g2_endpoint": (
                "deleting first or second surviving mark gives exactly the two "
                "endpoint row collapses on each genuine state; every nonzero "
                "endpoint weight is therefore covered by the pinned theorem"
            ),
        },
        "faces": replayed,
        "dependencies_sha256": EXPECTED_HASHES,
        "status": "independent exact solver-free replay",
        "scope": (
            "Exactly internal_spine_broom_ordinary g2 at stable ell=8, "
            "collision Newton index zero, on both parent faces.  Other stable "
            "or small Newton rows, all g2, all N5, and Erdos Problem 993 are not claimed."
        ),
        "source_sha256": sha256(SOURCE),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "faces": replayed,
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
