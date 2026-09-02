#!/usr/bin/env python3
"""Independent solver-free audit of the ell=1,2 k=0 ordinary-g2 bridge cones.

The producer source and its numerical optimizer are not imported.  This file
reconstructs raw g2, the literal child rows, the parent occupation partition,
every nonzero-weight generator, and the two saved rational decompositions for
each length.  It then joins the N>=13 cone to the independently audited exact
parent census for orders 2..12.
"""

from __future__ import annotations

import hashlib
import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_short_k0_bridge_independent_audit_exact_g2_structure_nonadjacent_20260830.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_SHORT_K0_BRIDGE_G2_STRUCTURE_NONADJACENT"

FILES = {
    "producer_source": "probe_iso_n5_g2_internal_ordinary_origin_bridge_cone_rank5_g2_alt.py",
    "ell1_report": "iso_n5_g2_internal_ordinary_ell1_k0_bridge_cone_probe_rank5_g2_alt_20260830.json",
    "ell2_report": "iso_n5_g2_internal_ordinary_ell2_k0_bridge_cone_probe_rank5_g2_alt_20260830.json",
    "finite_source": "census_iso_n5_g2_internal_ordinary_all_parent_finite_root.py",
    "finite_report": "iso_n5_g2_internal_ordinary_all_parent_finite_n2_12_exact_root_20260830.json",
    "finite_audit_source": "audit_iso_n5_g2_internal_ordinary_all_parent_finite_g2_transfer_audit.py",
    "finite_audit_report": "iso_n5_g2_internal_ordinary_all_parent_finite_independent_audit_exact_g2_transfer_audit_20260830.json",
    "componentwise_source": "prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent.py",
    "componentwise_report": "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json",
    "two_step_source": "verify_two_step_factorial_drop_forest_certificate.py",
    "n4_source": "assemble_iso_all_forest_n4_bundle_induction_root.py",
    "n4_report": "iso_all_forest_n4_bundle_induction_exact_root_20260829.json",
    "no_parent_source": "prove_iso_n5_g2_no_parent_k0_all_forest_rank5_g2_alt.py",
    "no_parent_report": "iso_n5_g2_no_parent_k0_all_forest_exact_rank5_g2_alt_20260830.json",
    "endpoint_source": "assemble_iso_n5_g2_singleton_endpoint_all_forest_rank5_g2_alt.py",
    "endpoint_report": "iso_n5_g2_singleton_endpoint_all_forest_assembled_exact_rank5_g2_alt_20260830.json",
}

