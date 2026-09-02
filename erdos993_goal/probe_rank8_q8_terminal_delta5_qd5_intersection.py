#!/usr/bin/env python3
"""Exact Bernstein probe for feasible two-sided root-capacity pieces in Delta5."""

from __future__ import annotations
import argparse,hashlib,json,time,math
from pathlib import Path
import numpy as np
import sympy as sp
from flint import fmpq,fmpq_mpoly_ctx
from explore_rank4_three_halves_grouped import minimum_with_index,tensor_bernstein_fast
from probe_rank8_q8_terminal_delta7_d5_bernstein import certify
from verify_rank7_terminal_broom_middle_differences import D4_CEILING
from verify_rank8_q8_terminal_reduction import c,h,newton_coefficients,residual

PIECES={"low":("l0","lcross","ucap","uc7","full")}

def tensor_bernstein_flint(poly,variables):
    """Exact dense Bernstein transform using python-flint rationals."""
    expanded=sp.Poly(sp.expand(poly),*variables,domain=sp.QQ)
    degrees=tuple(expanded.degree(variable) for variable in variables)
    coefficients=np.empty(tuple(degree+1 for degree in degrees),dtype=object);coefficients.fill(fmpq(0))
    for monomial,coefficient in expanded.terms():
        numerator,denominator=sp.fraction(coefficient)
        coefficients[monomial]=fmpq(int(numerator),int(denominator))
    for axis,degree in enumerate(degrees):
        moved=np.moveaxis(coefficients,axis,0);transformed=np.empty_like(moved)
        for index in range(degree+1):
            value=np.empty(moved.shape[1:],dtype=object);value.fill(fmpq(0))
            for exponent in range(index+1):
                value += moved[exponent]*fmpq(math.comb(index,exponent),math.comb(degree,exponent))
            transformed[index]=value
        coefficients=np.moveaxis(transformed,0,axis)
    return degrees,coefficients

def minimum_flint(coefficients):
    flat_index=min(range(coefficients.size),key=lambda index:coefficients.flat[index])
    return coefficients.flat[flat_index],np.unravel_index(flat_index,coefficients.shape)

def build(threshold:int,k:int,regime:str,piece:str,c8_bound:str="extension"):
    started=time.time()
    n,w,x=sp.symbols("n w x",positive=True); U,V,Z=sp.symbols("U V Z",nonnegative=True); source=(n,w,x,U,V,Z)
    c0=2*w/((n-1)*(n-2));c1=n*c0;c2=w;c3=sp.S.One;c4=1/x
    d4_low=(2+x)/10;d4=sp.factor(d4_low+(D4_CEILING-d4_low)*U);c5=sp.factor((1-d4)/x**2);x5=sp.factor(c4/c5)
    a=n-7;q_low=sp.factor((30/x5-18-3*k)/(7*a));q=sp.factor(q_low+15*V/(7*a))
    c6=sp.factor(c5*(7*a*q+3*k)/36);c7=sp.factor(a*q*c6/6)
    if c8_bound=="extension": c8=sp.factor(a*c7/8)
    elif c8_bound=="q7": c8=sp.factor(c7*(14*c7-c6)/(16*c6))
    else: raise ValueError(c8_bound)
    if regime=="low":
        if piece=="l0": S=(1-q)*Z;h7=sp.S.Zero
        elif piece=="lcross": S=1-q+q*Z;h7=a*c6*(S+q-1)/6
        elif piece=="ucap": S=7*q*Z/6;h7=a*S*c6/7
        elif piece=="uc7": S=7*q/6+(1-7*q/6)*Z;h7=c7
        elif piece=="full": S=sp.S.One;h7=c7
        else: raise ValueError(piece)
    else:
        if piece=="l0": S=(1-q)*Z;h7=sp.S.Zero
        elif piece=="lcross": S=(1-q)*(1+6*Z);h7=a*c6*(S+q-1)/6
        elif piece=="ucap": S=7*(1-q)*Z;h7=a*S*c6/7
        else: raise ValueError(piece)
    h6=sp.factor(S*c6)
    raw=newton_coefficients(residual())[5]
    rational=sp.cancel(raw.subs(dict(zip((*c[:9],h[6],h[7]),(c0,c1,c2,c3,c4,c5,c6,c7,c8,h6,h7))),simultaneous=True))
    print("STAGE source-rational",round(time.time()-started,3),flush=True)
    source_num,source_den=sp.fraction(rational);source_num=sp.Poly(sp.expand(source_num),*source,domain=sp.QQ);source_den=sp.Poly(sp.expand(source_den),*source,domain=sp.QQ)
    print("STAGE source-polys",round(time.time()-started,3),len(source_num.terms()),len(source_den.terms()),flush=True)
    T,W,A=sp.symbols("T W A",nonnegative=True);box=(T,W,A,U,V,Z);order=sp.Rational(threshold)/T
    wl=3/(order-3);wh=3*(order-1)/((order-3)*(order-4));wv=sp.factor(wl+(wh-wl)*W);xl=8*wv/(6-wv);xh=4*wv/(3*(1-wv));xv=sp.factor(xl+(xh-xl)*A)
    maps_sym=[]
    for value in (order,wv,xv):
        numerator,denominator=sp.fraction(sp.cancel(value));maps_sym.append((sp.Poly(sp.expand(numerator),*box,domain=sp.QQ),sp.Poly(sp.expand(denominator),*box,domain=sp.QQ)))
    for value in (U,V,Z):maps_sym.append((sp.Poly(value,*box,domain=sp.QQ),sp.Poly(1,*box,domain=sp.QQ)))
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
    print("STAGE cleared-cube",round(time.time()-started,3),flush=True)
    return sp.expand(numerator),sp.expand(denominator),box,num_degrees,den_degrees,len(source_num.terms()),len(source_den.terms())

