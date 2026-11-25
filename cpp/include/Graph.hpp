#pragma once

#include <string>
#include <unordered_map>
#include <vector>

namespace flight {

enum class ObjectiveMode {
    Distance,
    Penalty,
    Stops
};

struct Airport {
    std::string id;
    std::string name;
    std::string city;
    std::string country;
    double lat = 0.0;
    double lon = 0.0;
    bool enabled = true;
};

struct Edge {
    std::string from;
    std::string to;
    double distanceKm = 0.0;
    int flightTimeMin = 0;
    int frequencyPerDay = 4;
    int delayMin = 0;
    bool enabled = true;
};

struct SearchResult {
    std::string algorithm;
    bool found = false;
    std::string error;
    std::vector<std::string> path;
    double totalCost = 0.0;
    double totalDistanceKm = 0.0;
    std::vector<std::string> visitedOrder;
    std::size_t visitedCount = 0;
    std::size_t relaxations = 0;
    double executionTimeMs = 0.0;
};

class AirportGraph {
public:
    void addAirport(const Airport& airport);
    void setAirportEnabled(const std::string& id, bool enabled);
    void addRoute(const Edge& edge, bool bidirectional = true);

    const Airport* getAirport(const std::string& id) const;
    std::vector<Edge> getNeighbors(const std::string& id) const;
    double getEdgeWeight(const Edge& edge, ObjectiveMode mode) const;
    std::vector<std::string> getAllAirportIds() const;
    std::size_t airportCount() const { return airports_.size(); }

private:
    void upsertEdge(const Edge& edge);

    std::unordered_map<std::string, Airport> airports_;
    std::unordered_map<std::string, std::vector<Edge>> adjacency_;
};

SearchResult runDijkstra(
    const AirportGraph& graph,
    const std::string& sourceId,
    const std::string& targetId,
    ObjectiveMode mode = ObjectiveMode::Distance
);

SearchResult runAStar(
    const AirportGraph& graph,
    const std::string& sourceId,
    const std::string& targetId,
    ObjectiveMode mode = ObjectiveMode::Distance
);

} // namespace flight