EXPECTED_HASHES = {
    "producer_source": "7203D941660EAC630037ADBA6647581A8A668486FCB2D728641E8F1A0B3750E7",
    "ell1_report": "6A87A35EC269B7A01B2E62F237E2B494720D0FB30FF19D2E75B743EAF03053B8",
    "ell2_report": "9D06031CBDAEC4BF5AC08193F2B659EB2334675BA7AC40B5E28F8238DB95A055",
    "finite_source": "92F83A604B90B4B76B830FC20A945A2D336C148E4136620B2886AB57E0D50FA6",
    "finite_report": "F566E1F1631428CEEDB0F0D5A4B41BB674A1435EBE43506191A933333A02C99C",
    "finite_audit_source": "9F2C2B78E47E40E2FA54DEA081B53BBA48897826F14B4A3A712BA1CCB515385B",
    "finite_audit_report": "89DA3B3DF0A5EC3EED8CEF3A29F07C752A6F8D60BEFCD1E05D9A23E6B8B0B379",
    "componentwise_source": "FCA5115C5D303352DBBC001B305207D583219335326BC48D0C4BFEEE90FB5C1B",
    "componentwise_report": "27E70D94ED97F659E62D63527365906D33123EFDB4E6F8168951061B83BFCCA1",
    "two_step_source": "C9EE3DE3E13499FC9863649481D98413E4BA7B7FEE231DC371DC518FB15B6EF6",
    "n4_source": "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
    "n4_report": "28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
    "no_parent_source": "A8B04ACED34B1A9C5E2B504FE292FEC9F950EB4E22C68AEBFEE38D436DEEFB7F",
    "no_parent_report": "F1573D4E391CB51DFBCBE3A78A14EFA22264D46EE64046E8D2C66C7B88F385BF",
    "endpoint_source": "1E8494EBC450B1750644A8B6C75FA91EE3BA46659979F02BF393A6281A15B5CE",
    "endpoint_report": "577E3ECB64138663D9A31FD682F963E07B9BC08EBAB6F2D61E49635BE9E24228",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    return sp.expand(
        sp.prod(value - offset for offset in range(rank)) / sp.Integer(factorial(rank))
    )


def convolve(left, right, maximum=6):
    return tuple(
        sp.expand(sum(at(left, index) * at(right, rank - index) for index in range(rank + 1)))
        for rank in range(maximum + 1)
    )


def add_rows(left, right):
    return tuple(sp.expand(a + b) for a, b in zip(left, right))


def subtract_rows(left, right):
    return tuple(sp.expand(a - b) for a, b in zip(left, right))


def shift(row):
    return tuple(at(row, rank - 1) for rank in range(7))


def nested(rows, rank):
    e, u, v, w = rows
    r = rank
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def isolate_multiply(rows, amount, maximum=6):
    return tuple(tuple(
        sp.expand(sum(choose(amount, index) * at(row, rank - index) for index in range(rank + 1)))
        for rank in range(maximum + 1)
    ) for row in rows)


def add_xd(crows, drows):
    return tuple(tuple(
        sp.expand(at(crow, rank) + at(drow, rank - 1)) for rank in range(7)
    ) for crow, drow in zip(crows, drows))


def raw_g2():
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")

    def gamma(amount):
        top = nested(add_xd(isolate_multiply(crows, amount), drows), 5)
        base = nested(add_xd(crows, drows), 5)
        lower = sum(nested(isolate_multiply(crows, offset, 5), 4) for offset in range(amount))
        return sp.expand(top - base - lower)

    g1 = gamma(1)
    g2 = sp.expand(gamma(2) - 2 * g1)
    assert len(sp.Poly(g1, *sorted(g1.free_symbols, key=str)).terms()) == 54
    assert len(sp.Poly(g2, *sorted(g2.free_symbols, key=str)).terms()) == 70
    return crows, drows, g2


def specialize(expression, generic_c, generic_d, crows, drows):
    rules = {
        symbol: value
        for generic, actual in zip(generic_c + generic_d, crows + drows)
        for symbol, value in zip(generic, actual)
    }
    return sp.expand(expression.subs(rules))


def path_row(order):
    if order == -2:
        return (sp.Integer(0),) * 7
    if order <= 0:
        return (sp.Integer(1),) + (sp.Integer(0),) * 6
    return tuple(
        sp.Integer(comb(order - rank + 1, rank))
        if order - rank + 1 >= rank else sp.Integer(0)
        for rank in range(7)
    )


def child_rows(length):
    leaves = (sp.Integer(1),) + (sp.Integer(0),) * 6
    p1, p2, p3 = path_row(length - 1), path_row(length - 2), path_row(length - 3)
    x = add_rows(convolve(leaves, p1), shift(p2))
    u = convolve(leaves, p1)
    y = add_rows(convolve(leaves, p2), shift(p3))
    z = convolve(leaves, p2)
    return x, u, y, z


def bridge_row(child_full, child_deleted, parent_full, parent_deleted):
    return subtract_rows(
        convolve(child_full, parent_full),
        convolve(
            subtract_rows(child_full, child_deleted),
            subtract_rows(parent_full, parent_deleted),
        ),
    )


def phi_coefficient(p, h, left, right):
    return (
        at(p, left - 1) * at(p, right)
        + at(p, left) * at(p, right - 1)
        + at(p, left - 1) * at(h, right - 1)
        + at(h, left - 1) * at(p, right - 1)
    )


def kernel_coefficient(row, left, right):
    return (
        at(row, left - 1) * at(row, right - 1)
        + sp.Rational(1, 2) * (
            (left + right) * at(row, left) * at(row, right)
            - (right + 1) * at(row, left - 1) * at(row, right + 1)
            - (left + 1) * at(row, left + 1) * at(row, right - 1)
        )
    )


def psi_coefficient(p, h, left, right):
    x = tuple(at(p, index) + at(h, index - 1) for index in range(10))
    c = tuple(at(x, index) + at(p, index - 1) for index in range(10))
    return sp.expand(
        kernel_coefficient(c, left, right)
        - kernel_coefficient(x, left, right)
        - kernel_coefficient(p, left - 1, right - 1)
        - sp.Rational(1, 2) * phi_coefficient(p, h, left - 1, right - 1)
    )


def interval_expressions(full, deleted, prefix):
    p = sp.symbols("__p0:8")
    h = sp.symbols("__h0:7")
    cells = []
    for psi_degree in range(2, 9):
        phi_degree = 9 - psi_degree
        for layer in range(phi_degree // 2 + 1):
            lower = max(0, 4 - (phi_degree - layer))
            upper = min(psi_degree, 4 - layer)
            cells.append(sp.expand(sum(
                psi_coefficient(p, h, left, psi_degree - left)
                for left in range(lower, upper + 1)
            )))
    unique = []
    for value in cells:
        if value not in unique:
            unique.append(value)
    assert len(unique) == 16
    mapping = {p[0]: 1, h[0]: 1}
    mapping.update({p[index]: full[index] for index in range(1, len(full))})
    mapping.update({h[index]: deleted[index] for index in range(1, len(deleted))})
    supported = set(mapping)
    return {
        f"interval_{prefix}_{label}": sp.expand(value.subs(mapping))
        for label, value in enumerate(unique[1:], 2)
        if value.free_symbols.issubset(supported)
    }


def universal_rows(row, prefix):
    result = {}
    if len(row) > 4:
        result[f"two_step_{prefix}"] = sp.expand(
            2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]
        )
    if len(row) > 3:
        result[f"rank2_companion_{prefix}"] = sp.expand(
            2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]
        )
    return result


