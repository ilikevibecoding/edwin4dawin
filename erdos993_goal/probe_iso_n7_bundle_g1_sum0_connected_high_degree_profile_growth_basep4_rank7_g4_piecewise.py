#!/usr/bin/env python3
"""Order-growth test for the coupled cone with only P4>=m-3."""

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_profiles_rank7_g4_piecewise as cone

cone.p4_floor = lambda order, increments: order-3

from probe_iso_n7_bundle_g1_sum0_connected_high_degree_profile_growth_rank7_g4_piecewise import main


if __name__ == "__main__":
    main()
