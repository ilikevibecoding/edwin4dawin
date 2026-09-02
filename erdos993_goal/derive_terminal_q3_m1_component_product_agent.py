#!/usr/bin/env python3
"""Exact common-component one-edge decomposition of terminal m=1."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE=Path(__file__).resolve().parent
OUTPUT=HERE/'terminal_q3_m1_component_product_reduction_20260829.json'


def delta1(rows,j):
    p0,p1,r0,r1,u0,u1,a2,b,c0,e0=rows
    A0=p0*c0-a2*r0
    A1=p0*a2+p1*c0+p1*a2-a2*r1
    Q0=(j+1)*b*(c0+r0)-3*(p0+a2)*e0
    Q1=(j+1)*b*(a2+r1)-3*p1*e0-3*b*(p0+a2+p1)
    return sp.expand(
        (j+1)*a2*(A0*u1+A1*u0+A1*u1)
        +a2*(p0*Q1+p1*Q0+p1*Q1)
    )


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def main():
    j=sp.symbols('j',integer=True,positive=True)
    p0,p1,r0,r1,u0,u1,a2,b,c0,e0=sp.symbols(
        'p0 p1 r0 r1 u0 u1 a2 b c0 e0'
    )
    rows=(p0,p1,r0,r1,u0,u1,a2,b,c0,e0)
    D=delta1(rows,j)
    derivatives={
        'r0':sp.factor(sp.diff(D,r0)),
        'r1':sp.factor(sp.diff(D,r1)),
        'c0':sp.factor(sp.diff(D,c0)),
        'e0':sp.factor(sp.diff(D,e0)),
    }
    expected={
        'r0':(j+1)*a2*(b*p1-a2*u1),
        'r1':(j+1)*a2*(b*(p0+p1)-a2*(u0+u1)),
        'c0':(j+1)*a2*(p0*u1+p1*(u0+u1)+p1*b),
        'e0':-3*a2*p1*(2*p0+p1+a2),
    }
    assert all(sp.expand(derivatives[key]-expected[key])==0 for key in expected)
    # The functional is affine in all one-edge fields simultaneously.
    assert all(sp.diff(D,left,right)==0 for left in (r0,r1,c0,e0)
               for right in (r0,r1,c0,e0))

    ell=sp.symbols('ell',integer=True,nonnegative=True)
    A4,A3,A2,F3,Fj=sp.symbols('A4 A3 A2 F3 Fj',nonnegative=True)
    common_coefficient=sp.factor(
        expected['r0']*(A4+A3)
        +expected['r1']*(A3+A2)
        +expected['c0']*F3
        +expected['e0']*Fj
    )
    report={
        'schema':'terminal-q3-m1-component-product-reduction-v1',
        'date':'2026-08-29',
        'status':'PASS_EXACT_TERMINAL_M1_COMMON_COMPONENT_ONE_EDGE_DECOMPOSITION',
        'derivatives':{key:str(value) for key,value in derivatives.items()},
        'coefficient_of_s_ell_R':str(common_coefficient),
        'coefficient_mapping':{
            'A4':'i_(4-ell)(T_root)',
            'A3':'i_(3-ell)(T_root)',
            'A2':'i_(2-ell)(T_root)',
            'F3':'i_(3-ell)(T_root-w)',
            'Fj':'i_(j+1-ell)(T_root-w)',
        },
        'exact_decomposition':(
            'D1(T_root disjoint_union R)=D1 with S_R set to zero '
            '+sum_ell s_ell(R)*C_ell. All dependence on the common '
            'one-edge row is affine; C_ell is the displayed coefficient.'
        ),
        'sign_boundary':(
            'The first three groups in C_ell are low/shadow terms; the only '
            'explicit adverse group is -3*a2*p1*(2*p0+p1+a2)*'
            'i_(j+1-ell)(T_root-w). A proof must aggregate this term with '
            'q_ell(R)<=q3(R) rather than optimize s_ell independently.'
        ),
        'scope':(
            'This is an exact product reduction, not a positivity theorem '
            'for forest m1 or m0.'
        ),
        'source':Path(__file__).name,
        'source_sha256':sha256(__file__),
    }
    OUTPUT.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(report['status'])
    print(f'report={OUTPUT}')


if __name__=='__main__':
    main()
