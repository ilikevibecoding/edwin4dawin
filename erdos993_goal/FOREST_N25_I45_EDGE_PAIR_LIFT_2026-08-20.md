# A global edge-pair lift for 25-vertex forests

Date: 2026-08-20

Status: **PROVED EXACT COEFFICIENT INEQUALITY.**  If `J` is a forest on 25
vertices and

```text
a=i4(J)<=8854,
```

then

```text
i5(J) >= 7a-35198.                                        (1)
```

This statement is independent of any ambient tree coefficient, containment
face, or continuous parameter.  In particular, it applies when the ambient
`c5` rises above `C(23,5)`.

## Proof

Put

```text
B4=C(25,4)-a,
```

the number of non-independent four-subsets.  One edge belongs to
`C(23,2)=253` four-subsets, so

```text
e(J) >= e0:=ceil(B4/253).                                  (2)
```

When `a<=8854`, `B4>=3796`, whereas `15*253=3795`; hence `e0>=16`.

The adjacent edge pairs number `sum_v C(deg(v),2)`.  Because
`C(d,2)>=d-1` for every positive `d`, a 25-vertex graph with `e` edges has
at least

```text
A0=max(0,2e-25)                                            (3)
```

adjacent pairs.  Thus `e>=16` gives `A0>=7`.

Each disjoint edge pair is contained in `21` five-subsets, while each
adjacent pair is contained in `C(22,2)=231`.  Equations (2)--(3) give at
least

```text
21*C(16,2)+(231-21)*7=3990                                (4)
```

incidences `(edge pair, containing five-subset)`.

An induced five-vertex forest has at most four edges and therefore at most
six edge pairs.  Hence at least

```text
ceil(3990/6)=665                                           (5)
```

five-subsets contain two or more edges.

Let `B5=C(25,5)-i5(J)`.  For a bad five-subset `S`, let `t(S)` be its number
of bad four-subsets.  Exactly one edge gives `t(S)=3`; at least two edges
give `t(S)>=4`.  Therefore (5) and the exact incidence double count give

```text
D:=sum_(bad S)(t(S)-3)
  =21B4-3B5
  >=665.
```

The middle expression is divisible by three, so `D>=666`.  Substitution
yields

```text
D=3(i5(J)-7a+35420),
```

and (1) follows.

## Full piecewise inequality

The verifier also packages the same argument without fixing `e0=16`.  For
every integer `0<=a<=C(25,4)`, define

```text
B4=C(25,4)-a,
e0=ceil(B4/253),
A0=max(0,2e0-25),
R0=ceil((21*C(e0,2)+210*A0)/6),
L0=ceil(R0/3).
```

Then every 25-vertex forest with `i4(J)=a` satisfies

```text
i5(J) >= 7a-35420+L0.                                     (6)
```

The JSON report records the 51 maximal integer intervals on which
`(e0,A0,R0,L0)` is constant.  The threshold `a=8854` has

```text
e0=16, A0=7, R0=665, L0=222,
```

whereas `a=8855` is the first row at which this particular uniform edge floor
drops to 15.  Thus the scope of (1) is exact for the stated `e0>=16`
mechanism; formula (6) continues beyond it with the appropriate piecewise
lift.

## Local audit and replay

The verifier independently enumerates all `2^10` labelled graphs on five
vertices and retains all 291 forests.  It confirms

```text
maximum edge pairs in an induced five-vertex forest = 6,
minimum t(S) with at least two edges                  = 4.
```

Run

```powershell
python .\verify_forest_n25_i45_edge_pair_lift.py
```

The expected marker is

```text
PASS_EXACT_FOREST_N25_I45_EDGE_PAIR_LIFT
```
