import { searchPlaces } from "../kartverket";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => mockFetch.mockClear());

describe("searchPlaces", () => {
  it("returns an empty array for an empty query without calling the API", async () => {
    const result = await searchPlaces("");
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls the local proxy with the encoded query", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    await searchPlaces("Oslo");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toBe("/api/places?q=Oslo");
  });

  it("returns the parsed place array from the proxy response", async () => {
    const mockPlaces = [
      { name: "Bergen", lat: 60.3928, lon: 5.3241 },
      { name: "Bergens museum", lat: 60.3801, lon: 5.3267 },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlaces,
    });

    const places = await searchPlaces("Bergen");

    expect(places).toHaveLength(2);
    expect(places[0]).toEqual({ name: "Bergen", lat: 60.3928, lon: 5.3241 });
  });

  it("throws a descriptive error when the proxy responds with an error status", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(searchPlaces("Tromsø")).rejects.toThrow("Search failed: 503");
  });
});

// Integration test — makes a real network call via the Next.js proxy.
// Run with: INTEGRATION=true npx jest
const RUN_INTEGRATION = process.env.INTEGRATION === "true";

(RUN_INTEGRATION ? describe : describe.skip)(
  "Kartverket Stedsnavn API (integration)",
  () => {
    it("returns real results for 'Bergen'", async () => {
      const places = await searchPlaces("Bergen");
      expect(places.length).toBeGreaterThan(0);
      expect(places[0]).toMatchObject({
        name: expect.any(String),
        lat: expect.any(Number),
        lon: expect.any(Number),
      });
      expect(places[0].lat).toBeGreaterThan(55);
      expect(places[0].lon).toBeGreaterThan(4);
    }, 10_000);
  }
);
