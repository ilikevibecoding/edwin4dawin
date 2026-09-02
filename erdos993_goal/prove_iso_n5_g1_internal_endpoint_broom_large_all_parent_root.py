#!/usr/bin/env python3
"""All-order internal-spine endpoint g1 theorem for broom length ell>=8.

The exact broom reduction writes g1 as 28 tensor-binomial cells in
h=ell-8 and the collision-leaf count k.  This verifier independently
reconstructs every cell and checks its rational decomposition into the
sixteen nonnegative componentwise-deletion interval sums proved by the
disconnected-M5 theorem, plus a coefficientwise-nonnegative residual.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_factor_root import endpoint_expression
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_endpoint_broom_large_all_parent_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_BROOM_LARGE_ALL_PARENT_ROOT"

PINS = {
    "derive_iso_n5_g1_internal_endpoint_broom_factor_root.py":
        "89324C9B5C2E80B4E365B208FB896F0DB7E57579CC3381EEA8798E6A34EDA4F0",
    "iso_n5_g1_internal_endpoint_broom_factor_root_20260830.json":
        "0FA4D58DD4C3624327843BB8A39E986145675DA0E475473E20F62D2B4F64DDBC",
    "derive_iso_n5_g1_internal_endpoint_broom_parameters_root.py":
        "2582BFF4BBA40A2B11D27AB5A3256D291271EB45BF61827D60EC5ADB220B2879",
    "iso_n5_g1_internal_endpoint_broom_parameters_root_20260830.json":
        "2075C25A1761F7136498982FAFB3243A71E5F1349C07BC22F155E6A12E8B87D3",
    "probe_iso_n5_g1_internal_endpoint_parent_interval_cone_root.py":
        "D125C77324440B11C4DA463389A3866E0CF8158051B0004F3B5D3D8D62652FD3",
    "iso_n5_g1_internal_endpoint_parent_interval_cone_probe_root_20260830.json":
        "F6EF8CE022530F772F4C539D1271ABBBDFAC510E43D7FF51AFD4069FEAD59AD3",
    "prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent.py":
        "FCA5115C5D303352DBBC001B305207D583219335326BC48D0C4BFEEE90FB5C1B",
    "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json":
        "27E70D94ED97F659E62D63527365906D33123EFDB4E6F8168951061B83BFCCA1",
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
    "iso_n5_bundle_g12_canonical_configuration_exact_g1_bernstein_20260829.json":
        "584D8FAA7DA29CAB3884A30173EA7C7C6CB63771902DD3EB284E74AED4068DCB",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert {name: sha256(HERE / name) for name in PINS} == PINS
    probe = json.loads(
        (HERE / "iso_n5_g1_internal_endpoint_parent_interval_cone_probe_root_20260830.json")
        .read_text(encoding="utf-8")
    )
    disconnected = json.loads(
        (HERE / "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json")
        .read_text(encoding="utf-8")
    )
    configuration = json.loads(
        (HERE / "iso_n5_bundle_g12_canonical_configuration_exact_g1_bernstein_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert probe["marker"] == "PROBE_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_PARENT_INTERVAL_CONE_ROOT"
    assert probe["stable_parent_forms"] == probe["exact_decompositions"] == 28
    assert probe["unresolved_forms"] == 0
    assert disconnected["marker"] == (
        "PASS_EXACT_ISO_N5_DISCONNECTED_M5_ALL_COMPONENTWISE_G1_NONADJACENT"
    )
    assert disconnected["coverage"].startswith("All 16 distinct Psi interval sums")
    assert configuration["canonical_row_reductions"]["internal_endpoint"] == (
        "C as ordinary; D=(YRv,ZRv,YRv,ZRv)"
    )

    expression, rows = endpoint_expression()
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    substitutions = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        substitutions.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })
    parameterized = sp.expand(expression.subs(substitutions))
    degrees, coefficients = tensor_binomial(parameterized, (h, k))
    assert degrees == (6, 6)

    interval = unique_expressions(interval_cells(P, H))[1:]
    interval = [sp.expand(value.subs({P[0]: 1, H[0]: 1})) for value in interval]
    mapping = {
        **{P[index]: rows["R"][index] for index in range(1, 7)},
        **{H[index]: rows["Q"][index] for index in range(1, 6)},
    }
    interval = [sp.expand(value.subs(mapping)) for value in interval]
    variables = tuple(list(rows["Q"][1:6]) + list(rows["R"][1:7]))
    certificate_rows = {
        (row["h_index"], row["k_index"]): row for row in probe["forms"]
    }
    assert len(certificate_rows) == 28

    audit_rows = []
    for index, form in sorted(coefficients.items()):
        if form == 0:
            continue
        saved = certificate_rows[index]
        assert saved["exact_rational_certificate"] is True
        weights = {
            int(label): sp.Rational(value)
            for label, value in saved["interval_sum_weights"].items()
        }
        assert all(2 <= label <= 16 and value >= 0 for label, value in weights.items())
        residual = sp.expand(form - sum(
            weight * interval[label - 2] for label, weight in weights.items()
        ))
        residual_poly = sp.Poly(residual, *variables)
        assert all(value >= 0 for value in residual_poly.coeffs())
        stream = "".join(
            f"{powers}:{value};" for powers, value in residual_poly.terms()
        )
        assert hashlib.sha256(stream.encode()).hexdigest().upper() == saved[
            "residual_stream_sha256"
        ]
        assert len(residual_poly.terms()) == saved["residual_nonnegative_monomials"]
        assert str(min(residual_poly.coeffs())) == saved["minimum_residual_scalar"]
        audit_rows.append({
            "h_index": index[0],
            "k_index": index[1],
            "interval_sum_weights": {str(label): str(value) for label, value in weights.items()},
            "residual_nonnegative_monomials": len(residual_poly.terms()),
            "residual_stream_sha256": saved["residual_stream_sha256"],
        })
    assert len(audit_rows) == 28

    report = {
        "marker": MARKER,
        "theorem": (
            "In the canonical internal-spine broom endpoint mode, g1>=0 for every "
            "finite parent-side forest whenever the protected broom length ell>=8 "
            "and the collision-leaf count k>=0."
        ),
        "componentwise_deletion_lemma": (
            "Let R=F-v and Q=F-N[v].  In a forest, two distinct neighbors of v "
            "cannot lie in one component of R, since a path between them together "
            "with v would form a cycle.  Thus Q is obtained from R by deleting one "
            "vertex in each v-incident component and leaving every other component "
            "untouched, exactly the pinned componentwise-deletion domain."
        ),
        "tensor_binomial_certificate": {
            "parameterization": "ell=8+h, h>=0, k>=0",
            "degrees_h_k": list(degrees),
            "nonzero_parent_forms": len(audit_rows),
            "exact_interval_cone_decompositions": len(audit_rows),
            "unresolved_forms": 0,
            "logic": (
                "Every parent form is a nonnegative rational combination of "
                "nonnegative interval sums 2..16 plus nonnegative coefficient "
                "monomials.  Since C(h,i)C(k,j)>=0, their tensor-binomial sum g1 "
                "is nonnegative."
            ),
            "audit_rows": audit_rows,
        },
        "dependencies_sha256": PINS,
        "scope": (
            "This closes the ell>=8 sector of internal_spine_broom_endpoint g1. "
            "Lengths ell<=7, the other three D!=C g1 modes, g2, all N5, and "
            "Erdos Problem 993 remain separate obligations."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "parent_forms": len(audit_rows),
        "unresolved": 0,
        "theorem": report["theorem"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
