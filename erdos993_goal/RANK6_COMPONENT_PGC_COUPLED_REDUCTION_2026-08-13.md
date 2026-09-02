# Rank-six component PGC coupled reduction

Date: 2026-08-13

Status: **EXACT REDUCTION AND COMPLETE ORDER-16 AUDIT; NOT AN ALL-ORDER
PROOF.**  Rank six is the first open PGC rank after the rank-five theorem.

## Exact identity

For a pendant edge put `P=I(G)`, `B=I(G-{l,p})`, and
`P=(1+x)B+xC`.  Define

```text
Q_6(P)=12p_6^2-p_5p_6-14p_5p_7,
V_6(B)=4b_4b_5+39b_4b_6-25b_5^2.
```

Direct algebra gives

```text
H_6(P)-H_5(B)
 =3Q_6(P)/p_5+9c_5+V_6(B)/b_4.                       (1)
```

Thus the exact all-order target is the coupled cleared inequality

```text
3b_4 Q_6(P)+9c_5p_5b_4+V_6(B)p_5>=0.                (2)
```

The split used successfully at rank five cannot simply be repeated:
`V_6` is negative for twelve exact forest rows through order 18.  The first
is

```text
B=(1,16,105,365,724,822,507,150,18,1),
V_6(B)=-195936.
```

This is the independence polynomial of a 16-vertex tree.  Therefore any
rank-six proof must retain payment from `Q_6(P)` and/or `c_5`; a standalone
`V_6>=0` lemma is false.

## Exact bounded evidence

The complete forest-polynomial pendant audit through total order 16 checks
198,037 required rank-six instances.  All satisfy (1), and the exact minimum
margin is

```text
4055799/3406.
```

In this bounded pendant range every actual reduced row has `V_6>=0`, although
the standalone forest census above shows that this will not persist at larger
orders.

Independently, `Q_6(F)>=0` holds in every distinct forest polynomial through
order 18 with `alpha(F)>=10` (347,429 rows); its minimum is `38808`.  This is
strong evidence for a missing rank-six forest reserve theorem, but the
current workspace only contains the all-tree theorem.  Neither finite scan
is an all-order proof.

## Remaining theorem

Prove (2) using the component-separated forest source

```text
B=product B_i,
C=product C_i,
C_i=I(F_i-s_i),
B_i=C_i+xI(F_i-N[s_i]).
```

Generic coefficient boxes are too weak: arbitrary `0<=c_j<=b_j` choices can
make (2) negative.  The live rank-six problem is therefore a genuinely
coupled forest-deletion inequality, not just a same-row reserve.
