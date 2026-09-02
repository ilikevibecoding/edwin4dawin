#!/usr/bin/env python3
"""Inspect the sparse negative Bernstein controls on the high-chart beta0 face."""
from flint import fmpq_mpoly_ctx
import numpy as np
from probe_iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_flint_rank7_g5_finish import source_polynomial
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import compactify_one,split_simplex
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix

ctx=fmpq_mpoly_ctx.get(("x","y","z","w","u0","u1","u2","u3","u4","h"),"degrevlex")
source,_=source_polynomial(ctx,"high","B_le_C",0,0)
coefctx=fmpq_mpoly_ctx.get(("x","y","z","w","h"),"degrevlex")
_,betas,coeffs,_=split_simplex(source,coefctx,4,1)
assert betas[0]==(0,0,0,0,4)
target=fmpq_mpoly_ctx.get(("x","y","z","w","H"),"degrevlex")
mapped,dh,_=compactify_one(coeffs[0],target,4)
degrees,values,_=tensor_bernstein_from_flint_matrix(mapped,5)
bad=[]
for flat,v in enumerate(values.flat):
    if v<0:bad.append((tuple(map(int,np.unravel_index(flat,values.shape))),str(v)))
print("DEGREES",degrees,"DH",dh,"NEG",len(bad),"MIN",min(v for _,v in bad));print(*bad,sep="\n")
