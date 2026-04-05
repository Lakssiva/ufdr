const COUNTRY_CENTROIDS = {
  IN: { lat: 20.5937, lon: 78.9629 },
  US: { lat: 37.0902, lon: -95.7129 },
  GB: { lat: 55.3781, lon: -3.4360 },
  AE: { lat: 23.4241, lon: 53.8478 },
  PK: { lat: 30.3753, lon: 69.3451 },
  CN: { lat: 35.8617, lon: 104.1954 },
  RU: { lat: 61.5240, lon: 105.3188 },
  DE: { lat: 51.1657, lon: 10.4515 },
  FR: { lat: 46.2276, lon: 2.2137 },
  SG: { lat: 1.3521, lon: 103.8198 }
};

function extractGeo(metadata) {
  if (!metadata) return null;
  const lat = parseFloat(metadata.lat || metadata.latitude || metadata.Latitude || "");
  const lon = parseFloat(metadata.lon || metadata.longitude || metadata.Longitude || "");
  if (isFinite(lat) && isFinite(lon)) return { lat, lon, precision: "gps" };
  return null;
}

function resolveCountryCentroid(country) {
  if (!country) return null;
  const code = country.trim().toUpperCase();
  return COUNTRY_CENTROIDS[code] || null;
}

module.exports = { extractGeo, resolveCountryCentroid };
