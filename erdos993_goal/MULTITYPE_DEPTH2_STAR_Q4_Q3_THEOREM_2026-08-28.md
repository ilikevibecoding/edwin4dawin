# Nonuniform depth-two-star rank-four envelope theorem

Date: 2026-08-28

## Theorem

For the complete nonuniform depth-two-star family described in
`MULTITYPE_DEPTH2_STAR_Q3_Q2_THEOREM_2026-08-28.md`, the universal margin

```text
4 i_4(T) s_3(T) - 3 i_3(T) s_4(T) >= 0             (1)
```

holds.  Whenever `i_4(T)>0`, both ratios are defined and (1) is exactly

```text
q_4(T) <= q_3(T).
```

Together with the separately proved `q_3<=q_2`, this gives

```text
q_4(T) <= q_3(T) <= q_2(T)
```

through rank four for every choice of unequal arm multiplicities, including
any number of direct leaves.

## Certificate

Let `M=sum m_i` and `Sj=sum m_i^j`.  Coefficient extraction from the exact
zero-edge and one-edge generating functions gives `i_3,i_4,s_3,s_4` as
polynomials in `d,M,S2,S3,S4`.  The left side of (1) is an exact polynomial
of total degree seven with positive denominator 12.

Separate `t` zero arms from `s` positive arms and write every positive
multiplicity as `m_i=y_i+1`.  The numerator is expanded first in the product
integer-binomial basis

```text
prod_i binom(y_i,a_i).
```

Symmetry leaves 41 index partitions.  A term supported on `ell` variables
can occur only for `s>=ell`; after the exact boundary shift `s=ell+v` (and
`s=1+v` for the empty term), each of its coefficient polynomials is expanded
again in

```text
binom(v,a) binom(t,b).
```

All 268 nonzero integer coefficients in this two-level binomial certificate
are nonnegative.  Hence every term is nonnegative on its precise integer
domain, proving (1).  The all-direct-leaf case is a star and has zero margin.

The replay also independently counts literal zero-edge and one-edge subsets
for every sorted multiplicity vector of length at most four with entries at
most three.

## Replay

Run

```powershell
python .\verify_multitype_depth2_star_q4_q3_theorem_root.py
```

The required marker is

```text
PASS_EXACT_ALL_ORDER_MULTITYPE_DEPTH2_STAR_Q4_AT_MOST_Q3_THEOREM
```

## Scope

This is an all-order theorem for rank four on the complete nonuniform
depth-two-star family.  It does not prove `q_r<=q_3` for `r>=5`, the
token-surplus inequality for arbitrary trees, or Erdős Problem #993.
