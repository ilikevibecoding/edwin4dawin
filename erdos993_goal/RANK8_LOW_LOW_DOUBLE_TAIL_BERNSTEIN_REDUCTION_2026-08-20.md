# Rank-eight low/low double-tail Bernstein reduction

## Exact reduction

Write the normalized rank-eight convolution rows as

`s_r = hh_r + (1+x)lh_r + (1+y)rh_r + (1+x)(1+y)tt_r`,

where `0 <= x <= h/C`, `0 <= y <= h/D`, and `C,D >= 6h`.  Thus `x=y=0`
is the high/high base, while positive `x,y` produce the two low factors.

For

`M(x,y)=8s_8^2-9s_7s_9-hs_7s_8`,

exact symbolic expansion gives

`M(x,y)=M(0,y)+x d_x(y)+x^2 q_x(y)`.

Assuming the low/high edge theorem `M(0,y)>=0`, the usual one-variable tail
argument shows that it is sufficient to prove, throughout the right-tail
interval,

- `q_x(y)>=0`, and
- `C M(0,y)+h d_x(y)>=0`.

Both auxiliaries are exactly quadratic in `y`.  Their Bernstein coefficient
at `y=0` is respectively the already proved high/high tail-curvature theorem
and the current high/high base-payment target.  Consequently the entire
low/low interior reduces without gaps to four new targets:

1. the middle Bernstein coefficient of `q_x(y)`;
2. the far endpoint `q_x(h/D)`;
3. the middle Bernstein coefficient of `C M(0,y)+h d_x(y)`;
4. its far endpoint at `y=h/D`.

## Scope

This is an exact algebraic reduction only.  The four displayed targets are
not yet sign-certified, so this note does not prove the low/low cone, forest
`Q_8`, the rank-eight PGC, or Problem 993.

## Verification

- reduction source: `analyze_rank8_low_low_double_tail_reduction.py`
  (`8B9ADCA8205AF3006F17851B5DD6715A99AF8223CA89395AA3221E15DD387428`)
- reduction report: `rank8_low_low_double_tail_reduction_exact_20260820.json`
  (`1DB764EF5B9600A4C69550D26662A3B6C441B709BEC02484465923B9B4C566BC`)
- independent audit source: `audit_rank8_low_low_double_tail_reduction.py`
  (`4AAD41A2ADE2ABB3B7A350D136905DCA01DBA839DF7B8B6BE63FF1E8B2FB7FBF`)
- independent audit report:
  `rank8_low_low_double_tail_reduction_independent_audit_exact_20260820.json`
  (`34F75B0E1185B86AD946988898099ED7A1E93C8A780B4AFBAF03D342FDAA2ABF`)

Both exact symbolic remainders and both independent midpoint-to-Bernstein
conversion remainders are zero.
