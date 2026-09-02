#!/usr/bin/env python3
"""Solver-free exact replay of the N>=13 internal-ordinary g2 box cones.

This verifies the 20 nonorigin stable tensor-Newton rows and the 33 small
rows outside k-index zero and the two short k-index-one exceptions.  The
remaining rows are deliberately excluded and are supplied by separate exact
bridge and low-motif theorems.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt import ordinary_expression
from derive_iso_n5_g2_internal_ordinary_broom_parameters_rank5_g2_alt import stable_forms
from probe_iso_n5_g2_internal_ordinary_parent_global_cone_rank5_g2_alt import (
    add_parent_order_boxes,
    build_parent_basis,
)
from verify_two_step_factorial_drop_forest_certificate import (
    finite_certificate as two_step_finite_certificate,
    symbolic_large_order_certificate as two_step_symbolic_large_order_certificate,
    symbolic_rank2_certificate,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_box_cones_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_BOX_CONES_RANK5_G2_ALT"
PINS = {
    "derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt.py":
        "4618E651DBFF34BB519BF5CB3454523A82341F278170F6C100222C95AF3FA5F0",
    "iso_n5_g2_internal_ordinary_broom_factor_exact_rank5_g2_alt_20260830.json":
        "1763428AE4A25B07FEFF52963FC2D68305CC6A668D884294B6949463A3A03201",
    "derive_iso_n5_g2_internal_ordinary_broom_parameters_rank5_g2_alt.py":
        "48D1D3E396B8C84731EA0E46E3D8D104F43EEF7130F426AB73286935B4CC319B",
    "iso_n5_g2_internal_ordinary_broom_parameters_exact_rank5_g2_alt_20260830.json":
        "9D9DED93C91CDE9796FA059EC0B8548DE190D8AAA7C1953C197CF028BC379939",
    "probe_iso_n5_g2_internal_ordinary_parent_global_cone_rank5_g2_alt.py":
        "E6598CFD54B93599047205F25C5CA163C60A39F423D42E2D59CBD1C4C8F99E7A",
    "iso_n5_g2_internal_ordinary_parent_global_cone_probe_h0_k0_n13_iso0_rank5_g2_alt_20260830.json":
        "6C1216C416ED3BE009FC5CA6439B523B97A7F65BDA630C84A5757E05CC6C11F8",
    "probe_iso_n5_g2_internal_ordinary_small_parent_global_cone_rank5_g2_alt.py":
        "85502FB2E5AAADF0D1E467D99439A490E18843753FA0A702D19E4DD90D7B5804",
    "iso_n5_g2_internal_ordinary_small_parent_global_cone_probe_rank5_g2_alt_20260830.json":
        "B1F447BBEE2CAEA7ED30959632A15441F90F0C8C1D16A22BE0B01A2267DCB000",
    "prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent.py":
        "FCA5115C5D303352DBBC001B305207D583219335326BC48D0C4BFEEE90FB5C1B",
    "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json":
        "27E70D94ED97F659E62D63527365906D33123EFDB4E6F8168951061B83BFCCA1",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "verify_two_step_factorial_drop_forest_certificate.py":
        "C9EE3DE3E13499FC9863649481D98413E4BA7B7FEE231DC371DC518FB15B6EF6",
    "derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root.py":
        "8ED18D7C3116B83527A08471B0820319FFBB134E4FDA086070AB760F1F122E6B",
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def load(name):
    return json.loads((HERE / name).read_text())


def exact_decomposition(form, variables, basis_map, saved):
    assert saved["exact_rational_certificate"] is True
    weights = {label: sp.Rational(value) for label, value in saved["basis_weights"].items()}
    missing = sorted(set(weights) - set(basis_map))
    assert not missing, missing
    assert all(value >= 0 for value in weights.values())
    residual = sp.expand(form - sum(value * basis_map[label] for label, value in weights.items()))
    polynomial = sp.Poly(residual, *variables)
    assert polynomial.terms() and all(value >= 0 for value in polynomial.coeffs())
    stream = "".join(f"{powers}:{value};" for powers, value in polynomial.terms())
    digest = hashlib.sha256(stream.encode()).hexdigest().upper()
    assert digest == saved["residual_stream_sha256"]
    assert len(polynomial.terms()) == saved["residual_nonnegative_monomials"]
    assert str(min(polynomial.coeffs())) == saved["minimum_residual_scalar"]
    return {
        "weights": {label: str(value) for label, value in weights.items()},
        "residual_nonnegative_monomials": len(polynomial.terms()),
        "minimum_residual_scalar": str(min(polynomial.coeffs())),
        "residual_stream_sha256": digest,
    }


def small_forms(expression, rows, ell):
    k = sp.symbols("k", integer=True, nonnegative=True)
    actual = child_rows(ell, k)
    rules = {
        rows[name][rank]: actual[index][rank]
        for index, name in enumerate(("X", "U", "Y", "Z"))
        for rank in range(1, 7)
    }
    degrees, forms = tensor_binomial(sp.expand(expression.subs(rules)), (k,))
    assert degrees == (5,)
    return forms


def allowed_label(label):
    return (
        label.startswith((
            "E_minus_P_", "E_minus_V_", "P_minus_W_", "V_minus_W_",
            "both_marks_", "P_Qp_interval_sum_", "V_Qv_interval_sum_",
            "W_Qpv_interval_sum_", "W_B_interval_sum_",
            "P_Qp_dominance_", "V_Qv_dominance_",
            "W_Qpv_dominance_", "W_B_dominance_",
        ))
        or "_path_floor_times_" in label
        or "_edgeless_ceiling_times_" in label
        or label.startswith("two_step_")
        or label.startswith("rank2_companion_")
    )


def main():
    assert {name: sha256(HERE / name) for name in PINS} == PINS
    factor = load("iso_n5_g2_internal_ordinary_broom_factor_exact_rank5_g2_alt_20260830.json")
    parameters = load("iso_n5_g2_internal_ordinary_broom_parameters_exact_rank5_g2_alt_20260830.json")
    stable_report = load(
        "iso_n5_g2_internal_ordinary_parent_global_cone_probe_h0_k0_n13_iso0_rank5_g2_alt_20260830.json"
    )
    small_report = load(
        "iso_n5_g2_internal_ordinary_small_parent_global_cone_probe_rank5_g2_alt_20260830.json"
    )
    componentwise = load("iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json")
    assert factor["marker"] == "DERIVED_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_BROOM_FACTOR_RANK5_G2_ALT"
    assert parameters["marker"] == "DERIVED_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_BROOM_PARAMETERS_RANK5_G2_ALT"
    assert stable_report["exact_decompositions"] == 20 and stable_report["unresolved_forms"] == 1
    assert small_report["exact_decompositions"] == 33 and small_report["unresolved_forms"] == 9
    assert componentwise["marker"] == "PASS_EXACT_ISO_N5_DISCONNECTED_M5_ALL_COMPONENTWISE_G1_NONADJACENT"

    symbolic_rank2_certificate()
    assert two_step_symbolic_large_order_certificate() == 72
    assert two_step_finite_certificate() == (28_043, 7)

    expression, rows = ordinary_expression()
    _variables, basis = build_parent_basis(rows)
    variables, basis, order_rules = add_parent_order_boxes(rows, basis, 13)
    basis_map = dict(basis)
    assert len(basis_map) == len(basis) == 2228

    audited = []
    used_labels = set()
    stable_saved = {
        (row["h_index"], row["k_index"]): row for row in stable_report["forms"]
    }
    degrees, stable, _stable_rows = stable_forms()
    assert degrees == (5, 5)
    for index, form in sorted(stable.items()):
        if form == 0 or index == (0, 0):
            continue
        exact = exact_decomposition(
            sp.expand(form.subs(order_rules)), variables, basis_map, stable_saved[index]
        )
        used_labels.update(exact["weights"])
        audited.append({"region": "stable_nonorigin", "h_index": index[0],
                        "k_index": index[1], **exact})
    assert len(audited) == 20

    small_saved = {
        (row["ell"], row["k_index"]): row for row in small_report["forms"]
    }
    expected_small = {
        *((ell, index) for ell in (1, 2) for index in range(2, 6)),
        *((ell, index) for ell in range(3, 8) for index in range(1, 6)),
    }
    seen_small = set()
    for ell in range(1, 8):
        for index, form in sorted(small_forms(expression, rows, ell).items()):
            cell = (ell, index[0])
            if form == 0 or cell not in expected_small:
                continue
            exact = exact_decomposition(
                sp.expand(form.subs(order_rules)), variables, basis_map, small_saved[cell]
            )
            used_labels.update(exact["weights"])
            audited.append({"region": "small_box", "ell": ell,
                            "k_index": index[0], **exact})
            seen_small.add(cell)
    assert seen_small == expected_small and len(audited) == 53
    assert all(allowed_label(label) for label in used_labels)

    report = {
        "marker": MARKER,
        "theorem": (
            "For parent order N>=13, every nonorigin stable Newton row and all "
            "33 designated small internal-ordinary g2 rows are nonnegative."
        ),
        "parent_coefficient_box": {
            "orders": "E:N, P:N-1, V:N-1, W:N-2 with N=13+n0",
            "bounds": "binom(m-r+1,r)<=i_r(F)<=binom(m,r), ranks 2..6",
            "path_floor_proof": (
                "Join forest components to a tree, which can only decrease independent-set "
                "counts; leaf deletion plus Pascal induction gives the path lower bound."
            ),
            "ceiling_proof": "Every independent r-set is an r-subset of the vertex set.",
        },
        "sign_generators": {
            "selection_partitions": "coefficientwise induced-deletion and both-mark rows",
            "componentwise_intervals": "proved interval sums for each rooted deletion pair",
            "two_step_and_rank2": "independently replayed universal forest inequalities",
            "row_boxes": "path floors and edgeless ceilings times nonnegative coefficients",
            "residual": "coefficientwise nonnegative in n0 and parent coefficients",
        },
        "exact_audit": {
            "rows": len(audited), "stable_nonorigin_rows": 20,
            "small_rows": 33, "used_basis_labels": sorted(used_labels),
            "decompositions": audited,
        },
        "deliberately_excluded": {
            "stable": [[0, 0]],
            "small_k0": [[ell, 0] for ell in range(1, 8)],
            "small_low_k1": [[1, 1], [2, 1]],
        },
        "dependencies_sha256": PINS,
        "scope": "Only the displayed N>=13 internal-ordinary g2 coefficient rows.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "exact_rows": len(audited),
        "stable_nonorigin_rows": 20, "small_rows": 33,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
