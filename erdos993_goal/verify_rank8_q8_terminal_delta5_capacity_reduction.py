#!/usr/bin/env python3
"""Exact capacity/defect reduction and retained-interior audit for Delta5."""

from __future__ import annotations
import hashlib,json
from pathlib import Path
import sympy as sp
from verify_rank8_q8_terminal_reduction import c,h,newton_coefficients,residual

def choose_poly(value,rank): return sp.prod(value-j for j in range(rank))/sp.factorial(rank)

def main():
    coefficient=newton_coefficients(residual())[5]
    n,m=sp.symbols("n m",integer=True,nonnegative=True); S,D,E=sp.symbols("S D E",nonnegative=True)
    exact={c[0]:1,c[1]:n,c[2]:choose_poly(n-1,2)}
    weak=sp.expand(coefficient.subs({**exact,h[6]:S*c[6],h[7]:D*c[7]},simultaneous=True)); weak_corner=sp.factor(weak.subs({S:0,D:1})); assert weak_corner==-63*c[7]**3*(n**2-n+2)
    capacity=sp.expand(coefficient.subs({**exact,h[6]:S*c[6],h[7]:E*(n-7)*S*c[6]/7},simultaneous=True)); assert capacity.subs(S,0)==0
    second_E=sp.factor(sp.diff(capacity,E,2)); assert second_E==-18*S**2*c[6]**2*c[7]*(n-7)**2*(n**2-n+2)/7
    second_S=sp.factor(sp.diff(capacity,S,2))
    H=(-18*E**2*n**4+270*E**2*n**3-1170*E**2*n**2+1386*E**2*n-1764*E**2+512*E*c[3]*n-3584*E*c[3]+257*E*n**3-2568*E*n**2+5897*E*n-3598*E-2128*c[3]-2016*c[4]-56*n**2+168*n-112)
    assert sp.expand(second_S-c[6]**2*c[7]*H/7)==0

    endpoint_rows=[]; endpoint_expressions={}
    for e_value in (0,1):
        endpoint=sp.expand(capacity.subs(E,e_value))
        derivative8=sp.factor(sp.diff(endpoint,c[8])); expected8=-8*S*c[6]*(58*c[3]*c[7]+83*c[7]*n**2-141*c[7]*n+166*c[7]+16*c[8]*n**2-16*c[8]*n+32*c[8]); assert sp.expand(derivative8-expected8)==0
        after8=sp.factor(endpoint.subs(c[8],(n-7)*c[7]/8))
        curvature7=sp.factor(sp.diff(after8,c[7],2)); expected7=-2*S*c[6]*(58*c[3]*n+2010*c[3]+304*c[4]+n**4+68*n**3+1503*n**2-3196*n+3256); assert sp.expand(curvature7-expected7)==0
        shifted=sp.Poly(sp.expand((n**4+68*n**3+1503*n**2-3196*n+3256).subs(n,m+8)),m); assert all(value>0 for value in shifted.all_coeffs())
        endpoint_expressions[e_value]=after8; endpoint_rows.append({"capacity_endpoint_E":e_value,"d_dc8":str(derivative8),"d2_dc7":str(curvature7)})
    margin=sp.factor(n-15+sp.Rational(10,1)/n-sp.Rational(7,2)); assert all(value>0 for value in sp.Poly(sp.expand((2*n*margin).subs(n,m+18)),m).all_coeffs())

    y=sp.symbols("y",positive=True); curvature_rows=[]; obstruction=None
    for e_value in (0,1):
        for k in (1,7):
            d6_endpoint=(12*y**2/c[5]-k*y)/14
            in_y=endpoint_expressions[e_value].subs({c[6]:y,c[7]:d6_endpoint},simultaneous=True)
            minus_curvature=sp.factor(-sp.diff(in_y,y,2)); numerator,_=sp.fraction(sp.together(minus_curvature)); polynomial=sp.Poly(sp.expand(numerator),c[3],c[4],c[5],n,y,S)
            curvature_rows.append({"capacity_E":e_value,"D6_k":k,"curvature_numerator_terms":len(polynomial.terms()),"curvature_numerator_signs":sorted({int(sp.sign(value)) for _,value in polynomial.terms()})})
            if e_value==0 and k==1:
                path18={n:18,c[3]:560,c[4]:1365,c[5]:2002,y:1716,S:1}; exact_value=sp.factor(minus_curvature.subs(path18)); assert exact_value==-sp.Rational(4921832860648,2401)
                obstruction={"tree":"P18","independence_jet_c3_to_c6":[560,1365,2002,1716],"root_S":1,"capacity_E":0,"D6_k":1,"minus_second_derivative":str(exact_value),"consequence":"D5 endpoint reduction by concavity is invalid on a feasible tree jet"}
    assert obstruction is not None
    output=Path(__file__).with_name("rank8_q8_terminal_delta5_capacity_reduction_exact_20260817.json")
    payload={"status":"PASS_EXACT_RANK8_TERMINAL_DELTA5_CAPACITY_REDUCTION_WITH_LIVE_S_D5","weak_box_failure":{"corner":"h6/c6=0, h7/c7=1","value":str(weak_corner),"warning":"unrealizable; capacity must be retained"},"proved_reduction":{"capacity":"7*h7<=(n-7)*h6","range":"n>=18","E_concavity":str(second_E),"root_S":"retained on [0,1]","S_curvature_audit":str(second_S),"capacity_endpoints_E":[0,1],"c8_endpoint":"c8=(n-7)c7/8","c7_endpoints":["(12c6^2/c5-c6)/14","(12c6^2/c5-7c6)/14"],"endpoint_rows":endpoint_rows},"D5_curvature_audit":curvature_rows,"genuine_concavity_obstruction":obstruction,"warning":"This is a reduction, not yet Delta5>=0. Both S and full interior D5 remain live in the Bernstein certificate."}
    output.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8"); print(payload["status"]); print("script_sha256",hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()); print("report_sha256",hashlib.sha256(output.read_bytes()).hexdigest().upper())

if __name__=="__main__": main()
