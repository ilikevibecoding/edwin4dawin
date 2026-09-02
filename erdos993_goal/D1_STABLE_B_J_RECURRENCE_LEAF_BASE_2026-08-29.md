# Stable-B canonical-J recurrence: exact leaf base

Date: 2026-08-29

## Scope

This is the exact `A=0,Y=1` base only.  It proves neither the `A/Y` lifts,
the `G` branch needed when `BK<0`, the nonstable band `B<=Y+1`, arbitrary
root degree, terminal `m=0`, nor Erdos Problem #993.

On this face `S=B+2`, `H=P_S`, and `Kmin=P_(S-1)`.  Let `J_S(j)` denote
the canonical conditional lower

```text
J_S(j)=(j+1)A0(S)(P_S[j-1]+P_S[j+1]+P_(S-1)[j])
       +BH(S,j)P_S[j],
```

where `BH` uses the legitimate smaller-forest input `q_j<=q3`.  The theorem
is

```text
RJ(S,j)=J_S(j)-J_(S-1)(j)-J_(S-2)(j-1) >= 0          (1)
```

for `S>=14`, `j>=4`.  Equivalently, the leaf row satisfies the stable path
recurrence coefficientwise from rank four onward.

For `w=S-2j>=-1`, divide (1) by the positive path coefficient `P_S[j]` and
write every adjacent row ratio explicitly.  The unbounded domain splits as

```text
j>=7,w>=0; j=6,w>=2; j=5,w>=4; j=4,w>=6; w=-1,j>=8.
```

After the indicated shifts, every numerator and denominator coefficient is
nonnegative and each denominator is positive at the cone origin.  The audit
contains 7 exact cones,
132 numerator coefficient
references, and minimum numerator coefficient
3.

The remaining supported faces are literal, not generalized-binomial:

```text
w=-2: (j-1)(2j-3)(24j^4-44j^3-28j^2+67j-36)/3,
w=-3: 2(j-2)(24j^4-92j^3+44j^2+105j-27)/3.
```

Their shifts `j=8+u` and `j=9+u` are coefficient-positive.  For `w<=-4`
all three terms in (1) vanish.  The independent literal replay checked
7169 cells through `S=120`; it guards the
formulas but is not the basis of the unbounded proof.
