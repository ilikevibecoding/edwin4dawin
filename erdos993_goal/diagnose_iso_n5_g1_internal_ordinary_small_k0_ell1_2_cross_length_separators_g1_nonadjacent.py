#!/usr/bin/env python3
"""Exact separating diagnostics for the four open literal k=0 faces.

For each ell=1,2 parent placement, grant every solver-free certified literal
target at ell=3,...,7 as an additional nonnegative generator.  The requested
coefficient-cone decomposition remains infeasible.  This diagnostic records
an exact Farkas functional y with

    y >= 0,  <y,generator> >= 0,  <y,target> = -1.

Consequently the proposed generator cone cannot prove the target.  This is a
method obstruction only, never a graph counterexample or a sign disproof.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

import probe_iso_n5_g1_internal_ordinary_small_k0_cross_length_parent_cone_g1_nonadjacent as probe
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k0_ell1_2_cross_length_separators_diagnostic_g1_nonadjacent_20260830.json"
MARKER = "DIAGNOSTIC_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_ELL1_2_CROSS_LENGTH_SEPARATORS_G1_NONADJACENT"
CERTIFIED_LENGTHS = (3, 4, 5, 6, 7)

DEPENDENCIES = {
    "probe_iso_n5_g1_internal_ordinary_small_k0_cross_length_parent_cone_g1_nonadjacent.py":
        "0399A73F9C097B1E4DBBB2C2AAA70FA5FFF8B9CDC8B3A6134B91BC36A44C183D",
    "iso_n5_g1_internal_ordinary_small_k0_cross_length_parent_cone_probe_g1_nonadjacent_20260830.json":
        "72F16F941DA6CA1D67FAB28D8DDFC83D1C6D7A05D1202F54CCB40B5AD1FBC162",
    "prove_iso_n5_g1_internal_ordinary_small_k0_ell3_7_literal_all_parent_g1_nonadjacent.py":
        "1004A6D5C2E2163278E72463C2225D988EAE1765E789DEB68CDFF54360D1680B",
    "iso_n5_g1_internal_ordinary_small_k0_ell3_7_literal_all_parent_exact_g1_nonadjacent_20260830.json":
        "DEA3CEA8EE74E28A3AF02BE416462BC280EE081DF9C3690065F8CF5EEB4461F4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def exact_normalized_rationalization(solution, labels, target_vector, basis_vectors):
    for support_tolerance in (1e-8, 1e-10, 1e-12):
        for denominator in (10_000, 1_000_000, 100_000_000):
            values = [
                sp.Rational(Fraction(float(value)).limit_denominator(denominator))
                if value > support_tolerance else sp.Rational(0)
                for value in solution.x
            ]
            target_pairing = sum(
                value * coefficient
                for value, coefficient in zip(values, target_vector)
            )
            if target_pairing >= 0:
                continue
            values = [sp.factor(value / (-target_pairing)) for value in values]
            pairings = {
                label: sum(
                    values[row] * basis_vectors[label][row]
                    for row in range(len(target_vector))
                )
                for label in labels
            }
            if all(value >= 0 for value in values) and all(
                value >= 0 for value in pairings.values()
            ):
                return values, pairings, {
                    "method": "exact normalized rationalization",
                    "support_tolerance": support_tolerance,
                    "denominator_limit": denominator,
                }
    return None, None, {"method": "fast rationalization failed"}


def diagnose(expression, rows, ell, epsilon):
    target_raw, child = probe.target_for_length(expression, rows, ell)
    partition_rules, active, variables, _abcd = probe.parent_chart(rows, epsilon)
    target = sp.expand(target_raw.subs(partition_rules))
    basis = probe.base_basis(rows, child, partition_rules, active, variables, epsilon)
    for known_ell in CERTIFIED_LENGTHS:
        known_raw, _known_child = probe.target_for_length(expression, rows, known_ell)
        basis.append((
            f"known_target_ell{known_ell}_{'nonadjacent' if epsilon else 'adjacent'}",
            sp.expand(known_raw.subs(partition_rules)),
        ))
    universe, labels, target_vector, basis_vectors = probe.vectorize(
        target, basis, variables
    )
    coefficient_matrix = np.array([
        [float(basis_vectors[label][row]) for label in labels]
        for row in range(len(universe))
    ])
    rhs = np.array([float(value) for value in target_vector])
    primal = linprog(
        c=np.zeros(len(labels)),
        A_ub=coefficient_matrix,
        b_ub=rhs,
        bounds=[(0, None)] * len(labels),
        method="highs",
    )
    assert not primal.success

    dual = linprog(
        c=np.ones(len(universe)),
        A_ub=-coefficient_matrix.T,
        b_ub=np.zeros(len(labels)),
        A_eq=np.array([rhs]),
        b_eq=np.array([-1.0]),
        bounds=[(0, None)] * len(universe),
        method="highs",
    )
    assert dual.success
    values, pairings, recovery = exact_normalized_rationalization(
        dual, labels, target_vector, basis_vectors
    )
    if values is None:
        values, pairings, recovery = probe.recover_exact_separator(
            dual, labels, target_vector, basis_vectors
        )
    assert values is not None
    assert all(value >= 0 for value in values)
    assert sum(value * coefficient for value, coefficient in zip(values, target_vector)) == -1
    assert all(value >= 0 for value in pairings.values())
    sparse = [
        {"powers": list(universe[index]), "weight": str(value)}
        for index, value in enumerate(values) if value
    ]
    stream = "".join(
        f"{universe[index]}:{value};"
        for index, value in enumerate(values) if value
    )
    cross_labels = {
        f"known_target_ell{known}_{'nonadjacent' if epsilon else 'adjacent'}"
        for known in CERTIFIED_LENGTHS
    }
    return {
        "ell": ell,
        "epsilon": epsilon,
        "geometry": "nonadjacent" if epsilon else "adjacent",
        "target_hash": probe.hashlib.sha256("".join(
            f"{powers}:{value};"
            for powers, value in zip(universe, target_vector) if value
        ).encode()).hexdigest().upper(),
        "coefficient_rows": len(universe),
        "base_generators": len(basis) - len(CERTIFIED_LENGTHS),
        "certified_cross_length_generators": sorted(cross_labels),
        "total_generators": len(basis),
        "primal_status": primal.message,
        "recovery": recovery,
        "separator_support": len(sparse),
        "separator_weights": sparse,
        "separator_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        "target_pairing": "-1",
        "minimum_generator_pairing": str(min(pairings.values())),
        "zero_generator_pairings": sum(1 for value in pairings.values() if value == 0),
        "positive_generator_pairings": sum(1 for value in pairings.values() if value > 0),
        "cross_length_pairings": {
            label: str(pairings[label]) for label in sorted(cross_labels)
        },
    }


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    theorem = json.loads((HERE / (
        "iso_n5_g1_internal_ordinary_small_k0_ell3_7_literal_all_parent_exact_"
        "g1_nonadjacent_20260830.json"
    )).read_text(encoding="utf-8"))
    assert theorem["marker"] == (
        "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_ELL3_7_LITERAL_ALL_PARENT_G1_NONADJACENT"
    )
    expression, rows = ordinary_expression()
    faces = [
        diagnose(expression, rows, ell, epsilon)
        for ell in (1, 2) for epsilon in (0, 1)
    ]
    report = {
        "marker": MARKER,
        "faces": faces,
        "exact_separators": sum(face["target_pairing"] == "-1" for face in faces),
        "interpretation": (
            "Each exact nonnegative functional is nonnegative on every allowed "
            "base generator, every certified ell=3..7 target generator, and every "
            "coefficientwise nonnegative residual, but equals -1 on the ell=1 or "
            "ell=2 target. Therefore this augmented cone cannot certify those faces."
        ),
        "strict_warning": (
            "This is only a separating obstruction to the proposed sufficient-condition "
            "cone. It is not a forest counterexample and does not show g1<0."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "exact_separators": report["exact_separators"],
        "faces": [
            {
                "ell": face["ell"],
                "geometry": face["geometry"],
                "support": face["separator_support"],
                "minimum_generator_pairing": face["minimum_generator_pairing"],
            }
            for face in faces
        ],
        "strict_warning": report["strict_warning"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
