# Central-support obstruction to path-H/matching scalarization

Date: 2026-08-29

The proposed central block retained the guards `S>=2j+1` and
`T+Y>=2j-2`, so both the path-join ratio and the matching coefficient are
supported.  It is nevertheless false.  The first negative in the exact
`S=71,72` audit is

```text
(N,S,j,R,T,Y)=(73,72,33,23,49,23).
```

The path-scalarized payment is
`-135987438023295930904/155`.  Both structural guards are strict, and the
path-joining slope itself is positive.  The failure is the extra replacement
of the canonical H row by `P_S`.

The exact canonical-H payment at the same cell is
`16576408583865065827787776/155 > 0`.  Thus this is not a negative terminal
cell, not a terminal-`m=0` counterexample, and not a counterexample to Erdős
Problem #993.  It only proves that no all-order central PF/Bonferroni block
based on the path scalarization can close the cone.
