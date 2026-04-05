import axios from "axios";

const apiCandidates = [
  import.meta.env.VITE_API_BASE_URL,
  "/api",
  "http://127.0.0.1:5000/api",
  "http://localhost:5000/api"
].filter(Boolean);

let activeBaseUrl = apiCandidates[0];

function shouldRetry(error) {
  if (!error) return false;
  if (error.code === "ECONNABORTED") return true;
  if (!error.response) return true;
  return error.response.status >= 500;
}

async function withFallback(call) {
  let lastError = null;
  for (const baseURL of apiCandidates) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await call(baseURL);
        activeBaseUrl = baseURL;
        return response;
      } catch (error) {
        lastError = error;
        if (!shouldRetry(error)) break;
      }
    }
  }
  throw lastError || new Error("Unable to reach API server");
}

async function apiGet(url, config = {}) {
  const response = await withFallback((baseURL) => axios.get(`${baseURL}${url}`, { timeout: 12000, ...config }));
  return response.data;
}

async function apiPost(url, body, config = {}) {
  const response = await withFallback((baseURL) => axios.post(`${baseURL}${url}`, body, { timeout: 20000, ...config }));
  return response;
}

export async function fetchDashboard() { return apiGet("/dashboard"); }
export async function uploadUfdr(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiPost("/upload-ufdr", formData);
  return response.data;
}
export async function runQuery(question, scope = { sourceScope: "latest", sourceFile: "" }) {
  const response = await apiPost("/query", { question, sourceScope: scope.sourceScope, sourceFile: scope.sourceFile });
  return response.data;
}
export async function fetchQueryExamples() { const data = await apiGet("/query/examples"); return data.examples || []; }
export async function fetchQuerySources() { const data = await apiGet("/query/sources"); return data.sources || []; }
export async function fetchLinks(scope = { sourceScope: "latest", sourceFile: "" }) {
  return apiGet("/links", { params: { sourceScope: scope.sourceScope, sourceFile: scope.sourceFile } });
}
export async function fetchLocations(scope = { sourceScope: "latest", sourceFile: "" }) {
  return apiGet("/locations", { params: { sourceScope: scope.sourceScope, sourceFile: scope.sourceFile } });
}
export async function fetchReports(scope = { sourceScope: "all", sourceFile: "" }) {
  return apiGet("/reports", { params: { sourceScope: scope.sourceScope, sourceFile: scope.sourceFile } });
}
export async function generateReport(payload) {
  const response = await apiPost("/reports/generate", payload, { responseType: "blob" });
  const contentDisposition = response.headers["content-disposition"] || "";
  const match = contentDisposition.match(/filename=\\"?([^\\";]+)\\"?/i);
  const filename = match?.[1] || "Investigation_Report.pdf";
  return { blob: response.data, filename };
}
export async function fetchSuspects() { const data = await apiGet("/suspects"); return data.suspects || []; }
export async function fetchSuspectProfile(number) { return apiGet("/suspects/profile", { params: { number } }); }
export async function generateAiSummary() { const response = await apiPost("/dashboard/ai-summary", {}); return response.data; }
export function getActiveApiBaseUrl() { return activeBaseUrl; }
