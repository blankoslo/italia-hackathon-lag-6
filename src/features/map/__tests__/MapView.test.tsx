import React from "react";
import { render, screen } from "@testing-library/react";
import { MapViewClient } from "../MapViewClient";

const mockFlyTo = jest.fn();
const mockAddLayer = jest.fn();
const mockRemoveLayer = jest.fn();

jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: ({ attribution, url }: { attribution: string; url: string }) => (
    <div data-testid="tile-layer" data-attribution={attribution} data-url={url} />
  ),
  useMap: () => ({
    flyTo: mockFlyTo,
    addLayer: mockAddLayer,
    removeLayer: mockRemoveLayer,
  }),
}));

beforeEach(() => {
  mockFlyTo.mockClear();
  mockAddLayer.mockClear();
  mockRemoveLayer.mockClear();
});

describe("MapViewClient", () => {
  it("renders the map container and Kartverket tile layer", () => {
    render(<MapViewClient location={null} />);

    expect(screen.getByTestId("map-container")).toBeInTheDocument();

    const tile = screen.getByTestId("tile-layer");
    expect(tile).toHaveAttribute("data-attribution", "© Kartverket");
    expect(tile.getAttribute("data-url")).toContain("cache.kartverket.no");
  });

  it("does not call flyTo when no location is set", () => {
    render(<MapViewClient location={null} />);
    expect(mockFlyTo).not.toHaveBeenCalled();
  });

  it("calls flyTo with the correct coordinates when a location is provided", () => {
    render(
      <MapViewClient location={{ lat: 59.9139, lon: 10.7522, name: "Oslo" }} />
    );
    expect(mockFlyTo).toHaveBeenCalledWith(
      [59.9139, 10.7522],
      12,
      expect.any(Object)
    );
  });
});
