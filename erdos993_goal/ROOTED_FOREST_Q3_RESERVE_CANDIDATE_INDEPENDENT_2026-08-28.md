# Rooted-forest reserve candidate for the terminal-support recurrence

Date: 2026-08-28

Status: **exact finite evidence and an exact conditional reduction; the
all-order reserve inequality is not yet proved.**

## Candidate

Let `F` be a forest with one distinguished root in every component and let
`H` be obtained by deleting those roots.  Write

```text
f_j=i_j(F),  h_j=i_j(H),  z=s_2(F),
rho_j=h_j/f_j,  q_2(F)=z/(2f_2).
```

The candidate is

```text
2(j+1)h_2 f_j+(j-2)(2f_2-z)f_j >= 6h_j f_2,       j>=3,       (R)
```

or, when the displayed denominators are positive,

```text
3 rho_j <= (j+1)rho_2+(j-2)(1-q_2(F)).                         (R')
```

The term `2f_2-z` is the coefficient of rank one in `I'_F-C_F`; it is a
component reserve.  It cannot simply be dropped.

## Exact role in the terminal-support induction

For a terminal-support extension, put `F=G-w` and `H=G-N[w]`.  The ratio of
the `v`-included block at rank `j+1` is

```text
b_(j+1)=[s_j(F)+h_j+t f_j]/[(j+1)f_j].
```

Its rank-three anchor is

```text
b_3=[s_2(F)+h_2+t f_2]/(3f_2).
```

Assume, conditionally, that the smaller forest already satisfies
`q_j(F)<=q_2(F)`.  Then

```text
(j+1)f_j s_2-3f_2 s_j
 >= -(j-2)q_2(F) f_2 f_j.
```

The `t` term supplies `(j-2)t f_2 f_j`.  Since `t>=1`, inequality `(R)`
therefore gives

```text
b_(j+1) <= b_3.
```

Thus `(R)` would prove the included block's entire `q_3` envelope under the
smaller-forest induction hypothesis.  It does **not** by itself prove the
two-block payment or the complete terminal-extension preservation lemma.

## Fail-closed guard

The tempting root-shadow inequality

```text
(j+1)h_2 f_j >= 3h_j f_2
```

is false.  The smallest exact census witness is the augmented tree graph6
`EsOG`, rooted at vertex `2`, with `j=3`:

```text
f_2=6, h_2=4, f_3=1, h_3=1,
4h_2 f_3-3h_3 f_2=-2.
```

Here `z=6`, so the component reserve repairs the deficit and leaves exact
margin `2` in `(R)`.

## Exact finite evidence

`probe_rooted_forest_q3_reserve_independent_agent.py` independently enumerates
all 5,446 unlabeled augmented trees through order 14 and every choice of the
augmenting vertex.  Equivalently, this covers every rooted forest through
order 13 (with one distinguished root in each component), with repetitions
from automorphisms harmless.

It checked 72,144 rooted-forest cells and 424,204 rank inequalities.  There
were no failures and no zero margins.  The minimum absolute and normalized
margin is the `EsOG` witness above: `38-36=2`, or right/left ratio `19/18`.

Separately, 135,385 exact checks on deterministic uniform and hub-biased
random trees through order 140 found no failure; this is supplementary search
evidence and is not part of the frozen exhaustive report.

## Nearby sharp payment family

For the separate included-only mixture payment, take the base tree to be a
`d`-leaf star rooted at its center, attach a support and one leaf, and compare
the rank-four target with the rank-three anchor.  Direct binomial algebra gives

```text
payment_left/adverse = (d+4)/(d+1),
payment_left-adverse = d^4(d-2)(d-1)^4(d+1)/16.
```

Thus that payment is nonnegative on this family but asymptotically sharp.
This does not prove the payment for a general rooted forest.

## Scope

The exhaustive pass is not an all-order proof of `(R)`.  No claim is made
here about complete terminal-support preservation, the all-tree higher-rank
envelope, the averaged surplus beyond already audited ranks, or Erdos Problem
993.
