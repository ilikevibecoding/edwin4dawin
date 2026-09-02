#!/usr/bin/env python3
"""All-order theorem for internal-spine broom endpoint g1.

This verifier closes every protected-broom length ``ell>=1`` and every
collision-leaf count ``k>=0``.  It does not trust floating feasibility:
all selected cone weights are read as exact rationals and every residual is
reconstructed coefficient-for-coefficient.

Coverage is deliberately disjoint:

* ell=1: k=0, k=1, and the shifted tail k=2+t;
* ell=2,3: k=0 and the shifted tail k=1+t;
* ell=4: the complete Newton expansion at k=0;
* ell=5,6,7: the complete Newton expansion at k=0;
* ell>=8: the pinned all-parent tensor-binomial theorem.

The parent cone uses only proved componentwise-deletion interval sums,
universal single-forest inequalities, induced-subforest coefficient
dominance, and (for three concrete boundary states) the universal marked
forest C5 theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve, endpoint_expression
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms
from probe_iso_n5_g1_internal_endpoint_small_parent_interval_cone_root import child_rows
from probe_iso_n5_g1_internal_endpoint_small_shifted_augmented_cone_root import parent_basis
from verify_rank3_three_halves_forest_certificate import (
    finite_output_audit as q3_finite_output_audit,
    symbolic_large_order_certificate as q3_symbolic_large_order_certificate,
)
from verify_two_step_factorial_drop_forest_certificate import (
    finite_certificate as two_step_finite_certificate,
    symbolic_large_order_certificate as two_step_symbolic_large_order_certificate,
    symbolic_rank2_certificate,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_endpoint_all_forest_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_ALL_FOREST_ROOT"

PINS = {
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
    "iso_n5_bundle_g12_canonical_configuration_exact_g1_bernstein_20260829.json":
        "584D8FAA7DA29CAB3884A30173EA7C7C6CB63771902DD3EB284E74AED4068DCB",
    "derive_iso_n5_g1_internal_endpoint_broom_factor_root.py":
        "89324C9B5C2E80B4E365B208FB896F0DB7E57579CC3381EEA8798E6A34EDA4F0",
    "iso_n5_g1_internal_endpoint_broom_factor_root_20260830.json":
        "0FA4D58DD4C3624327843BB8A39E986145675DA0E475473E20F62D2B4F64DDBC",
    "derive_iso_n5_g1_internal_endpoint_broom_parameters_root.py":
        "2582BFF4BBA40A2B11D27AB5A3256D291271EB45BF61827D60EC5ADB220B2879",
    "prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent.py":
        "FCA5115C5D303352DBBC001B305207D583219335326BC48D0C4BFEEE90FB5C1B",
    "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json":
        "27E70D94ED97F659E62D63527365906D33123EFDB4E6F8168951061B83BFCCA1",
    "assemble_iso_n5_c5_all_marked_forests_root.py":
        "9C6E4B5C145378DDE7615A476158F4546F0687CCA910172B4735E2A62443FECA",
    "iso_n5_c5_all_marked_forests_exact_root_20260830.json":
        "F341C659D1B2DEC584D00AE4D86DA9BBCCA75EA91001179A95B30EB6CD584C02",
    "prove_iso_n5_g1_c5_hc_all_forest_g1_bernstein.py":
        "83EC8EAFE8780FDE2EA529EAC996921E9EF21D6F6F32851E88B0C415ED74D656",
    "iso_n5_g1_c5_hc_all_forest_exact_g1_bernstein_20260830.json":
        "8CE7277B5EE9996CC01F14FBDA6D07009ED8152EE08122A7AC4AC60FFDF2FBE5",
    "verify_rank3_three_halves_forest_certificate.py":
        "F78396D95B3CF18C73E5A1586E1B712731E319D9530D01A1AFDA3856CFBAD76D",
    "rank3_three_halves_forest_finite_n15_20260727.json":
        "5CCB7C37B65B98556E4466C0D565F0128F5565D980BCDDC3D3751A253DDB4ED7",
    "verify_two_step_factorial_drop_forest_certificate.py":
        "C9EE3DE3E13499FC9863649481D98413E4BA7B7FEE231DC371DC518FB15B6EF6",
    "prove_iso_n5_g1_internal_endpoint_broom_large_all_parent_root.py":
        "6C9588ACE188DD6EA883275A953E4E3B23F1390D4609EBB5145F02652733184B",
    "iso_n5_g1_internal_endpoint_broom_large_all_parent_exact_root_20260830.json":
        "5208D9D0EFE2C7408DA498FFE019B945A5FB4EE2BD3AFC7A858BF2AAE03FEF95",
    "probe_iso_n5_g1_internal_endpoint_small_parent_interval_cone_root.py":
        "CD0F31DBDC87CED348E73A6B1EE098C26A908F6416DB8263CE03093E22EAA38D",
    "iso_n5_g1_internal_endpoint_small_parent_interval_cone_probe_root_20260830.json":
        "E488D1C4A9991DF8CCFE3B40B1639532E1EF4E54ADE7209694141105BFB94415",
    "probe_iso_n5_g1_internal_endpoint_small_augmented_cone_root.py":
        "655B29A83A30CCE9CC1FCA9F07F3A76F10375DBAA8DEE900A06BBA139F06BED7",
    "iso_n5_g1_internal_endpoint_small_augmented_cone_probe_root_20260830.json":
        "15A20842AE760F25FCB0EEC4DF312B0422B1FB2E080054745C2E076ACCDC473A",
    "probe_iso_n5_g1_internal_endpoint_small_shifted_augmented_cone_root.py":
        "B3E642402B99D162A3027B381EA0A673FFCE460E1C7AAC199C300A2A261F4B90",
    "iso_n5_g1_internal_endpoint_small_shifted_augmented_cone_probe_root_20260830.json":
        "D6E3F8C1B41E091B1D33D70855171A457B23756548B97C2DD9D3FF1CF65DF64A",
    "probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root.py":
        "EEDBCE9A356D6073BC3E5E785F2F989BE7A460E0602DC7AF7C29EB57349206D8",
    "iso_n5_g1_internal_endpoint_boundary_global_payment_probe_root_20260830.json":
        "19037660452464E889F882A788E3C7D3B2AC396D558FC6B32745F867D955F53C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def exact_decomposition(form, variables, basis, saved, weight_field="basis_weights"):
    assert saved["exact_rational_certificate"] is True
    basis_map = dict(basis)
    if weight_field == "interval_sum_weights":
        weights = {
            f"interval_sum_{label}": sp.Rational(value)
            for label, value in saved[weight_field].items()
        }
    else:
        weights = {
            label: sp.Rational(value)
            for label, value in saved[weight_field].items()
        }
    assert all(label in basis_map for label in weights)
    assert all(value >= 0 for value in weights.values())
    residual = sp.expand(form - sum(
        value * basis_map[label] for label, value in weights.items()
    ))
    residual_poly = sp.Poly(residual, *variables)
    assert all(value >= 0 for value in residual_poly.coeffs())
    stream = "".join(
        f"{powers}:{value};" for powers, value in residual_poly.terms()
    )
    digest = hashlib.sha256(stream.encode()).hexdigest().upper()
    assert digest == saved["residual_stream_sha256"]
    assert len(residual_poly.terms()) == saved["residual_nonnegative_monomials"]
    assert str(min(residual_poly.coeffs())) == saved["minimum_residual_scalar"]
    return {
        "weights": {label: str(value) for label, value in weights.items()},
        "residual_nonnegative_monomials": len(residual_poly.terms()),
        "residual_stream_sha256": digest,
        "minimum_residual_scalar": saved["minimum_residual_scalar"],
    }


def child_reduction(expression, rows, length, collision_symbol):
    x, u, y, zz = child_rows(length, collision_symbol)
    substitutions = {}
    for rank in range(1, 7):
        substitutions.update({
            rows["X"][rank]: x[rank],
            rows["U"][rank]: u[rank],
            rows["Y"][rank]: y[rank],
            rows["Z"][rank]: zz[rank],
        })
    return sp.expand(expression.subs(substitutions))


def main() -> None:
    assert {name: sha256(HERE / name) for name in PINS} == PINS

    configuration = load(
        "iso_n5_bundle_g12_canonical_configuration_exact_g1_bernstein_20260829.json"
    )
    disconnected = load(
        "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json"
    )
    c5 = load("iso_n5_c5_all_marked_forests_exact_root_20260830.json")
    hc = load("iso_n5_g1_c5_hc_all_forest_exact_g1_bernstein_20260830.json")
    large = load("iso_n5_g1_internal_endpoint_broom_large_all_parent_exact_root_20260830.json")
    small = load("iso_n5_g1_internal_endpoint_small_parent_interval_cone_probe_root_20260830.json")
    augmented = load("iso_n5_g1_internal_endpoint_small_augmented_cone_probe_root_20260830.json")
    shifted = load("iso_n5_g1_internal_endpoint_small_shifted_augmented_cone_probe_root_20260830.json")
    boundary = load("iso_n5_g1_internal_endpoint_boundary_global_payment_probe_root_20260830.json")

    assert configuration["marker"] == (
        "PASS_EXACT_ISO_N5_BUNDLE_G12_CANONICAL_CONFIGURATION_G1_BERNSTEIN"
    )
    assert configuration["canonical_row_reductions"]["internal_endpoint"] == (
        "C as ordinary; D=(YRv,ZRv,YRv,ZRv)"
    )
    assert disconnected["marker"] == (
        "PASS_EXACT_ISO_N5_DISCONNECTED_M5_ALL_COMPONENTWISE_G1_NONADJACENT"
    )
    assert disconnected["coverage"].startswith("All 16 distinct Psi interval sums")
    assert c5["marker"] == "PASS_EXACT_ISO_N5_C5_ALL_MARKED_FORESTS_ROOT"
    assert c5["theorem"] == (
        "For every finite forest G and every pair of distinct vertices u,v, "
        "C5=[z^4w^4]R(E,U,V,W)-[z^3w^5]R(E,U,V,W) is nonnegative."
    )
    assert hc["marker"] == "PASS_EXACT_ISO_N5_G1_C5_HC_ALL_FOREST_G1_BERNSTEIN"
    assert "H_C(F)=a3^2-a1*a5 is nonnegative" in hc["theorem"]
    assert large["marker"] == (
        "PASS_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_BROOM_LARGE_ALL_PARENT_ROOT"
    )
    assert large["tensor_binomial_certificate"]["unresolved_forms"] == 0

    # Re-run the exact universal Q3, two-step, and rank-two basis checks.
    q3_boxes, _q3_depths = q3_symbolic_large_order_certificate()
    assert q3_boxes == 22 and q3_finite_output_audit() == 28_043
    symbolic_rank2_certificate()
    assert two_step_symbolic_large_order_certificate() == 72
    assert two_step_finite_certificate() == (28_043, 7)

    expression, rows = endpoint_expression()
    k, t = sp.symbols("k t", integer=True, nonnegative=True)
    variables, base_basis = parent_basis(rows)
    base_basis_map = dict(base_basis)
    assert len(base_basis) == 83
    reduced = {
        length: child_reduction(expression, rows, length, k)
        for length in range(1, 8)
    }
    newton = {
        length: tensor_binomial(value, (k,))[1]
        for length, value in reduced.items()
    }

    audited = []
    used_labels = set()

    def record(region, form, basis, saved, weight_field="basis_weights", **indices):
        exact = exact_decomposition(form, variables, basis, saved, weight_field)
        used_labels.update(exact["weights"])
        audited.append({"region": region, **indices, **exact})

    # ell=1,k=0 and ell=4 Newton index zero.
    augmented_rows = {
        (row["ell"], row["k_index"]): row for row in augmented["forms"]
    }
    for length in (1, 4):
        saved = augmented_rows[(length, 0)]
        record(
            "small_augmented_newton",
            newton[length][(0,)],
            base_basis,
            saved,
            ell=length,
            k_index=0,
        )

    # Complete original Newton expansions for ell=4..7.  Index zero at
    # ell=4 was just checked against the augmented cone.
    small_rows = {
        (row["ell"], row["k_index"]): row for row in small["forms"]
    }
    interval_basis = [
        (label, value) for label, value in base_basis
        if label.startswith("interval_sum_")
    ]
    for length in range(4, 8):
        for index, form in sorted(newton[length].items()):
            if form == 0 or (length == 4 and index == (0,)):
                continue
            saved = small_rows[(length, index[0])]
            record(
                "small_interval_newton",
                form,
                interval_basis,
                saved,
                weight_field="interval_sum_weights",
                ell=length,
                k_index=index[0],
            )

    # Three concrete low-k boundary states.  The C5_C row is the universal
    # C5 form of the marked forest C obtained after the support is removed.
    boundary_rows = {
        (row["ell"], row["k"], row["generator_set"]): row
        for row in boundary["rows"]
    }
    r, q = rows["R"], rows["Q"]
    r0 = tuple(
        sp.expand(r[index] + (q[index - 1] if index >= 1 else 0))
        for index in range(7)
    )
    constants = {r[0]: 1, q[0]: 1, q[6]: 0}
    for length, collision_count in ((1, 1), (2, 0), (3, 0)):
        x, u, _y, _zz = child_rows(length, sp.Integer(collision_count))
        crows = (
            convolve(x, r0),
            convolve(u, r0),
            convolve(x, r),
            convolve(u, r),
        )
        crows = tuple(
            tuple(sp.expand(value.subs(constants)) for value in row)
            for row in crows
        )
        c5_c = compact_forms(crows)["C5_C"]
        saved = boundary_rows[(length, collision_count, "C5_only")]
        record(
            "concrete_boundary_C5_payment",
            reduced[length].subs(k, collision_count),
            [*base_basis, ("C5_C", c5_c)],
            saved,
            ell=length,
            k_value=collision_count,
        )

    # Shifted tails: ell=1 uses k=2+t; ell=2,3 use k=1+t.
    shifted_rows = {
        (row["ell"], row["shift"], row["t_index"]): row
        for row in shifted["rows"]
        if row["row_kind"] == "shifted_newton_coefficient"
    }
    for length, shift in ((1, 2), (2, 1), (3, 1)):
        shifted_expression = sp.expand(reduced[length].subs(k, shift + t))
        degree, coefficients = tensor_binomial(shifted_expression, (t,))
        assert degree == (6,)
        indices = []
        for index, form in sorted(coefficients.items()):
            if form == 0:
                continue
            saved = shifted_rows[(length, shift, index[0])]
            record(
                "shifted_collision_tail",
                form,
                base_basis,
                saved,
                ell=length,
                k_shift=shift,
                t_index=index[0],
            )
            indices.append(index[0])
        assert indices == list(range(7))

    assert len(audited) == 53
    assert sum(row["region"] == "small_augmented_newton" for row in audited) == 2
    assert sum(row["region"] == "small_interval_newton" for row in audited) == 27
    assert sum(row["region"] == "concrete_boundary_C5_payment" for row in audited) == 3
    assert sum(row["region"] == "shifted_collision_tail" for row in audited) == 21
    assert "C5_C" in used_labels

    supported_labels = {
        "HC_R", "HC_Q", "Q3_R", "Q3_Q", "two_step_R", "two_step_Q",
        "rank2_companion_R", "rank2_companion_Q", "C5_C",
    }
    for label in used_labels:
        assert (
            label.startswith("interval_sum_")
            or label.startswith("dominance_")
            or label in supported_labels
        ), label

    report = {
        "marker": MARKER,
        "theorem": (
            "In the canonical internal-spine broom endpoint mode, g1>=0 for every "
            "finite parent-side forest, every protected broom length ell>=1, and "
            "every collision-leaf count k>=0."
        ),
        "parent_domain": {
            "rows": "R=I(F-v), Q=I(F-N[v])",
            "componentwise_deletion": (
                "Distinct neighbors of v lie in distinct components of F-v, or a "
                "cycle would result.  Thus Q is obtained from R by deleting at "
                "most one vertex per component, exactly the interval-theorem domain."
            ),
            "coefficient_dominance": "Q is an induced subforest of R, so q_j<=r_j.",
        },
        "sign_generators": {
            "interval_sums": "all interval sums 2..16 are nonnegative by the pinned disconnected-M5 theorem",
            "HC": "a3^2-a1*a5>=0 for every forest",
            "Q3": "6*a3^2-a2*a3-8*a2*a4>=0 for every forest",
            "two_step": "2*a2*a3-a1*a3-4*a1*a4>=0 for every forest",
            "rank2_companion": "2*a2^2-3*a1*a3-2*a2>=0 for every forest",
            "dominance": "(r_j-q_j) times a nonnegative coefficient is nonnegative",
            "C5_C": "C5(C)>=0 for every finite marked forest C",
        },
        "coverage": [
            {"ell": 1, "k": "0", "certificate": "augmented Newton boundary"},
            {"ell": 1, "k": "1", "certificate": "exact C5_C boundary payment"},
            {"ell": 1, "k": "2+t, t>=0", "certificate": "seven shifted Newton coefficients"},
            {"ell": [2, 3], "k": "0", "certificate": "exact C5_C boundary payments"},
            {"ell": [2, 3], "k": "1+t, t>=0", "certificate": "seven shifted Newton coefficients per length"},
            {"ell": [4, 7], "k": "all k>=0", "certificate": "complete Newton expansions"},
            {"ell": "8+h, h>=0", "k": "all k>=0", "certificate": "pinned 28-cell tensor-binomial theorem"},
        ],
        "small_exact_audit": {
            "exact_decomposition_rows": len(audited),
            "unresolved_rows": 0,
            "used_basis_labels": sorted(used_labels),
            "rows": audited,
        },
        "large_exact_audit": {
            "nonzero_parent_forms": large["tensor_binomial_certificate"]["nonzero_parent_forms"],
            "unresolved_forms": large["tensor_binomial_certificate"]["unresolved_forms"],
            "report_sha256": PINS[
                "iso_n5_g1_internal_endpoint_broom_large_all_parent_exact_root_20260830.json"
            ],
        },
        "coverage_is_disjoint_and_exhaustive": True,
        "dependencies_sha256": PINS,
        "scope": (
            "This closes exactly the internal_spine_broom_endpoint canonical g1 "
            "mode.  The singleton endpoint, singleton ordinary, and internal "
            "ordinary g1 modes; g2; all N5; and Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "small_exact_rows": len(audited),
        "large_exact_rows": report["large_exact_audit"]["nonzero_parent_forms"],
        "unresolved": 0,
        "theorem": report["theorem"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
