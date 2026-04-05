import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { fetchLocations, fetchQuerySources } from "../api/client";

function GeoMapPage() {
  const [data, setData] = useState({ points: [], stats: {} });
  const [sources, setSources] = useState([]);
  const [sourceScope, setSourceScope] = useState("latest");
  const [selectedSourceFile, setSelectedSourceFile] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchQuerySources().then((items) => { setSources(items); if (items[0]?.sourceFile) setSelectedSourceFile(items[0].sourceFile); }).catch(() => setSources([]));
  }, []);

  useEffect(() => {
    fetchLocations({ sourceScope, sourceFile: sourceScope === "file" ? selectedSourceFile : "" })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [sourceScope, selectedSourceFile]);

  const points = data.points || [];
  const stats = data.stats || {};

  return (
    <section className="page">
      <header className="page-header"><h1>Geolocation Map</h1><p>Geographic distribution of evidence records</p></header>
      <section className="panel panel-highlight">
        <div className="formats">
          <label>Scope:<select value={sourceScope} onChange={(e) => setSourceScope(e.target.value)} style={{ marginLeft: "0.5rem" }}><option value="latest">Latest uploaded file</option><option value="file">Specific file</option><option value="all">All records</option></select></label>
          {sourceScope === "file" && <label>File:<select value={selectedSourceFile} onChange={(e) => setSelectedSourceFile(e.target.value)} style={{ marginLeft: "0.5rem" }}>{sources.map((item) => <option key={item.sourceFile} value={item.sourceFile}>{item.sourceFile} ({item.count})</option>)}</select></label>}
        </div>
      </section>
      <div className="mini-grid">
        <article className="mini-card"><h4>Total Records</h4><h2>{stats.totalRecords || 0}</h2></article>
        <article className="mini-card"><h4>GPS Points</h4><h2>{stats.withGeo || 0}</h2></article>
        <article className="mini-card"><h4>Country Points</h4><h2>{stats.withCountry || 0}</h2></article>
        <article className="mini-card"><h4>Unique Locations</h4><h2>{stats.points || 0}</h2></article>
      </div>
      {error && <p className="error">{error}</p>}
      <section className="panel">
        <div className="google-map-wrapper">
          {points.length > 0 ? (
            <MapContainer center={[20, 78]} zoom={4} className="leaflet-map">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
              {points.map((pt) => (
                <CircleMarker key={pt.id} center={[pt.lat, pt.lon]} radius={Math.min(20, 5 + pt.count)} color={pt.precision === "gps" ? "#4493f8" : "#3fb950"} fillOpacity={0.7}>
                  <Popup><strong>{pt.count} record(s)</strong><br />{pt.precision}<br />{pt.examples.map((e, i) => <span key={i}>{e.type} {e.from} → {e.to}<br /></span>)}</Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          ) : (
            <div className="map-overlay"><p>No geo data available. Upload a file with lat/lon or country fields.</p></div>
          )}
        </div>
      </section>
    </section>
  );
}

export default GeoMapPage;
