# Nonuniform depth-two-star rank-five envelope theorem

Date: 2026-08-28

## Theorem

Every nonuniform depth-two star satisfies

```text
5 i_5(T) s_3(T) - 3 i_3(T) s_5(T) >= 0.
```

Whenever `i_5(T)>0`, this is exactly `q_5(T)<=q_3(T)`.  Combined with the
rank-three and rank-four theorems, the proved envelope is now

```text
q_4(T), q_5(T) <= q_3(T) <= q_2(T).
```

The arm leaf multiplicities are arbitrary, unequal, and may include any
number of zeros (direct leaves).

## Certificate

The exact zero-edge and one-edge generating functions reduce the margin to a
symmetric polynomial of total degree eight in the arm multiplicities, with
positive denominator 48.  Separate `t` zero arms from `s` positive arms and
write the latter as `m_i=y_i+1`.

The numerator is expanded in the product basis `prod_i binom(y_i,a_i)`.
There are 63 symmetry classes.  After applying the exact support boundary
`s=max(1,ell)+v`, where `ell` is the number of active indices, all coefficient
polynomials expand in `binom(v,a)binom(t,b)` with 446 nonzero coefficients.
Every one is a nonnegative integer.  This proves the margin on the complete
integer domain; the all-zero case is a star with zero margin.

The replay separately checks literal induced-edge counts on every sorted
multiplicity vector of length at most four with entries at most three.

## Replay

Run

```powershell
python .\verify_multitype_depth2_star_q5_q3_theorem_root.py
```

The required marker is

```text
PASS_EXACT_ALL_ORDER_MULTITYPE_DEPTH2_STAR_Q5_AT_MOST_Q3_THEOREM
```

## Scope

This is an all-order theorem at rank five for the complete nonuniform
depth-two-star family.  It does not prove `q_r<=q_3` for `r>=6`, the
token-surplus inequality for arbitrary trees, or Erdős Problem #993.
