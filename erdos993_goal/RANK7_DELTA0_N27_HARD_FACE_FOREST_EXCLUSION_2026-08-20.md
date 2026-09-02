# Rank-seven `Delta0` order-27 hard-face forest exclusion

Date: 2026-08-20

Status: **PROVED EXACT EXCLUSION.**  On the order-27 leaf-root hard face,
put

```text
c5=C(23,5)=33649,
a=i4(J),
b=i5(J)=c5-a.
```

No literal 25-vertex forest `J` realises any integer row

```text
8610 <= a <= 8633.                                        (1)
```

This interval safely contains the complete negative containment-upper,
`q`-lower window.  Consequently no rooted tree/`J` placement realises that
hard face.

## Edge-pair incidence lift

Let `B4=C(25,4)-a` be the number of non-independent four-subsets.  Throughout
(1),

```text
4017 <= B4 <= 4040.
```

One edge belongs to `C(23,2)=253` four-subsets.  The union bound therefore
forces

```text
e(J) >= ceil(B4/253)=16.                                  (2)
```

The number of adjacent edge pairs is `sum_v C(deg(v),2)`.  Since
`C(d,2)>=d-1` for positive `d`, a 25-vertex graph with 16 edges has at least

```text
2*16-25=7                                                 (3)
```

adjacent edge pairs.  Every adjacent pair lies in `C(22,2)=231`
five-subsets; every disjoint pair lies in `21`.  Equations (2)--(3) imply at
least

```text
21*C(16,2)+(231-21)*7=3990                               (4)
```

incidences `(edge pair, containing five-subset)`.

An induced forest on five vertices has at most four edges and therefore at
most `C(4,2)=6` edge pairs.  Thus at least

```text
ceil(3990/6)=665                                           (5)
```

five-subsets contain two or more edges.

## Bad-four/bad-five double count

For a bad five-subset `S`, let `t(S)` be its number of bad four-subsets.  If
`S` contains exactly one edge then `t(S)=3`; if it contains at least two
distinct edges then `t(S)>=4`.  Put

```text
D=sum_(bad S)(t(S)-3).
```

Double counting a bad four-subset and its extending vertex gives

```text
D=21B4-3B5=3(b-b_generic),
b_generic=C(25,5)-7B4=7a-35420.                           (6)
```

By (5), `D>=665`.  Since the left side of (6) is divisible by three,
`D>=666`, and hence

```text
b >= b_generic+222 = 7a-35198.                            (7)
```

But containment gives `b=33649-a`.  The difference between the lower bound
in (7) and containment is

```text
8a-68847,
```

whose minimum on (1) is `33` at `a=8610`.  Every integer row in (1) is
therefore impossible.  The weakest improved lower bound is

```text
b>=25072                                                   (a=8610),
```

already above the corresponding containment value `25039`.

This is a literal forest exclusion, not a continuous-cone or sampled-tree
calculation.

## Replay

Run

```powershell
python .\verify_rank7_delta0_n27_hard_face_forest_exclusion.py
```

The expected marker is

```text
PASS_EXACT_RANK7_DELTA0_N27_HARD_FACE_FOREST_EXCLUSION
```
