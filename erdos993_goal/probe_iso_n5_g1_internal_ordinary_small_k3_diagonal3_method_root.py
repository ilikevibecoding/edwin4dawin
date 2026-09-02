#!/usr/bin/env python3
"""Probe whether the proven diagonal-3 large-order argument covers small k=3."""

from __future__ import annotations

from pathlib import Path

import sympy as sp

import prove_iso_n5_g1_internal_ordinary_diagonal3_large_order_root as proof
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows


HERE = Path(__file__).resolve().parent
CELLS = tuple((ell, 3) for ell in range(1, 8))


def exact_cells():
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    targets = {}
    for ell in range(1, 8):
        xrow, urow, yrow, zrow = child_rows(ell, k)
        child_rules = {}
        for rank in range(1, 7):
            child_rules.update({
                rows["X"][rank]: xrow[rank], rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank], rows["Z"][rank]: zrow[rank],
            })
        degree, coefficients = tensor_binomial(
            sp.expand(expression.subs(child_rules)), (k,)
        )
        assert degree == (6,)
        targets[(ell, 3)] = coefficients[(3,)]

    araw = (sp.Integer(1), *sp.symbols("a1:7"))
    braw = (sp.Integer(1), *sp.symbols("b1:6"))
    craw = (sp.Integer(1), *sp.symbols("c1:6"))
    draw = (sp.Integer(1), *sp.symbols("d1:5"))
    arow, astats = proof.forest_rows("a", 4)
    brow, bstats = proof.forest_rows("b", 3)
    crow, cstats = proof.forest_rows("c", 3)
    drow, dstats = proof.forest_rows("d", 2)
    motif_rules = {}
    for raw, motif in ((araw, arow), (braw, brow), (craw, crow), (draw, drow)):
        motif_rules.update({raw[index]: value for index, value in enumerate(motif)})

    faces = {}
    for epsilon in (0, 1):
        partition_rules = {}
        for rank in range(1, 7):
            partition_rules.update({
                rows["W"][rank]: proof.at(araw, rank),
                rows["P"][rank]: proof.at(araw, rank) + proof.at(braw, rank - 1),
                rows["V"][rank]: proof.at(araw, rank) + proof.at(craw, rank - 1),
                rows["E"][rank]: (
                    proof.at(araw, rank) + proof.at(braw, rank - 1)
                    + proof.at(craw, rank - 1) + epsilon * proof.at(draw, rank - 2)
                ),
            })
        faces[epsilon] = {
            index: sp.expand(target.subs(partition_rules).subs(motif_rules))
            for index, target in targets.items()
        }
    return faces, astats, bstats, cstats, dstats


def main() -> None:
    proof.exact_cells = exact_cells
    proof.CELLS = CELLS
    proof.MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K3_DIAGONAL3_METHOD_ROOT"
    proof.OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k3_diagonal3_method_probe_root_20260830.json"
    proof.main()


if __name__ == "__main__":
    main()
