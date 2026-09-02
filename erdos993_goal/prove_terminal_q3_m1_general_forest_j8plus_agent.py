#!/usr/bin/env python3
"""Exact conditional all-order forest m=1 theorem for every target j>=8.

The proof keeps the fixed q3 low block literal, retains the exact positive
forest-anchor Gap reserve, and discards the FQ32 residual M only after its
coefficient is certified nonnegative.  It applies to disconnected forests
without isolated components and assumes the smaller-forest q_j<=q_2 input.
"""

from __future__ import annotations

from functools import lru_cache
from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

import audit_terminal_q3_low_newton_adversarial_agent as canonical
import audit_terminal_q3_low_newton_m2_forest_canonical_import_agent as rows
from derive_terminal_q3_m1_general_forest_agent import build, C


HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"terminal_q3_m1_general_forest_j8plus_exact_agent_20260829.json"

PINNED={
    "derive_terminal_q3_m1_general_forest_agent.py":
        "348DB21007B705120538CBA087D67DA40C97295CEA522523A6105078074A1A4C",
    "audit_terminal_q3_low_newton_adversarial_agent.py":
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D",
    "audit_terminal_q3_low_newton_m2_forest_canonical_import_agent.py":
        "462C76A2B3F39DBECD2E28EF4A434C6F461A65B19B53F7BB6032ACF51A9238E3",
    "prove_all_forest_q3_q2_component_lift_root.py":
        "6C9F956D8F37AFC462193E780284C24F995D90A644F6C6C2B129A0B9BE259B00",
    "all_forest_q3_q2_component_lift_exact_root_20260829.json":
        "71BA8A861714902FECC613150B2BA936A19100F0AB43DF5766CF8614C5E50442",
    "audit_all_forest_q3_q2_component_lift_independent_agent.py":
        "63C2FFE7432FE54BF197B2F6F89DFF737B280D7B2571D6B30692FF09227E9815",
    "all_forest_q3_q2_component_lift_independent_audit_20260829.json":
        "7465DCB4C62ACF76614003D42285B72CD559A27AB6F449804F3CC881B405695D",
    "prove_terminal_q3_forest_anchor_lift_agent.py":
        "01F04CA1C51B155D987C61611298B8B38CC60981EBA7C8269FD251B75BCB434D",
    "terminal_q3_forest_anchor_lift_exact_agent_20260829.json":
        "E9CD1A6276D589F885626AB69786D9499116D291242DA76883FAA577850F1DDF",
    "audit_terminal_q3_low_newton_m1_forest_finite_agent.py":
        "20F3FA5F42CB28D255CDC6F3D3CB3DD6E94FF384A056AC45858101E3A03FC1D4",
    "terminal_q3_low_newton_m1_forest_finite_audit_20260829.json":
        "63E52E6956A2B1B84C79B5E5893097151A1ADFC357683345B13965AE4732F29A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def tensor_bernstein(expression,variables):
    polynomial=sp.Poly(sp.expand(expression),*variables)
    degrees=tuple(polynomial.degree(variable) for variable in variables)
    indices=list(itertools.product(*[range(degree+1) for degree in degrees]))
    output={index:sp.Integer(0) for index in indices}
    for powers,coefficient in polynomial.terms():
        for index in itertools.product(*[
            range(power,degrees[k]+1) for k,power in enumerate(powers)
        ]):
            output[index]+=coefficient*sp.prod(
                sp.binomial(index[k],powers[k])/sp.binomial(degrees[k],powers[k])
                for k in range(len(variables))
            )
    return degrees,[sp.expand(output[index]) for index in indices]


def compile_exact_polynomial(expression,variables):
    terms=[]
    for powers,coefficient in sp.Poly(sp.expand(expression),*variables).terms():
        coefficient=sp.Rational(coefficient)
        terms.append((powers,Fraction(int(coefficient.p),int(coefficient.q))))

    def evaluate(values):
        total=Fraction(0)
        for powers,coefficient in terms:
            item=coefficient
            for value,power in zip(values,powers):
                if power:
                    item*=value**power
            total+=item
        return total
    return evaluate


@lru_cache(maxsize=1)
def certificate_expressions():
    numerator,denominator,mnum,mden,variables=build()
    j,r,h,d,R,W,y=variables
    N=j+r
    expected_den=12*r*(r+1)*(
        N**2-3*N+2*d+2*h
    )*(N**2+N+2*h+2)
    assert sp.expand(denominator-expected_den)==0
    assert sp.expand(mden-2*r*(r+1))==0

    wpoly=sp.Poly(numerator,W)
    assert wpoly.degree()==2
    w2=sp.expand(wpoly.coeff_monomial(W**2))
    linear=sp.expand(numerator-w2*W**2)

    # Exact no-isolate component bounds.
    rmax=N-2*h-d
    B=N-2*h-1
    # Deliberately omit the additional valid +R reserve here.  Using only
    # A=C(d,2) keeps the correlated lower endpoint affine in R while still
    # matching the path (v=0) and star (v=1) extremes that forced the split.
    A=C(d,2)
    lam=(d-1)/B
    correlated_low=sp.factor(lam*A+(1-lam)*B)
    upper=C(N-2*h,2)

    endpoints={}; endpoint_denominators={}
    for yvalue in (0,1):
        for wname,wvalue in (("low",correlated_low),("high",upper)):
            rational=sp.cancel(linear.subs({y:yvalue,W:wvalue}))
            boundary,boundary_den=sp.together(rational).as_numer_denom()
            boundary=sp.expand(boundary);boundary_den=sp.factor(boundary_den)
            if wname=="low":
                assert sp.expand(boundary_den-B)==0
                rpoly=sp.Poly(boundary,R)
                assert rpoly.degree()<=1
            else:
                assert boundary_den==1
                assert sp.Poly(boundary,R).degree()<=1
            endpoint_denominators[f"y{yvalue}_{wname}"]=str(boundary_den)
            for rname,rvalue in (("zero",0),("max",rmax)):
                endpoints[f"y{yvalue}_{wname}_{rname}"]=sp.expand(
                    boundary.subs(R,rvalue)
                )

    bzero={
        f"Bzero_y{yvalue}":sp.expand(numerator.subs({
            h:(N-1)/2,d:1,R:0,W:0,y:yvalue,
        }))
        for yvalue in (0,1)
    }
    tests={
        "W2_y0":w2.subs(y,0),
        "W2_y1":w2.subs(y,1),
        "M_coefficient_y0":mnum.subs(y,0),
        "M_coefficient_y_slope":sp.diff(mnum,y),
        **bzero,
        **endpoints,
    }
    return (
        numerator,denominator,mnum,mden,variables,tests,
        endpoint_denominators,
    )


def generic_identities():
    p0,p1,R0,R1,a,x,Gap,M=sp.symbols("p0 p1 R0 R1 a x Gap M")
    A0=(p0*Gap+a*M)/(2*p1)
    R0form=(3*p0*R1-M)/(2*p1)
    exact=sp.expand(
        x*A0+p1*R0form
        -(
            sp.Rational(3,2)*p0*R1
            +p0*x*Gap/(2*p1)
            +(a*x-p1)*M/(2*p1)
        )
    )
    assert exact==0

    N,h,d=sp.symbols("N h d",integer=True,positive=True)
    denominator_factor=sp.expand(N**2-3*N+2*d+2*h)
    assert sp.expand(
        denominator_factor-(N*(N-3)+2*d+2*h)
    )==0
    return {
        "reserve_elimination":"exact",
        "denominator_factor_1":"N*(N-3)+2*d+2*h>0 for N>=9",
        "denominator_factor_2":"N^2+N+2*h+2>0",
        "component_bounds":[
            "R<=N-2h-d",
            "W>=C(d,2)+R",
            "W>=N-2h-1",
            "W<=C(N-2h,2)",
            "0<=lambda=(d-1)/(N-2h-1)<=1 when B>0",
        ],
    }


def cone_certificate():
    (_num,_den,_mnum,_mden,variables,tests,endpoint_denominators)=certificate_expressions()
    j,r,h,d,_R,_W,_y=variables
    S,u,v,w=sp.symbols("S u v w",nonnegative=True)
    E=S
    substitution={
        j:8+E*w,
        r:1+E*(1-w),
        h:1+(E+6)*u/2,
        d:1+(E+6)*(1-u)*v,
    }
    records={};stream=hashlib.sha256()
    total_bernstein=total_power=zeros=0;minimum_positive=None
    for name,expression in tests.items():
        transformed=sp.expand(expression.subs(substitution,simultaneous=True))
        degrees,coefficients=tensor_bernstein(transformed,(u,v,w))
        powers_all=[]
        for index,coefficient in enumerate(coefficients):
            powers=sp.Poly(coefficient,S).all_coeffs()
            assert powers and all(value>=0 for value in powers),(name,index,coefficient)
            powers_all.extend(powers)
            stream.update(f"{name}|{index}|{coefficient}\n".encode())
        positives=[value for value in powers_all if value>0]
        assert positives
        local_min=min(positives)
        minimum_positive=(
            local_min if minimum_positive is None
            else min(minimum_positive,local_min)
        )
        records[name]={
            "degrees_u_v_w":list(degrees),
            "bernstein_coefficients":len(coefficients),
            "power_coefficients_in_S":len(powers_all),
            "zero_power_coefficients":sum(value==0 for value in powers_all),
            "minimum_positive_power_coefficient":str(local_min),
        }
        total_bernstein+=len(coefficients)
        total_power+=len(powers_all)
        zeros+=sum(value==0 for value in powers_all)
        print(name,"PASS",len(coefficients),flush=True)
    return {
        "parameterization":(
            "E=N-9=S>=0; j=8+E*w; r=1+E*(1-w); "
            "h=1+(E+6)u/2; d=1+(E+6)(1-u)v"
        ),
        "mapping_checks":{
            "all_order":"N>=9, equivalently |G|>=10",
            "B":"N-2h-1=(E+6)(1-u)>=0",
            "root_slack":"N-2h-d=(E+6)(1-u)(1-v)>=0",
            "lambda":"(d-1)/B=v on B>0",
        },
        "endpoint_denominators":endpoint_denominators,
        "tests":records,
        "total_bernstein_coefficients":total_bernstein,
        "total_power_coefficients_in_S":total_power,
        "zero_power_coefficients":zeros,
        "minimum_positive_power_coefficient":str(minimum_positive),
        "ordered_coefficient_stream_sha256":stream.hexdigest().upper(),
    }


def direct_canonical_crosscheck(max_order=11):
    numerator,denominator,mnum,mden,variables,_tests,_dens=certificate_expressions()
    num_eval=compile_exact_polynomial(numerator,variables)
    den_eval=compile_exact_polynomial(denominator,variables)
    mnum_eval=compile_exact_polynomial(mnum,variables)
    mden_eval=compile_exact_polynomial(mden,variables)
    types=[]
    for order in range(2,max_order+1):
        for graph in nx.nonisomorphic_trees(order):
            graph=nx.convert_node_labels_to_integers(graph,ordering="sorted")
            datum=rows.type_data(graph)
            datum["graph"]=graph
            datum["wedges"]=sum(
                degree*(degree-1)//2 for _,degree in graph.degree()
            )
            types.append(datum)

    @lru_cache(maxsize=None)
    def forest_pair(components):
        pair=((1,),(0,))
        for index in components:
            pair=rows.union_pair(pair,types[index]["pair"])
        return pair

    forests=roots=supported=canonical_equalities=lower_checks=0
    reserve_precondition_skips=0
    minimum_actual=minimum_num=None;minimum_cell="";stream=hashlib.sha256()
    finite_lower_nonnegative=finite_lower_negative=0
    for order in range(10,max_order+1):
        for components in rows.component_multisets(types,order):
            if len(components)<2:
                continue
            forests+=1;g_pair=forest_pair(components)
            W=sum(int(types[index]["wedges"]) for index in components)
            seen=set()
            for position,type_index in enumerate(components):
                if type_index in seen:
                    continue
                seen.add(type_index)
                rest=components[:position]+components[position+1:]
                rest_pair=forest_pair(rest)
                root_type=types[type_index];graph=root_type["graph"]
                for root in root_type["roots"]:
                    roots+=1;wroot=int(root["marked"]);d=graph.degree(wroot)
                    R=sum(graph.degree(u)-1 for u in graph.neighbors(wroot))
                    f_pair=rows.union_pair(root["F"],rest_pair)
                    h_pair=rows.union_pair(root["H"],rest_pair)
                    fi,fc=f_pair;hi,_hc=h_pair
                    adapter=rows.Adapter(f_pair,h_pair)
                    terminal={item[0]:item for item in canonical.terminal_rows(
                        nx.Graph(),0,list(g_pair[0]),
                        rows.one_edge_actual(g_pair[1]),adapter,
                    )}
                    for target in range(8,len(fi)):
                        b=rows.coeff(fi,target)
                        if not b:
                            continue
                        assert target in terminal
                        actual=terminal[target][1][1]
                        assert actual>0
                        gi=g_pair[0];gs=rows.one_edge_actual(g_pair[1])
                        fs=rows.one_edge_actual(fc)
                        N=order-1;h=len(components)-1;r=N-target;m=N-h
                        assert r>=1 and d>=1 and h>=1
                        assert 0<=R<=N-2*h-d
                        assert W>=d*(d-1)//2+R
                        assert W>=N-2*h-1
                        assert W<=(N-2*h)*(N-2*h-1)//2

                        p0=rows.coeff(gi,3)+rows.coeff(gi,2)
                        p1=rows.coeff(gi,2)+rows.coeff(gi,1)
                        r0=rows.coeff(gs,4)+rows.coeff(gs,3)
                        r1=rows.coeff(gs,3)+rows.coeff(gs,2)
                        u0=rows.coeff(gi,target+1)+rows.coeff(gi,target)
                        u1=rows.coeff(gi,target)+rows.coeff(gi,target-1)
                        a=rows.coeff(fi,2);z2=rows.coeff(fs,3)
                        h2=rows.coeff(hi,2);hj=rows.coeff(hi,target)
                        zj=rows.coeff(fs,target+1)
                        c0=a+z2+h2;e0=b+zj+hj

                        assert p0==int(C(N+1,3)-m*(N-1)+W+C(N+1,2)-m)
                        assert p1==int(C(N+1,2)-m+N+1)
                        assert r1==m*N-2*W
                        assert a==int(C(N,2)-(m-d))
                        assert z2==int((m-d)*(N-2)-2*(W-C(d,2)-R))
                        assert h2==int(C(N-d,2)-(m-d-R))

                        A0=p0*c0-a*r0
                        A1=p0*a+p1*c0+p1*a-a*r1
                        Q0=(target+1)*b*(c0+r0)-3*(p0+a)*e0
                        Q1=((target+1)*b*(a+r1)-3*p1*e0
                            -3*b*(p0+a+p1))
                        local=((target+1)*a*(A0*u1+A1*u0+A1*u1)
                               +a*(p0*Q1+p1*Q0+p1*Q1))
                        assert local==actual
                        canonical_equalities+=1

                        y=Fraction(hj,b)
                        assert 0<=y<=1
                        assert 2*a*e0<=b*(2*a*(1+y)+target*z2)
                        assert Fraction(u1,b)>=(
                            1+Fraction(target,r+1)+Fraction(target,r)*y
                        )
                        assert Fraction(u0,b)>=(
                            Fraction(N-2*target+3,target+1)
                            +Fraction(target-1,target+1)*y
                            +Fraction(target,r)*y
                        )
                        gap=2*p1*c0-3*a*r1
                        margin=3*p0*r1-2*p1*r0
                        assert gap>=0 and margin>=0

                        values=(target,r,h,d,R,W,y)
                        nv=num_eval(values);dv=den_eval(values)
                        mn=mnum_eval(values);md=mden_eval(values)
                        assert dv>0 and md>0
                        if mn>=0:
                            assert Fraction(actual,a*b)>=nv/dv
                            if nv>=0:
                                finite_lower_nonnegative+=1
                            else:
                                finite_lower_negative+=1
                            lower_checks+=1
                        else:
                            reserve_precondition_skips+=1
                        supported+=1
                        cell=(
                            f"order={order},components={components},"
                            f"type={root_type['graph6']},w={wroot},j={target}"
                        )
                        stream.update(f"{cell}|{actual}|{nv}|{dv}\n".encode())
                        if minimum_actual is None or actual<minimum_actual:
                            minimum_actual=actual;minimum_cell=cell
                        if minimum_num is None or nv<minimum_num:
                            minimum_num=nv
    assert supported>0
    return {
        "maximum_G_order":max_order,
        "no_isolate_disconnected_forests_orders_10_plus":forests,
        "rooted_cells":roots,
        "supported_j8plus_cells":supported,
        "canonical_delta1_equalities":canonical_equalities,
        "symbolic_lower_bound_checks":lower_checks,
        "reserve_precondition_skips":reserve_precondition_skips,
        "minimum_actual_delta1":str(minimum_actual),
        "minimum_actual_cell":minimum_cell,
        "minimum_cleared_numerator":str(minimum_num),
        "finite_lower_nonnegative_cells":finite_lower_nonnegative,
        "finite_lower_negative_or_reserve_cells":finite_lower_negative,
        "ordered_stream_sha256":stream.hexdigest().upper(),
    }


def verify_pins():
    for filename,expected in PINNED.items():
        actual=sha256(HERE/filename)
        assert actual==expected,(filename,actual,expected)
    fq=json.loads((HERE/"all_forest_q3_q2_component_lift_independent_audit_20260829.json").read_text())
    assert fq["status"]=="PASS_INDEPENDENT_EXACT_ALL_FOREST_Q3_AT_MOST_Q2_COMPONENT_LIFT_AUDIT"
    anchor=json.loads((HERE/"terminal_q3_forest_anchor_lift_exact_agent_20260829.json").read_text())
    assert anchor["status"]=="PASS_EXACT_ALL_ORDER_TERMINAL_Q3_FOREST_BASE_ANCHOR_LIFT"


def main():
    verify_pins()
    generic=generic_identities()
    print("generic identities PASS",flush=True)
    cone=cone_certificate()
    print("all-order j>=8 cone PASS",flush=True)
    direct=direct_canonical_crosscheck(11)
    print("direct canonical cross-check PASS",flush=True)
    report={
        "schema":"terminal-q3-m1-general-forest-j8plus-exact-agent-v1",
        "date":"2026-08-29",
        "status":"PASS_EXACT_GENERAL_NO_ISOLATE_FOREST_M1_J8PLUS_CONDITIONAL_Q_ENVELOPE",
        "claim":(
            "For every disconnected forest G without isolated components, "
            "every marked w, and every supported target j>=8, the terminal-q3 "
            "Newton coefficient d1 is nonnegative, assuming the smaller-forest "
            "input q_j(G-w)<=q_2(G-w)."
        ),
        "fixed_low_block":"a=i2(F), z2=s3(F), h2=i2(H)",
        "exact_reserves":(
            "The forest-anchor Gap term is retained exactly. The FQ32 margin "
            "M is discarded only after a*(U1/b)-p1>=0 is certified."
        ),
        "pinned_sha256":PINNED,
        "generic_and_domain":generic,
        "cone_certificate":cone,
        "direct_canonical_crosscheck":direct,
        "scope":(
            "This closes only no-isolate disconnected-forest m1 for j>=8, "
            "conditional on the strong-induction q envelope. Targets j=3..7, "
            "forest m0, the complete q envelope, unimodality, and Erdos "
            "Problem 993 remain open."
        ),
        "source":Path(__file__).name,
        "source_sha256":sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(report["status"])
    print("SOURCE",report["source_sha256"])
    print("REPORT",sha256(OUTPUT))


if __name__=="__main__":
    main()
