#!/usr/bin/env python3
"""Exact exchange symmetry for the adjacent two-deficit endpoint reduction.

The coupled incident-edge triangle has vertices (0,0), (e,0), and (0,e).
The last two are exchanged by swapping the two deletion families.  Thus each
high/low cone needs only the ``none`` and ``x`` endpoint computations; the
``y`` endpoint follows as an exact relabeling, not as a numerical inference.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n5_g1_adjacent_two_deficit_adaptive_coupled_cone_root import (
    abstract_scaled,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_adjacent_two_deficit_endpoint_symmetry_exact_root_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_ADJACENT_TWO_DEFICIT_ENDPOINT_SYMMETRY_ROOT"


def main() -> None:
    variables, none = abstract_scaled("none")
    variables_x, endpoint_x = abstract_scaled("x")
    variables_y, endpoint_y = abstract_scaled("y")
    assert variables == variables_x == variables_y
    _n, p, q, _e, *_ratios = variables

    exchange = {p: q, q: p}
    none_difference = sp.Poly(
        none.as_expr().subs(exchange, simultaneous=True) - none.as_expr(),
        *variables,
        domain=sp.QQ,
    )
    endpoint_difference = sp.Poly(
        endpoint_x.as_expr().subs(exchange, simultaneous=True)
        - endpoint_y.as_expr(),
        *variables,
        domain=sp.QQ,
    )
    assert none_difference.is_zero
    assert endpoint_difference.is_zero

    report = {
        "marker": MARKER,
        "identity": "S_x(n,p,q,e,R)=S_y(n,q,p,e,R)",
        "zero_endpoint_identity": "S_none(n,p,q,e,R)=S_none(n,q,p,e,R)",
        "consequence": (
            "For each ratio sector, exact certificates for endpoints none and x "
            "cover all three coupled-triangle vertices; endpoint y follows by "
            "exchanging the two deletion families."
        ),
        "scope": "Exact endpoint symmetry only; it does not assert either cone sign.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
