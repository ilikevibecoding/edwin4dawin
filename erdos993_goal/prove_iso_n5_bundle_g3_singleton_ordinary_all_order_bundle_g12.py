#!/usr/bin/env python3
"""All-order rank-five bundle-g3 theorem, singleton ordinary mode.

Let G=C be the support-deleted two-marked forest and let p be the unique
parent of the deepest singleton support, distinct from both protected marks.
Then D=G-p.  This script makes that deletion substitution exactly.  The
universal high-motif theorem leaves a charge of at most 18 R3_both.  For
nonempty G, a three-vertex degree-excess cone and exact total-degree simplex
Bernstein certificates prove the resulting residual for n>=13.  The edgeless
branch is symbolic, and all forests for 3<=n<=12 are checked exhaustively.

No internal-spine mode, complete N5 induction, or Problem 993 is asserted.
"""

from __future__ import annotations

import functools
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from prove_iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12 import (
    bernstein_certificate,
    g3_rows,
)


HERE = Path(__file__).resolve().parent
CONFIG_SOURCE = HERE / "derive_iso_n5_bundle_g3_five_mode_configuration_bundle_g12.py"
CONFIG_REPORT = HERE / "iso_n5_bundle_g3_five_mode_configuration_bundle_g12_20260829.json"
MOTIF_SOURCE = HERE / "prove_iso_n5_bundle_g3_high_motif_reduction_bundle_g12.py"
MOTIF_REPORT = HERE / "iso_n5_bundle_g3_high_motif_reduction_bundle_g12_20260829.json"
BERNSTEIN_SOURCE = HERE / "prove_iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12.py"
BERNSTEIN_REPORT = HERE / "iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g3_singleton_ordinary_all_order_bundle_g12_20260829.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G3_SINGLETON_ORDINARY_ALL_ORDER_BUNDLE_G12"


def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def branches():
    for a, au, av in itertools.product((0, 1), repeat=3):
        if a + au + av > 2:
            continue  # u,v,p cannot span a triangle in a forest
        for zu, zv, zp in itertools.product((0, 1), repeat=3):
            if a and not (zu and zv):
                continue
            if au and not (zu and zp):
                continue
            if av and not (zv and zp):
                continue
            yield a, au, av, zu, zv, zp


def configured_residual(config):
    residual = sp.sympify(config["generic_forest_invariant"]["residual_without_high_motifs"])
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
    expression = sp.factor(residual.subs(substitution))
    return expression, {
        "n": n, "e": e, "du": du, "dv": dv, "a": a,
        "wedges": wedges, "xu": xu, "xv": xv, "common": common,
        "dp": dp, "xp": xp, "au": au, "av": av, "cu": cu, "cv": cv,
    }


def symbolic_edgeless(residual, names):
    n = names["n"]
    zero = {symbol: 0 for key, symbol in names.items() if key != "n"}
    polynomial = sp.factor(residual.subs(zero))
    expected = (44 * n**4 - 113 * n**3 + 55 * n**2 + 170 * n - 48) / 6
    assert sp.expand(polynomial - expected) == 0
    m = sp.Symbol("m", nonnegative=True)
    shifted = sp.expand(polynomial.subs(n, 3 + m))
    assert shifted == (
        sp.Rational(22, 3) * m**4 + sp.Rational(415, 6) * m**3
        + sp.Rational(707, 3) * m**2 + sp.Rational(2201, 6) * m + 245
    )
    return {"form": str(polynomial), "n_equals_3_plus_m": str(shifted), "minimum": 245}


