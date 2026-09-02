#include <stdio.h>
#include <stdlib.h>
#include "gtools.h"

static unsigned long long counts[29][326];
static int registered = 0;

static unsigned long long choose26(int k)
{
    if (k < 0 || k > 26) return 0;
    if (k > 13) k = 26 - k;
    unsigned long long value = 1;
    for (int j = 1; j <= k; ++j)
        value = value * (unsigned long long)(26 - k + j) / (unsigned long long)j;
    return value;
}

static void report_profile(void)
{
    unsigned long long total_skeletons = 0;
    unsigned long long total_raw_subdivisions = 0;
    puts("e,skeletons,raw_positive_subdivision_vectors");
    for (int excess = 6; excess <= 39; ++excess)
    {
        unsigned long long skeletons = 0;
        unsigned long long raw = 0;
        for (int order = 1; order <= 28; ++order)
        {
            skeletons += counts[order][excess];
            raw += counts[order][excess] * choose26(order - 2);
        }
        printf("%d,%llu,%llu\n", excess, skeletons, raw);
        total_skeletons += skeletons;
        total_raw_subdivisions += raw;
    }
    printf("TOTAL,%llu,%llu\n", total_skeletons, total_raw_subdivisions);
}

void profile_tree(FILE *output, int parent[], int order)
{
    (void)output;
    if (!registered)
    {
        if (atexit(report_profile) != 0) abort();
        registered = 1;
    }
    int degree[129] = {0};
    for (int vertex = 2; vertex <= order; ++vertex)
    {
        ++degree[vertex];
        ++degree[parent[vertex]];
    }
    int excess = 0;
    for (int vertex = 1; vertex <= order; ++vertex)
        if (degree[vertex] >= 3)
            excess += (degree[vertex] - 1) * (degree[vertex] - 2) / 2;
    if (order <= 28 && excess <= 325)
        ++counts[order][excess];
}
