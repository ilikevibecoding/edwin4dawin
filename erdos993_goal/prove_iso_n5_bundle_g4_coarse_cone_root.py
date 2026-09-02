#!/usr/bin/env python3
"""Prove the universal rank-five whole-bundle coefficient g4 is positive.

The proof starts from the exact 103-term forest-invariant reduction.  It pays
the entire induced-D block by elementary forest inequalities, drops positive
connected-three and neighbor-excess motifs from C, and uses the standard
two-mark degree-excess wedge cap.  The resulting twenty branches are proved
on a four-dimensional box by exact tensor-Bernstein coefficients whose
remaining n-2 power coefficients are nonnegative.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
CONFIG_SOURCE = HERE / "derive_iso_n5_bundle_g4_forest_invariant_root.py"
CONFIG = HERE / "iso_n5_bundle_g4_forest_invariant_root_20260829.json"
CENSUS_SOURCE = HERE / "probe_iso_n5_bundle_g4_forest_census_root.py"
CENSUS = HERE / "iso_n5_bundle_g4_forest_census_probe_root_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g4_coarse_cone_exact_root_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def tensor_bernstein(expression: sp.Expr, variables: tuple[sp.Symbol, ...]):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(max(0, polynomial.degree(variable)) for variable in variables)
    power = dict(polynomial.terms())
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = sp.Integer(0)
        for monomial, coefficient in power.items():
            if all(power_index <= bernstein_index for power_index, bernstein_index in zip(monomial, index)):
                multiplier = sp.Integer(1)
                for power_index, bernstein_index, degree in zip(monomial, index, degrees):
                    multiplier *= sp.binomial(bernstein_index, power_index) / sp.binomial(degree, power_index)
                value += coefficient * multiplier
        yield degrees, index, sp.factor(value)


def main() -> None:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    census = json.loads(CENSUS.read_text(encoding="utf-8"))
    assert config["marker"] == "DERIVED_EXACT_ISO_N5_BUNDLE_G4_FOREST_INVARIANT_ROOT"
    assert census["marker"] == "PROBE_EXACT_ISO_N5_BUNDLE_G4_FOREST_CENSUS_ROOT"
    form = sp.sympify(config["forest_invariant_form"])
    names = {str(symbol): symbol for symbol in form.free_symbols}
    n = names["n"]
    q = names["q"]
    eu = names["epsilon_u"]
    ev = names["epsilon_v"]

    d_symbols = tuple(symbol for symbol in form.free_symbols if str(symbol).startswith("D_"))
    expanded = sp.expand(form)
    d_block = sp.Add(*[
        term for term in expanded.as_ordered_terms()
        if any(symbol in term.free_symbols for symbol in d_symbols)
    ])
    c_block = sp.expand(form - d_block)

    # Exact D-block decomposition used for the coarse payment.
    ddu = names["D_degree_u"]
    ddv = names["D_degree_v"]
    dadj = names["D_adjacent"]
    dcommon = names["D_common_neighbor"]
    de = names["D_edges"]
    dwedges = names["D_wedges"]
    dxu = names["D_neighbor_excess_u"]
    dxv = names["D_neighbor_excess_v"]
    d_degree_linear = (
        ddu * (4 * n + 4 * q + 3 - 4 * eu + 6 * ev)
        + ddv * (4 * n + 4 * q + 3 + 6 * eu - 4 * ev)
    )
    d_decomposition = (
        -2 * (ddu**2 + ddv**2)
        + d_degree_linear
        + dadj * (-6 * (ddu + ddv) - 6 * (eu + ev) - 10 * n + 6 * q - 4)
        - 6 * dcommon
        + de * (4 * (eu + ev) + 2 * n - 8 * q + 2)
        + 8 * dwedges - 4 * dxu - 4 * dxv
    )
    assert sp.expand(d_block - d_decomposition) == 0

    # Forest facts give the following all-order lower bound:
    # ddu+ddv<=q; ddu^2+ddv^2<=q^2; when dadj=1, eu=ev=1 and
    # -6(ddu+ddv)+6q>=0; dcommon<=1; de<=q-1; n>=q;
    # and 2*D_wedges>=dxu+dxv center by center.
    d_lower = -8 * q**2 + 8 * q - 10 * n - 24

    connected3 = [
        names["C_connected3_E"], names["C_connected3_U"],
        names["C_connected3_V"], names["C_connected3_W"],
    ]
    cxu = names["C_neighbor_excess_u"]
    cxv = names["C_neighbor_excess_v"]
    ccommon = names["C_common_neighbor"]
    cwedges = names["C_wedges"]
    assert all(sp.diff(c_block, symbol) > 0 for symbol in connected3)
    assert sp.expand(sp.diff(c_block, cxu) - (36 * n - 61)) == 0
    assert sp.expand(sp.diff(c_block, cxv) - (36 * n - 61)) == 0
    assert sp.expand(sp.diff(c_block, ccommon) - (-20 * n + 13)) == 0
    assert sp.expand(sp.diff(c_block, cwedges) - (-42 * n + 113)) == 0

    relaxed = c_block.subs({symbol: 0 for symbol in (*connected3, cxu, cxv)}) + d_lower
    relaxed = relaxed.subs(ccommon, 1)

    # Edgeless C: D is edgeless as well.  Prove the exact form on
    # q=n-h, 0<=h<=n, for all four survival-indicator branches.
    t, d = sp.symbols("t d", nonnegative=True)
    edgeless_substitutions = {
        names["C_adjacent"]: 0,
        names["C_degree_u"]: 0,
        names["C_degree_v"]: 0,
        names["C_edges"]: 0,
        cwedges: 0,
        cxu: 0,
        cxv: 0,
        ccommon: 0,
        **{symbol: 0 for symbol in connected3},
        **{symbol: 0 for symbol in d_symbols},
    }
    edgeless_rows = []
    for epsilon_u, epsilon_v in itertools.product((0, 1), repeat=2):
        value = sp.factor(form.subs(edgeless_substitutions).subs({
            n: t + 2,
            q: (t + 2) * (1 - d),
            eu: epsilon_u,
            ev: epsilon_v,
        }))
        coefficients = []
        for degrees, index, coefficient in tensor_bernstein(value, (d,)):
            t_coefficients = sp.Poly(sp.expand(coefficient), t).all_coeffs()
            assert all(entry >= 0 for entry in t_coefficients)
            coefficients.append({
                "degree": list(degrees),
                "index": list(index),
                "coefficient": str(coefficient),
                "t_power_coefficients": list(map(str, t_coefficients)),
            })
        edgeless_rows.append({
            "epsilon_u_epsilon_v": [epsilon_u, epsilon_v],
            "form": str(value),
            "bernstein": coefficients,
        })

    # Nonempty C.  The wedge coefficient is 29 at n=2, but then a nonempty
    # two-vertex forest is K2 and both W and the displayed wedge cap are zero.
    # For every integer n>=3 the coefficient -42n+113 is negative, so replacing
    # W by its upper cap gives a valid lower bound.  Put T=n-2 and use
    # stick-breaking box coordinates for
    # x+y+r<=T and h<=n:
    # x=T*a, y=T(1-a)b, r=T(1-a)(1-b)c, h=n*d.
    a, b, c = sp.symbols("a b c", nonnegative=True)
    box = (a, b, c, d)
    stream = []
    profiles = set()
    minimum_at_t0 = None
    minimum_witness = None
    branch_minima = {}
    branches = ((0, 0, 0), (0, 0, 1), (0, 1, 0), (0, 1, 1), (1, 1, 1))
    for adjacent, zu, zv in branches:
        for epsilon_u, epsilon_v in itertools.product((0, 1), repeat=2):
            x = t * a if zu else 0
            remaining = t * (1 - a) if zu else t
            y = remaining * b if zv else 0
            remaining = remaining * (1 - b) if zv else remaining
            r = remaining * c
            degree_u = zu + x
            degree_v = zv + y
            edge_count = 1 + x + y + r
            wedge_upper = (
                degree_u * (degree_u - 1) / 2
                + degree_v * (degree_v - 1) / 2
                + r * (r + 1) / 2
            )
            lower = sp.factor(relaxed.subs({
                n: t + 2,
                q: (t + 2) * (1 - d),
                eu: epsilon_u,
                ev: epsilon_v,
                names["C_adjacent"]: adjacent,
                names["C_degree_u"]: degree_u,
                names["C_degree_v"]: degree_v,
                names["C_edges"]: edge_count,
                cwedges: wedge_upper,
            }))
            branch = (adjacent, zu, zv, epsilon_u, epsilon_v)
            local_minimum = None
            local_count = 0
            for degrees, index, coefficient in tensor_bernstein(lower, box):
                profiles.add(degrees)
                t_coefficients = sp.Poly(sp.expand(coefficient), t).all_coeffs()
                assert all(entry >= 0 for entry in t_coefficients), (branch, degrees, index, coefficient)
                at_zero = sp.factor(coefficient.subs(t, 0))
                local_minimum = at_zero if local_minimum is None else min(local_minimum, at_zero)
                witness = {
                    "branch_adj_zu_zv_eu_ev": list(branch),
                    "degree_profile": list(degrees),
                    "index": list(index),
                    "coefficient": str(coefficient),
                    "t_power_coefficients": list(map(str, t_coefficients)),
                }
                if minimum_at_t0 is None or at_zero < minimum_at_t0:
                    minimum_at_t0 = at_zero
                    minimum_witness = witness
                stream.append(witness)
                local_count += 1
            branch_minima["".join(map(str, branch))] = {
                "minimum_at_n2": str(local_minimum),
                "coefficients": local_count,
            }

    report = {
        "marker": "PASS_EXACT_ISO_N5_BUNDLE_G4_COARSE_CONE_ROOT",
        "theorem": "For every forest-realizable marked rank-five sibling-bundle cell, the binom(M,4) coefficient g4 is positive.",
        "dependencies": {
            CONFIG_SOURCE.name: sha256(CONFIG_SOURCE),
            CONFIG.name: sha256(CONFIG),
            CENSUS_SOURCE.name: sha256(CENSUS_SOURCE),
            CENSUS.name: sha256(CENSUS),
        },
        "D_block": {
            "exact_form": str(sp.factor(d_block)),
            "lower_bound": str(d_lower),
            "facts": [
                "D_degree_u+D_degree_v<=q and the square sum is at most q^2.",
                "If D_adjacent=1 then both marks survive, their degree sum is at most q, and the adjacency block is at least -10*n-16.",
                "D_common_neighbor<=1 and D_edges<=q-1 in a forest.",
                "The D-edge coefficient is at least -6*q+2 because n>=q.",
                "Center by center, 2*D_wedges>=D_neighbor_excess_u+D_neighbor_excess_v.",
                "The two residual marked-degree linear coefficients are nonnegative whenever the corresponding degree is nonzero.",
            ],
        },
        "C_relaxation": {
            "positive_terms_dropped": [str(symbol) for symbol in (*connected3, cxu, cxv)],
            "common_neighbor_bound": "C_common_neighbor<=1",
            "wedge_coefficient": str(sp.diff(c_block, cwedges)),
            "wedge_cap": "W<=C(degree_u,2)+C(degree_v,2)+C(r+1,2)",
            "wedge_sign_boundary": (
                "For integer n>=3 the wedge coefficient -42*n+113 is negative. "
                "For n=2 and nonempty C, C=K2 and both W and the wedge cap are zero."
            ),
            "degree_excess_parameters": "x=du-1[du>0], y=dv-1[dv>0], r=e-1-x-y; x,y,r>=0 and x+y+r<=n-2",
        },
        "edgeless_C": edgeless_rows,
        "nonempty_C_bernstein": {
            "box": "a,b,c,d in [0,1]; t=n-2>=0",
            "coordinates": "x=t*a; y=t*(1-a)*b; r=t*(1-a)*(1-b)*c; h=n*d; q=n-h",
            "branches": branch_minima,
            "coefficient_count": len(stream),
            "degree_profiles": [list(profile) for profile in sorted(profiles)],
            "minimum_at_n2": str(minimum_at_t0),
            "minimum_witness": minimum_witness,
            "all_remaining_t_power_coefficients_nonnegative": True,
            "ordered_stream_sha256": hashlib.sha256(
                json.dumps(stream, sort_keys=True).encode()
            ).hexdigest().upper(),
        },
        "finite_direct_replay": {
            "configuration_cells": census["configuration_cells"],
            "negative_g4_cells": census["negative_g4_cells"],
            "minimum_g4": census["minima_g1_to_g4"]["4"],
            "role": "Independent finite audit only; the theorem is the forest-cone/Bernstein certificate above.",
        },
        "scope": "Exact universal theorem for rank-five g4 only; g1-g3, all N5, and Erdos Problem #993 remain separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "coefficient_count": len(stream),
        "degree_profiles": report["nonempty_C_bernstein"]["degree_profiles"],
        "minimum_at_n2": report["nonempty_C_bernstein"]["minimum_at_n2"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
