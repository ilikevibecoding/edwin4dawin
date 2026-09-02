#!/usr/bin/env python3
"""Exact three-mark identities for the adjacent marked-spine ordinary mode.

The ordered vertices are p,u,v with edges pu and uv.  Independent sets are
partitioned by their exact intersection with {p,u,v}; hence only masks
0,p,u,v,pv can occur.  The target is g2 for marks (u,v) with p deleted.
We compare it to every literal endpoint/no-parent g2 functional obtained by
remarking the same graph.  This is an algebraic routing artifact only.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_ordinary_marked_spine_identities_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_IDENTITIES_RANK7_G5_FINISH"


def main():
    generic = reconstruct()
    n = sp.Symbol("n", integer=True, positive=True)
    # bits: p=0, u=1, v=2.  pu and uv are edges.
    allowed = (0, 1, 2, 4, 5)
    rows = {}
    for mask in range(8):
        pop = mask.bit_count()
        for rank in range(8):
            if mask not in allowed or rank < pop:
                value = sp.Integer(0)
            elif rank == 0:
                value = sp.Integer(mask == 0)
            elif rank == 1:
                if mask == 0:
                    value = n - 3
                else:
                    value = sp.Integer(pop == 1)
            else:
                value = sp.Symbol(f"R{mask}_{rank}", integer=True, nonnegative=True)
            rows[mask, rank] = value

    def count(rank, required=0, forbidden=0, deleted=0):
        return sp.Add(*(
            rows[mask, rank]
            for mask in allowed
            if mask & required == required
            and not mask & forbidden
            and not mask & deleted
        ))

    def functional(first, second, deleted=None, c_deleted=None):
        bits = (1 << first, 1 << second)
        rules = {}
        removed_by_family = {
            "E": 0,
            "U": bits[0],
            "V": bits[1],
            "W": bits[0] | bits[1],
        }
        deleted_bit = 0 if deleted is None else 1 << deleted
        c_deleted_bit = 0 if c_deleted is None else 1 << c_deleted
        for family in "EUVW":
            forbidden = removed_by_family[family]
            for rank in range(8):
                rules[sp.Symbol(f"c{family}{rank}")] = count(
                    rank, forbidden=forbidden, deleted=c_deleted_bit
                )
                rules[sp.Symbol(f"d{family}{rank}")] = count(
                    rank, forbidden=forbidden, deleted=deleted_bit
                )
        return sp.expand(generic.subs(rules))

    labels = {0: "p", 1: "u", 2: "v"}
    target = functional(1, 2, 0)
    comparisons = {}
    references = {}
    for first, second in ((0, 1), (1, 0), (1, 2), (2, 1), (0, 2), (2, 0)):
        for deleted in (None, first, second):
            label = f"marks_{labels[first]}{labels[second]}_delete_{'none' if deleted is None else labels[deleted]}"
            value = functional(first, second, deleted)
            references[label] = value
            difference = sp.expand(target - value)
            poly = sp.Poly(difference, *sorted(difference.free_symbols, key=str))
            comparisons[label] = {
                "difference_terms": len(poly.terms()),
                "difference_negative_scalar_coefficients": sum(1 for c in poly.coeffs() if c < 0),
                "difference_minimum_scalar_coefficient": str(min(poly.coeffs())),
                "difference_factored": str(sp.factor(difference)),
                "difference_sha256": hashlib.sha256(str(difference).encode()).hexdigest().upper(),
            }
    # The adjacent no-parent functional on the smaller graph G-p.
    label = "marks_uv_no_parent_on_G_minus_p"
    value = functional(1, 2, deleted=0, c_deleted=0)
    references[label] = value
    difference = sp.expand(target-value)
    poly = sp.Poly(difference, *sorted(difference.free_symbols, key=str))
    comparisons[label] = {
        "difference_terms": len(poly.terms()),
        "difference_negative_scalar_coefficients": sum(1 for c in poly.coeffs() if c < 0),
        "difference_minimum_scalar_coefficient": str(min(poly.coeffs())),
        "difference_factored": str(sp.factor(difference)),
        "difference_sha256": hashlib.sha256(str(difference).encode()).hexdigest().upper(),
    }

    tpoly = sp.Poly(target, *sorted(target.free_symbols, key=str))
    report = {
        "marker": MARKER,
        "scope": "forest with distinct p,u,v and spine edges pu,uv; target marks u,v and deletes ordinary p",
        "allowed_three_mark_masks": list(allowed),
        "target": {
            "terms": len(tpoly.terms()),
            "negative_scalar_coefficients": sum(1 for c in tpoly.coeffs() if c < 0),
            "minimum_scalar_coefficient": str(min(tpoly.coeffs())),
            "factored": str(sp.factor(target)),
            "sha256": hashlib.sha256(str(target).encode()).hexdigest().upper(),
        },
        "comparisons_target_minus_reference": comparisons,
        "status": "exact three-mark routing identities; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        label: {key: row[key] for key in (
            "difference_terms", "difference_negative_scalar_coefficients", "difference_minimum_scalar_coefficient"
        )}
        for label, row in comparisons.items()
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
