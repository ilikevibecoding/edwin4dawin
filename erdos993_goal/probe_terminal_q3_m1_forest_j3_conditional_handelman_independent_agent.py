#!/usr/bin/env python3
"""Probe scalar Handelman multipliers for the two outside-crossing cases."""

from __future__ import annotations

from math import comb, prod

from flint import fmpq

from probe_terminal_q3_m1_forest_j3_tail_flint_independent_agent import build


def bernstein_target(poly, degrees):
    shape=tuple(n+1 for n in degrees); strides=tuple(prod(shape[j+1:]) for j in range(5))
    values=[fmpq(0)]*prod(shape)
    for powers,coefficient in poly.to_dict().items():
        assert all(a<=b for a,b in zip(powers,degrees))
        index=sum(a*b for a,b in zip(powers,strides))
        values[index]=coefficient/comb(degrees[0],powers[0])
    for axis in range(1,5):
        n=degrees[axis]; stride=strides[axis]; converted=[fmpq(0)]*len(values)
        weights=[[fmpq(comb(i,k),comb(n,k)) for k in range(i+1)] for i in range(n+1)]
        for outer in range(prod(shape[:axis])):
          base=outer*shape[axis]*stride
          for inner in range(stride):
            line=[values[base+k*stride+inner] for k in range(n+1)]
            for i in range(n+1):
              converted[base+i*stride+inner]=sum(
                  (weights[i][k]*line[k] for k in range(i+1)),fmpq(0))
        values=converted
    return values


def w_bernstein(poly):
    p0=poly.subs({"w":fmpq(0)}); p3=poly.subs({"w":fmpq(1)})
    der=poly.derivative(4)
    p1=p0+der.subs({"w":fmpq(0)})/3
    p2=p3-der.subs({"w":fmpq(1)})/3
    return (p0,p1,p2,p3)


def scalar_interval(P,J):
    degrees=tuple(max(a,b) for a,b in zip(P.degrees(),J.degrees()))
    pn=bernstein_target(P,degrees); jn=bernstein_target(J,degrees)
    low=fmpq(0); high=None; badzero=[]
    for index,(a,b) in enumerate(zip(pn,jn)):
        if b>0:
            bound=a/b
            high=bound if high is None or bound<high else high
        elif b<0:
            bound=a/b
            if bound>low: low=bound
        elif a<0:
            badzero.append((index,a))
    return degrees,low,high,badzero,len(pn),sum(a<0 for a in pn),sum(b<0 for b in jn)


def main():
    Pc,Pt,K,_Tden=build()
    Klo=K.subs({"w":fmpq(0)}); Khi=K.subs({"w":fmpq(1)})
    for label,branch,J in (("LEFT_COUPLED",Pc,-Klo),("RIGHT_TANGENT",Pt,Khi)):
      for index,coefficient in enumerate(w_bernstein(branch)):
        result=scalar_interval(coefficient,J)
        print(label,index,"degrees",result[0],"low",result[1],"high",result[2],
              "badzero_count",len(result[3]),"badzero_first",result[3][:2],
              "controls",result[4],"p_negative",result[5],"j_negative",result[6],
              "FEASIBLE",not result[3] and result[2] is not None and result[1]<=result[2],flush=True)


if __name__=="__main__": main()
