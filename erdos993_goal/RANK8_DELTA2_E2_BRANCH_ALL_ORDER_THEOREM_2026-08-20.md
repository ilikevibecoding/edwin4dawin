# Rank-eight terminal Delta2: all branch-rooted e=2 double claws

## Theorem

For every branch-rooted degree-surplus-two double-claw core `(A,q)` of order
`n>=23`,

`Delta^2 R_1(A,q)>0`.

Here `q` may be either degree-three branch vertex; side reversal makes either
one the designated root side.  Pendant-arm and bridge-interior roots are not
claimed by this theorem.

## Exact no-gap cells

Each of the four pendant arm lengths is classified as a fixed short value
`1,...,6` or a long value `X+7`.  The central bridge is a fixed short value
`1,...,7` or a long value `G+8`.  Within each branch pair, arm exchange is
quotiented exactly, giving 28 pair types on the root side and 28 on the far
side, crossed with 8 bridge types.

When both arms of a pair are long, their endpoint states through rank eight
depend only on the sum of their offsets.  Thus each pair contributes at most
one aggregate long coordinate.

The exact order condition is that the five suppressed edge lengths sum to at
least 22.  If a pattern leaves a lower bound `T>0` on the sum of `m` long
coordinates, at least one coordinate is at least `ceil(T/m)`.  Shifting each
coordinate representative by this amount covers the complete order region;
the tested orthants are harmless supersets.

The complete key counts are:

| aggregate long coordinates | relevant patterns | symbolic cells |
|---:|---:|---:|
| 0 | 636 | 636 |
| 1 | 2,499 | 2,499 |
| 2 | 637 | 698 |
| 3 | 49 | 49 |
| **total** | **3,821** | **3,882** |

Every symbolic polynomial has no negative coefficient and a strictly
positive constant.  The independent audit regenerates every pattern and
order-cover key and independently rebuilds all 3,882 constant terms from
literal integer double-claw and root-deletion formulas.

## Immutable package

- `run_rank8_delta2_e2_branch_short_long_cells.py`  
  SHA-256 `DBC56B368C6033336568B05215EEC173DB428CF4AA16C477D123AE245391040B`
- reports for 0, 1, 2, 3 aggregate long coordinates:  
  `1D5700803A1371E9E19566147EA5E592A676C243766F92180640969AB5D3E7DD`,  
  `3BE314AF1A92FB3B4FA5F3467572598B390B5C64CAFED0B2B99C6666BA2BBF1D`,  
  `6E1F3A98E72E47B3E98A0E265AF16FD1FFC619BEDBE5C4A52FC0A9C2A635C590`,  
  `78F7ED3CCFD3C2E93CC3DBA71E349249D067AAA6D23C4A932265EF52FD97D6BF`.
- `audit_rank8_delta2_e2_branch_all_order.py`  
  SHA-256 `DB210D84ED07148F332E73630BBA758497EB29B5ACD98038A3A1D24A1027C528`
- `rank8_delta2_e2_branch_all_order_independent_audit_exact_20260820.json`  
  SHA-256 `5A82B58361B66DF210BC3BF5341632D022003CD4E5A320A230490DAC8D579708`

No signed-basis failure or relaxed negative is used as a tree
counterexample.  This package is exact for its branch-root scope only.
