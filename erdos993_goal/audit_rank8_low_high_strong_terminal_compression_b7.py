#!/usr/bin/env python3
"""Independent SymPy audit of direct-H b7 terminal compression."""

import hashlib,json,math
from pathlib import Path
import sympy as sp

ROOT=Path(__file__).resolve().parent
OUT=ROOT/"rank8_low_high_strong_terminal_compression_b7_independent_audit_20260820.json"
PINS={
 "verify_rank8_low_high_strong_terminal_compression_b7.py":"5986BF0E4391AE9D10217226C8BC045001D8D7B30B913DE0A00807FA86A54A0C",
 "rank8_low_high_strong_terminal_compression_b7_exact_20260820.json":"45E27C64871EE3412E464C80B5150C13A5D1D58DEAE209DB2FD949F38430CB3E",
}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest().upper()
def conv(a,b,r):return sum(math.comb(r,i)*a[i]*b[r-i] for i in range(r+1))
def main():
 pins={n:sha(ROOT/n) for n in PINS};assert pins==PINS
 theorem=json.loads((ROOT/"rank8_low_high_strong_terminal_compression_b7_exact_20260820.json").read_text())
 h,C,z,tb=sp.symbols('h C z tb',nonnegative=True);p=[sp.Integer(1),*sp.symbols('p1:10',nonnegative=True)];q=[sp.Integer(1),*sp.symbols('q1:9',nonnegative=True)];u=[0,0,0,*sp.symbols('u3:10',nonnegative=True)]
 qa=[*q,q[8]*tb];qs=[*q,q[8]*(tb+z)]
 ca={r:conv(p,qa,r) for r in (7,8,9)};cs={r:conv(p,qs,r) for r in (7,8,9)};va={r:conv(u,qa,r) for r in (7,8,9)};vs={r:conv(u,qs,r) for r in (7,8,9)}
 M=lambda c:c[8]**2-c[7]*c[9]-h*c[7]*c[8]
 d=lambda c,v:2*c[8]*v[8]-v[7]*c[9]-c[7]*v[9]-h*(v[7]*c[8]+c[7]*v[8])
 correction=z*q[8]*(C*ca[7]+h*va[7]);assert sp.expand((C*M(ca)+h*d(ca,va))-(C*M(cs)+h*d(cs,vs))-correction)==0
 assert sp.Poly(sp.expand(correction)).coeffs() and min(sp.Poly(sp.expand(correction)).coeffs())>0
 payload={"schema":"rank8-low-high-strong-terminal-compression-b7-audit-v1","status":"PASS_INDEPENDENT_AUDIT_STRONG_TERMINAL_COMPRESSION_B7","pinned_inputs":pins,"identity":theorem["identity"],"scope_warning":theorem["scope_warning"],"source_sha256":sha(Path(__file__))}
 OUT.write_text(json.dumps(payload,indent=2)+"\n");print(payload["status"]);print("SOURCE",payload["source_sha256"]);print("REPORT",sha(OUT))
if __name__=='__main__':main()
