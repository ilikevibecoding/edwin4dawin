# Residual-forest moment identity for the all-rank pendant cascade

## Status

The identities in this note are exact and all-rank.  They do **not** prove
the Alavi--Malde--Schwenk--Erdos conjecture: the final coupled moment
inequality below remains open.  Their value is that the separate `Q_k` and
`V_k` formulas are both shadows of one residual-forest statistic.

## 1. Residual law

Let `G` be a forest, let `i_j` be the number of independent `j`-sets, and
choose `S` uniformly from the independent `j`-sets.  Write

```text
R_S = G-N[S],
X   = |V(R_S)|,
C   = number of nonempty components of R_S,
mu_j=(j+1)i_(j+1)/i_j=E[X],
D_j = Var(X)+2E[C].
```

The number of ordered pairs of distinct, mutually compatible extension
vertices is `X(X-1)-2|E(R_S)|`.  Double counting an independent `(j+2)`-set
with an ordered pair of its deleted vertices gives

```text
E[X(X-1)-2|E(R_S)|] = mu_j mu_(j+1).             (1)
```

Because `R_S` is a forest, `|E(R_S)|=X-C`.  Expanding (1) therefore proves

```text
mu_j-mu_(j+1) = 3-D_j/mu_j.                      (2)
```

No probabilistic approximation is involved.

## 2. Exact moment forms of `Q_k` and `H_k`

For a coefficient row `p` put

```text
Q_k(p)=2k p_k^2-p_(k-1)p_k-2(k+1)p_(k-1)p_(k+1),

H_k(p)=k^2(p_k^2-p_(k-1)p_(k+1))/p_(k-1)
       +k(p_k-p_(k+1)).
```

Apply the residual law at `j=k-1`, and abbreviate `mu=mu_(k-1)` and
`D=D_(k-1)`.  Direct substitution of (2) gives

```text
Q_k(p)/(p_(k-1)p_k) = 5-2D/mu,                  (3)

H_k(p) = p_(k-1)(4mu-D).                        (4)
```

Consequently the rank-`k` three-halves reserve has the exact criterion

```text
Q_k(p)>=0  iff  Var(X)+2E[C] <= (5/2)E[X].       (5)
```

This explains why variance-only or component-only estimates repeatedly lose
the sharp constant: the invariant is their fixed sum.

## 3. Exact all-rank PGC target

For a pendant edge `lp`, write

```text
P=I(G)=(1+x)B+xC_0,
B=I(G-{l,p}).
```

Let `(mu_P,D_P)` be the residual statistics for a uniform independent
`(k-1)`-set of `G`, and `(mu_B,D_B)` those for a uniform independent
`(k-2)`-set of `G-{l,p}`.  Formula (4) makes the prefix pendant cascade

```text
H_k(P)>=H_(k-1)(B)
```

equivalent to the single coupled inequality

```text
p_(k-1)(4mu_P-D_P)
  >= b_(k-2)(4mu_B-D_B).                         (6)
```

Thus it is not necessary, in principle, to prove `Q_k>=0` and `V_k>=0`
separately.  A switching or martingale argument that compares the two
literal residual laws in (6) would close every rank at once.  Conversely,
(5) states exactly what the current rank-seven `Q_7` cone certificates are
proving.

## 4. The pendant leaf is an exact mixture component

The coupling in (6) has a sharper form.  Partition the independent
`(k-1)`-sets of `G` into

```text
A = sets containing the pendant leaf l,
Z = sets not containing l.
```

Put `a=|A|=b_(k-2)`, `z=|Z|`, and let `(mu_A,D_A)` and `(mu_Z,D_Z)` be their
residual statistics in `G`.  Deleting `l` and its selected neighbor `p`
identifies the `A` residual law exactly with the uniform independent
`(k-2)`-set residual law in `G-{l,p}`.  Hence

```text
a(4mu_A-D_A)=H_(k-1)(B).                          (7)
```

Variance decomposition for the two-class mixture gives

```text
H_k(P)-H_(k-1)(B)
 = z(4mu_Z-D_Z)
   - az/(a+z)(mu_A-mu_Z)^2.                       (8)
```

Thus PGC is exactly the statement that the non-leaf class pays the
between-class mean separation:

```text
z(4mu_Z-D_Z) >= az/(a+z)(mu_A-mu_Z)^2.            (9)
```

Unlike separate `Q_k` and `V_k` bounds, (9) retains the literal pendant
coupling.  It is still an open inequality, and it is algebraically
equivalent to the earlier exact leaf-mixture PGC formulation rather than a
strictly weaker target.  In particular, the known Galvin local-payment
counterexample forbids discarding the same-rank reserve inside the first
term of (9).  The gain here is the common `Var(X)+2E[C]` normalization and
the explicit variance cost, not a completed sign argument.

## 5. Replay

Run

```powershell
python .\verify_general_pgc_residual_moment_identity.py
```

The replay proves (3)--(4) and (8) symbolically and checks (1)--(8) by exact
rational enumeration over every forest in the NetworkX graph atlas and every
pendant setup there.  Its terminal
marker is

```text
PASS_EXACT_GENERAL_PGC_RESIDUAL_MOMENT_IDENTITY
```
