#!/usr/bin/env python3
"""Test fixed-order ratio bridges for the corrected endpoint cones."""
import sympy as sp
from probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent import ratio_parameterization
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import tensor_bernstein_sparse,shift_and_simplex_homogenize
from prove_iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_g1_nonadjacent import lowered_rows

def main():
    x,core,rows,_=lowered_rows();N,A,B,Q=core;dummy=sp.symbols("fixed_order_dummy",nonnegative=True)
    total=0;minimum=None
    for order in range(13,26):
      for sector in ("high","low"):
       cubes0,z,sub,cone,rho=ratio_parameterization(sector,N,A,B,x,5);cubes=(A,B,Q,*cubes0[2:])
       for i,row in enumerate(rows):
        num,den=sp.fraction(sp.together(row.subs(sub).subs(N,order)))
        poly=sp.Poly(num,dummy,*cubes,*z);deg,br=tensor_bernstein_sparse(poly,len(cubes))
        try:
         hom,count,local=shift_and_simplex_homogenize(br,len(z))
        except AssertionError:
         print("FAIL",order,sector,i,flush=True);break
        total+=count;minimum=local if minimum is None else min(minimum,local)
       else:
        print("FIXED",order,sector,total,minimum,flush=True)
    print("PASS",total,minimum)

if __name__=="__main__":main()
