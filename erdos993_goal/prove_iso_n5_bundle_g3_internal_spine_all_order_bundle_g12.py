#!/usr/bin/env python3
"""All-order rank-five g3 theorem for both internal-spine modes.

Deleting an internal support separates the marks: C=A disjoint-union R, with
u in A and v in R.  The support neighbourhood deletes a in A and p in R.
This script treats the four collision patterns (a distinct/equal u and p
distinct/equal v).  Since no connected edge motif contains both marks, the
universal high-motif lower bound is zero.  The remaining low residual is
proved by component-sensitive degree-excess cones: a symbolic n>=16 tail,
fixed-order Bernstein certificates for n=8,...,15, a symbolic edgeless branch,
and a complete exact census through order seven.

This proves the two internal-spine g3 modes only, not all N5 or Problem 993.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path

import networkx as nx
import sympy as sp

from prove_iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12 import (
    bernstein_certificate,
    g3_rows,
)
from prove_iso_n5_bundle_g3_singleton_ordinary_all_order_bundle_g12 import row_cache


HERE = Path(__file__).resolve().parent
CONFIG_SOURCE = HERE / "derive_iso_n5_bundle_g3_five_mode_configuration_bundle_g12.py"
CONFIG_REPORT = HERE / "iso_n5_bundle_g3_five_mode_configuration_bundle_g12_20260829.json"
MOTIF_SOURCE = HERE / "prove_iso_n5_bundle_g3_high_motif_reduction_bundle_g12.py"
MOTIF_REPORT = HERE / "iso_n5_bundle_g3_high_motif_reduction_bundle_g12_20260829.json"
BERNSTEIN_SOURCE = HERE / "prove_iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12.py"
BERNSTEIN_REPORT = HERE / "iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12_20260829.json"
SINGLETON_SOURCE = HERE / "prove_iso_n5_bundle_g3_singleton_ordinary_all_order_bundle_g12.py"
SINGLETON_REPORT = HERE / "iso_n5_bundle_g3_singleton_ordinary_all_order_bundle_g12_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g3_internal_spine_all_order_bundle_g12_20260829.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G3_INTERNAL_SPINE_ALL_ORDER_BUNDLE_G12"


def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def configured_residual(config):
    raw = sp.sympify(config["generic_forest_invariant"]["residual_without_high_motifs"])
    n = sp.Symbol("n")
    e = sp.Symbol("C_edges")
    du, dv = sp.symbols("C_degree_u C_degree_v")
    wedges, xu, xv = sp.symbols("C_wedges C_neighbor_excess_u C_neighbor_excess_v")
    da, dp, xa, xp = sp.symbols("degree_a degree_p excess_a excess_p")
    hu, hv, cu, cv = sp.symbols("hit_u hit_v common_ua common_vp")
    eu, ev = sp.symbols("epsilon_u epsilon_v")
    substitution = {
        sp.Symbol("q"): n - 2,
        sp.Symbol("C_adjacent"): 0,
        sp.Symbol("C_common_neighbor"): 0,
        sp.Symbol("D_edges"): e - da - dp,
        sp.Symbol("D_degree_u"): eu * (du - hu),
        sp.Symbol("D_degree_v"): ev * (dv - hv),
        sp.Symbol("D_adjacent"): 0,
        sp.Symbol("D_wedges"): wedges - da * (da - 1) / 2 - xa - dp * (dp - 1) / 2 - xp,
        sp.Symbol("D_neighbor_excess_u"): eu * (xu - hu * (da - 1) - cu),
        sp.Symbol("D_neighbor_excess_v"): ev * (xv - hv * (dp - 1) - cv),
        sp.Symbol("D_common_neighbor"): 0,
    }
    expression = sp.factor(raw.subs(substitution))
    names = {
        "n": n, "e": e, "du": du, "dv": dv, "wedges": wedges,
        "xu": xu, "xv": xv, "da": da, "dp": dp, "xa": xa, "xp": xp,
        "hu": hu, "hv": hv, "cu": cu, "cv": cv, "eu": eu, "ev": ev,
    }
    return expression, names


def edgeless_branch(residual, q):
    n=q["n"]
    specialized=residual.subs({q["eu"]:0,q["ev"]:0,q["da"]:q["du"],q["xa"]:q["xu"],q["dp"]:q["dv"],q["xp"]:q["xv"],q["hu"]:0,q["hv"]:0,q["cu"]:0,q["cv"]:0})
    zero={q[key]:0 for key in ("e","du","dv","wedges","xu","xv")}
    form=sp.factor(specialized.subs(zero))
    expected=(n-1)*(44*n**3-55*n**2+36)/6
    assert sp.expand(form-expected)==0
    m=sp.Symbol("m",nonnegative=True);shift=sp.expand(form.subs(n,2+m))
    assert shift==sp.Rational(22,3)*m**4+sp.Rational(253,6)*m**3+sp.Rational(517,6)*m**2+sp.Rational(238,3)*m+28
    return {"form":str(form),"n_equals_2_plus_m":str(shift),"minimum":28}


def batches(residual,q,n_value,tail,common_negative):
    n,e,du,dv=q["n"],q["e"],q["du"],q["dv"]
    W,xu,xv=q["wedges"],q["xu"],q["xv"]
    da,dp,xa,xp=q["da"],q["dp"],q["xa"],q["xp"]
    hu,hv,cu,cv,eu,ev=q["hu"],q["hv"],q["cu"],q["cv"],q["eu"],q["ev"]
    m=sp.Symbol("m",nonnegative=True); s=sp.symbols("s0:5",nonnegative=True)
    rows=[];lower_count=sign_count=0

    def certify_case(label,branch,specialized,structural,cap,replacements,signs):
        nonlocal lower_count,sign_count
        sign_rows={}
        for variable,sign in signs.items():
            cert=bernstein_certificate(sp.expand(sign*sp.diff(specialized,variable).subs(structural)),s,m)
            sign_rows[str(variable)]=cert;sign_count+=cert["coefficient_count"]
        lower=sp.expand(specialized.subs(replacements).subs(structural))
        cert=bernstein_certificate(lower,s,m);lower_count+=cert["coefficient_count"]
        rows.append({"case":label,"branch":list(branch),"lower":cert,"monotonicity":sign_rows})

    # a!=u, p!=v: two distinct nontrivial marked components.
    for hitu,hitv in itertools.product((0,1),repeat=2):
        length=n_value-4
        x,y,aa,pp,r=[length*s[i] for i in range(5)]
        structural={n:n_value,eu:1,ev:1,hu:hitu,hv:hitv,du:1+x,dv:1+y,da:1+aa,dp:1+pp,e:2+x+y+aa+pp+r}
        cap=sum(d*(d-1)/2 for d in (1+x,1+y,1+aa,1+pp))+r*(r+1)/2
        replacements={W:cap,xu:0,xv:0,xa:0,xp:n-2-da-dp,cu:(1-hitu) if common_negative else 0,cv:(1-hitv) if common_negative else 0}
        signs={W:-1,xu:1,xv:1,xa:-1,xp:-1,cu:(-1 if common_negative else 1),cv:(-1 if common_negative else 1)}
        certify_case("ordinary_distinct",(hitu,hitv),residual,structural,cap,replacements,signs)

    # a=u, p!=v.
    for hitv,zu in itertools.product((0,1),repeat=2):
        baseline=1+zu;length=n_value-2-baseline
        x,y,pp,r=zu*length*s[0],length*s[1],length*s[2],length*s[3]
        special=sp.expand(residual.subs({eu:0,ev:1,da:du,xa:xu,hu:0,cu:0,hv:hitv}))
        structural={n:n_value,du:zu+x,dv:1+y,dp:1+pp,e:baseline+x+y+pp+r}
        cap=sum(d*(d-1)/2 for d in (zu+x,1+y,1+pp))+r*(r+1)/2
        replacements={W:cap,xu:0,xv:0,xp:n-2-du-dp,cv:(1-hitv) if common_negative else 0}
        signs={W:-1,xu:1,xv:1,xp:-1,cv:(-1 if common_negative else 1)}
        certify_case("ordinary_a_equals_u",(hitv,zu),special,structural,cap,replacements,signs)

    # a!=u, p=v.
    for hitu,zv in itertools.product((0,1),repeat=2):
        baseline=1+zv;length=n_value-2-baseline
        x,y,aa,r=length*s[0],zv*length*s[1],length*s[2],length*s[3]
        special=sp.expand(residual.subs({eu:1,ev:0,dp:dv,xp:xv,hv:0,cv:0,hu:hitu}))
        structural={n:n_value,du:1+x,dv:zv+y,da:1+aa,e:baseline+x+y+aa+r}
        cap=sum(d*(d-1)/2 for d in (1+x,zv+y,1+aa))+r*(r+1)/2
        replacements={W:cap,xu:0,xv:0,xa:n-2-dv-da,cu:(1-hitu) if common_negative else 0}
        signs={W:-1,xu:1,xv:1,xa:-1,cu:(-1 if common_negative else 1)}
        certify_case("endpoint_p_equals_v",(hitu,zv),special,structural,cap,replacements,signs)

    # a=u,p=v.
    for zu,zv in itertools.product((0,1),repeat=2):
        baseline=max(1,zu+zv);length=n_value-2-baseline
        x,y,r=zu*length*s[0],zv*length*s[1],length*s[2]
        special=sp.expand(residual.subs({eu:0,ev:0,da:du,xa:xu,dp:dv,xp:xv,hu:0,hv:0,cu:0,cv:0}))
        structural={n:n_value,du:zu+x,dv:zv+y,e:baseline+x+y+r}
        cap=sum(d*(d-1)/2 for d in(zu+x,zv+y))+r*(r+1)/2
        replacements={W:cap,xu:0,xv:0};signs={W:-1,xu:1,xv:1}
        certify_case("endpoint_double_collision",(zu,zv),special,structural,cap,replacements,signs)

    assert len(rows)==16
    return {"tail":tail,"n":str(n_value),"branches":16,"lower_coefficient_count":lower_count,"monotonicity_coefficient_count":sign_count,"rows":rows}


def symbolic_certificates(residual,q):
    m=sp.Symbol("m",nonnegative=True)
    tail=batches(residual,q,16+m,True,True)
    fixed=[batches(residual,q,sp.Integer(order),False,False) for order in range(8,16)]
    return {
        "component_degree_excess": (
            "For c guaranteed nontrivial components, e=c+sum selected(deg-1)+r; "
            "C-wedges <= sum C(selected degrees,2)+C(r+1,2), and e<=n-2."
        ),
        "deletion_neighbor_excess_caps": [
            "Xa+Xp<=n-2-da-dp when a,p are distinct from the marks",
            "Xu+Xp<=n-2-du-dp when a=u", "Xa+Xv<=n-2-da-dv when p=v",
        ],
        "tail_n_ge_16":tail,
        "fixed_orders_8_through_15":fixed,
        "all_basis_inversions_exact":True,
        "all_coefficients_nonnegative":True,
    }


def finite_proof():
    counts=Counter();minima={}
    for G0 in nx.graph_atlas_g():
        if not(2<=len(G0)<=7 and nx.is_forest(G0)):continue
        G=nx.convert_node_labels_to_integers(G0);removed=row_cache(G)
        for u,v in itertools.permutations(G.nodes(),2):
            if nx.node_connected_component(G,u)==nx.node_connected_component(G,v):continue
            crows=tuple(removed(x) for x in ((),(u,),(v,),(u,v)))
            Au=nx.node_connected_component(G,u);Pv=nx.node_connected_component(G,v)
            configurations=[]
            for a in Au-{u}:
                for p in Pv-{v}:configurations.append(("ordinary_distinct",((a,p),(a,p,u),(a,p,v),(a,p,u,v))))
            for p in Pv-{v}:configurations.append(("ordinary_a_equals_u",((u,p),(u,p),(u,p,v),(u,p,v))))
            for a in Au-{u}:configurations.append(("endpoint_p_equals_v",((a,v),(a,u,v),(a,v),(a,u,v))))
            configurations.append(("endpoint_double_collision",((u,v),(u,v),(u,v),(u,v))))
            for label,removals in configurations:
                value=g3_rows(crows,tuple(removed(x) for x in removals));assert value>=0
                counts[label]+=1;minima[label]=min(minima.get(label,value),value)
    expected_counts={"endpoint_double_collision":1064,"ordinary_a_equals_u":1336,"endpoint_p_equals_v":1336,"ordinary_distinct":1072}
    expected_minima={"endpoint_double_collision":28,"ordinary_a_equals_u":143,"endpoint_p_equals_v":143,"ordinary_distinct":512}
    assert dict(counts)==expected_counts and minima==expected_minima
    return {"range":"2<=n<=7","scope":"all unlabeled atlas forests, ordered disconnected marks, every paired-component deletion choice","total":sum(counts.values()),"counts":dict(counts),"minima":minima}


def main():
    config=json.loads(CONFIG_REPORT.read_text());motif=json.loads(MOTIF_REPORT.read_text())
    bern=json.loads(BERNSTEIN_REPORT.read_text());single=json.loads(SINGLETON_REPORT.read_text())
    assert config["marker"]=="PASS_EXACT_ISO_N5_BUNDLE_G3_FIVE_MODE_CONFIGURATION_BUNDLE_G12"
    assert motif["marker"]=="PASS_EXACT_ISO_N5_BUNDLE_G3_HIGH_MOTIF_REDUCTION_BUNDLE_G12"
    assert bern["marker"]=="PASS_EXACT_ISO_N5_BUNDLE_G3_ROOT_ENDPOINT_ALL_ORDER_BUNDLE_G12"
    assert single["marker"]=="PASS_EXACT_ISO_N5_BUNDLE_G3_SINGLETON_ORDINARY_ALL_ORDER_BUNDLE_G12"
    residual,q=configured_residual(config);edgeless=edgeless_branch(residual,q)
    symbolic=symbolic_certificates(residual,q);finite=finite_proof()
    report={
        "marker":MARKER,
        "theorem":("The rank-five whole-bundle coefficient g3 is nonnegative in both canonical internal-spine modes, including a=u and/or p=v collision boundaries, at every order."),
        "structural_reduction":("C has u and v in different components; D=C-{a,p}, with a in the u-component and p in the v-component. Hence R3_both=0 and the proved high-motif layer is nonnegative."),
        "exact_low_residual":str(residual),"edgeless_branch":edgeless,
        "symbolic_certificates":symbolic,"finite_certificate":finite,
        "mode_scope":{"ordinary":"a distinct/equal u, p distinct v","endpoint":"a distinct/equal u, p=v"},
        "scope":"Both rank-five internal-spine g3 modes only; no complete N5 induction or Problem 993 claim.",
        "dependencies":{p.name:sha256(p) for p in (CONFIG_SOURCE,CONFIG_REPORT,MOTIF_SOURCE,MOTIF_REPORT,BERNSTEIN_SOURCE,BERNSTEIN_REPORT,SINGLETON_SOURCE,SINGLETON_REPORT)},
        "source_sha256":sha256(Path(__file__)),
    }
    encoded=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(encoded,encoding="utf-8")
    print(json.dumps({"marker":MARKER,"tail_branches":symbolic["tail_n_ge_16"]["branches"],"fixed_order_branches":sum(x["branches"] for x in symbolic["fixed_orders_8_through_15"]),"finite_total":finite["total"],"finite_minima":finite["minima"]},indent=2,sort_keys=True));print(MARKER)


if __name__=="__main__":main()
