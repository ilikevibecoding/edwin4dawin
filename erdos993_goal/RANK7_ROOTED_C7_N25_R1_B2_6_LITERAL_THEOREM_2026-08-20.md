# Exact rooted-`C7` theorem for the smallest order-25 literal profile

Date: 2026-08-20

Status: **PROVED EXACTLY FOR THE COMPLETE NAMED LITERAL PROFILE FAMILY.**

## Theorem

Let `T` be a tree on 25 vertices rooted at a leaf `p`.  Suppose its positive
excess partition and root-neighbour excess are

```text
(deg(v)-1 : deg(v)>1) = (2^6,1^11),
deg(u)-1=1 for the unique u in N(p).
```

Equivalently, `r=1`, `B2=6`, and the root support has excess one.  Then the
rank-seven rooted cross is strictly positive:

```text
C7(T,p)>0.
```

This closes the smallest formal survivor of the earlier literal-neighbour
relaxation.  It is not a full order-25 census or a universal rooted-`C7`
theorem.

## Exact placement/component reduction

The excess partition forces the degree sequence

```text
3^6, 2^11, 1^8.
```

Suppress all eleven degree-two vertices.  The result is a tree with six
degree-three vertices, eight leaves, and thirteen edges.  Its six
degree-three vertices induce a free tree `U` on six vertices with maximum
degree at most three.  Conversely, attach `3-deg_U(v)` leaves at each vertex
of any such `U`; this reconstructs every possible cubic skeleton exactly.

There are six free trees on six vertices and exactly four have maximum degree
at most three:

```text
P6,
the (3,3,1,1,1,1) double star,
the three-arm shape with arm lengths (3,1,1),
the three-arm shape with arm lengths (2,2,1).
```

A skeleton leaf is determined up to symmetry by the orbit of its incident
internal vertex.  These four shapes have respectively

```text
3, 1, 4, 3
```

eligible rooted-leaf orbits, for eleven total.

The root support has degree two exactly when the root's pendant skeleton edge
contains at least one subdivision.  If that mandatory subdivision is removed
from the count, the remaining ten subdivisions form a weak composition over
thirteen edges.  Therefore every rooted orbit has exactly

```text
C(10+13-1,13-1)=C(22,12)=646,646
```

raw placements.  The complete exact outer enumeration has

```text
11*646,646=7,113,106
```

placements.  Automorphic duplicates are harmless: every literal rooted tree
occurs, and every enumerated placement is itself a literal tree in the named
profile.

## Exact coefficient evaluation

For each placement, put

```text
H=T-p,
G=T-{p,u},
h_k=i_k(H),
g_k=i_k(G),
c_k=i_k(T).
```

Because the root is a leaf with support `u`, deletion at `p` gives

```text
c_k=h_k+g_(k-1).
```

A tree dynamic program computes all coefficients through rank seven using
unsigned integer convolution.  The rooted cross is then evaluated with
signed 128-bit intermediate arithmetic:

```text
C7(T,p)
 = c5(c6^2-c5*c7)-2c6(c6*h5-c5*h6).
```

No floating-point arithmetic or scalar relaxation is used.

## Exhaustive result

```text
rooted skeleton orbits       11
placements per orbit    646,646
total placements       7,113,106
strictly positive      7,113,106
zero                           0
negative                       0
```

The exact minimum is

```text
min C7(T,p)=6,714,591,315,160.
```

It occurs in the rooted double-star skeleton row.  The stored minimum witness
has

```text
h5=16,333, h6=30,683, h7=41,164,
g4=4,948,  g5=12,376, g6=21,565,
c5=21,281, c6=43,059, c7=62,729.
```

## Independent audit

The independent verifier does not trust the skeleton manifest.  It

1. regenerates all six free trees on six vertices;
2. proves exactly four have maximum degree at most three;
3. checks the four manifest graphs are a complete isomorphism transversal;
4. computes the eligible marked-vertex orbits and obtains `3+1+4+3=11`;
5. reconstructs the reported minimum 25-vertex tree;
6. verifies its degree sequence, `B2=6`, root degree, and support excess; and
7. recomputes `c5,c6,c7,h5,h6,h7,g4,g5,g6` by direct independent-subset
   enumeration, recovering the same rooted cross exactly.

The compiled enumerator was also run twice after the final source change; its
report and ordered-result checksum were identical.

## Immutable hashes

```text
enumerate_rank7_rooted_c7_n25_r1_b2_6_literal.cpp
EE59B3CBD71D66E24F9BECADFC5F815ABEF55736B508DEF2FB5611A732D74C67

enumerate_rank7_rooted_c7_n25_r1_b2_6_literal.exe
0320065288937A2E2EE55D3A53A34F107B0E7AC4485F2B5C7E04547CF9794C40

rank7_rooted_c7_n25_r1_b2_6_literal_exact_20260820.json
4E3E5DB8B9EB3FC1A055E12B297AEB0FAB80D2FB0652948DB5C6ED7367ED79EA

audit_rank7_rooted_c7_n25_r1_b2_6_literal.py
429CEEFF85536869E382FD6F5800AAEC1D2C8B422E8E8E83769523B7AC2346C6

rank7_rooted_c7_n25_r1_b2_6_literal_independent_audit_exact_20260820.json
677617A7EFA0307C0615C76FD750B3879E692FD166680C0124E98A11272C17D2
```

The enumerator marker is

```text
PASS_EXACT_LITERAL_PROFILE_C7_POSITIVE
```

and the independent audit marker is

```text
PASS_INDEPENDENT_EXACT_LITERAL_PROFILE_AUDIT
```
