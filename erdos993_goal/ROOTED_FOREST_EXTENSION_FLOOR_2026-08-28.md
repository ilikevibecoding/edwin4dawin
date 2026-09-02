# Rooted-forest independent-set extension floors

Date: 2026-08-28

Status: **proved for every finite rooted forest and every rank.**  This is an
all-order corollary of the prescribed-root incidence injection in
`RANK4_EDGE_LOCAL_COMPONENT_SURPLUS_THEOREM_2026-08-28.md`.

Let `F` be an `N`-vertex forest with `c` components and one distinguished
root in every component.  Put `H=F-roots`,

```text
f_j=i_j(F),    h_j=i_j(H).
```

Then, for every `j>=0`,

```text
(j+1)f_(j+1) >= max(0,c-j,N-3j) f_j,                (1)
```

and the following coupled strengthening also holds:

```text
(j+1)f_(j+1) >= (N-3j+2)f_j-2h_j.                  (2)
```

The right side of (2) is allowed to be negative.  Inequality (1) takes the
maximum of three independently valid lower bounds; it is not obtained by
discarding the `h_j` term in (2).

## Proof

For an independent `j`-set `S`, let `a(S)` be the number of vertices that
can be adjoined to `S`.  Double counting one-vertex extensions gives

```text
(j+1)f_(j+1)=sum_(S in I_j(F)) a(S),
a(S)=N-j-|N_F(S)|.                                  (3)
```

Because `F` has `N-c` edges, `|N_F(S)|<=N-c` pointwise.  Hence

```text
a(S)>=c-j,
```

which proves the `c-j` term in (1); nonnegativity gives the zero term.

Orient every component away from its distinguished root.  Over all
independent `j`-sets, let `U` count selected nonroots with multiplicity and
let `D` be the selected-degree sum.  The prescribed-root injection sends
every downward selected incidence injectively to an upward selected
incidence, and therefore

```text
D<=2U.                                               (4)
```

Also `|N_F(S)|<=sum_(v in S)deg_F(v)`.  Summing this inequality and using
`U<=j f_j` in (3)-(4) gives

```text
(j+1)f_(j+1)>=(N-j)f_j-D
              >=(N-j)f_j-2j f_j
              =(N-3j)f_j,                           (5)
```

which completes (1).

For (2), let `R` be the total number of selected roots over all independent
`j`-sets.  Then `U=jf_j-R`.  Every set counted by `f_j-h_j` contains at
least one root, so

```text
R>=f_j-h_j,
U<=(j-1)f_j+h_j.                                    (6)
```

Substituting (6) in (3)-(4) yields

```text
(j+1)f_(j+1)
 >=(N-j)f_j-2[(j-1)f_j+h_j]
 =(N-3j+2)f_j-2h_j,
```

as claimed.

## Role in the terminal payment

For `J=G disjoint_union t K1`, the high coefficient needed in the terminal
two-block payment is

```text
i_(j+1)(J)
 =sum_l C(t,l)f_(j+1-l)+sum_l C(t,l)h_(j-l).
```

Combining (1) with the ordinary lower-shadow double counts for the remaining
terms removes `f_(j+1)` from the all-order payment obligation.  This
corollary does **not** itself prove that payment, the `q_r<=q_3` envelope,
unimodality, or Erdos Problem 993.