def main():
    started=time.time()
    parser=argparse.ArgumentParser();parser.add_argument("--order",type=int,default=18);parser.add_argument("--k",type=int,choices=(1,7),required=True);parser.add_argument("--regime",choices=("low","high"),required=True);parser.add_argument("--piece",required=True);parser.add_argument("--c8-bound",choices=("extension","q7"),default="extension");parser.add_argument("--backend",choices=("flint","sympy"),default="sympy");parser.add_argument("--max-depth",type=int,default=20);parser.add_argument("--no-split",action="store_true");args=parser.parse_args()
    if args.piece not in PIECES[args.regime]:raise SystemExit("piece is not present in this q regime")
    numerator,denominator,box,num_deg,den_deg,num_terms,den_terms=build(args.order,args.k,args.regime,args.piece,args.c8_bound)
    transform=tensor_bernstein_flint if args.backend=="flint" else tensor_bernstein_fast
    minimum=minimum_flint if args.backend=="flint" else minimum_with_index
    denominator_degrees,denominator_coefficients=transform(denominator,box);denominator_minimum,denominator_index=minimum(denominator_coefficients);assert denominator_minimum>=0
    print("STAGE denominator-bernstein",round(time.time()-started,3),flush=True)
    del denominator_coefficients
    degrees,coefficients=transform(numerator,box);initial_minimum,initial_index=minimum(coefficients)
    print("STAGE numerator-bernstein",round(time.time()-started,3),flush=True)
    certificate=({"status":"PASS" if initial_minimum>=0 else "UNRESOLVED_NO_SPLIT","leaves":1 if initial_minimum>=0 else 0,"deepest":0,"worst":(initial_minimum,tuple(int(v) for v in initial_index),0),"splits_by_axis":[0]*len(box)} if args.no_split else certify(coefficients,args.max_depth))
    payload={"status":certificate["status"],"threshold":args.order,"D6_k":args.k,"q_regime":args.regime,"capacity_piece":args.piece,"c8_bound":args.c8_bound,"bernstein_backend":args.backend,"q_range":"full D5-induced q interval; low-piece formulas used as safe supersets when q>6/7","box":[str(v) for v in box],"source_numerator_terms":num_terms,"source_numerator_degrees":list(num_deg),"source_denominator_terms":den_terms,"source_denominator_degrees":list(den_deg),"cleared_degrees":list(degrees),"initial_coefficients":int(coefficients.size),"initial_minimum":str(initial_minimum),"initial_minimum_index":[int(v) for v in initial_index],"denominator_degrees":list(denominator_degrees),"denominator_minimum":str(denominator_minimum),"denominator_minimum_index":[int(v) for v in denominator_index],"certificate":certificate}
    suffix="" if args.c8_bound=="extension" else f"_{args.c8_bound}"
    output=Path(__file__).with_name(f"rank8_q8_terminal_delta5_qd5_n{args.order}_k{args.k}_{args.regime}_{args.piece}{suffix}_exact_20260817.json");output.write_text(json.dumps(payload,indent=2,default=str)+"\n",encoding="utf-8")
    print("DELTA5_QD5",args.order,args.k,args.regime,args.piece);print("CLEARED",degrees,coefficients.size,initial_minimum,initial_index);print("CERTIFICATE",certificate);print("REPORT",output.name,hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if certificate["status"]!="PASS":raise SystemExit(2)
    print("PASS_EXACT_RANK8_DELTA5_QD5_INTERSECTION_BRANCH")

if __name__=="__main__":main()
