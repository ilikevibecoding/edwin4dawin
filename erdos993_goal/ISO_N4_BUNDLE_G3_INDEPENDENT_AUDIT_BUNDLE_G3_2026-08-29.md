# Independent audit of the rank-four bundle coefficient `g3`

Date: 2026-08-29

Status: **PASS — exact independent audit of the genuine-forest proof.**

This note audits `derive_iso_n4_bundle_g3_invariants_root.py`.  It does not
claim positivity of the remaining binomial coefficients `g1` or `g2`, a full
bundle-payment theorem, forest ISO, or Erdős Problem #993.

## Audited theorem

Let `B` be a forest with distinct marked vertices `u,v` and an unmarked
support vertex `s`.  Put

```text
G = B-s,                 S = N_B(s),
D = G-S,                 n = |G|, q = |D|.
```

For the rank-four whole-sibling-bundle payment

```text
Gamma_M = N4((1+x)^M C+xD)-N4(C+xD)
          -sum_(t=0)^(M-1) N3((1+x)^t C),
```

the coefficient `g3=[binom(M,3)] Gamma_M` is strictly positive in every
genuine forest cell.

## Independent algebraic derivation

The audit does not import the target proof.  It implements the defining
nine-line nested form and computes

```text
g3 = Gamma_3 - 3 Gamma_2 + 3 Gamma_1 - Gamma_0
```

directly.  It then independently substitutes the order, edge, and wedge
formulas for the four minors of `G` and the independent-pair formulas for the
four minors of `D`.

The most delicate substitution is the wedge count after both marks are
deleted.  With

```text
W  = sum_x binom(deg_G(x),2),
su = sum_(x in N_G(u)) (deg_G(x)-1),
sv = sum_(x in N_G(v)) (deg_G(x)-1),
a  = 1_(uv is an edge),
h  = |N_G(u) intersect N_G(v)|,
```

the exact formulas are

```text
W(G-u)     = W-binom(du,2)-su,
W(G-v)     = W-binom(dv,2)-sv,
W(G-u-v)   = W-binom(du,2)-binom(dv,2)-su-sv
             +a(du+dv-2)+h.
```

The `+h` term repairs the double subtraction at a common neighbour, while
`+a(du+dv-2)` repairs the two removed marked centres when `uv` is an edge.
The audit symbolically recovers exactly the target's Boolean-reduced `g3`.

For `D=G-S`, `S` is an independent transversal of the components of `G`.
Thus, if `R=sum_(x in S)deg_G(x)`, then `e(D)=e(G)-R`.  If `epsilon_u`
records survival of `u` and `hit_u=|N_G(u) intersect S|` (similarly for
`v`), the audit also independently verifies all four exact `D` pair-count
formulas, including the `-epsilon_u epsilon_v a` correction after deleting
both surviving marks.

## Lower-bound audit

After writing `deleted_count=n-q`, the target grouping is exact.  Every bound
used in the proof was checked:

1. `S` meets each component of `G` at most once, so it is independent,
   `R>=0`, and each surviving mark has `hit<=1`.
2. For a forest with distinct marks,
   `du+dv<=n`, `e<=n-1`, `h<=1`, and
   `W<=binom(e,2)`.
3. The base part has the exact completion of the square

   ```text
   base - (74n^2/3-4n-11/4) = (6 deleted_count-4n-9)^2/12.
   ```

4. The degree part has the exact nonnegative residual

   ```text
   degree - (-12n^2+16n)
     = 3(du-dv)^2+(n-du-dv)(12n-3du-3dv-16).
   ```

   Here the second factor is at least `9n-16>=2` because `n>=2`.
5. Using `W<=binom(e,2)`, the edge/wedge part is bounded below by

   ```text
   F(e)=e(10n-57/2-15e/2).
   ```

   It is nonnegative for `n>=9`.  For `2<=n<=8`,

   ```text
   F(e)-F(n-1)=(n-1-e)(15e-5n+42)/2 >= 0.
   ```

6. The Boolean epsilon terms are at least `-12n-21`; the common-neighbour
   term is at least `-5`; the adjacency part and the remaining displayed
   terms are nonnegative.

Consequently,

```text
g3 >= 38n^2/3-115/4                                  for n>=9,
g3 >= 71/12+(n-2)(91n+41)/6 > 0                     for 2<=n<=8.
```

The second lower bound is minimized at `n=2`, where it is `71/12`.

## Exact genuine-forest replay

The audit separately evaluates the independence polynomials and the defining
`Gamma_0,...,Gamma_3` on:

- every nonisomorphic tree of base order `3,...,10` (199 source graphs), and
- every atlas forest of base order `3,...,7` (76 source graphs),
- every unordered marked pair and every support outside that pair.

Results:

```text
genuine marked-support cells                    60,966
direct g3 = invariant g3 matches                60,966
wedge/minor formula matches                    243,864
D independent-pair formula matches            243,864
negative or zero g3 cells                            0
minimum observed g3                                 69
```

The observed minimum occurs for graph6 `BG`, marks `[1,2]`, support `0`,
with `Gamma_0,...,Gamma_3=[0,4,30,147]`.  This finite minimum is replay
evidence only; the universal conclusion comes from the symbolic bounds above.

## Replay, marker, and integrity

```text
python audit_iso_n4_bundle_g3_independent_bundle_g3.py
```

Success marker:

```text
PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G3_FOREST_PROOF_AUDIT_BUNDLE_G3
```

SHA-256 (on-disk bytes):

```text
derive_iso_n4_bundle_g3_invariants_root.py
A3958AA80A5B50C22BCCD4463B658C914DF2A5C25F10D65464DFCBC36EA8BA3A

iso_n4_bundle_g3_forest_invariants_root_20260829.json
BBEAE23A9E6D7D1BE0B2680D0E69BA01E1A6FEC8ED5D49968668DDD652D4F735

audit_iso_n4_bundle_g3_independent_bundle_g3.py
ED17F97BBE47502CF2C839DCB7B72740DB4DC74BFE33EB7788A437E1AA1DF318

iso_n4_bundle_g3_independent_audit_bundle_g3_20260829.json
0747B3A21A7CBB37D927B5ABC846E45ADC4697FFB66BCB07C2D0FBA11B301BFF
```

The target producer writes its JSON through Windows text-mode newline
translation, so its printed logical-LF hash differs from the on-disk-byte hash
listed above.  The independent audit writes bytes directly; its printed report
hash and on-disk hash are both
`0747B3A21A7CBB37D927B5ABC846E45ADC4697FFB66BCB07C2D0FBA11B301BFF`.
