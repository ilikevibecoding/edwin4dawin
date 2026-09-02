#!/usr/bin/env python3
"""Exact two-sided root-capacity polygon and relaxed-cone no-gos for Delta5."""

from __future__ import annotations
import hashlib,json
from pathlib import Path
import sympy as sp
from verify_rank7_terminal_broom_middle_differences import D4_CEILING
from verify_rank8_q8_terminal_reduction import c,h,newton_coefficients,residual

def branch_value(order:int,e_value:int):
    n=sp.Integer(order);w=3*(n-1)/((n-3)*(n-4));x=4*w/(3*(1-w));d4=(2+x)/10
    c0=2*w/((n-1)*(n-2));c1=n*c0;c2=w;c3=sp.S.One;c4=1/x;c5=(1-d4)/x**2;x5=c4/c5;d5=(2+x5)/12;c6=(1-d5)*c5**2/c4;c7=(12*c6**2/c5-c6)/14;c8=(n-7)*c7/8;h6=c6;h7=sp.Rational(e_value,7)*(n-7)*c6
    raw=newton_coefficients(residual())[5]
    return sp.factor(raw.subs(dict(zip((*c[:9],h[6],h[7]),(c0,c1,c2,c3,c4,c5,c6,c7,c8,h6,h7))),simultaneous=True))

def q_relaxed_value():
    n=sp.Integer(44);w=3*(n-1)/((n-3)*(n-4));x=4*w/(3*(1-w));d4=(2+x)/10+(D4_CEILING-(2+x)/10)/2
    c0=2*w/((n-1)*(n-2));c1=n*c0;c2=w;c3=sp.S.One;c4=1/x;c5=(1-d4)/x**2;x5=c4/c5;q=sp.Rational(6,7);a=n-7;c6=c5*(7*a*q+3)/36;c7=a*q*c6/6;c8=a*c7/8;S=1-q;h6=S*c6;h7=sp.S.Zero
    raw=newton_coefficients(residual())[5];value=sp.factor(raw.subs(dict(zip((*c[:9],h[6],h[7]),(c0,c1,c2,c3,c4,c5,c6,c7,c8,h6,h7))),simultaneous=True));d5=sp.factor(1-(c6/c5)*x5)
    return value,d5,sp.factor((2+x5)/12),sp.factor(sp.Rational(1,6)+x5/2)

def main():
    a,q,S=sp.symbols("a q S",positive=True);H=sp.symbols("H",nonnegative=True)
    lower_cross=a*(S+q-1)/6;upper_capacity=a*S/7;upper_c7=a*q/6
    assert sp.factor(lower_cross.subs(S,1-q))==0
    assert sp.factor(upper_capacity.subs(S,7*q/6)-upper_c7)==0
    assert sp.factor(lower_cross-upper_capacity)==a*(7*q+S-7)/42
    # q<=6/7: lower pieces meet at 1-q, upper pieces meet at 7q/6.
    # q>=6/7: feasibility ends where cross lower meets capacity upper,
    # S=7(1-q); the c7 upper piece is absent.
    meeting_high=7*(1-q)
    assert sp.factor(lower_cross.subs(S,meeting_high)-upper_capacity.subs(S,meeting_high))==0
    assert sp.factor(upper_capacity.subs(S,meeting_high)-a*(1-q))==0
    # D6 endpoint relation after q=6c7/(a c6).
    r,k=sp.symbols("r k",positive=True)
    c7_ratio=(12*r-k)/14
    q_definition=sp.factor(6*c7_ratio/a)
    solved_r=sp.factor((7*a*q+3*k)/36)
    assert sp.factor(q_definition.subs(r,solved_r)-q)==0

    no_go_e0=branch_value(30,0);expected_e0=-sp.Rational(2213247516319965128407929840951425,29079431300748652716791808);assert no_go_e0==expected_e0
    no_go_e1=branch_value(46,1);expected_e1=-sp.Rational(106393762849746774973533652052385353,11607368956312500000000000);assert no_go_e1==expected_e1
    q_no_go,q_no_go_d5,q_d5_low,q_d5_high=q_relaxed_value();assert q_no_go==-sp.Rational(182906438864805695089369530613219744301872461903,646400379817590015228043961335808000);assert q_no_go_d5==-sp.Rational(190052,3653073);assert q_no_go_d5<q_d5_low<q_d5_high
    output=Path(__file__).with_name("rank8_q8_terminal_delta5_two_sided_capacity_exact_20260817.json")
    payload={"status":"PASS_EXACT_RANK8_TERMINAL_DELTA5_TWO_SIDED_CAPACITY_POLYGON","capacities":["7*h7<=(n-7)*h6","6*(c7-h7)<=(n-7)*(c6-h6)"],"normalization":"q=6*c7/((n-7)*c6), H=h7/c6, S=h6/c6","feasible_q":"0<=q<=1","D6_endpoint_substitution":"c6/c5=(7*(n-7)*q+3*k)/36, k in {1,7}","boundary_pieces":{"q_in_[0,6/7]":["lower zero: S in [0,1-q], H=0","lower cross: S in [1-q,1], H=(n-7)(S+q-1)/6","upper capacity: S in [0,7q/6], H=(n-7)S/7","upper c7: S in [7q/6,1], H=(n-7)q/6"],"q_in_[6/7,1]":["lower zero: S in [0,1-q], H=0","lower cross: S in [1-q,7(1-q)], H=(n-7)(S+q-1)/6","upper capacity: S in [0,7(1-q)], H=(n-7)S/7"]},"coverage_reason":"Delta5 is concave in h7. For every fixed feasible S its minimum is on the lower or upper h7 boundary; the seven listed parameterized pieces cover those boundaries exactly.","relaxed_cone_no_gos":[{"order":30,"old_branch":"E=0,k=1,S=1, upper w/x, lower D4/D5","value":str(no_go_e0),"reason_unrealizable":"h6=c6 and h7=0 force c7=0 by the complementary capacity"},{"order":46,"old_branch":"E=1,k=1,S=1, upper w/x, lower D4/D5","value":str(no_go_e1),"reason_unrealizable":"violates the complementary root capacity"},{"order":44,"new_branch":"q=6/7,k=1,lower-zero,S=1/7, upper w/x, midpoint D4","value":str(q_no_go),"implied_D5":str(q_no_go_d5),"required_D5_interval":[str(q_d5_low),str(q_d5_high)],"reason_unrealizable":"the independent q overrelaxation violates the D5 defect interval"}],"warning":"These are counterexamples to relaxed cones, not rooted-tree counterexamples. The remaining analytic problem is the exact q-D5 intersection."}
    output.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8");print(payload["status"]);print("script_sha256",hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper());print("report_sha256",hashlib.sha256(output.read_bytes()).hexdigest().upper())

if __name__=="__main__":main()
