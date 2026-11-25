#include "Graph.hpp"
#include "Haversine.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace flight {

void AirportGraph::addAirport(const Airport& airport) {
    if (airport.id.empty()) {
        throw std::invalid_argument("Airport id cannot be empty.");
    }
    if (!isValidCoordinate(airport.lat, airport.lon)) {
        throw std::invalid_argument("Airport has invalid coordinates: " + airport.id);
    }
    airports_[airport.id] = airport;
    if (adjacency_.find(airport.id) == adjacency_.end()) {
        adjacency_[airport.id] = {};
    }
}

void AirportGraph::setAirportEnabled(const std::string& id, bool enabled) {
    auto it = airports_.find(id);
    if (it != airports_.end()) {
        it->second.enabled = enabled;
    }
}

void AirportGraph::addRoute(const Edge& edge, bool bidirectional) {
    const auto srcIt = airports_.find(edge.from);
    const auto dstIt = airports_.find(edge.to);
    if (srcIt == airports_.end() || dstIt == airports_.end()) {
        throw std::invalid_argument("Cannot add route for unknown airport.");
    }
    if (edge.from == edge.to) {
        throw std::invalid_argument("Self-loop routes are not allowed.");
    }

    Edge normalized = edge;
    if (normalized.distanceKm <= 0.0) {
        normalized.distanceKm = std::round(haversineDistanceKm(
            srcIt->second.lat, srcIt->second.lon,
            dstIt->second.lat, dstIt->second.lon
        ));
    }
    if (normalized.distanceKm < 0.0) {
        throw std::invalid_argument("Edge distance cannot be negative.");
    }
    if (normalized.flightTimeMin <= 0) {
        normalized.flightTimeMin = std::max(25, static_cast<int>(std::round((normalized.distanceKm / 820.0) * 60.0 + 25.0)));
    }

    upsertEdge(normalized);
    if (bidirectional) {
        Edge reverse = normalized;
        reverse.from = normalized.to;
        reverse.to = normalized.from;
        upsertEdge(reverse);
    }
}

void AirportGraph::upsertEdge(const Edge& edge) {
    auto& list = adjacency_[edge.from];
    for (auto& existing : list) {
        if (existing.to == edge.to) {
            existing = edge;
            return;
        }
    }
    list.push_back(edge);
}

const Airport* AirportGraph::getAirport(const std::string& id) const {
    auto it = airports_.find(id);
    return it == airports_.end() ? nullptr : &it->second;
}

std::vector<Edge> AirportGraph::getNeighbors(const std::string& id) const {
    std::vector<Edge> result;
    auto it = adjacency_.find(id);
    if (it == adjacency_.end()) return result;

    for (const auto& edge : it->second) {
        if (!edge.enabled) continue;
        const auto targetIt = airports_.find(edge.to);
        if (targetIt != airports_.end() && targetIt->second.enabled) {
            result.push_back(edge);
        }
    }
    return result;
}

double AirportGraph::getEdgeWeight(const Edge& edge, ObjectiveMode mode) const {
    if (mode == ObjectiveMode::Stops) {
        return 1.0;
    }
    if (mode == ObjectiveMode::Penalty) {
        const double delayPenalty = static_cast<double>(std::max(0, edge.delayMin)) * 12.0;
        const double freqPenalty = edge.frequencyPerDay >= 6
            ? 0.0
            : static_cast<double>(6 - edge.frequencyPerDay) * 35.0;
        return edge.distanceKm + delayPenalty + freqPenalty;
    }
    return edge.distanceKm;
}

std::vector<std::string> AirportGraph::getAllAirportIds() const {
    std::vector<std::string> ids;
    ids.reserve(airports_.size());
    for (const auto& [id, _] : airports_) {
        ids.push_back(id);
    }
    return ids;
}

} // namespace flight