def tail_proof(residual, names):
    n, e = names["n"], names["e"]
    du, dv, a = names["du"], names["dv"], names["a"]
    wedges, xu, xv, common = names["wedges"], names["xu"], names["xv"], names["common"]
    dp, xp = names["dp"], names["xp"]
    au, av, cu, cv = names["au"], names["av"], names["cu"], names["cv"]
    m = sp.Symbol("m", nonnegative=True)
    sx, sy, sz, sr = sp.symbols("sx sy sz sr", nonnegative=True)
    simplex = (sx, sy, sz, sr)
    rows = []
    lower_count = monotonicity_count = 0
    for aa, aau, aav, zu, zv, zp in branches():
        length = 11 + m  # n-2 for n=13+m
        x, y, z, r = zu * length * sx, zv * length * sy, zp * length * sz, length * sr
        structural = {
            n: 13 + m,
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
        signs = {wedges: -1, xu: 1, xv: 1, common: -1, xp: -1, cu: -1, cv: -1}
        sign_rows = {}
        for variable, sign in signs.items():
            certificate = bernstein_certificate(
                sp.expand(sign * sp.diff(charged, variable).subs(structural)), simplex, m
            )
            sign_rows[str(variable)] = certificate
            monotonicity_count += certificate["coefficient_count"]
        replacements = {
            wedges: wedge_cap,
            xu: 0,
            xv: 0,
            common: (1 - aa) * zu * zv,
            xp: zp * (n - 1 - dp),
            cu: (1 - aau) * zu * zp,
            cv: (1 - aav) * zv * zp,
        }
        lower = sp.expand(charged.subs(replacements).subs(structural))
        certificate = bernstein_certificate(lower, simplex, m)
        lower_count += certificate["coefficient_count"]
        rows.append({
            "adjacent_uv_up_vp_positive_u_v_p": [aa, aau, aav, zu, zv, zp],
            "lower": certificate,
            "monotonicity": sign_rows,
        })
    assert len(rows) == 17
    return {
        "range": "nonempty forests, n>=13 written n=13+m",
        "degree_excess_identity": (
            "du=zu+x,dv=zv+y,dp=zp+z,e=1+x+y+z+r with "
            "x+y+z+r<=n-2; this follows from total forest degree excess"
        ),
        "wedge_cap": "W<=C(du,2)+C(dv,2)+C(dp,2)+C(r+1,2)",
        "other_caps": [
            "Xp<=zp*(n-1-dp)", "common(u,v)<=zu*zv*(1-a)",
            "common(u,p)<=zu*zp*(1-au)", "common(v,p)<=zv*zp*(1-av)",
        ],
        "basis": "exact total-degree Bernstein on sx+sy+sz+sr<=1",
        "branches": len(rows),
        "lower_coefficient_count": lower_count,
        "monotonicity_coefficient_count": monotonicity_count,
        "all_basis_inversions_exact": True,
        "all_tail_power_coefficients_nonnegative": True,
        "rows": rows,
    }


def unlabeled_forests(order):
    types = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining, start, chosen):
        if remaining == 0:
            yield nx.disjoint_union_all([types[index][1] for index in chosen])
            return
        for index in range(start, len(types)):
            size = types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def row_cache(graph):
    n = len(graph)
    neighbours = [sum(1 << w for w in graph.neighbors(v)) for v in range(n)]

    @functools.lru_cache(None)
    def polynomial(mask):
        if mask == 0:
            return (1, 0, 0, 0, 0, 0, 0)
        bit = mask & -mask
        vertex = bit.bit_length() - 1
        without = polynomial(mask ^ bit)
        without_closed = polynomial(mask & ~bit & ~neighbours[vertex])
        return tuple(without[k] + (without_closed[k - 1] if k else 0) for k in range(7))

    full = (1 << n) - 1

    def removed(vertices):
        mask = full
        for vertex in vertices:
            mask &= ~(1 << vertex)
        return polynomial(mask)

    return removed


