#!/usr/bin/env python3
"""Fail-closed all-order assembly of singleton-endpoint rank-five g2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    raw_coefficients,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_singleton_endpoint_all_forest_assembled_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_SINGLETON_ENDPOINT_ALL_FOREST_RANK5_G2_ALT"
DEPENDENCIES = {
    "prove_iso_n5_g2_singleton_endpoint_large_pair_cone_rank5_g2_alt.py":
        "BE451CB012E30ECC3B7A68D6CF0E4476427F85C5690E32B17B9CE9BA22CC6D63",
    "iso_n5_g2_singleton_endpoint_large_pair_cone_exact_rank5_g2_alt_20260830.json":
        "40C64D4508F1A04EA32104DCEEC3294FD605707A14C2D426341CB6BC43F04E8D",
    "census_iso_n5_g2_singleton_endpoint_all_forests_rank5_g2_alt.py":
        "B8B16A74B7B64BF90581FE3ADE4AA4BDE2AA2DF275BCCF0C39E522DFA276E1FF",
    "iso_n5_g2_singleton_endpoint_all_forests_finite_2_13_rank5_g2_alt_20260830.json":
        "0B96397967C14BCC034254DE13F474C271111301E09B55AFDC3FEB117D962C69",
    "audit_iso_n5_g2_singleton_endpoint_finite_independent_rank5_g2_alt.py":
        "294E1672D37C49F74F9E8A3296A85B0381DBA365EB3FBC0A1A3F92EADF381442",
    "iso_n5_g2_singleton_endpoint_finite_independent_audit_rank5_g2_alt_20260830.json":
        "AD91109D1524516F41DA7B5FF1376777DEAB366C05F0B960671DFE09B9A7C2D0",
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def load(name):
    return json.loads((HERE / name).read_text())


def endpoint_symmetry():
    crows, drows, _g1, g2 = raw_coefficients()
    rules_u = {}
    rules_v = {}
    for rank in range(7):
        rules_u.update({
            drows[0][rank]: crows[1][rank],
            drows[1][rank]: crows[1][rank],
            drows[2][rank]: crows[3][rank],
            drows[3][rank]: crows[3][rank],
        })
        rules_v.update({
            drows[0][rank]: crows[2][rank],
            drows[1][rank]: crows[3][rank],
            drows[2][rank]: crows[2][rank],
            drows[3][rank]: crows[3][rank],
        })
    endpoint_u = sp.expand(g2.subs(rules_u))
    endpoint_v = sp.expand(g2.subs(rules_v))
    exchange = {
        crows[1][rank]: crows[2][rank] for rank in range(7)
    } | {
        crows[2][rank]: crows[1][rank] for rank in range(7)
    }
    exchanged = sp.expand(endpoint_u.xreplace(exchange))
    assert sp.expand(exchanged - endpoint_v) == 0
    return {
        "p_equals_u_rows": "D=(C_U,C_U,C_W,C_W)",
        "p_equals_v_rows": "D=(C_V,C_W,C_V,C_W)",
        "exact_u_v_exchange_identity": True,
        "endpoint_u_terms": len(sp.Poly(endpoint_u, *sorted(endpoint_u.free_symbols, key=str)).terms()),
        "endpoint_v_terms": len(sp.Poly(endpoint_v, *sorted(endpoint_v.free_symbols, key=str)).terms()),
    }


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    large = load("iso_n5_g2_singleton_endpoint_large_pair_cone_exact_rank5_g2_alt_20260830.json")
    finite = load("iso_n5_g2_singleton_endpoint_all_forests_finite_2_13_rank5_g2_alt_20260830.json")
    audit = load("iso_n5_g2_singleton_endpoint_finite_independent_audit_rank5_g2_alt_20260830.json")
    assert large["marker"] == "PASS_EXACT_ISO_N5_G2_SINGLETON_ENDPOINT_LARGE_PAIR_CONE_RANK5_G2_ALT"
    assert finite["marker"] == "PASS_EXACT_FINITE_ISO_N5_G2_SINGLETON_ENDPOINT_ALL_FORESTS_RANK5_G2_ALT"
    assert audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N5_G2_SINGLETON_ENDPOINT_FINITE_AUDIT_RANK5_G2_ALT"
    assert finite["orders"] == [2, 13]
    assert large["coefficient_certificate"]["order_base"] == 14
    assert finite["ordered_value_stream_sha256"] == audit["ordered_value_stream_sha256"]
    assert finite["ordered_distinct_uv_cells"] == audit["ordered_distinct_uv_cells"] == 907410
    assert large["coefficient_certificate"]["all_coefficients_strictly_positive"] is True
    symmetry = endpoint_symmetry()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every canonical rank-five singleton_endpoint forest configuration, "
            "raw g2(C,D)>=0, for both p=u and p=v."
        ),
        "coverage": {
            "orders_below_2": "vacuous because the two marks are distinct",
            "orders_2_through_13": {
                "certificate": finite["marker"],
                "independent_audit": audit["marker"],
                "unlabeled_forests": finite["unlabeled_forests"],
                "ordered_distinct_uv_cells": finite["ordered_distinct_uv_cells"],
                "minimum": finite["global_minimum"],
                "value_stream_sha256": finite["ordered_value_stream_sha256"],
            },
            "orders_at_least_14": {
                "certificate": large["marker"],
                "canonical_interval_vertices": large["coefficient_certificate"]["canonical_interval_vertices"],
                "homogeneous_coefficients": large["coefficient_certificate"]["total_homogeneous_coefficients"],
                "strict_minimum": large["coefficient_certificate"]["global_minimum"],
                "coefficient_stream_sha256": large["coefficient_certificate"]["coefficient_stream_sha256"],
            },
        },
        "endpoint_orientation_symmetry": symmetry,
        "dependencies_sha256": DEPENDENCIES,
        "scope": (
            "Exactly the whole canonical singleton_endpoint rank-five g2 mode. "
            "The no_parent_k0 mode is a separate frozen theorem; singleton_ordinary "
            "is a separate frozen theorem. The two internal-spine modes, all g2, "
            "all N5, and Erdos Problem 993 are not claimed here."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_cells": finite["ordered_distinct_uv_cells"],
        "large_vertices": large["coefficient_certificate"]["canonical_interval_vertices"],
        "large_coefficients": large["coefficient_certificate"]["total_homogeneous_coefficients"],
        "orientation_symmetry": symmetry["exact_u_v_exchange_identity"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
