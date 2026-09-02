#!/usr/bin/env python3
"""Solver-free exact verifier for the internal-ordinary origin cell.

This verifier rebuilds the (h,k)=(0,0) parent form, all used nonnegative
generators, and the saved rational weights.  It does not invoke an optimizer.
For each marked-parent geometry it checks coefficient-for-coefficient that

    target = sum(nonnegative rational weight * proved generator) + residual,

where every residual coefficient is nonnegative.  The generators used by the
saved certificate are componentwise-deletion interval sums, universal S and
N4 payments on actual composite/deleted marked forests, universal two-step and
rank-two forest inequalities, and induced-subforest dominance products.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
)
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms
from probe_iso_n5_g1_internal_ordinary_low00_parent_interval_cone_root import (
    at,
    interval_basis,
    universal_row_basis,
)
from verify_two_step_factorial_drop_forest_certificate import (
    finite_certificate as two_step_finite_certificate,
    symbolic_large_order_certificate as two_step_symbolic_large_order_certificate,
    symbolic_rank2_certificate,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_low00_parent_interval_cone_exact_root_20260830.json"
CERTIFICATE = HERE / "iso_n5_g1_internal_ordinary_low00_parent_interval_cone_probe_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW00_PARENT_INTERVAL_CONE_ROOT"

PINS = {
    "probe_iso_n5_g1_internal_ordinary_low00_parent_interval_cone_root.py":
        "DE5A26E40E61CBF9978D5FECEB2EB7AD3ECD299D5C321A3239CD1D33FDEA1A2D",
    "iso_n5_g1_internal_ordinary_low00_parent_interval_cone_probe_root_20260830.json":
        "6E2F8BD077FDCBE9DAC9C3399FE8A64BD43C1D5AFCAF25AF36590CC2AE7559F9",
    "prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent.py":
        "FCA5115C5D303352DBBC001B305207D583219335326BC48D0C4BFEEE90FB5C1B",
    "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json":
        "27E70D94ED97F659E62D63527365906D33123EFDB4E6F8168951061B83BFCCA1",
    "assemble_iso_n5_s_all_marked_forests_root.py":
        "E56AA4AD8AF3FE936DAF8354A6D7BAD1BAC5AFDCCD6C4436FB198A0FC76D479E",
    "iso_n5_s_all_marked_forests_exact_root_20260830.json":
        "E4FDD1215C0924A40E2B6D47BAC9CF5BB54830686AAB6E5F1188D8F25F386CBE",
    "assemble_iso_all_forest_n4_bundle_induction_root.py":
        "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
    "iso_all_forest_n4_bundle_induction_exact_root_20260829.json":
        "28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
    "verify_two_step_factorial_drop_forest_certificate.py":
        "C9EE3DE3E13499FC9863649481D98413E4BA7B7FEE231DC371DC518FB15B6EF6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    assert {name: sha256(HERE / name) for name in PINS} == PINS

    interval_theorem = load(
        "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json"
    )
    s_theorem = load("iso_n5_s_all_marked_forests_exact_root_20260830.json")
    n4_theorem = load("iso_all_forest_n4_bundle_induction_exact_root_20260829.json")
    saved = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert interval_theorem["marker"] == (
        "PASS_EXACT_ISO_N5_DISCONNECTED_M5_ALL_COMPONENTWISE_G1_NONADJACENT"
    )
    assert interval_theorem["coverage"].startswith("All 16 distinct Psi interval sums")
    assert s_theorem["marker"] == "PASS_EXACT_ISO_N5_S_ALL_MARKED_FORESTS_ROOT"
    assert s_theorem["theorem"] == (
        "For every finite forest G and every pair of distinct marked vertices u,v, "
        "the rank-five scalar reserve S=M5+3*C5 is nonnegative."
    )
    assert n4_theorem["marker"] == "PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT"
    assert n4_theorem["theorem"] == (
        "N4(B;u,v)>=0 for every finite forest B and every pair of distinct marked vertices u,v."
    )
    assert saved["marker"] == (
        "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW00_PARENT_INTERVAL_CONE_ROOT"
    )
    assert saved["status"] == "exact theorem certificate"
    assert all(face["exact_rational_certificate"] for face in saved["faces"])

    # Independently rerun the exact universal two-step and rank-two checks.
    symbolic_rank2_certificate()
    assert two_step_symbolic_large_order_certificate() == 72
    assert two_step_finite_certificate() == (28_043, 7)

    expression, rows = ordinary_expression()
    ell = 8
    collision_count = 0
    origin_rules = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(collision_count, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(collision_count, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        origin_rules.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })
    target = sp.expand(expression.subs(origin_rules))

    x, urow, y, zrow = (rows[name] for name in ("X", "U", "Y", "Z"))
    e, p, vrow, wrow = (rows[name] for name in ("E", "P", "V", "W"))
    constants = {row[0]: 1 for row in (x, urow, y, zrow, e, p, vrow, wrow)}
    x0 = tuple(sp.Integer(1) if rank == 0 else origin_rules[x[rank]] for rank in range(7))
    u0 = tuple(sp.Integer(1) if rank == 0 else origin_rules[urow[rank]] for rank in range(7))
    y0 = tuple(sp.Integer(1) if rank == 0 else origin_rules[y[rank]] for rank in range(7))
    z0 = tuple(sp.Integer(1) if rank == 0 else origin_rules[zrow[rank]] for rank in range(7))

    def row_difference(full, deleted):
        return tuple(sp.expand(left - right) for left, right in zip(full, deleted))

    def bridge_row(child_full, child_deleted, parent_full, parent_deleted):
        product = convolve(child_full, parent_full)
        forbidden = convolve(
            row_difference(child_full, child_deleted),
            row_difference(parent_full, parent_deleted),
        )
        return tuple(
            sp.expand(value - removed)
            for value, removed in zip(product, forbidden)
        )

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
    global_payments = {}
    for state_name, state_rows in states.items():
        forms = compact_forms(state_rows)
        for form_name in ("S_C", "C5_C", "N4_C"):
            global_payments[
                f"global_{form_name.replace('_C', '')}_{state_name}"
            ] = sp.expand(forms[form_name].subs(constants))

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    audited = []
    used_labels = set()
    for epsilon in (0, 1):
        partition_rules = {}
        for rank in range(1, 7):
            partition_rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        active_rows = (("A", a), ("B", b), ("C", c)) + (("D", d),) * epsilon
        variables = tuple(symbol for _name, row in active_rows for symbol in row[1:])
        basis = []
        basis.extend(interval_basis(a, b, "A_B"))
        basis.extend(interval_basis(a, c, "A_C"))
        if epsilon:
            basis.extend(interval_basis(b, d, "B_D"))
            basis.extend(interval_basis(c, d, "C_D"))
        for name, row in active_rows:
            basis.extend(universal_row_basis(row, name))
        basis.extend([
            (label, sp.expand(candidate.subs(partition_rules)))
            for label, candidate in global_payments.items()
        ])
        multipliers = [("one", sp.Integer(1))] + [
            (str(symbol), symbol) for symbol in variables
        ]
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
        basis_map = dict(basis)
        saved_face = next(face for face in saved["faces"] if face["epsilon"] == epsilon)
        weights = {
            label: sp.Rational(value) for label, value in saved_face["weights"].items()
        }
        assert weights and all(label in basis_map for label in weights)
        assert all(value >= 0 for value in weights.values())
        used_labels.update(weights)
        transformed_target = sp.expand(target.subs(partition_rules))
        residual = sp.expand(
            transformed_target
            - sum(value * basis_map[label] for label, value in weights.items())
        )
        residual_poly = sp.Poly(residual, *variables)
        assert all(value >= 0 for value in residual_poly.coeffs())

        # Recreate the exact row universe used by the saved certificate.
        target_terms = dict(sp.Poly(transformed_target, *variables).terms())
        used_basis_terms = {
            label: dict(sp.Poly(basis_map[label], *variables).terms())
            for label in weights
        }
        universe = sorted(
            set(target_terms).union(
                *(set(terms) for terms in used_basis_terms.values())
            ),
            reverse=True,
        )
        residual_vector = [
            sp.Rational(target_terms.get(powers, 0))
            - sum(
                weight * used_basis_terms[label].get(powers, 0)
                for label, weight in weights.items()
            )
            for powers in universe
        ]
        assert all(value >= 0 for value in residual_vector)
        stream = "".join(
            f"{powers}:{value};"
            for powers, value in zip(universe, residual_vector) if value
        )
        stream_hash = hashlib.sha256(stream.encode()).hexdigest().upper()
        assert stream_hash == saved_face["residual_stream_sha256"]
        assert sum(value != 0 for value in residual_vector) == (
            saved_face["nonzero_residual_coefficients"]
        )
        assert str(min(residual_vector)) == saved_face["minimum_residual_coefficient"]
        audited.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "nonzero_weights": len(weights),
            "coefficient_rows": len(universe),
            "nonzero_residual_coefficients": sum(value != 0 for value in residual_vector),
            "minimum_residual_coefficient": str(min(residual_vector)),
            "residual_stream_sha256": stream_hash,
        })

    assert not any(label.startswith(("HC_", "Q3_", "global_C5_")) for label in used_labels)
    assert any(label.startswith("interval_") for label in used_labels)
    assert any(label.startswith("dominance_") for label in used_labels)
    assert any(label.startswith("global_S_") for label in used_labels)
    assert any(label.startswith("global_N4_") for label in used_labels)
    assert "two_step_A" in used_labels
    assert any(label.startswith("rank2_companion_") for label in used_labels)

    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite parent-side forest and both marked-parent "
            "geometries, the internal-spine/broom-ordinary g1 tensor-Newton "
            "cell (h,k)=(0,0) for ell=8+h is nonnegative."
        ),
        "cell": [0, 0],
        "generator_logic": {
            "interval": (
                "A->B, A->C, B->D, and C->D delete at most one vertex per "
                "component; all used interval sums are nonnegative."
            ),
            "dominance": "Every deleted row is an induced subforest of its full row.",
            "global_S_N4": (
                "Each used S or N4 payment is evaluated on an actual bridge or "
                "induced-deletion marked forest."
            ),
            "two_step_rank2": "Universal exact forest inequalities rerun above.",
        },
        "faces": audited,
        "used_generator_labels": sorted(used_labels),
        "dependencies_sha256": PINS,
        "status": "solver-free exact rational theorem",
        "scope": (
            "This proves only the origin tensor cell of the ell>=8 "
            "internal-spine ordinary-parent g1 reduction.  Other cells and "
            "small ell are assembled separately."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "faces": audited,
        "used_generators": len(used_labels),
        "status": report["status"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
