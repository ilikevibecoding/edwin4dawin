# Boundary-SM3 critical-last recurrence reduction

Date: 2026-08-13

Status: **EXACT ALL-ORDER DECOMPOSITION AND ONE-RANK REDUCTION; NOT AN
ALL-ORDER SIGN PROOF.**  Appending a critical branch last splits the full
aggregated tensor margin into two ordinary forest defects.  One is inside the
known SM3 induction range; the other is exactly one rank beyond it.  Exact
bounded audits find no negative critical-last payment.  The remaining
one-rank theorem is open, so this note does not prove Boundary-SM3 or Erdos
Problem 993 and no master route file is changed.

## 1. Critical-last setup

Use the notation of
`BOUNDARY_SM3_RECIPROCAL_TENSOR_COMPENSATION_2026-08-13.md`:

```text
P=product_i(E_i+Z_i),
J=(1+x)P+product_i E_i,
beta=sum_i alpha_i,
r=floor(2 beta/3),
a=beta-r=ceil(beta/3).
```

At least one branch is critical in the exceptional leaf setup.  Choose one
such branch and append it last.  Write its rooted deletion polynomials as

```text
C=I(F_i-s_i),       D=I(F_i-N[s_i]),
deg C=deg D=c,      alpha_i=c+1.
```

Put

```text
C^=x^c C(1/x),      D^=x^c D(1/x).
```

Criticality gives

```text
E_i=x C^,            Z_i=D^.                         (1)
```

Let `F_0` be the union of the other branches, and let `G_0` be the tree made
from those branches by adding their support `p` and the final induction leaf.
Then

```text
P_0=x^beta_0 I(F_0;1/x),
J_0=x^(beta_0+1) I(G_0;1/x).                         (2)
```

This retains the full aggregation over every other rooted branch; no labelled
channel is estimated separately.

## 2. THEOREM (critical-last two-forest identity)

Define the two forests

```text
Q_1=C disjoint_union G_0,
Q_2=D disjoint_union F_0 disjoint_union K_1.         (3)
```

Both have independence number `beta=beta_0+c+1`.  With
`D_k(Q)=3i_k(Q)-i_(k-1)(Q)`, the append-one-branch recurrence gives the exact
all-order identity

```text
3[x^a]J-[x^(a+1)]J
  =D_(r+1)(Q_1)+D_r(Q_2).                            (4)
```

### Proof

The recurrence and (1) give

```text
J=E_i J_0+(1+x)Z_i P_0
 =x C^ J_0+(1+x)D^ P_0.                             (5)
```

The first summand is

```text
x^(beta+1) I(C disjoint_union G_0;1/x)
 =x^(beta+1)I(Q_1;1/x),                              (6)
```

while the second is

```text
x^beta I(D disjoint_union F_0 disjoint_union K_1;1/x)
 =x^beta I(Q_2;1/x).                                 (7)
```

For a degree-`beta` polynomial `R`, reciprocity gives

```text
3[x^a]{x^beta R(1/x)}-[x^(a+1)]{x^beta R(1/x)}=D_r(R),
```

because `beta-a=r`.  With the extra factor `x` in (6), the same calculation
gives `D_(r+1)(Q_1)`.  Summing proves (4).

Since `r<=floor(2 alpha(Q_2)/3)`, the second term is already an ordinary SM3
prefix instance.  Thus the genuinely new obligation is only

```text
D_(floor(2 beta/3)+1)(Q_1)>=0                       (8)
```

for the special forests `Q_1=C disjoint_union G_0` produced by a critical
branch.  This is one rank beyond the usual SM3 prefix.

## 3. Exact changing-index table

Suppose the partial degree is `beta_0=3n+r_0` and the appended branch degree is
`alpha=3m+s`, with `r_0,s in {0,1,2}`.  If

```text
a_0=ceil(beta_0/3),       a=ceil((beta_0+alpha)/3),
```

then `a-a_0=m+eta_(r_0,s)`, where the exact residue table is

```text
             s=0  s=1  s=2
r_0=0          0    1    1
r_0=1          0    0    0
r_0=2          0    0    1.                         (9)
```

This is the complete index jump that any literal coefficient-cone induction
must track.  Formula (4) avoids transporting a whole cone through these jumps:
it converts the final critical append directly into two forest defects.

## 4. Sharp no-gos

### 4.1 Arbitrary-last termwise positivity is false

Take the order-seven tree with edges

```text
01, 03, 04, 05, 06, 12
```

and `p=1`.  Its branches have states

```text
(E,Z)=((1+x)^4,x^3),              alpha=4, noncritical,
(E,Z)=(x,1),                      alpha=1, critical.
```

Here `beta=5`, `a=2`, and the full margin is `30`.  If the noncritical branch
is appended last, however, the recurrence summands have exact margins

```text
L_2(EJ_0)=31,          L_2((1+x)ZP_0)=-1.            (10)
```

Thus arbitrary append order does not preserve two-payment positivity.  If the
critical singleton is appended last instead, the same total splits as

```text
D_3(Q_1)=11,           D_2(Q_2)=19.                 (11)
```

The critical-last order is structural, not cosmetic.

### 4.2 The one-rank overshoot is not universal

For the path `P_5`,

```text
I(P_5)=1+5x+6x^2+x^3,
alpha(P_5)=3,
D_3(P_5)=3-6=-3.                                    (12)
```

Hence (8) cannot be replaced by an unrestricted theorem for every forest.
The special critical-last construction and the residue restriction must be
used.  This also explains why a residue-blind induction invariant cannot
close the problem.

## 5. Exact bounded replay

Run

```text
python verify_boundary_sm3_critical_last_recurrence.py
```

It checks the identities above using integer convolution and reports

```text
unlabelled trees through order 14                         5,447
all vertex setups                                        72,145
eligible critical setups                                 26,994
critical-last choices                                    42,438
negative first payments                                       0
negative second payments                                      0

distinct rooted states through order 9                      482
critical rooted states                                      176
random products requested                                50,000
eligible random critical-last products                   33,350
negative first payments                                       0
negative second payments                                      0
```

The exhaustive minima are `0` for `D_(r+1)(Q_1)` and `3` for `D_r(Q_2)`.
The random-product minima are `5` and `3`.  The random choices are reproducible
from seed `993081321`.  These zero-failure counts are bounded evidence for
(8), not an all-order proof.

## 6. Exact remaining theorem

The tensor recurrence has therefore isolated the following sufficient
all-order statement:

> If `C,D` are the two root-deletion forests of a critical rooted tree branch,
> `G_0` is the final-leaf tree built from arbitrary other rooted branches, and
> `alpha(C disjoint_union G_0)=beta` with `beta mod 3 in {1,2}`, then
> `D_(floor(2beta/3)+1)(C disjoint_union G_0)>=0`.

Proving this special overshoot theorem would make both terms in (4)
nonnegative and settle Boundary-SM3.  It is not proved here.

## 7. Artifact hashes

```text
08309E5FCE396EC7F71603B5F063CB801AD0AE1CB9BEC86374D5E72C8DB2DB7F
  verify_boundary_sm3_critical_last_recurrence.py
1C9DB37A026C56859ADB665B634DBB6B214E4C519166265FD8922BFBE4EBAA18
  boundary_sm3_critical_last_recurrence_exact_20260813.json
```
