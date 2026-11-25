cmake_minimum_required(VERSION 3.16)
project(flight_route_optimizer_cpp VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(flight_engine
    src/Graph.cpp
    src/Dijkstra.cpp
    src/AStar.cpp
)

target_include_directories(flight_engine
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

if(MSVC)
    target_compile_options(flight_engine PRIVATE /W4)
else()
    target_compile_options(flight_engine PRIVATE -Wall -Wextra -Wpedantic)
endif()

add_executable(flight_optimizer_cli src/main.cpp)
target_link_libraries(flight_optimizer_cli PRIVATE flight_engine)

enable_testing()
add_executable(test_flight_engine tests/test_engine.cpp)
target_link_libraries(test_flight_engine PRIVATE flight_engine)
add_test(NAME FlightEngineUnitTests COMMAND test_flight_engine)