def polynomial_stream(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    stream = "".join(
        f"{powers}:{coefficient};" for powers, coefficient in polynomial.terms()
        if coefficient
    )
    return polynomial, hashlib.sha256(stream.encode()).hexdigest().upper()


def parent_box_basis(E, P, V, W, n0):
    rows = {"E": E, "P": P, "V": V, "W": W}
    orders = {
        "E": n0 + 13,
        "P": n0 + 12,
        "V": n0 + 12,
        "W": n0 + 11,
    }
    multipliers = [("one", sp.Integer(1)), ("n0", n0)] + [
        (str(rows[name][rank]), rows[name][rank])
        for name in ("E", "P", "V", "W") for rank in range(2, 7)
    ]
    result = {}
    for name in ("E", "P", "V", "W"):
        for rank in range(2, 7):
            gaps = {
                "path_floor": sp.expand(rows[name][rank] - choose(orders[name] - rank + 1, rank)),
                "edgeless_ceiling": sp.expand(choose(orders[name], rank) - rows[name][rank]),
            }
            for bound_name, gap in gaps.items():
                for multiplier_name, multiplier in multipliers:
                    result[f"parent_box_{name}_{rank}_{bound_name}_times_{multiplier_name}"] = sp.expand(gap * multiplier)
    return result


def main():
    assert {label: sha256(HERE / name) for label, name in FILES.items()} == EXPECTED_HASHES
    reports = {ell: load(FILES[f"ell{ell}_report"]) for ell in (1, 2)}
    finite = load(FILES["finite_report"])
    finite_audit = load(FILES["finite_audit_report"])
    componentwise = load(FILES["componentwise_report"])
    n4 = load(FILES["n4_report"])
    no_parent = load(FILES["no_parent_report"])
    endpoint = load(FILES["endpoint_report"])
    for ell, report in reports.items():
        assert report["marker"] == "PROBE_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ORIGIN_BRIDGE_CONE_RANK5_G2_ALT"
        assert report["cell"] == {"ell": ell, "k_index": 0}
        assert report["status"] == "exact theorem certificate"
        assert [face["epsilon"] for face in report["faces"]] == [0, 1]
        assert all(face["exact_rational_certificate"] for face in report["faces"])
    assert finite["marker"] == "PASS_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ALL_PARENT_FINITE_N2_12_ROOT"
    assert finite_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ALL_PARENT_FINITE_G2_TRANSFER_AUDIT"
    assert finite["ordered_stream_sha256"] == finite_audit["ordered_stream_sha256"]
    assert finite["exact_form_checks"] == finite_audit["exact_form_checks"] == 21216006
    assert componentwise["marker"] == "PASS_EXACT_ISO_N5_DISCONNECTED_M5_ALL_COMPONENTWISE_G1_NONADJACENT"
    assert n4["marker"] == "PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT"
    assert no_parent["marker"] == "PASS_EXACT_ISO_N5_G2_NO_PARENT_K0_ALL_FOREST_RANK5_G2_ALT"
    assert endpoint["marker"] == "PASS_EXACT_ISO_N5_G2_SINGLETON_ENDPOINT_ALL_FOREST_RANK5_G2_ALT"

    generic_c, generic_d, g2 = raw_g2()
    E = (sp.Integer(1), *sp.symbols("e1:7"))
    P = (sp.Integer(1), *sp.symbols("p1:7"))
    V = (sp.Integer(1), *sp.symbols("v1:7"))
    W = (sp.Integer(1), *sp.symbols("w1:7"))
    n0 = sp.symbols("n0", integer=True, nonnegative=True)
    parent_boxes = parent_box_basis(E, P, V, W, n0)
    replayed = []

    for ell in (1, 2):
        X, U, Y, Z = child_rows(ell)
        states = {
            "00_C": (convolve(X, E), convolve(U, E), convolve(X, V), convolve(U, V)),
            "10_delete_a": (convolve(Y, E), convolve(Z, E), convolve(Y, V), convolve(Z, V)),
            "01_delete_p": (convolve(X, P), convolve(U, P), convolve(X, W), convolve(U, W)),
            "11_D": (convolve(Y, P), convolve(Z, P), convolve(Y, W), convolve(Z, W)),
            "bridge_G": (
                bridge_row(X, Y, E, P), bridge_row(U, Z, E, P),
                bridge_row(X, Y, V, W), bridge_row(U, Z, V, W),
            ),
        }
        target = specialize(g2, generic_c, generic_d, states["00_C"], states["11_D"])
        globals_ = {}
        for state_name, state in states.items():
            globals_[f"global_N4_{state_name}"] = nested(state, 4)
            globals_[f"global_g2_no_parent_{state_name}"] = specialize(
                g2, generic_c, generic_d, state, state
            )
            se, su, sv, sw = state
            globals_[f"global_g2_endpoint_first_{state_name}"] = specialize(
                g2, generic_c, generic_d, state, (su, su, sw, sw)
            )
            globals_[f"global_g2_endpoint_second_{state_name}"] = specialize(
                g2, generic_c, generic_d, state, (sv, sw, sv, sw)
            )

        for face in reports[ell]["faces"]:
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
                    E[rank]: at(a, rank) + at(b, rank - 1) + at(c, rank - 1) + epsilon * at(d, rank - 2),
                })
            active = (("A", a), ("B", b), ("C", c)) + (("D", d),) * epsilon
            order_rule = {a[1]: n0 + 11}
            variables = (n0,) + tuple(
                symbol for _name, row in active for symbol in row[1:] if symbol != a[1]
            )
            basis = {}
            basis.update(interval_expressions(a, b, "A_B"))
            basis.update(interval_expressions(a, c, "A_C"))
            if epsilon:
                basis.update(interval_expressions(b, d, "B_D"))
                basis.update(interval_expressions(c, d, "C_D"))
            for name, row in active:
                basis.update(universal_rows(row, name))
            basis.update({
                label: sp.expand(value.subs(parent_rules).subs(order_rule))
                for label, value in globals_.items()
            })
            basis.update({
                label: sp.expand(value.subs(parent_rules).subs(order_rule))
                for label, value in parent_boxes.items()
            })
            multipliers = [("one", sp.Integer(1))] + [(str(symbol), symbol) for symbol in variables]
            pairs = [("A_B", a, b), ("A_C", a, c)]
            if epsilon:
                pairs.extend((("B_D", b, d), ("C_D", c, d)))
            for pair_name, full, deleted in pairs:
                for rank in range(1, min(len(full), len(deleted))):
                    for multiplier_name, multiplier in multipliers:
                        basis[f"dominance_{pair_name}_{rank}_times_{multiplier_name}"] = sp.expand(
                            ((full[rank] - deleted[rank]) * multiplier).subs(order_rule)
                        )
            basis = {label: sp.expand(value.subs(order_rule)) for label, value in basis.items()}

            weights = {label: sp.Rational(value) for label, value in face["weights"].items()}
            assert weights and all(value > 0 for value in weights.values())
            assert set(weights).issubset(basis)
            reduced_target = sp.expand(target.subs(parent_rules).subs(order_rule))
            target_poly = sp.Poly(reduced_target, *variables)
            assert len(target_poly.terms()) == face["target_monomials"]
            residual = sp.expand(
                reduced_target - sum(weight * basis[label] for label, weight in weights.items())
            )
            residual_poly, residual_hash = polynomial_stream(residual, variables)
            assert residual_poly.terms()
            assert all(coefficient >= 0 for coefficient in residual_poly.coeffs())
            assert len(residual_poly.terms()) == face["nonzero_residual_coefficients"]
            assert residual_hash == face["residual_stream_sha256"]
            families = {
                "interval": sum(label.startswith("interval_") for label in weights),
                "dominance": sum(label.startswith("dominance_") for label in weights),
                "forest_row": sum(label.startswith(("two_step_", "rank2_companion_")) for label in weights),
                "parent_box": sum(label.startswith("parent_box_") for label in weights),
                "N4": sum(label.startswith("global_N4_") for label in weights),
                "g2_no_parent": sum(label.startswith("global_g2_no_parent_") for label in weights),
                "g2_endpoint": sum(label.startswith("global_g2_endpoint_") for label in weights),
            }
            assert sum(families.values()) == len(weights)
            replayed.append({
                "ell": ell,
                "epsilon": epsilon,
                "geometry": face["geometry"],
                "target_monomials": len(target_poly.terms()),
                "nonzero_weights": len(weights),
                "weight_families": families,
                "residual_terms": len(residual_poly.terms()),
                "minimum_positive_residual_coefficient": str(min(residual_poly.coeffs())),
                "residual_stream_sha256": residual_hash,
            })
            print(ell, epsilon, len(weights), residual_hash, flush=True)

    assert [(row["ell"], row["epsilon"]) for row in replayed] == [
        (1, 0), (1, 1), (2, 0), (2, 1)
    ]
    # Pascal check underlying the coefficientwise path floor induction for
    # a degree-one leaf.  Isolated-vertex deletion gives a stronger second term.
    t = sp.symbols("t", integer=True, nonnegative=True)
    for rank in range(2, 7):
        assert sp.expand(
            choose(t - rank, rank) + choose(t - rank, rank - 1)
            - choose(t - rank + 1, rank)
        ) == 0

    report = {
        "marker": MARKER,
        "theorem": (
            "The ell=1 and ell=2, collision-Newton-index zero internal-spine "
            "ordinary-parent g2 forms are nonnegative for every finite forest "
            "parent and every ordered distinct parent/mark placement."
        ),
        "coverage": {
            "orders_below_2": "vacuous because p and v are distinct",
            "orders_2_through_12": {
                "producer": finite["marker"],
                "independent_audit": finite_audit["marker"],
                "unlabeled_forests": finite["unlabeled_forests"],
                "ordered_parent_pairs": finite["ordered_parent_pairs"],
                "exact_form_checks": finite["exact_form_checks"],
                "ordered_stream_sha256": finite["ordered_stream_sha256"],
            },
            "orders_at_least_13": {
                "parameter": "N=13+n0 with n0>=0; a1=|W|=N-2=n0+11",
                "faces": replayed,
            },
        },
        "geometry": {
            "partition": "W=A, P=A+xB, V=A+xC, E=A+xB+xC+epsilon*x^2D",
            "epsilon_zero": "p-v adjacent; simultaneous selection is forbidden",
            "epsilon_one": "p-v nonadjacent, covering both connected and disconnected placements",
            "states": (
                "00,10,01,11 are the four induced deletions of child attachment a "
                "and parent p; bridge_G adds only edge ap, so every payment state is a forest"
            ),
        },
        "generator_applicability": {
            "intervals": (
                "A->B,A->C and, when epsilon=1, B->D,C->D are genuine "
                "componentwise neighbor-root deletions in the parent forest"
            ),
            "dominance": "induced-deletion coefficient gaps times nonnegative coefficients or n0",
            "forest_rows": "two-step and rank2-companion inequalities from the pinned exact factorial-drop source",
            "parent_path_floor": (
                "For a degree-one leaf, i_r(F)=i_r(F-v)+i_(r-1)(F-{u,v}); "
                "the two induction floors combine by Pascal. An isolated vertex gives a stronger term."
            ),
            "parent_edgeless_ceiling": "i_r(F)<=C(|F|,r) trivially",
            "N4": "pinned all-marked-forest N4 theorem on a genuine state",
            "g2_no_parent": "pinned no-parent g2 theorem on a genuine state",
            "g2_endpoint": "pinned singleton-endpoint g2 theorem after deleting the indicated surviving mark",
        },
        "large_order_replay": replayed,
        "dependencies_sha256": EXPECTED_HASHES,
        "status": "independent exact solver-free replay with gapless finite/large join",
        "scope": (
            "Exactly internal_spine_broom_ordinary raw g2 at ell in {1,2}, "
            "collision Newton index zero, both parent geometries, all parent orders. "
            "Other Newton cells, modes, all N5, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(SOURCE),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "large_faces": replayed,
        "finite_checks": finite["exact_form_checks"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
