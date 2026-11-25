#include "Graph.hpp"
#include "Haversine.hpp"

#include <cassert>
#include <cmath>
#include <iostream>

int main() {
    // 1. Haversine test (JFK -> LAX ~ 3974 km)
    const double jfkLax = flight::haversineDistanceKm(40.6413, -73.7781, 33.9416, -118.4085);
    assert(jfkLax > 3900.0 && jfkLax < 4050.0);

    // 2. Slide 16 illustrative graph: A -> C -> B -> D (500 km) beats A -> B -> D (550 km)
    flight::AirportGraph slideGraph;
    slideGraph.addAirport({"A", "Airport A", "", "", 38.0, -93.5, true});
    slideGraph.addAirport({"B", "Airport B", "", "", 37.5, -92.3, true});
    slideGraph.addAirport({"C", "Airport C", "", "", 37.2, -92.5, true});
    slideGraph.addAirport({"D", "Airport D", "", "", 38.9, -91.0, true});

    slideGraph.addRoute({"A", "B", 300.0, 45, 6, 0, true});
    slideGraph.addRoute({"B", "D", 250.0, 40, 6, 0, true});
    slideGraph.addRoute({"A", "C", 200.0, 35, 5, 0, true});
    slideGraph.addRoute({"C", "D", 400.0, 55, 4, 0, true});
    slideGraph.addRoute({"C", "B", 50.0, 20, 7, 0, true});

    const auto d = flight::runDijkstra(slideGraph, "A", "D");
    const auto a = flight::runAStar(slideGraph, "A", "D");

    assert(d.found && a.found);
    assert(std::abs(d.totalCost - 500.0) < 1e-6);
    assert(std::abs(a.totalCost - 500.0) < 1e-6);
    assert(d.path.size() == 4);
    assert(a.path == d.path);

    // 3. Same source & destination
    const auto same = flight::runAStar(slideGraph, "A", "A");
    assert(same.found && same.totalCost == 0.0 && same.path.size() == 1);

    // 4. Disconnected node handling
    slideGraph.addAirport({"Z", "Isolated", "", "", 10.0, 10.0, true});
    const auto disconnected = flight::runDijkstra(slideGraph, "A", "Z");
    assert(!disconnected.found);

    std::cout << "All C++17 flight engine unit tests passed.\n";
    return 0;
}
