# Rank-eight terminal Delta0--Delta3 on the all-long e=2 cells

## Exact theorem

Let `(A,q)` be a rooted tree core with degree surplus

`e(A)=sum_v binom(deg_A(v)-1,2)=2`.

Then `A` is a double claw: two degree-three branch vertices joined by a
central bridge, with two pendant arms at each branch.  On each of the exact
long scopes below,

`Delta^j R_1(A,q)>0` for `j=0,1,2,3`.

The three root-type scopes are:

1. Branch root: all four pendant arms have length at least 7 and the central
   bridge has length at least 8.
2. Pendant-arm root: if the selected arm has length `a` and the root is at
   branch-distance `d`, then `d-1>=7` and `a-d>=7`; the paired and two far
   pendant arms have length at least 7, and the bridge has length at least 8.
3. Bridge-interior root: all four pendant arms have length at least 7, and at
   least seven bridge vertices lie strictly between the root and each branch
   vertex.  Equivalently, each root-to-branch edge distance is at least 8.

This gives twelve positive cells: four residual ranks crossed with the three
root types.  It is not yet an all-order theorem for every rooted `e=2` core;
the complementary short-segment boundary cells remain separate obligations.

## Endpoint-state compression

For path arms `A+7` and `B+7`, every excluded or included branch endpoint
state through rank eight depends only on `S=A+B`.  The elementary product
`P=A*B` cancels identically.  Independently, if `F_k(N)` denotes the rank-`k`
coefficient for two long path components of total order `N`, then

`F_k(N)=sum_(r=0)^(floor(k/2)) [x^(k-2r)] I(P_(N-4r))`.

This turns the apparent five- and six-variable cells into:

- branch root: three effective variables and 3,654 positive coefficients;
- bridge-interior root: four effective variables and 27,405 positive
  coefficients;
- pendant root: four effective variables and 27,405 positive coefficients.

For the pendant cell the exact compressed coordinates are
`X=(d-1-7)+(b-7)` for the near segment and paired arm, the tail offset,
the far-arm pair sum, and the bridge offset.

## Exact tree coordinates

The lower ranks use

`c0=1`, `c1=n`, `c2=binom(n-1,2)`,
`c3=binom(n-2,3)+2`.

The last identity is the exact three-set motif formula
`c3=binom(n-2,3)+e(A)` with `e(A)=2`.  The independently audited order
expressions are

- branch: `n=37+SL+SR+G`;
- bridge interior: `n=45+SL+SR+N+M`;
- pendant: `n=45+X+U+SR+G`.

## Immutable package

- `assemble_rank8_delta013_e2_all_long.py`  
  SHA-256 `0A34A5C62D7BE89CED10BA00AB81F9C4D4CB4132A1A918BDF23AA9C6938D81AC`
- `rank8_delta013_e2_all_long_exact_20260820.json`  
  SHA-256 `753DF4C499A78021C50E32C700B93FBCB16877003EF8265F4106D63C45AB5701`
- `probe_rank8_delta2_e2_symmetric_long_cells.py`  
  SHA-256 `4141749D3431C439510C1A35F5BA4509EC4236503104753D610E7FC777250A36`
- `audit_rank8_delta2_e2_long_pair_sum_identity.py`  
  SHA-256 `A63B505EA6F50FFAACB6DBBBCF1A5707E5105122FFE65D9A846117DD7688005B`
- `rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json`  
  SHA-256 `3D08D942263C416BD799F4BBA5822B3289CD92BCBEE936520D95B23FFD2CAB46`
- `probe_rank8_delta013_e2_symmetric_long_cells.py`  
  SHA-256 `32CC4A331D388143640809AD4F07D18B002AB9A16C1F0C40769D9923F7DD0085`
- `audit_rank8_delta013_e2_symmetric_long_cells.py`  
  SHA-256 `D5EB865FC0923F0AF43B89F8EEC6092FD5EE081E78E50EDA00DFA7A4D5F3875E`
- `rank8_delta013_e2_symmetric_long_independent_audit_exact_20260820.json`  
  SHA-256 `7872A0B5F181B4F15FC54DDFB9E54B57E1412C3BDC620D477911192EABE55A1B`

The combined report pins all twelve cell reports, both independent long-cell
audits, and the independent exact `n=23` double-claw classification audit.
