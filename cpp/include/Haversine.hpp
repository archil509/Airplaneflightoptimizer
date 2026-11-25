#pragma once

#include <cmath>
#include <stdexcept>

namespace flight {

constexpr double kEarthRadiusKm = 6371.0;
constexpr double kPi = 3.14159265358979323846;

inline double toRadians(double degrees) {
    return degrees * (kPi / 180.0);
}

inline bool isValidCoordinate(double lat, double lon) {
    return std::isfinite(lat) && std::isfinite(lon) &&
           lat >= -90.0 && lat <= 90.0 &&
           lon >= -180.0 && lon <= 180.0;
}

/**
 * Computes great-circle distance in kilometers using the Haversine formula.
 */
inline double haversineDistanceKm(double lat1, double lon1, double lat2, double lon2) {
    if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
        throw std::invalid_argument("Invalid latitude or longitude coordinate.");
    }

    const double phi1 = toRadians(lat1);
    const double phi2 = toRadians(lat2);
    const double dPhi = toRadians(lat2 - lat1);
    const double dLambda = toRadians(lon2 - lon1);

    const double sinLat = std::sin(dPhi / 2.0);
    const double sinLon = std::sin(dLambda / 2.0);

    double a = sinLat * sinLat + std::cos(phi1) * std::cos(phi2) * sinLon * sinLon;
    if (a < 0.0) a = 0.0;
    if (a > 1.0) a = 1.0;

    const double c = 2.0 * std::atan2(std::sqrt(a), std::sqrt(1.0 - a));
    return kEarthRadiusKm * c;
}

} // namespace flight
