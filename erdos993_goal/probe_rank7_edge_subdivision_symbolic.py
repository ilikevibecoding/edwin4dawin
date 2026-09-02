#!/usr/bin/env python3
"""Inspect the generic one-edge-subdivision residual increment symbolically."""
from __future__ import annotations
import argparse
from math import comb
import sympy as sp


def family(prefix:str, included:bool)->list[sp.Expr]:
    out=[sp.Integer(0)]*8
    if included:
        out[1]=sp.Integer(1)
        for k in range(2,8):out[k]=sp.Symbol(f"{prefix}{k}",nonnegative=True)
    else:
        out[0]=sp.Integer(1)
        for k in range(1,8):out[k]=sp.Symbol(f"{prefix}{k}",nonnegative=True)
    return out


def add(*arrays:list[sp.Expr])->list[sp.Expr]:return [sum(a[k] for a in arrays) for k in range(8)]
def mul(a:list[sp.Expr],b:list[sp.Expr])->list[sp.Expr]:return [sum(a[i]*b[k-i] for i in range(k+1)) for k in range(8)]
def shift(a:list[sp.Expr])->list[sp.Expr]:return [sp.Integer(0)]+a[:7]


def residual(c:list[sp.Expr],h:list[sp.Expr],t:int)->sp.Expr:
    p6=sum(comb(t,l)*c[6-l] for l in range(min(6,t)+1))+h[5]
    p7=sum(comb(t,l)*c[7-l] for l in range(min(7,t)+1))+h[6]
    p8o=sum(comb(t,l)*c[8-l] for l in range(1,min(8,t)+1))
    return 7*c[6]*h[5]*(14*p7*p7-p6*p7-16*p6*p8o)-7*h[5]*p6*(14*c[7]*c[7]-c[6]*c[7])-8*c[6]*p6*(12*h[6]*h[6]-h[5]*h[6])


def main()->None:
    parser=argparse.ArgumentParser();parser.add_argument("--rank",type=int,choices=range(7),required=True);args=parser.parse_args();rank=args.rank
    a,b,c,d,e,f=(family("a",False),family("b",True),family("c",False),family("d",True),family("e",False),family("f",True))
    oldc=add(mul(a,c),mul(a,d),mul(b,c));newc=add(oldc,shift(mul(a,c)),mul(b,d))
    oldh=add(mul(e,c),mul(e,d),mul(f,c));newh=add(oldh,shift(mul(e,c)),mul(f,d))
    expr=sp.Integer(0)
    for j in range(rank+1):expr+=(-1)**(rank-j)*comb(rank,j)*(residual(newc,newh,1+j)-residual(oldc,oldh,1+j))
    poly=sp.Poly(sp.expand(expr));terms=poly.terms();negative=[(monomial,coefficient) for monomial,coefficient in terms if coefficient<0]
    print("rank",rank,"terms",len(terms),"negative_terms",len(negative),"minimum_coefficient",min(coefficient for _,coefficient in terms),flush=True)
    if negative:print("first_negative",negative[0],flush=True)


if __name__=="__main__":main()
