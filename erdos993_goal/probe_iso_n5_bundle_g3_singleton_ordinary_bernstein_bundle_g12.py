#!/usr/bin/env python3
"""Exact Bernstein probe for rank-five g3, singleton ordinary mode."""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

from prove_iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12 import (
    bernstein_certificate,
)


HERE = Path(__file__).resolve().parent


def branches():
    for a, au, av in itertools.product((0, 1), repeat=3):
        if a + au + av > 2:  # no triangle on u,v,p
            continue
        for zu, zv, zp in itertools.product((0, 1), repeat=3):
            if a and not (zu and zv):
                continue
            if au and not (zu and zp):
                continue
            if av and not (zv and zp):
                continue
            yield a, au, av, zu, zv, zp


def configured_residual():
    report = json.loads((HERE / "iso_n5_bundle_g3_five_mode_configuration_bundle_g12_20260829.json").read_text())
    residual = sp.sympify(report["generic_forest_invariant"]["residual_without_high_motifs"])
    n = sp.Symbol("n")
    e = sp.Symbol("C_edges")
    du, dv, a = sp.symbols("C_degree_u C_degree_v C_adjacent")
    wedges, xu, xv, common = sp.symbols(
        "C_wedges C_neighbor_excess_u C_neighbor_excess_v C_common_neighbor"
    )
    dp, xp = sp.symbols("degree_p neighbor_excess_p")
    au, av, cu, cv = sp.symbols("adjacent_pu adjacent_pv common_pu common_pv")
    substitution = {
        sp.Symbol("q"): n - 1,
        sp.Symbol("epsilon_u"): 1,
        sp.Symbol("epsilon_v"): 1,
        sp.Symbol("D_edges"): e - dp,
        sp.Symbol("D_degree_u"): du - au,
        sp.Symbol("D_degree_v"): dv - av,
        sp.Symbol("D_adjacent"): a,
        sp.Symbol("D_wedges"): wedges - dp * (dp - 1) / 2 - xp,
        sp.Symbol("D_neighbor_excess_u"): xu - au * (dp - 1) - cu,
        sp.Symbol("D_neighbor_excess_v"): xv - av * (dp - 1) - cv,
        sp.Symbol("D_common_neighbor"): common - au * av,
    }
    return sp.factor(residual.subs(substitution)), locals()


def main():
    residual, names = configured_residual()
    n, e = names["n"], names["e"]
    du, dv, a = names["du"], names["dv"], names["a"]
    wedges, xu, xv, common = names["wedges"], names["xu"], names["xv"], names["common"]
    dp, xp = names["dp"], names["xp"]
    au, av, cu, cv = names["au"], names["av"], names["cu"], names["cv"]
    m = sp.Symbol("m", nonnegative=True)
    sx, sy, sz, sr = sp.symbols("sx sy sz sr", nonnegative=True)
    simplex = (sx, sy, sz, sr)
    all_branches = list(branches())
    print("branches", len(all_branches))
    for cutoff in range(8, 51):
        all_pass = True
        failed = None
        for branch in all_branches:
            aa, aau, aav, zu, zv, zp = branch
            length = cutoff + m - 2
            x, y, z, r = zu * length * sx, zv * length * sy, zp * length * sz, length * sr
            structural = {
                n: cutoff + m,
                a: aa, au: aau, av: aav,
                du: zu + x, dv: zv + y, dp: zp + z,
                e: 1 + x + y + z + r,
            }
            wedge_cap = (
                (zu + x) * (zu + x - 1) / 2
                + (zv + y) * (zv + y - 1) / 2
                + (zp + z) * (zp + z - 1) / 2
                + (r + 1) * r / 2
            )
            if aa == 0:
                r3_both = zu * zv * (n - 3)
            else:
                marked = du + dv - 2
                r3_both = marked * (marked - 1) / 2 + xu + xv - du - dv + 2
            charged = sp.expand(residual - 18 * r3_both)
            replacements = {
                wedges: wedge_cap,
                xu: 0,
                xv: 0,
                common: (1 - aa) * zu * zv,
                xp: zp * (n - 1 - dp),
                cu: (1 - aau) * zu * zp,
                cv: (1 - aav) * zv * zp,
            }
            signs = {
                wedges: -1, xu: 1, xv: 1, common: -1,
                xp: -1, cu: -1, cv: -1,
            }
            try:
                for variable, sign in signs.items():
                    bernstein_certificate(
                        sp.expand(sign * sp.diff(charged, variable).subs(structural)), simplex, m
                    )
                bernstein_certificate(
                    sp.expand(charged.subs(replacements).subs(structural)), simplex, m
                )
            except AssertionError:
                all_pass = False
                failed = branch
                break
        if all_pass:
            print("PASS_CUTOFF", cutoff)
            return
        if cutoff in (8, 12, 20, 30, 40, 50):
            print("FAIL_CUTOFF", cutoff, failed)


if __name__ == "__main__":
    main()
