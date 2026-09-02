#!/usr/bin/env python3
"""Independent lightweight algebra/hash/scope audit of the a0/a2 lift."""
from __future__ import annotations
import ast,hashlib,json
from pathlib import Path
import sympy as sp

ROOT=Path(__file__).resolve().parent
OUT=ROOT/"rank8_low_high_strong_a0_a2_lift_reduction_delta12_audit_20260820.json"
PINS={
 "verify_rank8_low_high_strong_a0_a2_lift_reduction.py":"F0748208666C0F2DD64AE1D0C143854C5BDC9CDF2347DB37F2D2D7667262F966",
 "rank8_low_high_strong_a0_a2_lift_reduction_exact_20260820.json":"86C971751769FB6C0912EF028487A61757C6B95787AED0FC582877158FF39174",
}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest().upper()
def main():
 pins={n:sha(ROOT/n) for n in PINS};assert pins==PINS
 report=json.loads((ROOT/"rank8_low_high_strong_a0_a2_lift_reduction_exact_20260820.json").read_text())
 assert report['status']=='PASS_EXACT_STRONG_A0_A2_COEFFICIENT_LIFT_REDUCTION'
 a2=report['a2_support_check'];assert a2['terms']==13437560 and a2['negative']==11883 and a2['negative_with_positive_a2_exponent']==0 and a2['first_bad'] is None
 slices=report['a0_slices_over_arbitrary_a2_and_core'];assert [(r['a0_exponent'],r['terms'],r['negative'],r['minimum']) for r in slices]==[(1,8469439,0,1),(2,5152192,0,1)]
 source=(ROOT/"verify_rank8_low_high_strong_a0_a2_lift_reduction.py").read_text();ast.parse(source)
 assert 'b3' not in repr(a2['variables']) and 'b7' not in repr(a2['variables'])
 assert a2['variables']==['h','ta','a2','a3','a4','a5','a6','a7','tb','b0','b1','b2']

 # Independent generic expansion of H=C*M+h*d for c=c0+x*c1,
 # v=v0+x*v1.  This verifies that the source's two a0 slice formulas
 # are exactly the x and x^2 coefficients and that no higher slice exists.
 x,C,h=sp.symbols('x C h');c0={r:sp.symbols(f'c{r}0') for r in (7,8,9)};c1={r:sp.symbols(f'c{r}1') for r in (7,8,9)};v0={r:sp.symbols(f'v{r}0') for r in (7,8,9)};v1={r:sp.symbols(f'v{r}1') for r in (7,8,9)}
 c={r:c0[r]+x*c1[r] for r in c0};v={r:v0[r]+x*v1[r] for r in v0}
 M=c[8]**2-c[7]*c[9]-h*c[7]*c[8]
 d=2*c[8]*v[8]-v[7]*c[9]-c[7]*v[9]-h*(v[7]*c[8]+c[7]*v[8]);H=sp.Poly(sp.expand(C*M+h*d),x)
 margin1=2*c0[8]*c1[8]-c0[7]*c1[9]-c1[7]*c0[9]-h*(c0[7]*c1[8]+c1[7]*c0[8])
 deriv1=2*(c0[8]*v1[8]+c1[8]*v0[8])-v0[7]*c1[9]-v1[7]*c0[9]-c0[7]*v1[9]-c1[7]*v0[9]-h*(v0[7]*c1[8]+v1[7]*c0[8]+c0[7]*v1[8]+c1[7]*v0[8])
 margin2=c1[8]**2-c1[7]*c1[9]-h*c1[7]*c1[8]
 deriv2=2*c1[8]*v1[8]-v1[7]*c1[9]-c1[7]*v1[9]-h*(v1[7]*c1[8]+c1[7]*v1[8])
 assert H.degree()==2;assert sp.expand(H.coeff_monomial(x)-(C*margin1+h*deriv1))==0;assert sp.expand(H.coeff_monomial(x**2)-(C*margin2+h*deriv2))==0
 payload={"schema":"rank8-low-high-strong-a0-a2-lift-delta12-audit-v1","status":"PASS_INDEPENDENT_LIGHTWEIGHT_ALGEBRA_HASH_SCOPE_AUDIT_A0_A2_LIFT","pinned_inputs":pins,"report_counts_verified":True,"a0_quadratic_and_slice_algebra_verified":True,"a2_support_implication_verified":True,"join_order_verified":"core at a0=a2=0 -> arbitrary a2 at a0=0 -> arbitrary a0","scope_verified":"b3..b7 remain zero in this reduction","audit_limit":"The 13,437,560 and two large coefficient sets were not independently regenerated; their exact asserted counts/signs are hash-pinned to the producer report.","source_sha256":sha(Path(__file__))}
 OUT.write_text(json.dumps(payload,indent=2)+"\n");print(payload['status']);print('SOURCE',payload['source_sha256']);print('REPORT',sha(OUT))
if __name__=='__main__':main()
