#!/usr/bin/env python3
"""Exact full-D5 Bernstein probe for rank-eight terminal Delta6."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast
from probe_rank8_q8_terminal_delta7_d5_bernstein import certify
from verify_rank7_terminal_broom_middle_differences import D4_CEILING
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def build_cleared_branch(threshold: int, capacity_e: int, d6_k: int):
    n, w, x = sp.symbols("n w x", positive=True)
    U, V = sp.symbols("U V", nonnegative=True)
    source_variables = (n, w, x, U, V)

    c0 = 2*w/((n-1)*(n-2)); c1 = n*c0; c2 = w; c3 = sp.S.One; c4 = 1/x
    d4_low = (2+x)/10
    d4 = sp.factor(d4_low+(D4_CEILING-d4_low)*U)
    c5 = sp.factor((1-d4)/x**2); x5 = sp.factor(c4/c5)
    d5_low = (2+x5)/12; d5_high = sp.Rational(1, 6)+x5/2
    d5 = sp.factor(d5_low+(d5_high-d5_low)*V)
    c6 = sp.factor((1-d5)*c5**2/c4)
    c7 = sp.factor((12*c6**2/c5-d6_k*c6)/14)
    c8 = sp.factor((n-7)*c7/8)
    h6 = c6; h7 = sp.Rational(capacity_e, 7)*(n-7)*c6

    raw = newton_coefficients(residual())[6]
    rational = sp.cancel(raw.subs(dict(zip(
        (*c[:9], h[6], h[7]),
        (c0,c1,c2,c3,c4,c5,c6,c7,c8,h6,h7),
    )), simultaneous=True))
    source_numerator, source_denominator = sp.fraction(rational)
    source_numerator = sp.Poly(sp.expand(source_numerator), *source_variables, domain=sp.QQ)
    source_denominator = sp.Poly(sp.expand(source_denominator), *source_variables, domain=sp.QQ)

    T, W, A = sp.symbols("T W A", nonnegative=True); box = (T,W,A,U,V)
    order = sp.Rational(threshold, 1)/T
    w_low = 3/(order-3); w_high = 3*(order-1)/((order-3)*(order-4))
    w_value = sp.factor(w_low+(w_high-w_low)*W)
    x_low = 8*w_value/(6-w_value); x_high = 4*w_value/(3*(1-w_value))
    x_value = sp.factor(x_low+(x_high-x_low)*A)
    maps_sympy = []
    for value in (order,w_value,x_value):
        numerator,denominator = sp.fraction(sp.cancel(value))
        maps_sympy.append((sp.Poly(sp.expand(numerator),*box,domain=sp.QQ),sp.Poly(sp.expand(denominator),*box,domain=sp.QQ)))
    maps_sympy.extend([
        (sp.Poly(U,*box,domain=sp.QQ),sp.Poly(1,*box,domain=sp.QQ)),
        (sp.Poly(V,*box,domain=sp.QQ),sp.Poly(1,*box,domain=sp.QQ)),
    ])
    context = fmpq_mpoly_ctx.get([str(variable) for variable in box])
    def to_flint(poly: sp.Poly):
        data = {}
        for monomial, coefficient in poly.terms():
            numerator, denominator = sp.fraction(coefficient)
            data[monomial] = fmpq(int(numerator), int(denominator))
        return context.from_dict(data)
    maps = [(to_flint(num),to_flint(den)) for num,den in maps_sympy]
    def clear(source: sp.Poly):
        maxima = source.degree_list()
        powers = [[num**power*den**(maximum-power) for power in range(maximum+1)] for maximum,(num,den) in zip(maxima,maps)]
        result = context.constant(0)
        for monomial,coefficient in source.terms():
            coefficient_numerator,coefficient_denominator = sp.fraction(coefficient)
            term = context.constant(fmpq(int(coefficient_numerator),int(coefficient_denominator)))
            for axis,power in enumerate(monomial): term *= powers[axis][power]
            result += term
        data = {}
        for monomial,coefficient in result.terms():
            data[monomial] = sp.Rational(int(coefficient.numerator),int(coefficient.denominator))
        return sp.Poly.from_dict(data,box,domain=sp.QQ).as_expr(),maxima
    numerator,numerator_degrees = clear(source_numerator)
    denominator,denominator_degrees = clear(source_denominator)
    return sp.expand(numerator),sp.expand(denominator),box,numerator_degrees,denominator_degrees,len(source_numerator.terms()),len(source_denominator.terms())


def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("--order",type=int,required=True)
    parser.add_argument("--e",type=int,choices=(0,1),required=True); parser.add_argument("--k",type=int,choices=(1,7),required=True)
    parser.add_argument("--max-depth",type=int,default=28); parser.add_argument("--no-split",action="store_true"); args=parser.parse_args()
    if args.order < 18: raise SystemExit("proved endpoint range starts at n=18")
    numerator,denominator,box,source_num_degrees,source_den_degrees,source_num_terms,source_den_terms = build_cleared_branch(args.order,args.e,args.k)
    denominator_degrees,denominator_coefficients=tensor_bernstein_fast(denominator,box); denominator_minimum,denominator_index=minimum_with_index(denominator_coefficients); assert denominator_minimum>=0
    degrees,coefficients=tensor_bernstein_fast(numerator,box); initial_minimum,initial_index=minimum_with_index(coefficients)
    certificate = ({"status":"PASS" if initial_minimum>=0 else "UNRESOLVED_NO_SPLIT","leaves":1 if initial_minimum>=0 else 0,"deepest":0,"worst":(initial_minimum,tuple(int(value) for value in initial_index),0),"splits_by_axis":[0]*len(box)} if args.no_split else certify(coefficients,args.max_depth))
    payload={"status":certificate["status"],"threshold":args.order,"branch":{"capacity_E":args.e,"D6_k":args.k},"domain":f"n>={args.order}, full D4 and full interior D5 intervals","box":[str(variable) for variable in box],"source_numerator_terms":source_num_terms,"source_numerator_degrees":list(source_num_degrees),"source_denominator_terms":source_den_terms,"source_denominator_degrees":list(source_den_degrees),"cleared_degrees":list(degrees),"initial_coefficients":int(coefficients.size),"initial_minimum":str(initial_minimum),"initial_minimum_index":[int(value) for value in initial_index],"denominator_degrees":list(denominator_degrees),"denominator_minimum":str(denominator_minimum),"denominator_minimum_index":[int(value) for value in denominator_index],"certificate":certificate}
    output=Path(__file__).with_name(f"rank8_q8_terminal_delta6_n{args.order}_e{args.e}_k{args.k}_exact_20260817.json"); output.write_text(json.dumps(payload,indent=2,default=str)+"\n",encoding="utf-8")
    print("DELTA6_BRANCH",args.order,args.e,args.k); print("CLEARED",degrees,coefficients.size,initial_minimum,initial_index); print("CERTIFICATE",certificate); print("REPORT",output.name,hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if certificate["status"]!="PASS": return 2
    print("PASS_EXACT_RANK8_DELTA6_FULL_D5_BRANCH"); return 0


if __name__=="__main__": raise SystemExit(main())
