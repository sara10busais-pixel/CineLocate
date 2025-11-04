// Cine Locate — Robust CSV parsing + platform flags + details + dynamic genres
const CSV_PATH = "cleaned_streaming_titles_final.csv";

let DATA = [];
const FIELD = {
  title: null,
  type: null,
  genre: null,
  year: null,
  duration: null,
  seasons: null,
  description: null,
  platform: null,
  netflix: null,
  hulu: null,
  prime: null,
  disney: null,
};

function pickField(headers, candidates){
  for(const cand of candidates){
    const idx = headers.findIndex(h => h.toLowerCase().trim() === cand);
    if(idx !== -1) return headers[idx];
  }
  return null;
}

function toDecade(y){
  const n = Number(y);
  if(!Number.isFinite(n)) return "";
  return `${Math.floor(n/10)*10}s`;
}

function normalizePlatform(row){
  // Prefer explicit flags, otherwise fallback to 'platform' text column
  const flags = [];
  if(FIELD.netflix && String(row[FIELD.netflix]).trim() === "1") flags.push("Netflix");
  if(FIELD.disney && String(row[FIELD.disney]).trim() === "1") flags.push("Disney+");
  if(FIELD.hulu && String(row[FIELD.hulu]).trim() === "1") flags.push("Hulu");
  if(FIELD.prime && String(row[FIELD.prime]).trim() === "1") flags.push("Amazon Prime");

  if(flags.length) return flags.join(", ");

  if(FIELD.platform){
    const v = String(row[FIELD.platform] ?? "").replace(/_/g, " ").trim();
    const map = { "prime video":"Amazon Prime", "amazon":"Amazon Prime", "amazon prime video":"Amazon Prime", "disney plus":"Disney+" };
    const low = v.toLowerCase();
    return map[low] ?? v;
  }
  return "";
}

function rowHasPlatform(row, selected){
  if(!selected) return true;
  const plat = normalizePlatform(row).toLowerCase().split(",").map(s => s.trim());
  const wanted = selected.toLowerCase();
  return plat.includes(wanted);
}

function splitGenres(val){
  if(val == null) return [];
  return String(val).split(/[,|/]/).map(x => x.trim()).filter(Boolean);
}

// Build genre list based on current platform + type so we remove "broken" ones
function availableGenres(data, platform, type){
  const set = new Set();
  data.forEach(r => {
    if(!rowHasPlatform(r, platform)) return;
    if(type && String(r[FIELD.type] ?? "").toLowerCase() !== type.toLowerCase()) return;
    splitGenres(r[FIELD.genre]).forEach(g => set.add(g));
  });
  return Array.from(set).sort();
}

function populateOptions(sel, values, anyLabel="Any"){
  const el = document.getElementById(sel);
  const uniq = Array.from(new Set(values.filter(Boolean))).sort();
  el.innerHTML = `<option value="">${anyLabel}</option>` + uniq.map(v => `<option value="${v}">${v}</option>`).join("");
}

function renderResults(rows){
  const box = document.getElementById("results");
  if(rows.length === 0){
    box.innerHTML = `<p class="meta">No results found.</p>`;
    return;
  }
  box.innerHTML = rows.map(r => {
    const title = r[FIELD.title] ?? "(Untitled)";
    const type = r[FIELD.type] ?? "";
    const year = r[FIELD.year] ?? "";
    const platform = normalizePlatform(r);
    const genres = FIELD.genre ? splitGenres(r[FIELD.genre]).join(", ") : "";
    const decade = toDecade(year);

    // Duration vs Seasons
    const duration = r[FIELD.duration] ? String(r[FIELD.duration]) : "";
    let seasons = r[FIELD.seasons] ? String(r[FIELD.seasons]) : "";
    if(!seasons || seasons === "0" || seasons === "nan" || seasons.toLowerCase() === "none") seasons = "—";

    const description = r[FIELD.description] ? String(r[FIELD.description]) : "";

    return `
      <article class="card">
        <h3>🎬 ${title}</h3>
        <div class="meta">🎞️ ${[type, genres].filter(Boolean).join(" • ")}</div>
        <div class="meta">🗓 ${[year, decade, platform].filter(Boolean).join(" • ")}</div>
        <div class="meta">⏱ ${duration || "—"} &nbsp;&nbsp; 📺 ${seasons}</div>
        <p class="desc">${description}</p>
      </article>
    `;
  }).join("");
}

