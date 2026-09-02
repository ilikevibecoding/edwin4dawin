#!/usr/bin/env python3
"""Exact all-order singleton-ordinary g2 theorem for configuration order n>=14.

The raw coefficient is split into universal rank-three forest reserves on the
whole and both-marks-deleted rows plus a residual.  Exact connected-subtree
incidence bounds reduce that residual to 136 canonical forest-geometry cells;
every cell has a strictly positive homogeneous coefficient stream.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n5_g2_singleton_direct_pair_motif_cone_rank5_g2_alt import (
    derive_pair_cone,
)
from derive_iso_n5_g2_singleton_direct_pair_reduced_cone_rank5_g2_alt import (
    derive_reduced,
)
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_batch_g1_bernstein import (
    branch_key,
    canonical_branches,
)
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein import (
    homogeneous_coefficients_fast,
    mapped_polynomial,
)


HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n5_g2_singleton_ordinary_large_q3_pair_cone_exact_rank5_g2_alt_20260830.json"
MARKER="PASS_EXACT_ISO_N5_G2_SINGLETON_ORDINARY_LARGE_Q3_PAIR_CONE_RANK5_G2_ALT"
DEPENDENCIES={
    "derive_iso_n5_g2_singleton_l_parent_invariant_rank5_g2_alt.py":"9A26B7B6C2A18BCA6BCE59F0AB12F5F2C3617765D4EF4876D0AF2CB602445415",
    "derive_iso_n5_g2_singleton_direct_pair_motif_cone_rank5_g2_alt.py":"492240F5E1A7E26A62C1F75FE974D4AE295AC1485EED9F6E001AADF787749142",
    "derive_iso_n5_g2_singleton_direct_pair_reduced_cone_rank5_g2_alt.py":"C5D443BB544B1273B52A3F9AFBA1E99E6AE87A7B4B99B632FEAB0F31643DB7DC",
    "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein.py":"549FA8171D2686B063EDF670E4E5B0D42267312CB1583A411518713C84A461E2",
    "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_batch_g1_bernstein.py":"2ACB779AA69BA88C5A57B970CCBB57044A6D2A6585C29771A18EE7D4C1BD0FB0",
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":"9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
    "verify_rank3_three_halves_forest_certificate.py":"F78396D95B3CF18C73E5A1586E1B712731E319D9530D01A1AFDA3856CFBAD76D",
    "RANK3_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":"0CAD18D9D3EDDF05581AC7909CB1F52932FE43FB522CD24AF55D9F61395DB3DE",
    "validate_iso_n5_g2_q3_ie_identity_rank5_g2_alt.py":"6546DD50577F8F049787BADC8D1EEC3CF767EAB6DA11F279A561A1A2ADD2E133",
    "iso_n5_g2_q3_ie_identity_validation_rank5_g2_alt_20260830.json":"06F7C7DB03D9FE07CEC50B94E7423B9E6DD9405EA3C77600AA2E845874819529",
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def choose(value,rank):
    return sp.prod(value-j for j in range(rank))/sp.factorial(rank)


def shifted_sign(expression,n,sign):
    y=sp.Symbol("y",nonnegative=True)
    coefficients=sp.Poly(sp.expand(expression.subs(n,y+14)),y).all_coeffs()
    assert all(sign*value>0 for value in coefficients)
    return {"shifted_at_n_14":str(sp.expand(expression.subs(n,y+14))),
            "coefficients":[str(value) for value in coefficients]}


def structural_sign_certificate():
    q3w=sp.Rational(3,4)
    _,active=derive_pair_cone(q3_scale=sp.Rational(3,4),q3_w_scale=q3w)
    _,isolated=derive_pair_cone(q3_scale=sp.Integer(1),q3_w_scale=q3w)
    n=active["n"];e=active["edge_count"];du=active["degree_u"]
    dv=active["degree_v"];adj=active["adjacent"]
    h,j=sp.symbols("h j",nonnegative=True)

    active_none_floor=(22*n**2-43*n-136)/4
    active_one_floor=(12*n-164)/4
    isolated_none_floor=(18*n**2-31*n-144)/4
    both_upper=(-20*n**2+85*n-180)/4
    r3w_floor=8*n-14

    # e=n-1-h.  For the one-mark weight also write du=e-j.  All
    # remainders below have manifestly nonnegative coefficients for n>=14.
    assert sp.expand(active["weight_none"].subs(e,n-1-h)-active_none_floor-
        (32*adj+(6*n-29)*(du+dv)+(14*n-41)*h)/4)==0
    assert sp.expand(active["weight_u"].subs({e:n-1-h,du:n-1-h-j})-
        active_one_floor-(32*adj+(6*n-37)*dv+(8*n-20)*h+24*j)/4)==0
    assert sp.expand(active["weight_v"].subs({e:n-1-h,dv:n-1-h-j})-
        active_one_floor-(32*adj+(6*n-37)*du+(8*n-20)*h+24*j)/4)==0
    assert sp.expand(isolated["weight_none"].subs({e:n-1-h,du:0,dv:0,adj:0})-
        isolated_none_floor-(14*n-49)*h/4)==0

    # For the negative both-mark weight use adj<=1, du,dv>=0,
    # (-2n+47)e<=19e, and e<=n-1.  The displayed upper bound is strict.
    both_relaxed=(32+19*(n-1)-20*n**2+66*n-193)/4
    assert sp.expand(both_relaxed-both_upper)==0
    # The C_W connected-three coefficient is
    # 2(3adj-3du-3dv+7n-10).  Since du+dv<=e+adj<=n-1+adj,
    # it is at least 8n-14.
    assert sp.expand(active["C_connected3_W_residual"]
                     .subs(du,n-1+adj-dv)-r3w_floor)==0

    return {
        "q3_reserves":{
            "whole_row":"Q3(C_E) with scale 1 if du=dv=0, else scale 3/4",
            "both_marks_deleted_row":"(3/4) Q3(C_W)",
            "theorem":"Q3(I(F))=6i3^2-i2*i3-8i2*i4>=0 for every forest F",
        },
        "active_mark_positive_floors":{
            "neither_mark_connected3_weight":shifted_sign(active_none_floor,n,1),
            "one_mark_connected3_weight":shifted_sign(active_one_floor,n,1),
            "C_W_connected3_weight":shifted_sign(r3w_floor,n,1),
        },
        "isolated_marks_positive_floor":shifted_sign(isolated_none_floor,n,1),
        "both_marks_weight_upper":shifted_sign(both_upper,n,-1),
        "motif_payment":(
            "Q35>=R4-S4; 4*S4<=(q-3)*S3 in every q-edge forest row; "
            "positive neither/one-mark connected-three weights are discarded; "
            "the negative both-mark weight is multiplied by the exact adjacent "
            "bound, common-neighbor bound, or distance-three bound."
        ),
        "Q_variable_elimination":(
            "Q_wedges has coefficient 2(-3dp+4n-10)>0 and is set to zero; "
            "Q endpoint neighbor-excess coefficients are 5-6n<0 and are set "
            "to the exact edge-minus-degree upper bounds."
        ),
    }


def connected_edge_sets(graph,rank):
    total=0
    stars=0
    rows=[]
    for chosen in itertools.combinations(tuple(graph.edges()),rank):
        sub=nx.Graph();sub.add_edges_from(chosen)
        vertices=set().union(*(set(edge) for edge in chosen))
        if nx.is_connected(sub) and len(vertices)==rank+1:
            total+=1
            stars+=int(max(dict(sub.degree()).values())==rank)
            rows.append((chosen,vertices))
    return total,stars,rows


def three_edge_five(graph):
    total=0
    for chosen in itertools.combinations(tuple(graph.edges()),3):
        sub=nx.Graph();sub.add_edges_from(chosen)
        vertices=set().union(*(set(edge) for edge in chosen))
        total+=int(len(vertices)==5 and nx.number_connected_components(sub)==2)
    return total


def incidence_regression():
    forests=0;marked_pairs=0
    stream=[]
    for graph0 in nx.graph_atlas_g():
        if len(graph0) and not nx.is_forest(graph0):
            continue
        graph=nx.convert_node_labels_to_integers(graph0);forests+=1
        e=graph.number_of_edges()
        r3,s3,r3rows=connected_edge_sets(graph,3)
        r4,s4,_=connected_edge_sets(graph,4)
        q35=three_edge_five(graph)
        assert 4*s4 <= (e-3)*s3 if s3 else s4==0
        assert q35>=r4-s4
        for u,v in itertools.permutations(graph.nodes(),2):
            marked_pairs+=1
            du,dv=graph.degree(u),graph.degree(v)
            adj=int(graph.has_edge(u,v))
            common=len(set(graph.neighbors(u))&set(graph.neighbors(v)))
            assert common<=1 and not (adj and common)
            xu=sum(graph.degree(w)-1 for w in graph.neighbors(u))
            xv=sum(graph.degree(w)-1 for w in graph.neighbors(v))
            actual=sum(int(u in vertices and v in vertices) for _,vertices in r3rows)
            if adj:
                bound=sp.binomial(du+dv-2,2)+xu+xv-(du+dv-2)
                assert actual==bound
            elif common:
                bound=du+dv+sp.Rational(xu+xv,2)-3
                assert actual<=bound
            else:
                bound=int(du>0 and dv>0)
                assert actual<=bound
            stream.append((len(graph),e,u,v,actual,str(bound)))
    return {"atlas_forests":forests,"ordered_marked_pairs":marked_pairs,
            "all_star_and_nonstar_payments_pass":True,
            "all_both_mark_motif_bounds_pass":True,
            "stream_sha256":hashlib.sha256(repr(stream).encode()).hexdigest().upper(),
            "role":"finite regression of elementary all-order incidence lemmas"}


def coefficient_certificate():
    branches=canonical_branches()
    assert len(branches)==136 and len({branch_key(row) for row in branches})==136
    numerators={}
    for scale in (sp.Integer(1),sp.Rational(3,4)):
        reduced,names=derive_reduced(q3_scale=scale,q3_w_scale=sp.Rational(3,4))
        flag=names["positive_degree_u_v"]
        for positive in (0,1):
            numerators[(scale,positive)]=sp.expand(reduced.subs(flag,positive))
    rows=[];stream=hashlib.sha256();total=0;global_minimum=None
    for index,branch in enumerate(branches):
        degrees,adjacency,common,endpoints,uv_common,parent_state,parent_interval=branch
        scale=sp.Integer(1) if not (degrees[0] or degrees[1]) else sp.Rational(3,4)
        polynomial,_=mapped_polynomial(
            degrees,adjacency,common,endpoints,"centers",1,0,0,uv_common,14,
            numerator=numerators[(scale,degrees[0]*degrees[1])],
            parent_state=parent_state,positive_parent_interval=parent_interval,
        )
        coefficients,stats=homogeneous_coefficients_fast(polynomial,0,0)
        assert coefficients and all(value>0 for value in coefficients.values())
        minimum=min(coefficients.values());global_minimum=(minimum if global_minimum is None
                                                           else min(global_minimum,minimum))
        total+=len(coefficients)
        local=hashlib.sha256()
        for key,value in sorted(coefficients.items()):
            record=f"{key}:{value};".encode();local.update(record);stream.update(record)
        rows.append({"index":index,"branch":branch_key(branch),
                     "q3_E_scale":str(scale),"minimum":str(minimum),
                     "coefficient_count":len(coefficients),
                     "coefficient_stream_sha256":local.hexdigest().upper(),**stats})
    assert global_minimum==sp.Rational(17,40)
    return {"order_base":14,"canonical_branches":136,"rows":rows,
            "total_homogeneous_coefficients":total,
            "global_minimum":str(global_minimum),
            "coefficient_stream_sha256":stream.hexdigest().upper(),
            "all_coefficients_strictly_positive":True}


def main():
    for name,expected in DEPENDENCIES.items():
        assert expected!="TO_BE_PINNED" and sha256(HERE/name)==expected,name
    validation=json.loads((HERE/"iso_n5_g2_q3_ie_identity_validation_rank5_g2_alt_20260830.json").read_text())
    assert validation["marker"]=="PASS_DIRECT_VALIDATION_ISO_N5_G2_Q3_IE_IDENTITY_RANK5_G2_ALT"
    structure=structural_sign_certificate()
    incidence=incidence_regression()
    coefficients=coefficient_certificate()
    report={"marker":MARKER,
            "theorem":"For every singleton-ordinary canonical forest configuration of order n>=14, raw g2(C,D)>=0.",
            "structural_certificate":structure,"incidence_regression":incidence,
            "coefficient_certificate":coefficients,"dependencies_sha256":DEPENDENCIES,
            "scope":("Exact large-order singleton_ordinary g2 only (configuration order n>=14). "
                     "Orders n<=13, the other three still-open canonical g2 modes, all N5, and "
                     "Erdos Problem 993 remain separate."),
            "source_sha256":sha256(Path(__file__))}
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n"
    OUTPUT.write_text(raw,encoding="utf-8",newline="\n")
    print(json.dumps({"marker":MARKER,"branches":coefficients["canonical_branches"],
                      "coefficients":coefficients["total_homogeneous_coefficients"],
                      "minimum":coefficients["global_minimum"],
                      "stream_sha256":coefficients["coefficient_stream_sha256"],
                      "incidence_pairs":incidence["ordered_marked_pairs"]},indent=2,sort_keys=True))
    print("SOURCE_SHA256",report["source_sha256"])
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__=="__main__":main()
