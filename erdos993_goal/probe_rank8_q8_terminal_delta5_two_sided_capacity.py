#!/usr/bin/env python3
"""Exact Bernstein probe for feasible two-sided root-capacity pieces in Delta5."""

from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
import sympy as sp
from flint import fmpq,fmpq_mpoly_ctx
from explore_rank4_three_halves_grouped import minimum_with_index,tensor_bernstein_fast
from probe_rank8_q8_terminal_delta7_d5_bernstein import certify
from verify_rank7_terminal_broom_middle_differences import D4_CEILING
from verify_rank8_q8_terminal_reduction import c,h,newton_coefficients,residual

PIECES={"low":("l0","lcross","ucap","uc7"),"high":("l0","lcross","ucap")}

def build(threshold:int,k:int,regime:str,piece:str):
    n,w,x=sp.symbols("n w x",positive=True); U,Q,Z=sp.symbols("U Q Z",nonnegative=True); source=(n,w,x,U,Q,Z)
    c0=2*w/((n-1)*(n-2));c1=n*c0;c2=w;c3=sp.S.One;c4=1/x
    d4_low=(2+x)/10;d4=sp.factor(d4_low+(D4_CEILING-d4_low)*U);c5=sp.factor((1-d4)/x**2)
    q=sp.factor(sp.Rational(6,7)*Q if regime=="low" else sp.Rational(6,7)+Q/7); a=n-7
    c6=sp.factor(c5*(7*a*q+3*k)/36);c7=sp.factor(a*q*c6/6);c8=sp.factor(a*c7/8)
    if regime=="low":
        if piece=="l0": S=(1-q)*Z;h7=sp.S.Zero
        elif piece=="lcross": S=1-q+q*Z;h7=a*c6*(S+q-1)/6
        elif piece=="ucap": S=7*q*Z/6;h7=a*S*c6/7
        elif piece=="uc7": S=7*q/6+(1-7*q/6)*Z;h7=c7
        else: raise ValueError(piece)
    else:
        if piece=="l0": S=(1-q)*Z;h7=sp.S.Zero
        elif piece=="lcross": S=(1-q)*(1+6*Z);h7=a*c6*(S+q-1)/6
        elif piece=="ucap": S=7*(1-q)*Z;h7=a*S*c6/7
        else: raise ValueError(piece)
    h6=sp.factor(S*c6)
    raw=newton_coefficients(residual())[5]
    rational=sp.cancel(raw.subs(dict(zip((*c[:9],h[6],h[7]),(c0,c1,c2,c3,c4,c5,c6,c7,c8,h6,h7))),simultaneous=True))
    source_num,source_den=sp.fraction(rational);source_num=sp.Poly(sp.expand(source_num),*source,domain=sp.QQ);source_den=sp.Poly(sp.expand(source_den),*source,domain=sp.QQ)
    T,W,A=sp.symbols("T W A",nonnegative=True);box=(T,W,A,U,Q,Z);order=sp.Rational(threshold)/T
    wl=3/(order-3);wh=3*(order-1)/((order-3)*(order-4));wv=sp.factor(wl+(wh-wl)*W);xl=8*wv/(6-wv);xh=4*wv/(3*(1-wv));xv=sp.factor(xl+(xh-xl)*A)
    maps_sym=[]
    for value in (order,wv,xv):
        numerator,denominator=sp.fraction(sp.cancel(value));maps_sym.append((sp.Poly(sp.expand(numerator),*box,domain=sp.QQ),sp.Poly(sp.expand(denominator),*box,domain=sp.QQ)))
    for value in (U,Q,Z):maps_sym.append((sp.Poly(value,*box,domain=sp.QQ),sp.Poly(1,*box,domain=sp.QQ)))
    context=fmpq_mpoly_ctx.get([str(variable) for variable in box])
    def to_flint(poly):
        data={}
        for monomial,coefficient in poly.terms():
            numerator,denominator=sp.fraction(coefficient);data[monomial]=fmpq(int(numerator),int(denominator))
        return context.from_dict(data)
    maps=[(to_flint(num),to_flint(den)) for num,den in maps_sym]
    def clear(poly):
        maxima=poly.degree_list();powers=[[num**power*den**(maximum-power) for power in range(maximum+1)] for maximum,(num,den) in zip(maxima,maps)];result=context.constant(0)
        for monomial,coefficient in poly.terms():
            numerator,denominator=sp.fraction(coefficient);term=context.constant(fmpq(int(numerator),int(denominator)))
            for axis,power in enumerate(monomial):term*=powers[axis][power]
            result+=term
        data={monomial:sp.Rational(int(coefficient.numerator),int(coefficient.denominator)) for monomial,coefficient in result.terms()}
        return sp.Poly.from_dict(data,box,domain=sp.QQ).as_expr(),maxima
    numerator,num_degrees=clear(source_num);denominator,den_degrees=clear(source_den)
    return sp.expand(numerator),sp.expand(denominator),box,num_degrees,den_degrees,len(source_num.terms()),len(source_den.terms())

