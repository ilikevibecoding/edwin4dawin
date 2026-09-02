#!/usr/bin/env python3
"""All-order theorem for the internal-spine broom endpoint g2 mode.

For every protected one-ended broom length ell>=1, every collision-leaf
count k>=0, and every parent-side forest, the exact factor form is expanded
in an integer Newton basis.  Each parent form is replayed as a nonnegative
rational combination of proved componentwise-deletion interval sums,
universal forest drop inequalities, induced-subforest dominance terms, and
coefficientwise-nonnegative monomials.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g2_internal_endpoint_broom_factor_rank5_g2_alt import endpoint_expression
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from probe_iso_n5_g1_internal_endpoint_small_parent_interval_cone_root import child_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    interval_cells,
    unique_expressions,
)
from verify_two_step_factorial_drop_forest_certificate import (
    finite_certificate as two_step_finite_certificate,
    symbolic_large_order_certificate as two_step_symbolic_large_order_certificate,
    symbolic_rank2_certificate,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_endpoint_all_forest_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_INTERNAL_ENDPOINT_ALL_FOREST_RANK5_G2_ALT"
PINS = {
    "derive_iso_n5_g2_internal_endpoint_broom_factor_rank5_g2_alt.py":
        "E66F42547B1C19A1F9FFAED89BB6A85027018ECA8EBC4311AB291B717F4C49F6",
    "iso_n5_g2_internal_endpoint_broom_factor_exact_rank5_g2_alt_20260830.json":
        "20E10E80B4672BD3037ACE3FA904813DA94CC6780E0699EEB7FE11B0344E7F34",
    "probe_iso_n5_g2_internal_endpoint_parent_interval_cone_rank5_g2_alt.py":
        "44DC0BFF407491E3C98B70083016D05E6BF86960171B2A1E6ABED2FD85BC78D6",
    "iso_n5_g2_internal_endpoint_parent_interval_cone_probe_rank5_g2_alt_20260830.json":
        "2CFE7C9DD1AD62FDC47AC4ECDFF1822576C28A07738B1FFEBC3D3850AA475EA5",
    "probe_iso_n5_g2_internal_endpoint_origin_augmented_cone_rank5_g2_alt.py":
        "F283968E92B7DC30D2DA6DFD9D7C634E8B89C365EDD3C7425B1C1302174FFBC6",
    "iso_n5_g2_internal_endpoint_origin_augmented_cone_probe_rank5_g2_alt_20260830.json":
        "D7454060BEDA0715D9CC7B4BAB6510889F7723FDFB3FE9650F5C1959112D7608",
    "probe_iso_n5_g2_internal_endpoint_small_augmented_cone_rank5_g2_alt.py":
        "7082E24EC692D4376D4773A9AD5830A99AE74DBEBF28198F1661B43D590D86FC",
    "iso_n5_g2_internal_endpoint_small_augmented_cone_probe_rank5_g2_alt_20260830.json":
        "9A65029A0929E93E015C2CBAABFB5E8FCBAC31D00483360FE5B56768318CAA5A",
    "prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent.py":
        "FCA5115C5D303352DBBC001B305207D583219335326BC48D0C4BFEEE90FB5C1B",
    "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json":
        "27E70D94ED97F659E62D63527365906D33123EFDB4E6F8168951061B83BFCCA1",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "verify_two_step_factorial_drop_forest_certificate.py":
        "C9EE3DE3E13499FC9863649481D98413E4BA7B7FEE231DC371DC518FB15B6EF6",
    "derive_iso_n5_g1_internal_endpoint_broom_parameters_root.py":
        "2582BFF4BBA40A2B11D27AB5A3256D291271EB45BF61827D60EC5ADB220B2879",
    "probe_iso_n5_g1_internal_endpoint_small_parent_interval_cone_root.py":
        "CD0F31DBDC87CED348E73A6B1EE098C26A908F6416DB8263CE03093E22EAA38D",
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def load(name):
    return json.loads((HERE / name).read_text())


def parent_basis(rows):
    q, r = rows["Q"], rows["R"]
    variables = tuple(list(q[1:6]) + list(r[1:7]))
    interval = unique_expressions(interval_cells(P, H))[1:]
    mapping = {
        P[0]: 1, H[0]: 1,
        **{P[index]: r[index] for index in range(1, 7)},
        **{H[index]: q[index] for index in range(1, 6)},
    }
    basis = [
        (f"interval_sum_{label}", sp.expand(value.subs(mapping)))
        for label, value in enumerate(interval, 2)
    ]
    for name, row in (("R", r), ("Q", q)):
        basis.extend([
            (f"two_step_{name}", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
            (f"rank2_companion_{name}", 2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]),
        ])
    multipliers = [("one", sp.Integer(1))] + [(str(symbol), symbol) for symbol in variables]
    for rank in range(1, 6):
        difference = r[rank] - q[rank]
        for multiplier_name, multiplier in multipliers:
            basis.append((
                f"dominance_{rank}_times_{multiplier_name}",
                sp.expand(difference * multiplier),
            ))
    return variables, basis


def exact_decomposition(form, variables, basis, saved, interval_only=False):
    assert saved["exact_rational_certificate"] is True
    basis_map = dict(basis)
    if interval_only:
        weights = {
            f"interval_sum_{label}": sp.Rational(value)
            for label, value in saved["interval_sum_weights"].items()
        }
    else:
        weights = {label: sp.Rational(value) for label, value in saved["weights"].items()}
    assert all(label in basis_map for label in weights)
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


def stable_forms(expression, rows):
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    rules = {}
    for rank in range(1, 7):
        u = isolate_times_path(k, ell - 1, rank)
        x = sp.expand(u + path_coefficient(ell - 2, rank - 1))
        z = isolate_times_path(k, ell - 2, rank)
        y = sp.expand(z + path_coefficient(ell - 3, rank - 1))
        rules.update({rows["X"][rank]: x, rows["U"][rank]: u,
                      rows["Y"][rank]: y, rows["Z"][rank]: z})
    reduced = sp.expand(expression.subs(rules))
    degrees, forms = tensor_binomial(reduced, (h, k))
    assert degrees == (5, 5)
    return forms


def small_forms(expression, rows, ell):
    k = sp.Symbol("k", integer=True, nonnegative=True)
    actual = child_rows(ell, k)
    rules = {
        rows[name][rank]: actual[index][rank]
        for index, name in enumerate(("X", "U", "Y", "Z"))
        for rank in range(1, 7)
    }
    reduced = sp.expand(expression.subs(rules))
    degrees, forms = tensor_binomial(reduced, (k,))
    assert degrees == (5,)
    return forms


def main():
    assert {name: sha256(HERE / name) for name in PINS} == PINS
    factor = load("iso_n5_g2_internal_endpoint_broom_factor_exact_rank5_g2_alt_20260830.json")
    interval = load("iso_n5_g2_internal_endpoint_parent_interval_cone_probe_rank5_g2_alt_20260830.json")
    origin = load("iso_n5_g2_internal_endpoint_origin_augmented_cone_probe_rank5_g2_alt_20260830.json")
    small = load("iso_n5_g2_internal_endpoint_small_augmented_cone_probe_rank5_g2_alt_20260830.json")
    componentwise = load("iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json")
    assert factor["marker"] == "DERIVED_EXACT_ISO_N5_G2_INTERNAL_ENDPOINT_BROOM_FACTOR_RANK5_G2_ALT"
    assert interval["exact_decompositions"] == 20 and interval["unresolved_forms"] == 1
    assert origin["exact_rational_certificate"] is True
    assert small["exact_decompositions"] == 42 and small["unresolved_forms"] == 0
    assert componentwise["marker"] == "PASS_EXACT_ISO_N5_DISCONNECTED_M5_ALL_COMPONENTWISE_G1_NONADJACENT"
    assert componentwise["coverage"].startswith("All 16 distinct Psi interval sums")

    # Independently replay the universal two-step and rank-two generators.
    symbolic_rank2_certificate()
    assert two_step_symbolic_large_order_certificate() == 72
    assert two_step_finite_certificate() == (28_043, 7)

    expression, rows = endpoint_expression()
    variables, basis = parent_basis(rows)
    assert len(basis) == 79  # 15 interval + 4 universal + 60 dominance rows.
    interval_basis = [(label, value) for label, value in basis if label.startswith("interval_sum_")]
    used_labels = set()
    audited = []

    interval_saved = {
        (row["h_index"], row["k_index"]): row for row in interval["forms"]
    }
    stable = stable_forms(expression, rows)
    nonzero_stable = 0
    for index, form in sorted(stable.items()):
        if form == 0:
            continue
        nonzero_stable += 1
        if index == (0, 0):
            exact = exact_decomposition(form, variables, basis, origin)
            region = "stable_origin_augmented"
        else:
            saved = interval_saved[index]
            exact = exact_decomposition(form, variables, interval_basis, saved, interval_only=True)
            region = "stable_interval"
        used_labels.update(exact["weights"])
        audited.append({"region": region, "h_index": index[0], "k_index": index[1], **exact})
    assert nonzero_stable == 21

    small_saved = {
        (row["ell"], row["k_index"]): row for row in small["forms"]
    }
    for ell in range(1, 8):
        forms = small_forms(expression, rows, ell)
        indices = []
        for index, form in sorted(forms.items()):
            if form == 0:
                continue
            saved = small_saved[(ell, index[0])]
            exact = exact_decomposition(form, variables, basis, saved)
            used_labels.update(exact["weights"])
            audited.append({"region": "small_augmented", "ell": ell, "k_index": index[0], **exact})
            indices.append(index[0])
        assert indices == list(range(6))

    assert len(audited) == 63
    supported = {"two_step_R", "two_step_Q", "rank2_companion_R", "rank2_companion_Q"}
    for label in used_labels:
        assert label.startswith("interval_sum_") or label.startswith("dominance_") or label in supported

    report = {
        "marker": MARKER,
        "theorem": (
            "In the canonical internal_spine_broom_endpoint mode, rank-five g2>=0 "
            "for every finite parent-side forest, every broom length ell>=1, and "
            "every collision-leaf count k>=0."
        ),
        "parent_domain": {
            "rows": "R=I(F-v), Q=I(F-N[v])",
            "componentwise_deletion": (
                "Distinct neighbors of v lie in distinct components of F-v in a forest; "
                "hence Q is obtained from R by deleting at most one vertex per component."
            ),
            "coefficient_dominance": "Q is an induced subforest of R, so q_j<=r_j.",
        },
        "sign_generators": {
            "interval_sums": "all componentwise-deletion interval sums 2..16 are nonnegative",
            "two_step": "2*a2*a3-a1*a3-4*a1*a4>=0 for every forest",
            "rank2_companion": "2*a2^2-3*a1*a3-2*a2>=0 for every forest",
            "dominance": "(r_j-q_j) times a nonnegative independence coefficient is nonnegative",
            "residual": "coefficientwise nonnegative in the nonnegative q_j,r_j variables",
        },
        "coverage": [
            {"ell": [1, 7], "k": "all integers k>=0", "certificate": "42 exact k-Newton parent forms"},
            {"ell": "8+h, h>=0", "k": "all integers k>=0", "certificate": "21 exact tensor-Newton parent forms"},
        ],
        "exact_audit": {
            "rows": len(audited),
            "small_rows": sum(row["region"] == "small_augmented" for row in audited),
            "stable_interval_rows": sum(row["region"] == "stable_interval" for row in audited),
            "stable_origin_rows": sum(row["region"] == "stable_origin_augmented" for row in audited),
            "used_basis_labels": sorted(used_labels),
            "decompositions": audited,
        },
        "coverage_is_disjoint_and_exhaustive": True,
        "dependencies_sha256": PINS,
        "scope": (
            "Exactly the internal_spine_broom_endpoint canonical rank-five g2 mode. "
            "The internal ordinary mode, all g2, all N5, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "exact_rows": len(audited),
        "small_rows": report["exact_audit"]["small_rows"],
        "stable_rows": report["exact_audit"]["stable_interval_rows"] + 1,
        "unresolved": 0,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
