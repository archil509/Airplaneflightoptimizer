#include "Graph.hpp"

#include <iostream>
#include <string>

int main(int argc, char* argv[]) {
    flight::AirportGraph graph;

    // Sample transcontinental / international corridors for standalone C++17 verification
    graph.addAirport({"JFK", "John F. Kennedy Intl", "New York", "USA", 40.6413, -73.7781, true});
    graph.addAirport({"ORD", "O'Hare Intl", "Chicago", "USA", 41.9742, -87.9073, true});
    graph.addAirport({"ATL", "Hartsfield-Jackson", "Atlanta", "USA", 33.6407, -84.4277, true});
    graph.addAirport({"DFW", "Dallas/Fort Worth", "Dallas", "USA", 32.8998, -97.0403, true});
    graph.addAirport({"DEN", "Denver Intl", "Denver", "USA", 39.8561, -104.6737, true});
    graph.addAirport({"LAX", "Los Angeles Intl", "Los Angeles", "USA", 33.9416, -118.4085, true});
    graph.addAirport({"LHR", "London Heathrow", "London", "UK", 51.4700, -0.4543, true});
    graph.addAirport({"DXB", "Dubai Intl", "Dubai", "UAE", 25.2532, 55.3657, true});
    graph.addAirport({"DEL", "Indira Gandhi Intl", "Delhi", "India", 28.5562, 77.1000, true});
    graph.addAirport({"SIN", "Singapore Changi", "Singapore", "Singapore", 1.3644, 103.9915, true});
    graph.addAirport({"HND", "Tokyo Haneda", "Tokyo", "Japan", 35.5494, 139.7798, true});

    graph.addRoute({"JFK", "ORD", 0, 0, 8, 0, true});
    graph.addRoute({"JFK", "ATL", 0, 0, 8, 0, true});
    graph.addRoute({"JFK", "LHR", 0, 0, 9, 0, true});
    graph.addRoute({"ORD", "DEN", 0, 0, 8, 0, true});
    graph.addRoute({"ORD", "DFW", 0, 0, 7, 0, true});
    graph.addRoute({"ATL", "DFW", 0, 0, 7, 0, true});
    graph.addRoute({"DEN", "LAX", 0, 0, 7, 0, true});
    graph.addRoute({"DFW", "LAX", 0, 0, 7, 0, true});
    graph.addRoute({"LHR", "DXB", 0, 0, 7, 0, true});
    graph.addRoute({"DXB", "DEL", 0, 0, 8, 0, true});
    graph.addRoute({"DEL", "SIN", 0, 0, 6, 0, true});
    graph.addRoute({"DEL", "HND", 0, 0, 4, 0, true});
    graph.addRoute({"SIN", "HND", 0, 0, 5, 0, true});

    const std::string src = argc >= 2 ? argv[1] : "JFK";
    const std::string dst = argc >= 3 ? argv[2] : "LAX";

    const auto d = flight::runDijkstra(graph, src, dst);
    const auto a = flight::runAStar(graph, src, dst);

    std::cout << "Flight Optimizer C++17 Engine (" << src << " -> " << dst << ")\n";
    std::cout << "Dijkstra: found=" << (d.found ? "true" : "false")
              << ", cost=" << d.totalCost << " km, visited=" << d.visitedCount
              << ", time=" << d.executionTimeMs << " ms\n";
    std::cout << "A*      : found=" << (a.found ? "true" : "false")
              << ", cost=" << a.totalCost << " km, visited=" << a.visitedCount
              << ", time=" << a.executionTimeMs << " ms\n";

    return (d.found && a.found) ? 0 : 1;
}