def main():
    parser=argparse.ArgumentParser();parser.add_argument("--order",type=int,default=18);parser.add_argument("--k",type=int,choices=(1,7),required=True);parser.add_argument("--regime",choices=("low","high"),required=True);parser.add_argument("--piece",required=True);parser.add_argument("--max-depth",type=int,default=20);parser.add_argument("--no-split",action="store_true");args=parser.parse_args()
    if args.piece not in PIECES[args.regime]:raise SystemExit("piece is not present in this q regime")
    numerator,denominator,box,num_deg,den_deg,num_terms,den_terms=build(args.order,args.k,args.regime,args.piece)
    denominator_degrees,denominator_coefficients=tensor_bernstein_fast(denominator,box);denominator_minimum,denominator_index=minimum_with_index(denominator_coefficients);assert denominator_minimum>=0
    degrees,coefficients=tensor_bernstein_fast(numerator,box);initial_minimum,initial_index=minimum_with_index(coefficients)
    certificate=({"status":"PASS" if initial_minimum>=0 else "UNRESOLVED_NO_SPLIT","leaves":1 if initial_minimum>=0 else 0,"deepest":0,"worst":(initial_minimum,tuple(int(v) for v in initial_index),0),"splits_by_axis":[0]*len(box)} if args.no_split else certify(coefficients,args.max_depth))
    payload={"status":certificate["status"],"threshold":args.order,"D6_k":args.k,"q_regime":args.regime,"capacity_piece":args.piece,"q_range":"[0,6/7]" if args.regime=="low" else "[6/7,1]","box":[str(v) for v in box],"source_numerator_terms":num_terms,"source_numerator_degrees":list(num_deg),"source_denominator_terms":den_terms,"source_denominator_degrees":list(den_deg),"cleared_degrees":list(degrees),"initial_coefficients":int(coefficients.size),"initial_minimum":str(initial_minimum),"initial_minimum_index":[int(v) for v in initial_index],"denominator_degrees":list(denominator_degrees),"denominator_minimum":str(denominator_minimum),"denominator_minimum_index":[int(v) for v in denominator_index],"certificate":certificate}
    output=Path(__file__).with_name(f"rank8_q8_terminal_delta5_twocap_n{args.order}_k{args.k}_{args.regime}_{args.piece}_exact_20260817.json");output.write_text(json.dumps(payload,indent=2,default=str)+"\n",encoding="utf-8")
    print("DELTA5_TWOCAP",args.order,args.k,args.regime,args.piece);print("CLEARED",degrees,coefficients.size,initial_minimum,initial_index);print("CERTIFICATE",certificate);print("REPORT",output.name,hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if certificate["status"]!="PASS":raise SystemExit(2)
    print("PASS_EXACT_RANK8_DELTA5_TWO_SIDED_CAPACITY_BRANCH")

if __name__=="__main__":main()
