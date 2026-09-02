#!/usr/bin/env python3
"""Exact q-D5 interval and four-piece capacity-superset reduction for Delta5."""

from __future__ import annotations
import hashlib,json
from pathlib import Path
import sympy as sp

def main():
    a,x5,k,V,q=sp.symbols("a x5 k V q",positive=True)
    d5_low=(2+x5)/12;d5_high=sp.Rational(1,6)+x5/2
    r_low=sp.factor((1-d5_high)/x5);r_high=sp.factor((1-d5_low)/x5)
    assert sp.factor(r_low-(5/(6*x5)-sp.Rational(1,2)))==0;assert sp.factor(r_high-(5/(6*x5)-sp.Rational(1,12)))==0;assert sp.factor(r_high-r_low)==sp.Rational(5,12)
    q_low=sp.factor((36*r_low-3*k)/(7*a));q_high=sp.factor((36*r_high-3*k)/(7*a));assert sp.factor(q_high-q_low)==15/(7*a)
    q_value=sp.factor(q_low+(q_high-q_low)*V)
    r_from_q=sp.factor((7*a*q+3*k)/36);assert sp.factor((36*r_from_q-3*k)/(7*a)-q)==0

    # For q<=6/7 these are the exact four boundary intervals.  For q>=6/7,
    # lower-cross and upper-capacity are enlarged supersets of the exact high-q
    # intervals; lower-zero remains exact and upper-c7 is harmless extra domain.
    high_lower_cross_upper=7*(1-q);low_lower_cross_upper=sp.Integer(1)
    high_upper_capacity_upper=7*(1-q);low_upper_capacity_upper=7*q/6
    assert sp.factor(low_lower_cross_upper-high_lower_cross_upper)==7*q-6
    assert sp.factor(low_upper_capacity_upper-high_upper_capacity_upper-7*(7*q-6)/6)==0

    output=Path(__file__).with_name("rank8_q8_terminal_delta5_qd5_intersection_exact_20260817.json")
    payload={"status":"PASS_EXACT_RANK8_TERMINAL_DELTA5_QD5_INTERSECTION_REDUCTION","D5_interval":[str(d5_low),str(d5_high)],"c6_over_c5_interval":[str(r_low),str(r_high)],"q_interval":[str(q_low),str(q_high)],"q_width":str(sp.factor(q_high-q_low)),"q_parameter":str(q_value),"D6_endpoint_inverse":"c6/c5=(7*(n-7)*q+3*k)/36","four_covering_pieces":["lower zero: S=(1-q)Z, H=0","lower cross: S=1-q+qZ, H=(n-7)(S+q-1)/6","upper capacity: S=7qZ/6, H=(n-7)S/7","upper c7: S=7q/6+(1-7q/6)Z, H=(n-7)q/6"],"high_q_superset_check":{"lower_cross_extra_width":"7q-6>=0","upper_capacity_extra_width":"7(7q-6)/6>=0"},"coverage":"For 0<=q<=6/7 the four pieces are exact. For 6/7<=q<=1 they contain every exact lower/upper boundary piece, so nonnegativity on them is sufficient.","warning":"q and D5 are linked by the displayed affine interval; treating either as independent reproduces the archived negative relaxed jets."}
    output.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8");print(payload["status"]);print("script_sha256",hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper());print("report_sha256",hashlib.sha256(output.read_bytes()).hexdigest().upper())

if __name__=="__main__":main()
