# All-rank R=Y=1 boundary for d=1 terminal m=0

Date: 2026-08-29

## Scope

This theorem covers only `d=1,R=Y=1,N>=15` and every supported target rank
`j>=6`, conditional on the pinned smaller-forest induction inputs.  The
already frozen `d=1,j=4` and `d=1,j=5` theorems cover those two ranks.  This
does not cover `R>1`, the whole `d=1` sector, arbitrary root degree, all
terminal m=0, or Erdos Problem 993.

On this boundary the two exact rows are simply

```text
H=P_S,  K=P_(S-1).
```

The low-block caps are `u_H<=q3(P_S)` and
`u_I<=((j-1)q2(P_(S-1))+1)/j`.  Put `S=2j+w`.  For `w>=-1`, divide the
cancelled terminal lower by `P_S[j]>0` and use

```text
P_S[j-1]/P_S[j]=j(j+w+2)/((w+2)(w+3)),
P_S[j+1]/P_S[j]=w(w+1)/((j+w+1)(j+1)),
P_(S-1)[j]/P_S[j]=(w+1)/(j+w+1),
P_(S-1)[j-1]/P_S[j]=j/(w+2).                         (1)
```

After substituting the exact low-block constants, four disjoint cones cover
all supported `j>=6,S>=14`:

```text
j>=7,w>=0;  j=6,w>=2;  w=-1,j>=8;  w=-2,j>=8.
```

The last face has `P_S[j]=0` and is rebuilt literally before normalization:
`H_(j-1)=j`, `K_(j-1)=1`, and the other displayed rows vanish.  Every
cleared numerator and denominator coefficient in all four cones is
nonnegative, and each denominator has positive origin.  This is the
all-order sign proof.  The independent literal replay checks
3130 supported cells through `S=120`; it is a guard, not
finite extrapolation.
