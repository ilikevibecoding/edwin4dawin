#!/usr/bin/env python3
"""Numerical scouting only for the pure-cubic B2=5 joint endpoint cone."""
import argparse
from math import comb
from scipy.optimize import differential_evolution
from probe_rank7_joint_branching_domain import expression,evaluate

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--rank",type=int,required=True);args=ap.parse_args()
    n=23;B2=5;fn=expression(args.rank)
    for r in (1,2,3):
        lo=max(4,comb(r-1,2));hi=comb(r-1,2)+comb(n-r-1,2);bf=(B2-lo)/(hi-lo)
        worst=(1e100,None)
        for p in range(5):
            for q in range(8):
                c4=comb(n-3,4)+5*n-32+p-q
                c3=comb(n-2,3)+B2;c2=comb(n-1,2);w=c2/c3
                xlo=8*w/(6-w);xhi=4*w/(3*(1-w));X=(c3/c4-xlo)/(xhi-xlo)
                if not 0<=X<=1:continue
                for endpoint in (0,1):
                    result=differential_evolution(
                        lambda u:evaluate(fn,n,r,endpoint,[bf,X,*u]),
                        [(0,1)]*4,maxiter=120,popsize=7,tol=1e-6,
                        seed=993+args.rank*1000+r*100+p*10+q+endpoint,polish=True)
                    if result.fun<worst[0]:worst=(result.fun,(p,q,endpoint,result.x.tolist(),c4))
        print("rank",args.rank,"r",r,"worst",worst,flush=True)
if __name__=="__main__":main()
