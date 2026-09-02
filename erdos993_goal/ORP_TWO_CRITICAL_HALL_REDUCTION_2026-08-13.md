# ORP two-critical-root Hall reduction

Date: 2026-08-13

Status: **SHARPEST RIGOROUS REDUCTION; NOT AN ALL-ORDER PROOF.**  The identities
and equivalences labelled THEOREM below are exact.  The order bounds labelled
BOUNDED EVIDENCE are finite computations.  Neither ORP, the two-critical
coefficient payment, nor the connected Hall theorem is proved at all orders.
This note does not prove Boundary-SM3 or Erdos Problem #993.

## 1. THEOREM (critical-count identity)

Let `T` be a tree (the same argument works componentwise for a forest), let
`p` satisfy

```text
F=T-p,              H=T-N[p],              alpha(T)=alpha(F)=beta,
r=floor(2 beta/3).
```

Write the components of `F` as `F_i`, rooted at the corresponding neighbors
`s_i` of `p`, and put

```text
C_i=F_i-s_i,        D_i=F_i-N_Fi[s_i],
c_i=alpha(C_i),     d_i=alpha(D_i).
```

Call branch `i` **critical** when `d_i=c_i`, and let `t` be the number of
critical branches.  Since `D_i` is induced in `C_i`, `d_i<=c_i`, while

```text
alpha(F_i)=max(c_i,1+d_i).
```

Consequently each critical branch contributes exactly one, and each
noncritical branch contributes zero, to `alpha(F_i)-alpha(C_i)`.  Therefore

```text
                 beta-alpha(H)=t.                         (1)
```

This proves the critical-count identity at every order; it does not prove the
observed lower bounds on `t` under the negative-row hypothesis.

## 2. THEOREM (root-channel formula)

Let

```text
H(x)=product_i I(C_i;x),
mu_i=[x^(r-1)] I(D_i;x) product_(j!=i) I(C_j;x).
```

Equivalently, `mu_i` counts the sets `A in I_(r-1)(H)` that avoid every
neighbor of `s_i`, hence can receive `s_i` by ordinary inclusion.  For a set
`Q` of roots, define the disjoint rank-`r` codomain

```text
R_Q = I_r(H)
      disjoint_union
      union_(i in Q) { {s_i} union A :
                       A in I_(r-1)(H-N_H(s_i)) }.
```

The root label makes the displayed channels disjoint, so exactly

```text
                   |R_Q|=h_r+sum_(i in Q) mu_i.            (2)
```

In particular, if `i,j` are the two critical branches with largest `mu`, the
finite two-branch observation is precisely the whole-domain cardinality
condition

```text
                   |R_{i,j}| >= |I_(r-1)(H)|.              (3)
```

Thus the two-critical coefficient theorem (3) would prove ORP immediately.

## 3. THEOREM (exact proper-subfamily Hall remainder)

Put `L=I_(r-1)(H)`.  Join `A in L` to `B in R_Q` when `F[A triangle B]` is
connected.  Connectivity forces every root-channel move to be local: for a
right set containing `s_i`, the two sets agree outside `F_i`, and their
symmetric difference inside `F_i` is a connected alternating tree containing
`s_i`.  The root channels for distinct `i` remain disjoint.

For `X subseteq L`, write `N_0(X)` for its neighbors in `I_r(H)` and `N_i(X)`
for its neighbors in root channel `i`.  Hall's theorem now gives the exact
two-root target

```text
 |N_0(X)|+|N_i(X)|+|N_j(X)| >= |X|    for every X subseteq L.  (4)
```

Equation (3) is only the `X=L` cardinality test; it does not imply (4).  After
the scalar two-payment is established, the genuinely missing matching step is
therefore the **proper-subfamily Hall remainder** in (4).  This separates the
coefficient ORP target from the strictly stronger simultaneous matching
target; they are not logically equivalent.

## 4. BOUNDED EVIDENCE (new connected-Hall replay)

Run

```text
python probe_orp_two_critical_hall.py --max-order 13 \
  --output orp_two_critical_hall_n13.json
```

The replay enumerates all 2,286 unlabeled trees through order 13, all 14,639
noncore vertex setups, and all 1,485 negative-row setups in the exceptional
congruence classes `beta mod 3 in {1,2}`.  It chooses only the two critical
roots with largest rank-`r` contribution, discards all other marked-root
channels, and computes a maximum connected-exchange matching.  Results:

```text
critical-count threshold failures             0
two-critical coefficient-payment failures     0
two-critical connected-Hall failures           0
one-critical coefficient-payment failures      7
```

This strictly sharpens the earlier order-12 one-root Hall replay because the
codomain now excludes every noncritical root and all but two critical roots.
It is exact bounded evidence, not a proof of (3) or (4).

The separate pre-existing coefficient audit through order 16 reports the
following conditional critical-count distribution:

```text
beta=1 mod 3: t=3:5618, t=4:4291, t=5:1305, t=6:45;
beta=2 mod 3: t=2: 388, t=3:6005, t=4:3058, t=5:1482, t=6:2.
```

It also reports zero failures when `h_r` is supplemented by the two largest
critical-branch contributions.  Those statements remain BOUNDED EVIDENCE.

## 5. NO-GO (one critical branch is genuinely insufficient)

The new replay gives a sharp exceptional-congruence witness at order 13:

```text
n=13, tree_index=52, p=0, beta=8, r=5,
h_4=46, h_5=12, critical contributions=(33,33).
```

Hence `3h_5=36<46`, but one critical root pays only `12+33=45<46`; both roots
pay `78`.  The edge list is stored in `first_one_critical_nogo` in the JSON
report.  Therefore a one-critical-root coefficient theorem is false even in
the exact ORP regime.  Two critical branches are not merely an artifact of a
loose proof.

## 6. Remaining all-order obligations

The critical identity (1) reduces the route to two sign-sensitive statements:

1. **OPEN SIGN/COUNT LEMMA.** Under `3h_r<h_(r-1)`, prove `t>=3` when
   `beta=1 mod 3`, and `t>=2` when `beta=2 mod 3`.  These bounds are what the
   still-unproved SM3+ control for `H` would supply; (1) alone does not supply
   them.
2. **OPEN TWO-CRITICAL PAYMENT.** For the two critical indices with largest
   `mu`, prove (3).  This alone closes coefficient ORP.
3. **OPEN PROPER-SUBFAMILY HALL REMAINDER.** To obtain the stronger connected
   alternating-tree injection, prove (4).  The whole-set payment (3) cannot be
   substituted for this Hall condition.

This is the sharpest rigorous reduction reached here.  No master file was
edited because none of the three open obligations was closed.

## 7. Replay hashes

Computed after finalization with SHA-256; the note hash is intentionally not
self-listed.

```text
559F399D377CB3C5D25958D5E3E2CFEEFC2E31891EE30C09CB01BFC5DE1A4CC4
  probe_orp_two_critical_hall.py
478CEC8037B9E9D7E11CA140BC93B50227D88AA2C161E2847AE23D94B8CF74E8
  orp_two_critical_hall_n13.json
```
