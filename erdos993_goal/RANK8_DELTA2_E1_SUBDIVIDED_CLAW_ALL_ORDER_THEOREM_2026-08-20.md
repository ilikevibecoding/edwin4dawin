# Rank-eight terminal Delta2: the complete degree-surplus-one layer

## Theorem

Let `(A,q)` be any rooted tree core of order `n>=23`, and put

`e(A)=sum_v binom(deg_A(v)-1,2)`.

If `e(A)=1`, then the rank-eight terminal residual satisfies

`Delta^2 R_1(A,q)>0`.

This is an exact all-order theorem for the first nonpath layer.  It is not a
theorem for `e>=2`, nor does it close Delta0, Delta1, or Delta3.

## Shape and rooted-orbit classification

For a tree, `e=1` means that exactly one vertex has degree three and every
other vertex has degree at most two.  Therefore `A` is a subdivided claw with
three positive arm lengths `(a,b,c)` satisfying `a+b+c=n-1`.

The root is either the degree-three center or lies on one selected arm at a
distance `d` from the center.  If the selected arm has length `a`, write
`near=d-1` and `tail=a-d`.  The remaining two arms have lengths `b,c`.

## Exact coefficient formulas

For a path,

`[x^k] I(P_s)=binom(s-k+1,k)`.

For the subdivided claw,

`I(C(a,b,c))=I(P_a)I(P_b)I(P_c)+x I(P_(a-1))I(P_(b-1))I(P_(c-1))`.

If the center is deleted,

`I(C-q)=I(P_a)I(P_b)I(P_c)`.

If the root is on the arm `a` at distance `d`,

`I(C-q)=I(P_tail) I(C(near,b,c))`.

These identities give the exact `c4,...,c8,h6,h7` substituted into the
22-term polynomial for `Delta^2 R_1`.

## Exact short/long subdivision certificate

For ranks through eight, every path segment is split without a gap into a
fixed short order and a symbolic long order:

- `near,tail` are one of `0,...,6` or `X+7`;
- the two other arms are one of `1,...,6` or `X+7`.

For an arm root,

`n=near+tail+b+c+2`,

so `n>=23` is exactly `near+tail+b+c>=21`.  If a short/long pattern leaves a
positive lower bound `T` on the sum of `m` long offsets, some offset is at
least `ceil(T/m)`.  Shifting each nonsymmetric coordinate representative by
that amount covers the whole order constraint; the two other arms use their
permutation symmetry.  The resulting 787 relevant short/long patterns produce
838 symbolic orthants.  Every nonzero polynomial coefficient and every
constant coefficient is strictly positive.

For a center root, arm permutation symmetry reduces the analogous split to 28
cells: one three-long cell, six two-long/one-short cells, and 21
one-long/two-short cells.  Zero long arms force `n<=19`.  Again every
coefficient and constant term is strictly positive.

## Exact control at n=23

A literal arm-formula scan, separate from the symbolic cell proof, covers all 40 unordered positive arm
triples summing to 22 and all 865 distinct rooted orbits (920 root placements
before quotienting equal-arm symmetry).  The exact minimum is

`38230158759117788736`,

at arms `(1,3,18)` with the root on the length-one arm.  There are no negative
rooted orbits.

## Immutable proof package

- `assemble_rank8_delta2_e1_all_order.py`  
  SHA-256 `1A85FB61A066676D78ACF2594DFFAB7B9FFB90EC7457D456C6C5D376783F9EE1`
- `rank8_delta2_e1_all_order_exact_20260820.json`  
  SHA-256 `755DBEBDF4D0F43E6C7C6FD4A999443BAB5410F977F4741933FF63DC3B8D1F3E`
- `verify_rank8_delta2_e1_center_all_order.py`  
  SHA-256 `8D2C88C78AA9909E441AF4E5ACFD08083E00CC2EC15C7FD94719770257AAA958`
- `rank8_delta2_e1_center_all_order_exact_20260820.json`  
  SHA-256 `E59852D1F2647C975302133501DE19FFB3FED922BC5DDB10BA07F36356599B6F`
- `run_rank8_delta2_e1_arm_short_long_cells.py`  
  SHA-256 `29884626B28507DA01208D5C67F22EB41A31F132C3543CB1E3967ABFAAD40014`
- arm-root reports for 0,1,2,3,4 long segments:  
  `38B9C3640EDEF3CC970F01EC9BDD568E27D7A234802437DBD74C00B70214C687`,  
  `9698A27B11C1F327BA8911DACD42868358A893EE6B581BAE73EB55B60B807547`,  
  `1FD79D647090CAAF87B9217A9766A74E5C55D75789E369C66F9146814AC2A3A5`,  
  `EF5ED4D529BC7C49547F8B04F0E527422E1EE8F5C81D08F5EFAC7937B7F79498`,  
  `20F34B6423D64B2307E4224A7BBFA6EA7C82E28E6D07267C108F10A158B5B902`.

The combined assembler pins every source/report dependency and regenerates the
complete short/long pattern keys and all order-cover shifts.
