#!/usr/bin/env python3
"""Exact root-capacity/defect reduction and D5 no-go for Delta6."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value-j for j in range(rank))/sp.factorial(rank)


def main() -> None:
    coefficient = newton_coefficients(residual())[6]
    n,m = sp.symbols("n m",integer=True,nonnegative=True)
    S,D,E = sp.symbols("S D E",nonnegative=True)
    tree_exact={c[0]:1,c[1]:n,c[2]:choose_poly(n-1,2)}

    weak=sp.expand(coefficient.subs({**tree_exact,h[6]:S*c[6],h[7]:D*c[7]},simultaneous=True))
    weak_corner=sp.factor(weak.subs({S:0,D:1}))
    assert weak_corner == -126*c[7]**3*(n+1)

    capacity=sp.expand(coefficient.subs({**tree_exact,h[6]:S*c[6],h[7]:E*(n-7)*S*c[6]/7},simultaneous=True))
    second_E=sp.factor(sp.diff(capacity,E,2))
    assert second_E == -36*S**2*c[6]**2*c[7]*(n-7)**2*(n+1)/7
    G=(18*E**2*(n-7)**2*(n+1)+E*(-128*n**3+1023*n**2-1146*n+1799)+1008*c[3]+532*n**2-1540*n+1064)
    second_S=sp.factor(sp.diff(capacity,S,2))
    assert sp.expand(second_S+2*c[6]**2*c[7]*G/7)==0
    lower_G=sp.expand(G.subs(c[3],choose_poly(n-2,3)))
    power=sp.Poly(lower_G,E); coefficients=[power.coeff_monomial(E**j) for j in range(3)]
    bernstein=[coefficients[0],sp.factor(coefficients[0]+coefficients[1]/2),sp.factor(sum(coefficients))]
    expected_bernstein=[28*(6*n**3-35*n**2+101*n-106),(208*n**3-937*n**2+4510*n-4137)/2,58*n**3-191*n**2+2312*n-287]
    assert all(sp.expand(left-right)==0 for left,right in zip(bernstein,expected_bernstein))
    shifted=[]
    for value in bernstein:
        row=sp.Poly(sp.expand(value.subs(n,m+8)),m).all_coeffs(); assert all(entry>0 for entry in row); shifted.append([str(entry) for entry in row])
    assert capacity.subs(S,0)==0

    endpoint_rows=[]; endpoint_expressions={}
    for e_value in (0,1):
        endpoint=sp.expand(capacity.subs({S:1,E:e_value}))
        derivative8=sp.factor(sp.diff(endpoint,c[8]))
        expected8=-16*c[6]*(19*c[7]*n**2+44*c[7]*n+101*c[7]+16*c[8]*n+16*c[8])
        assert sp.expand(derivative8-expected8)==0
        after8=sp.factor(endpoint.subs(c[8],(n-7)*c[7]/8))
        curvature7=sp.factor(sp.diff(after8,c[7],2))
        expected7=-8*c[6]*(192*c[3]+10*n**3+476*n**2-35*n+1495)
        assert sp.expand(curvature7-expected7)==0
        endpoint_expressions[e_value]=after8
        endpoint_rows.append({"capacity_endpoint_E":e_value,"d_dc8":str(derivative8),"d2_dc7":str(curvature7)})

    mu5_margin=sp.factor(n-15+sp.Rational(10,1)/n-sp.Rational(7,2))
    assert sp.expand(mu5_margin-(2*n**2-37*n+20)/(2*n))==0
    assert all(value>0 for value in sp.Poly(sp.expand((2*n*mu5_margin).subs(n,m+18)),m).all_coeffs())

    y=sp.symbols("y",positive=True); curvature_rows=[]; obstruction=None
    for e_value in (0,1):
        for k in (1,7):
            d6_endpoint=(12*y**2/c[5]-k*y)/14
            in_y=endpoint_expressions[e_value].subs({c[6]:y,c[7]:d6_endpoint},simultaneous=True)
            minus_curvature=sp.factor(-sp.diff(in_y,y,2)); numerator,_=sp.fraction(sp.together(minus_curvature))
            polynomial=sp.Poly(sp.expand(numerator),c[3],c[4],c[5],n,y)
            row={"capacity_E":e_value,"D6_k":k,"curvature_numerator_terms":len(polynomial.terms()),"curvature_numerator_signs":sorted({int(sp.sign(value)) for _,value in polynomial.terms()})}
            curvature_rows.append(row)
            if e_value==0 and k==1:
                path18={n:18,c[3]:choose_poly(16,3),c[4]:choose_poly(15,4),c[5]:choose_poly(14,5),y:choose_poly(13,6)}
                exact_value=sp.factor(minus_curvature.subs(path18)); assert exact_value == -sp.Rational(11496615135896,343)
                obstruction={"tree":"P18","independence_jet_c3_to_c6":[560,1365,2002,1716],"capacity_E":0,"D6_k":1,"minus_second_derivative":str(exact_value),"consequence":"the D5 endpoint reduction by concavity is invalid on a feasible tree jet"}
    assert obstruction is not None

    output=Path(__file__).with_name("rank8_q8_terminal_delta6_capacity_reduction_exact_20260817.json")
    payload={"status":"PASS_EXACT_RANK8_TERMINAL_DELTA6_CAPACITY_REDUCTION_WITH_D5_OBSTRUCTION","weak_box_failure":{"corner":"h6/c6=0, h7/c7=1","value":str(weak_corner),"warning":"not realizable; extension capacity must be retained"},"root_concavity":{"capacity":"7*h7<=(n-7)*h6","range":"n>=8","d2_dE2":str(second_E),"d2_dS2":str(second_S),"tree_lower_bound":"c3>=C(n-2,3)","G_lower_Bernstein_coefficients":[str(value) for value in bernstein],"shift_n_equals_m_plus_8_coefficients":shifted},"proved_reduction":{"range":"n>=18","root_endpoints":["(S,E)=(1,0)","(S,E)=(1,1)"],"c8_endpoint":"c8=(n-7)c7/8","c7_endpoints":["(12c6^2/c5-c6)/14","(12c6^2/c5-7c6)/14"],"endpoint_rows":endpoint_rows},"D5_curvature_audit":curvature_rows,"genuine_concavity_obstruction":obstruction,"warning":"This is an exact reduction, not yet a proof of Delta6>=0; the full D5 interval must be retained."}
    output.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8")
    print(payload["status"]); print("script_sha256",hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()); print("report_sha256",hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__=="__main__": main()