function applyFilters(){
  const type = document.getElementById("typeSelect").value.trim();
  const genre = document.getElementById("genreSelect").value.trim();
  const decade = document.getElementById("decadeSelect").value.trim();
  const platform = document.getElementById("platformSelect").value.trim();

  const filtered = DATA.filter(r => {
    const rType = String(r[FIELD.type] ?? "").trim();
    const rYear = r[FIELD.year];
    const rDecade = toDecade(rYear);
    const rGenres = FIELD.genre ? splitGenres(r[FIELD.genre]) : [];
    const okType = !type || rType.toLowerCase() === type.toLowerCase();
    const okGenre = !genre || rGenres.some(g => g.toLowerCase() === genre.toLowerCase());
    const okDecade = !decade || rDecade === decade;
    const okPlat = rowHasPlatform(r, platform);
    return okType && okGenre && okDecade && okPlat;
  });

  renderResults(filtered.slice(0, 400));
}

// Update genre dropdown to only show genres that actually exist for the selected platform/type
function refreshGenreOptions(){
  const platform = document.getElementById("platformSelect").value.trim();
  const type = document.getElementById("typeSelect").value.trim();
  const gens = availableGenres(DATA, platform, type);
  populateOptions("genreSelect", gens);
}

function initUI(){
  // Populate Type options
  const types = Array.from(new Set(DATA.map(r => String(r[FIELD.type] ?? "").trim()).filter(Boolean))).sort();
  populateOptions("typeSelect", types);

  // Populate Decades
  const decades = Array.from(new Set(DATA.map(r => toDecade(r[FIELD.year])))).filter(Boolean).sort();
  populateOptions("decadeSelect", decades);

  refreshGenreOptions(); // initial

  // Bind handlers
  document.getElementById("searchBtn").addEventListener("click", applyFilters);
  document.getElementById("platformSelect").addEventListener("change", () => { refreshGenreOptions(); });
  document.getElementById("typeSelect").addEventListener("change", () => { refreshGenreOptions(); });
}

async function loadCSV(){
  const res = await fetch(CSV_PATH);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data;
  if(rows.length === 0){ console.warn("CSV appears empty."); return; }

  const headers = parsed.meta.fields.map(h => h || "").map(h => h.trim());

  FIELD.title       = pickField(headers, ["title","show_id","name"]);
  FIELD.type        = pickField(headers, ["type","content_type"]);
  FIELD.genre       = pickField(headers, ["listed_in","genre","genres","category"]);
  FIELD.year        = pickField(headers, ["release_year","year","date_added_year"]);
  FIELD.duration    = pickField(headers, ["duration","runtime","minutes","runtime_minutes","duration_class"]);
  FIELD.seasons     = pickField(headers, ["seasons","season","num_seasons"]);
  FIELD.description = pickField(headers, ["description","overview","summary"]);
  FIELD.platform    = pickField(headers, ["platform","service"]);
  FIELD.netflix     = pickField(headers, ["netflix"]);
  FIELD.hulu        = pickField(headers, ["hulu"]);
  FIELD.prime       = pickField(headers, ["prime_video","amazon_prime","amazon","amazon prime video"]);
  FIELD.disney      = pickField(headers, ["disney+","disney_plus","disney"]);

  // Clean numeric year
  rows.forEach(r => {
    if(FIELD.year){
      const num = Number(String(r[FIELD.year]).replace(/[^0-9]/g,''));
      r[FIELD.year] = Number.isFinite(num) ? num : null;
    }
    // Normalize type casing
    if(FIELD.type && r[FIELD.type]){
      const t = String(r[FIELD.type]).trim().toLowerCase();
      r[FIELD.type] = (t === "movie" ? "Movie" : (t.includes("tv") ? "TV Show" : r[FIELD.type]));
    }
  });

  DATA = rows;
  initUI();
  renderResults(DATA.slice(0, 100));
}

document.addEventListener("DOMContentLoaded", () => {
  loadCSV().catch(err => console.error("Failed to load CSV:", err));
});