def finite_proof():
    total = 0
    minimum = None
    rows = {}
    expected = {
        3: (3, 9, 89), 4: (6, 72, 362), 5: (10, 300, 1026),
        6: (20, 1200, 2574), 7: (37, 3885, 5676),
        8: (76, 12768, 10871), 9: (153, 38556, 18540),
        10: (329, 118440, 29913), 11: (710, 351450, 45657),
        12: (1601, 1056660, 67215),
    }
    for order in range(3, 13):
        forests = configurations = 0
        local_minimum = None
        for graph in unlabeled_forests(order):
            forests += 1
            removed = row_cache(graph)
            for u, v in itertools.combinations(range(order), 2):
                crows = tuple(removed(r) for r in ((), (u,), (v,), (u, v)))
                for p in range(order):
                    if p in (u, v):
                        continue
                    drows = tuple(removed(r) for r in ((p,), (p, u), (p, v), (p, u, v)))
                    value = g3_rows(crows, drows)
                    assert value >= 0
                    configurations += 1
                    total += 1
                    local_minimum = value if local_minimum is None else min(local_minimum, value)
                    minimum = value if minimum is None else min(minimum, value)
        assert (forests, configurations, local_minimum) == expected[order]
        rows[str(order)] = {
            "unlabeled_forests": forests,
            "marked_parent_configurations": configurations,
            "minimum_g3": local_minimum,
        }
    assert total == 1583340 and minimum == 89
    return {
        "range": "3<=n<=12",
        "complete_scope": "every unlabeled forest, every unordered mark pair, every distinct parent p",
        "total_configurations": total,
        "global_minimum": minimum,
        "orders": rows,
        "role": "complete finite branch of the theorem, not extrapolated",
    }


def main():
    config = json.loads(CONFIG_REPORT.read_text(encoding="utf-8"))
    motif = json.loads(MOTIF_REPORT.read_text(encoding="utf-8"))
    bernstein = json.loads(BERNSTEIN_REPORT.read_text(encoding="utf-8"))
    assert config["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G3_FIVE_MODE_CONFIGURATION_BUNDLE_G12"
    assert motif["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G3_HIGH_MOTIF_REDUCTION_BUNDLE_G12"
    assert bernstein["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G3_ROOT_ENDPOINT_ALL_ORDER_BUNDLE_G12"
    assert config["source_sha256"] == sha256(CONFIG_SOURCE)
    assert motif["source_sha256"] == sha256(MOTIF_SOURCE)
    assert bernstein["source_sha256"] == sha256(BERNSTEIN_SOURCE)
    assert motif["generic_high_motif_lower_bound"] == "-18*R3_both"
    residual, names = configured_residual(config)
    edgeless = symbolic_edgeless(residual, names)
    tail = tail_proof(residual, names)
    finite = finite_proof()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every canonical deepest singleton support whose parent p is "
            "distinct from both protected marks, the rank-five whole-bundle coefficient g3 is nonnegative."
        ),
        "exact_D_equals_G_minus_p_substitution": {
            "orders_edges": "q=n-1; eD=e-dp; duD=du-a_up; dvD=dv-a_vp",
            "wedges": "WD=W-C(dp,2)-Xp",
            "marked_neighbor_excess": (
                "XuD=Xu-a_up(dp-1)-common(u,p), and symmetrically for v"
            ),
            "marked_common": "commonD(u,v)=common(u,v)-a_up*a_vp",
            "configured_residual": str(residual),
        },
        "high_motif_input": "high layer >= -18*R3_both",
        "edgeless_branch": edgeless,
        "large_order_certificate": tail,
        "finite_certificate": finite,
        "scope": (
            "Rank-five g3 singleton ordinary mode only. The two internal-spine "
            "broom modes remain open; no complete N5 induction or Problem 993 claim."
        ),
        "dependencies": {
            CONFIG_SOURCE.name: sha256(CONFIG_SOURCE), CONFIG_REPORT.name: sha256(CONFIG_REPORT),
            MOTIF_SOURCE.name: sha256(MOTIF_SOURCE), MOTIF_REPORT.name: sha256(MOTIF_REPORT),
            BERNSTEIN_SOURCE.name: sha256(BERNSTEIN_SOURCE), BERNSTEIN_REPORT.name: sha256(BERNSTEIN_REPORT),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "theorem": report["theorem"],
        "tail_branches": tail["branches"],
        "tail_lower_coefficients": tail["lower_coefficient_count"],
        "finite_configurations": finite["total_configurations"],
        "finite_minimum": finite["global_minimum"],
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
