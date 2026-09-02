#!/usr/bin/env python3
"""Exact occupation algebra for nonadjacent endpoint-parent rank-six G2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n6_bundle_g2_exact_parent_modes_root import build_partitioned


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_parent_occupation_"
    "exact_root_20260831.json"
)
MARKER = (
    "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_PARENT_"
    "OCCUPATION_ROOT"
)
PINS = {
    "literal_parent_modes_source": (
        "probe_iso_n6_bundle_g2_exact_parent_modes_root.py",
        "25189D7DE6C31E028E06B9CE9C46652D734B44560248BAD167E6E9C19990D9A7",
    ),
    "adjacent_endpoint_source": (
        "derive_iso_n6_bundle_g2_adjacent_endpoint_occupation_rank7_g5_finish.py",
        "F22A223842BC48DB1E6F22B87B1A668524D5AF41F0332DBDA07FB28859740CA7",
    ),
    "adjacent_endpoint_report": (
        "iso_n6_bundle_g2_adjacent_endpoint_occupation_exact_"
        "rank7_g5_finish_20260831.json",
        "E3085D7739627E4BAB837208DFF2E8DBCA1A97ACB5073538398F2E3BE17377CD",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def endpoint_mode(expression, rows, parent):
    ranks = {
        "E": {
            r: rows["W"][r] + rows["A"][r]
            + rows["B"][r] + rows["Z"][r]
            for r in range(2, 8)
        },
        "U": {r: rows["W"][r] + rows["A"][r] for r in range(2, 8)},
        "V": {r: rows["W"][r] + rows["B"][r] for r in range(2, 8)},
        "W": {r: rows["W"][r] for r in range(2, 8)},
    }
    source = {
        "u": {"E": "U", "U": "U", "V": "W", "W": "W"},
        "v": {"E": "V", "U": "W", "V": "V", "W": "W"},
    }[parent]
    rules = {}
    for variable in expression.free_symbols:
        label = str(variable)
        if label.startswith("d") and len(label) >= 3:
            family, rank = label[1], int(label[2:])
            rules[variable] = ranks[source[family]][rank]
    return sp.expand(expression.subs(rules))


def split_pieces(value, groups):
    labels = "ABCD"
    variables = tuple(item for group in groups for item in group)
    offsets = []
    start = 0
    for group in groups:
        offsets.append((start, start + len(group)))
        start += len(group)
    result = {}
    for powers, coefficient in sp.Poly(value, *variables).terms():
        active = "".join(
            labels[index]
            for index, (left, right) in enumerate(offsets)
            if any(powers[left:right])
        ) or "constant"
        monomial = coefficient * sp.prod(
            variable**power for variable, power in zip(variables, powers)
        )
        result[active] = sp.expand(result.get(active, 0) + monomial)
    return {label: sp.expand(piece) for label, piece in sorted(result.items())}


def summary(value):
    polynomial = sp.Poly(value, *sorted(value.free_symbols, key=str))
    return {
        "terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(
            1 for coefficient in polynomial.coeffs() if coefficient < 0
        ),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "expression_sha256": hashlib.sha256(
            sp.srepr(sp.expand(value)).encode()
        ).hexdigest().upper(),
    }


def main() -> None:
    for filename, expected in PINS.values():
        assert sha256(HERE / filename) == expected
    adjacent_report = json.loads(
        (HERE / PINS["adjacent_endpoint_report"][0]).read_text(encoding="utf-8")
    )
    assert adjacent_report["marker"] == (
        "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_OCCUPATION_"
        "RANK7_G5_FINISH"
    )

    expression, n, rows = build_partitioned()
    endpoint_u_literal = endpoint_mode(expression, rows, "u")
    endpoint_v_literal = endpoint_mode(expression, rows, "v")

    a = sp.symbols("a0:8", integer=True, nonnegative=True)
    b = sp.symbols("b0:7", integer=True, nonnegative=True)
    c = sp.symbols("c0:7", integer=True, nonnegative=True)
    d = sp.symbols("d0:6", integer=True, nonnegative=True)
    occupation = {n: a[1] + 2}
    for rank in range(2, 8):
        occupation[rows["W"][rank]] = a[rank]
        occupation[rows["A"][rank]] = b[rank - 1]
        occupation[rows["B"][rank]] = c[rank - 1]
        occupation[rows["Z"][rank]] = d[rank - 2]

    endpoint_u = sp.expand(endpoint_u_literal.subs(occupation))
    endpoint_v = sp.expand(endpoint_v_literal.subs(occupation))
    endpoint_u_pieces = split_pieces(endpoint_u, (a, b, c, d))
    assert set(endpoint_u_pieces) == {"A", "AB", "AC", "AD", "BC"}
    assert sp.expand(sum(endpoint_u_pieces.values()) - endpoint_u) == 0

    swap_bc = {**dict(zip(b, c)), **dict(zip(c, b))}
    assert sp.expand(endpoint_u.xreplace(swap_bc) - endpoint_v) == 0

    adjacent_locals = {str(symbol): symbol for symbol in (*a, *b, *c)}
    adjacent_pieces = {
        label: sp.sympify(value, locals=adjacent_locals)
        for label, value in adjacent_report["pieces"].items()
    }
    assert sp.expand(endpoint_u_pieces["A"] - adjacent_pieces["A2"]) == 0
    assert sp.expand(endpoint_u_pieces["AB"] - adjacent_pieces["L2_AB"]) == 0
    assert sp.expand(endpoint_u_pieces["AC"] - adjacent_pieces["M2_AC"]) == 0
    assert sp.expand(endpoint_u_pieces["BC"] - adjacent_pieces["R2_BC"]) == 0
    adjacent_endpoint_u = sp.expand(sum(adjacent_pieces.values()))
    assert sp.expand(endpoint_u - adjacent_endpoint_u - endpoint_u_pieces["AD"]) == 0

    # The new common-neighbor row enters through the same R2 form as B,C.
    ad_to_bc = {**dict(zip(a, b)), **dict(zip(d, c[:6]))}
    assert sp.expand(endpoint_u_pieces["AD"].xreplace(ad_to_bc) - endpoint_u_pieces["BC"]) == 0

    named = {
        "A2": endpoint_u_pieces["A"],
        "L2_AB": endpoint_u_pieces["AB"],
        "M2_AC": endpoint_u_pieces["AC"],
        "R2_AD": endpoint_u_pieces["AD"],
        "R2_BC": endpoint_u_pieces["BC"],
    }
    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "canonical_modes": ["singleton_endpoint", "internal_spine_endpoint"],
        "scope": "nonadjacent marks; deleted parent is one marked endpoint",
        "occupation_rows": (
            "W=A,U=A+xB,V=A+xC,E=A+xB+xC+x^2D"
        ),
        "endpoint_u_split": (
            "A2(A)+L2(A,B)+M2(A,C)+R2(B,C)+R2(A,D)"
        ),
        "pieces": {label: str(value) for label, value in named.items()},
        "summaries": {label: summary(value) for label, value in named.items()},
        "identities": {
            "literal_endpoint_u_reconstructed": True,
            "endpoint_v_is_endpoint_u_under_B_C_swap": True,
            "nonadjacent_minus_adjacent_is_R2_AD": True,
            "R2_AD_is_R2_BC_under_row_renaming": True,
        },
        "sign_status": (
            "OPEN: the adjacent endpoint-parent theorem does not by itself "
            "control the additional signed R2(A,D) term"
        ),
        "scope_guard": (
            "This is exact occupation algebra only. It identifies, but does "
            "not prove, the nonadjacent endpoint-parent G2 obligation."
        ),
        "pins": {
            label: {"file": filename, "sha256": expected}
            for label, (filename, expected) in PINS.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "endpoint_u_split": report["endpoint_u_split"],
        "identities": report["identities"],
        "sign_status": report["sign_status"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
