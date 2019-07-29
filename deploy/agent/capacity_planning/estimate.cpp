#include <array>
#include <random>
#include <algorithm>
#include <iostream>

// build table for varying number of requests per minute: up to TABLE_RANGE
static const int TABLE_RANGE = 10000;

// the table is sparse — there's the certain step between adjacent rows
static const int TABLE_STEP = 10;

// run N independent instances of simulation
static const int NINSTANCES = 10000;

// simulation is performed as follows:
// for each request a bin is picked randomly and the bin counter is
// incremented; this yields the maximum number of requests occuring per
// second for the given number of requests per minute
static const int NBINS = 60;

// simulation results are agregated (each simulation instance
// contributing a single result); CONFIDENCE_PERCENTAGE of the result set
// is retained while the rest is discarded and maximum is computed on
// the pruned result set
//
// If we didn't prune we would end up with a larger maximum value due to
// outliers. The practical outcame is that it is highly unlikely that
// RPS will ever exceed the upper bound computed (provided that
// confidence value is high enough).
static const int CONFIDENCE_PERCENTAGE = 95;

struct instance {
    std::array<int, NBINS> bins = {};
    int max = 0;
};

int main() {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<int> dist(0, NBINS-1);
    std::vector<instance> instances(NINSTANCES);
    std::vector<int> max(instances.size());
    for (size_t j=1; j<=TABLE_RANGE; ++j) {
       for (size_t i=0; i<instances.size(); ++i) {
           max[i] = instances[i].max = std::max(instances[i].max, ++instances[i].bins[dist(gen)]);
       }
       if (j%TABLE_STEP==0) {
            std::sort(max.begin(), max.end());
            std::cout << j << " " << max[max.size()*CONFIDENCE_PERCENTAGE/100] << std::endl;
       }
    }
}
