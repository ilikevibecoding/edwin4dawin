#!/usr/bin/env python3
"""Exact singleton-endpoint g1 theorem for an adjacent leaf parent mark.

Assume the canonical parent is p=u, uv is an edge of the marked remainder C,
and deg_C(u)=1.  Then QE=QV=W=I(C-{u,v}).  With

    P=W, H=I(C-{u}-N[v]), U=P+xH,

the corrected endpoint residual is a six-row componentwise-neighbour-deletion
polynomial.  A complete reduced-core census through order 12 and exact
high/low forest-ratio cones from order 13 prove it at every order.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent import (
    ratio_parameterization,
)
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    polynomial_hash,
    shift_and_simplex_homogenize,
    tensor_bernstein_sparse,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_U_LEAF_ADJACENT_ALL_ORDER_G1_NONADJACENT"

PINS = {
    "derive_iso_n5_g1_singleton_endpoint_corrected_residual_g1_nonadjacent.py":
        "8100E7B132606481575C681088C30F8B7D6308E670162AC3B96E5C92982C6C89",
    "iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json":
        "5E277A78168DE1978C9AACD6AFF12F55A624F4D8CCF4017CA290406106A3C3B1",
    "probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent.py":
        "72795F07C3C0A30CF0B6E05C2980AA97367763EEC6AC8B43514F873AA23D6CFF",
    "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":
        "D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
    "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py":
        "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
    "TWO_STEP_FACTORIAL_DROP_FOREST_CERTIFICATE_2026-07-27.md":
        "C84F064D4E980F0CCA7AA5853385940AE0892BCE4932A37799824DA3B11C2DC1",
    "verify_two_step_factorial_drop_forest_certificate.py":
        "C9EE3DE3E13499FC9863649481D98413E4BA7B7FEE231DC371DC518FB15B6EF6",
    "assemble_iso_n5_s_all_marked_forests_root.py":
        "E56AA4AD8AF3FE936DAF8354A6D7BAD1BAC5AFDCCD6C4436FB198A0FC76D479E",
    "iso_n5_s_all_marked_forests_exact_root_20260830.json":
        "E4FDD1215C0924A40E2B6D47BAC9CF5BB54830686AAB6E5F1188D8F25F386CBE",
    "assemble_iso_all_forest_n4_bundle_induction_root.py":
        "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
    "iso_all_forest_n4_bundle_induction_exact_root_20260829.json":
        "28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
    "audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py":
        "E656BEE9BC8412B99ABB93CBFB484985C9B2EBEFB5FC575437385B7AD2B8B29B",
    "iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json":
        "0D341C165A35835F08DE48852540FBD3B83BC133CB0871F9930B862D0C3B1B21",
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def block(A, B):
    return A[2]*B[3] - 2*A[3]*B[2] + A[4]*B[1]


def n4_deleted(U, W):
    return sp.expand(
        2*U[2]*W[2] - U[2]*W[3] - 5*U[2]*W[4]
        + 2*U[3]*W[1] + 2*U[3]*W[2] + 3*U[3]*W[3]
        - U[4]*W[1] + 3*U[4]*W[2] - 5*U[5]*W[1]
        - W[1]*W[4] + W[2]*W[3]
    )


def residual(P, H):
    U = tuple(at(P, k) + at(H, k-1) for k in range(8))
    return sp.expand(n4_deleted(U, P) + block(P, P) + block(U, P))


def generic_rows():
    t = sp.symbols("selected_isolates_t", nonnegative=True)
    x = (sp.Integer(1), *sp.symbols("x1:8"))
    h = (sp.Integer(1), *sp.symbols("h1:8"))
    P = tuple(sp.expand(sp.expand_func(sum(
        sp.binomial(t, j) * at(x, k-j) for j in range(k+1)
    ))) for k in range(8))
    expression = residual(P, h)
    degree = sp.degree(expression, t)
    rows = [sp.expand(sum(
        (-1)**(r-j) * sp.binomial(r, j) * expression.subs(t, j)
        for j in range(r+1)
    )) for r in range(degree+1)]
    reconstructed = sp.expand(sp.expand_func(sum(
        sp.binomial(t, r) * row for r, row in enumerate(rows)
    )))
    assert sp.expand(expression - reconstructed) == 0
    assert len(rows) == 6
    return x, h, rows


def lowered_rows():
    x, h, rows = generic_rows()
    N, A, B, Q = sp.symbols("N A B Q", nonnegative=True)
    a = N*A/2
    b = B*N*(1-A)
    c = a+b
    e = N-a
    q = a + Q*N*(1-A)*(1-B)
    edges = N-c
    base = {
        x[1]: N,
        x[2]: choose(N, 2)-edges,
        h[1]: e,
        h[2]: choose(e, 2)-(edges-q),
    }
    h3_lower = choose(e, 3)-(edges-q)*(e-2)
    h4_upper = choose(e, 4)
    lowered = []
    signs = []
    expected_h3 = [3*base[x[2]], 3*N, 3, 0, 0, 0]
    expected_h4 = [-5*N, -5, 0, 0, 0, 0]
    for index, row in enumerate(rows):
        after = sp.expand(row.subs(base))
        c3 = sp.factor(sp.diff(after, h[3]))
        c4 = sp.factor(sp.diff(after, h[4]))
        assert sp.expand(c3-expected_h3[index]) == 0
        assert sp.expand(c4-expected_h4[index]) == 0
        value = sp.expand(after.subs({h[3]: h3_lower, h[4]: h4_upper}))
        assert not any(value.has(h[k]) for k in range(1, 8))
        lowered.append(value)
        signs.append({"row": index, "h3": str(c3), "h4": str(c4)})
    return x, (N,A,B,Q), lowered, signs


def exact_sector(row_index, sector):
    x, core, rows, _signs = lowered_rows()
    N,A,B,Q = core
    cubes0, simplex, substitutions, cone, rho1 = ratio_parameterization(
        sector, N, A, B, x, 5
    )
    cubes = (A,B,Q,*cubes0[2:])
    offset = sp.symbols("large_offset", nonnegative=True)
    # The homogenizer performs offset=13+t.  The preliminary N=offset+13
    # therefore gives the explicit asymptotic range N>=26.
    expression = rows[row_index].subs(substitutions).subs(N, offset+13)
    numerator, denominator = sp.fraction(sp.together(expression))
    polynomial = sp.Poly(numerator, offset, *cubes, *simplex)
    degrees, bernstein = tensor_bernstein_sparse(polynomial, len(cubes))
    homogeneous, total_terms, minimum = shift_and_simplex_homogenize(
        bernstein, len(simplex)
    )
    assert minimum >= 0
    return {
        "row": row_index,
        "sector": sector,
        "order_scope": "N>=26",
        "cone": cone,
        "denominator": str(denominator),
        "cube_degrees": degrees,
        "cube_rows": len(bernstein),
        "power_terms": len(polynomial.terms()),
        "power_hash": polynomial_hash(polynomial),
        "homogeneous_terms": total_terms,
        "homogeneous_hash": coefficient_rows_hash(homogeneous),
        "minimum": str(minimum),
        "rho1": str(rho1),
    }


def fixed_sector(order, row_index, sector):
    assert 15 <= order <= 25
    x, core, rows, _signs = lowered_rows()
    N,A,B,Q = core
    cubes0, simplex, substitutions, cone, rho1 = ratio_parameterization(
        sector, N, A, B, x, 5
    )
    cubes = (A,B,Q,*cubes0[2:])
    dummy = sp.symbols("fixed_order_dummy", nonnegative=True)
    numerator, denominator = sp.fraction(sp.together(
        rows[row_index].subs(substitutions).subs(N, order)
    ))
    polynomial = sp.Poly(numerator, dummy, *cubes, *simplex)
    degrees, bernstein = tensor_bernstein_sparse(polynomial, len(cubes))
    homogeneous, total_terms, minimum = shift_and_simplex_homogenize(
        bernstein, len(simplex)
    )
    assert minimum >= 0
    return {
        "order": order, "row": row_index, "sector": sector, "cone": cone,
        "denominator": str(denominator), "cube_degrees": degrees,
        "cube_rows": len(bernstein), "power_terms": len(polynomial.terms()),
        "power_hash": polynomial_hash(polynomial),
        "homogeneous_terms": total_terms,
        "homogeneous_hash": coefficient_rows_hash(homogeneous),
        "minimum": str(minimum), "rho1": str(rho1),
    }


def finite_certificate():
    x,h,rows = generic_rows()
    evaluator = sp.lambdify((*x[1:],*h[1:]), rows, modules="math")
    totals = {"forests":0,"patterns":0,"checks":0}
    minima = [None]*6
    by_order = {}
    for N in range(15):
        nf=np=0; local=[None]*6
        for graph in forest_graphs(N):
            nf += 1
            P=tuple(poly_forest(graph))
            components=[tuple(sorted(c)) for c in nx.connected_components(graph)]
            choices=[(None,*(v for v in c if graph.degree(v)>0)) for c in components]
            for choice in itertools.product(*choices):
                selected=tuple(v for v in choice if v is not None)
                reduced=graph.copy(); reduced.remove_nodes_from(selected)
                H=tuple(poly_forest(reduced))
                values=[int(v) for v in evaluator(
                    *(at(P,k) for k in range(1,8)),
                    *(at(H,k) for k in range(1,8)),
                )]
                assert all(v>=0 for v in values), (N,selected,values)
                for i,v in enumerate(values):
                    local[i]=v if local[i] is None else min(local[i],v)
                    minima[i]=v if minima[i] is None else min(minima[i],v)
                np += 1
        totals["forests"]+=nf;totals["patterns"]+=np;totals["checks"]+=6*np
        by_order[str(N)]={"forests":nf,"patterns":np,"minima":local}
        print("FINITE",N,nf,np,local,flush=True)
    return {**totals,"minima":minima,"by_order":by_order}


def load(name):
    return json.loads((HERE/name).read_text(encoding="utf-8"))


def main():
    assert {name:sha256(HERE/name) for name in PINS} == PINS
    derived=load("iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json")
    assert derived["marker"]=="DERIVED_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_CORRECTED_RESIDUAL_G1_NONADJACENT"
    assert derived["correction_terms"]==11
    scalar=load("iso_n5_s_all_marked_forests_exact_root_20260830.json")
    n4=load("iso_all_forest_n4_bundle_induction_exact_root_20260829.json")
    n4a=load("iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json")
    assert scalar["marker"]=="PASS_EXACT_ISO_N5_S_ALL_MARKED_FORESTS_ROOT"
    assert n4["marker"]=="PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT"
    assert n4a["marker"]=="PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_AUDIT_BUNDLE_G12"

    p=(sp.Integer(1),*sp.symbols("p1:8"));h=(sp.Integer(1),*sp.symbols("h1:8"))
    expected=sp.expand(
        2*h[1]*p[2]-5*h[1]*p[4]+2*h[2]*p[1]+3*h[2]*p[3]
        +3*h[3]*p[2]-5*h[4]*p[1]+2*p[1]*p[3]-5*p[1]*p[5]
        +2*p[2]**2-2*p[2]*p[4]+3*p[3]**2
    )
    assert sp.expand(residual(p,h)-expected)==0
    _x,_core,_rows,signs=lowered_rows()
    finite=finite_certificate()
    assert set(finite["by_order"])=={str(order) for order in range(15)}
    large=[exact_sector(i,s) for i in range(6) for s in ("high","low")]
    assert len(large)==12
    assert all(Fraction(row["minimum"])>=0 for row in large)
    bridge=[fixed_sector(order,i,s) for order in range(15,26)
            for i in range(6) for s in ("high","low")]
    assert len(bridge)==132
    assert all(Fraction(row["minimum"])>=0 for row in bridge)

    report={
        "marker":MARKER,
        "theorem":(
            "In singleton_endpoint_p_equals_u, if uv is an edge and u has degree one "
            "in C, then the rank-five bundle coefficient g1 is nonnegative."
        ),
        "geometry":"QE=QV=W; U=P+xH with H obtained from P by deleting the independent neighbours of v other than u",
        "identity":"g1=S(C)+N4(C)+F, F=N4(D)+B(W,W)+B(U,W)",
        "residual":str(sp.factor(expected)),
        "newton_endpoint_signs":signs,
        "finite":finite,
        "large":{
            "order_scope":"N>=26",
            "branches":12,
            "cube_rows":sum(r["cube_rows"] for r in large),
            "power_terms":sum(r["power_terms"] for r in large),
            "homogeneous_coefficients":sum(r["homogeneous_terms"] for r in large),
            "minimum":str(min(Fraction(r["minimum"]) for r in large)),
            "rows":large,
        },
        "fixed_order_bridge":{
            "orders":[15,25],"branches":len(bridge),
            "cube_rows":sum(r["cube_rows"] for r in bridge),
            "power_terms":sum(r["power_terms"] for r in bridge),
            "homogeneous_coefficients":sum(r["homogeneous_terms"] for r in bridge),
            "minimum":str(min(Fraction(r["minimum"]) for r in bridge)),
            "rows":bridge,
        },
        "sign_payment":"F>=0 by the displayed all-order certificate; S>=0 universally; N4(C)>=0 by the audited all-forest theorem",
        "dependencies_sha256":PINS,
        "scope":(
            "Only the adjacent deg_C(u)=1 subfamily of singleton_endpoint_p_equals_u "
            "is closed. Adjacent degree at least two, connected nonadjacent, disconnected "
            "nonisolated, other canonical modes, g2, all N5, and Problem 993 remain separate."
        ),
        "source_sha256":sha256(Path(__file__)),
    }
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n"
    OUTPUT.write_text(raw,encoding="utf-8",newline="\n")
    print(json.dumps({"marker":MARKER,"finite":finite,"large":report["large"]|{"rows":"omitted"},"fixed_order_bridge":report["fixed_order_bridge"]|{"rows":"omitted"},"scope":report["scope"]},indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__=="__main__":
    main()
