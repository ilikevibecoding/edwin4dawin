#!/usr/bin/env python3
"""Exact global-payment cone probe for the three endpoint boundary states.

The residual parent cone leaves exactly the concrete child states
``(ell,k)=(1,1),(2,0),(3,0)``.  In every internal-endpoint state the row
``C`` is itself the four-minor row of the marked forest obtained after the
chosen support is removed; its marks lie in different components.  Hence
the already proved all-forest ``N4(C)``, disconnected-mark ``M5(C)``, and
all-mark ``C5(C)`` forms are legitimate nonnegative generators.

This script constructs those generators directly from the compact
bivariate operator, specializes them to each child state, and asks for an
exact rational decomposition of the boundary g1 form.  It is a probe: only
an exact decomposition is a sign certificate.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_common_factor_product_rule_root import defect_form, nested
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve, endpoint_expression
from derive_iso_nested_compact_operator_root import w, z
from probe_iso_n5_g1_internal_endpoint_small_parent_interval_cone_root import child_rows
from probe_iso_n5_g1_internal_endpoint_small_shifted_augmented_cone_root import (
    cone_row,
    parent_basis,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_endpoint_boundary_global_payment_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_BOUNDARY_GLOBAL_PAYMENT_ROOT"
TARGETS = ((1, 1), (2, 0), (3, 0))


def polynomial_tuple(row):
    pz = sum(value * z**index for index, value in enumerate(row))
    pw = sum(value * w**index for index, value in enumerate(row))
    return pz, pw, sp.diff(pz, z), sp.diff(pw, w)


def coefficient(expression, left, right):
    return sp.expand(expression).coeff(z, left).coeff(w, right)


def compact_forms(crows):
    tuples = tuple(polynomial_tuple(row) for row in crows)
    nvalue = nested(tuples)
    rvalue = defect_form(tuples)
    n4 = coefficient(nvalue, 4, 4)
    m5 = 2 * coefficient(nvalue, 4, 5)
    c5 = coefficient(rvalue, 4, 4) - coefficient(rvalue, 3, 5)
    return {
        "N4_C": sp.expand(n4),
        "M5_C": sp.expand(m5),
        "C5_C": sp.expand(c5),
        "S_C": sp.expand(m5 + 3 * c5),
        "no_parent_g1_C": sp.expand(m5 + 3 * c5 + 2 * n4),
    }


def main() -> None:
    endpoint, rows = endpoint_expression()
    generic_c, generic_d, raw_g1, _raw_g2 = raw_coefficients()
    variables, base_basis = parent_basis(rows)
    r, q = rows["R"], rows["Q"]
    r0 = tuple(sp.expand(r[index] + (q[index - 1] if index >= 1 else 0)) for index in range(7))
    constants = {r[0]: 1, q[0]: 1, q[6]: 0}

    results = []
    for length, collisions in TARGETS:
        x, u, y, zz = child_rows(length, sp.Integer(collisions))
        child_constants = {
            symbol: value
            for symbolic_row, actual_row in (
                (rows["X"], x), (rows["U"], u),
                (rows["Y"], y), (rows["Z"], zz),
            )
            for symbol, value in zip(symbolic_row, actual_row)
        }
        target = sp.expand(endpoint.subs(child_constants).subs(constants))

        crows = (
            convolve(x, r0),
            convolve(u, r0),
            convolve(x, r),
            convolve(u, r),
        )
        crows = tuple(tuple(sp.expand(value.subs(constants)) for value in row) for row in crows)
        global_forms = compact_forms(crows)

        # Independently match the raw no-parent specialization before using
        # the compact generators in a cone.
        raw_rules = {
            symbol: value
            for generic_row, actual_row in zip(generic_c, crows)
            for symbol, value in zip(generic_row, actual_row)
        }
        raw_rules.update({
            symbol: value
            for generic_row, actual_row in zip(generic_d, crows)
            for symbol, value in zip(generic_row, actual_row)
        })
        assert sp.expand(raw_g1.subs(raw_rules) - global_forms["no_parent_g1_C"]) == 0

        for generator_set in (
            ("C5_only", ("C5_C",)),
            ("N4_M5_C5", ("N4_C", "M5_C", "C5_C")),
            ("N4_S", ("N4_C", "S_C")),
            ("no_parent", ("no_parent_g1_C",)),
        ):
            label, names = generator_set
            basis = list(base_basis) + [(name, global_forms[name]) for name in names]
            row = cone_row(target, variables, basis)
            results.append({
                "ell": length,
                "k": collisions,
                "generator_set": label,
                "extra_generators": list(names),
                **row,
            })

    report = {
        "marker": MARKER,
        "targets": [list(target) for target in TARGETS],
        "base_basis_size": len(base_basis),
        "rows": results,
        "exact_decompositions": sum(row["exact_rational_certificate"] for row in results),
        "scope": (
            "Exact global-payment cone probe for the three concrete child states. "
            "Only rows carrying exact_rational_certificate=true prove a sign."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
