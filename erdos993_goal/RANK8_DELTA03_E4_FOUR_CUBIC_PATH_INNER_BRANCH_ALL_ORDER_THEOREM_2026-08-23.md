# Rank-eight terminal Delta0--Delta3: four-cubic-path inner branch root

## Theorem

For every subdivision of the four-cubic-path degree-surplus-four skeleton, of
every order `n>=27`, rooted at either inner degree-three branch vertex,

`Delta^j R_1(A,q)>0` for `j=0,1,2,3`.

## Exact quotient and all-order lift

The exact symmetry quotient has 19,668,992 keys, partitioned without a gap as:

- 5,445,468 all-short keys, of which 4,950,075 have order at least 27;
- 14,223,523 mixed all-order rays;
- one all-long ray.

The exact transfer/Newton reduction proves degree bounds `28,28,27,26` for
`Delta0,...,Delta3`. The primary scan checked all 4,950,075 finite cells and
29 points on every rank-ray, totaling 1,649,928,784 rank-ray samples. Every
Newton constant and first difference is positive, all higher coefficients
through the exact degree are nonnegative, and every coefficient above the
degree vanishes.

## Independent literal audit

A separately compiled checked-`i256` engine used an independently transcribed
forward branch transfer. It rebuilt 47,620,647 expanded adjacency-list trees,
matched the complete primary finite-value and Newton-coefficient streams, and
checked an unseen `S=29` value for each rank and ray (56,894,096 checks).

## Immutable evidence

- reduction source/report:  
  `D700939A09AE8BD2061AA6FCF5F459212AB6C86311F42AA019F3874E8051A70E`  
  `8115775F3D6E1256658A22577E11EC9AF81B321DCD1F060DA0B709944BE61F23`
- primary source/executable/raw result:  
  `7906B463F1CD46E486D21096D438FE024B168A7B6FE9544C40C7A4E586E3F035`  
  `A4425E8111F4E6E6CA09FC04304B8A5FC46760C0976BD494B351300889BE4A9A`  
  `AE8B283A7C740B68715A92DD5DE4D354921E5AA6BD9A58628C0257AB6DF80626`
- sealed primary source/report:  
  `A071AA1AAFAECDEE9A726AC79D1B10F1A5CBE05C55359B1EF069781F978F795E`  
  `7F2ACF697E086BBDDEDCDA66B90DE160442D858A9E317AA2FDC729ABDD759A10`
- literal-audit source/executable/raw result:  
  `FA206481BFF3268215627BA136F67AA96393841A8865D6D29C73904BEFFD8430`  
  `A878CF915D9B2B1DB270D25C287E1989B84877B0EC271714D874C74B1D9BBE0A`  
  `D6EED798E9A28D3CF6F6773B5E865F18642E2AF62E787AE322C41DE3B6014B3E`
- sealed independent-audit source/report:  
  `4CD2E89BCE125A3C73EE7E09D5273E412C61FEE42C222329D15A53C0F9999E88`  
  `2EC6D582AA8C9E029E2CD2880BA89A4B3F5561F86238623B836F0F56D1048952`

This theorem credits exactly `four_cubic_path:inner_branch`; all other root
orbits remain separate.
