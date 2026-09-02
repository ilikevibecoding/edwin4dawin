#!/usr/bin/env python3
"""Exact three-mark occupation probe for rank-six bundle g2.

This handles the singleton-ordinary canonical mode C=rows(G), D=rows(G-p)
with three distinct marked vertices u,v,p.  Independent sets are partitioned
by their exact intersection with {u,v,p}.  The resulting polynomial is an
exact normal form, but no sign theorem is asserted here.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_singleton_ordinary_three_mark_partition_"
    "probe_root_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_SINGLETON_ORDINARY_"
    "THREE_MARK_PARTITION_ROOT"
)


def main() -> None:
    expression = reconstruct()
    n = sp.Symbol("n", integer=True, positive=True)

    # Bit 0=u, bit 1=v, bit 2=p.  R_mask_rank counts independent
    # rank-sets whose exact intersection with the three marks is mask.
    rows: dict[tuple[int, int], sp.Expr] = {}
    for mask in range(8):
        population = mask.bit_count()
        for rank in range(8):
            if rank < population:
                value = sp.Integer(0)
            elif rank == 0:
                value = sp.Integer(1 if mask == 0 else 0)
            elif rank == 1:
                if mask == 0:
                    value = n - 3
                else:
                    value = sp.Integer(1 if population == 1 else 0)
            else:
                value = sp.Symbol(f"R{mask}_{rank}", nonnegative=True)
            rows[mask, rank] = value

    def row(allowed_mask: int, rank: int) -> sp.Expr:
        return sp.Add(*(
            rows[mask, rank]
            for mask in range(8)
            if mask & ~allowed_mask == 0
        ))

    # C rows allow all masks not containing the deleted endpoint marks.
    # D additionally excludes p, exactly implementing G-p.
    allowed_c = {"E": 0b111, "U": 0b110, "V": 0b101, "W": 0b100}
    allowed_d = {"E": 0b011, "U": 0b010, "V": 0b001, "W": 0b000}
    rules = {}
    for family in "EUVW":
        for rank in range(8):
            rules[sp.Symbol(f"c{family}{rank}")] = row(allowed_c[family], rank)
            rules[sp.Symbol(f"d{family}{rank}")] = row(allowed_d[family], rank)

    reduced = sp.expand(expression.subs(rules))
    no_parent_rules = dict(rules)
    for family in "EUVW":
        for rank in range(8):
            no_parent_rules[sp.Symbol(f"d{family}{rank}")] = row(
                allowed_c[family], rank
            )
    no_parent = sp.expand(expression.subs(no_parent_rules))
    deletion_delta = sp.expand(reduced - no_parent)
    variables = tuple(sorted(reduced.free_symbols, key=str))
    polynomial = sp.Poly(reduced, *variables)
    negative = [
        (powers, coefficient)
        for powers, coefficient in polynomial.terms()
        if coefficient.is_negative is True
    ]

    # Reconstruct every generic row literally from the partition as a guard.
    for family in "EUVW":
        for rank in range(8):
            assert sp.expand(
                rules[sp.Symbol(f"c{family}{rank}")]
                - row(allowed_c[family], rank)
            ) == 0
            assert sp.expand(
                rules[sp.Symbol(f"d{family}{rank}")]
                - row(allowed_d[family], rank)
            ) == 0

    def expression_summary(value: sp.Expr) -> dict[str, object]:
        local_variables = tuple(sorted(value.free_symbols, key=str))
        local_polynomial = sp.Poly(value, *local_variables)
        local_negative = [
            (powers, coefficient)
            for powers, coefficient in local_polynomial.terms()
            if coefficient.is_negative is True
        ]
        return {
            "monomials": len(local_polynomial.terms()),
            "negative_scalar_coefficients": len(local_negative),
            "minimum_scalar_coefficient": str(min(local_polynomial.coeffs())),
            "factored": str(sp.factor(value)),
        }

    assert sp.expand(no_parent + deletion_delta - reduced) == 0
    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "canonical_mode": "singleton_ordinary",
        "configuration": "C=rows(G); D=rows(G-p), p distinct from u,v",
        "partition": (
            "R_mask_rank counts independent rank-sets with exact intersection "
            "mask with the ordered marks (u,v,p)"
        ),
        "monomials": len(polynomial.terms()),
        "negative_scalar_coefficients": len(negative),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "first_negative_terms": [
            {"powers": list(powers), "coefficient": str(coefficient)}
            for powers, coefficient in negative[:20]
        ],
        "expression": str(sp.factor(reduced)),
        "no_parent_plus_deletion_delta": {
            "identity": "g2(C,C-p)=g2(C,C)+Delta_p",
            "no_parent": expression_summary(no_parent),
            "deletion_delta": expression_summary(deletion_delta),
            "exact_reconstruction": True,
        },
        "status": "exact occupation normal form; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "monomials": report["monomials"],
        "negative_scalar_coefficients": report["negative_scalar_coefficients"],
        "minimum_scalar_coefficient": report["minimum_scalar_coefficient"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
