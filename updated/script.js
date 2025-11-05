// CineLocate — Keep original filters & results AND add optional search helper.

const CSV_PATH = "cleaned_streaming_titles_final.csv";
let DATA = [];

const FIELD = {
  title: "show_id",         // we will resolve robustly after reading headers
  type: "type",
  year: "release_year",
  duration: "duration",
  genre: "listed_in",
  description: "description",
  platformText: "platform", // fallback label text if flags missing
  decade: "decade",
  seasons: "seasons",
  disney: "disney+",
  hulu: "hulu",
  netflix: "netflix",
  prime: "prime_video",
};

// Utility
function splitGenres(val) {
  if (!val) return [];
  return String(val).split(/[,|/]/).map(s => s.trim()).filter(Boolean);
}
function normalizePlatforms(row) {
  const plats = [];
  if (FIELD.netflix && String(row[FIELD.netflix]).trim() === "1") plats.push("Netflix");
  if (FIELD.disney && String(row[FIELD.disney]).trim() === "1") plats.push("Disney+");
  if (FIELD.hulu && String(row[FIELD.hulu]).trim() === "1") plats.push("Hulu");
  if (FIELD.prime && String(row[FIELD.prime]).trim() === "1") plats.push("Amazon Prime");
  if (plats.length) return plats.join(", ");
  // fallback on text column if present
  if (FIELD.platformText && row[FIELD.platformText]) {
    const v = String(row[FIELD.platformText]).replace(/_/g, " ").trim();
    const low = v.toLowerCase();
    const map = {
      "prime video": "Amazon Prime",
      "amazon prime video": "Amazon Prime",
      "amazon": "Amazon Prime",
      "disney plus": "Disney+"
    };
    return map[low] || v;
  }
  return "";
}
function toDecade(year) {
  if (year == null) return "";
  const n = Number(String(year).replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n)) return "";
  return `${Math.floor(n / 10) * 10}s`;
}

// Build UI options
function populate(selectId, values, anyLabel = "Any") {
  const el = document.getElementById(selectId);
  el.innerHTML = `<option value="">${anyLabel}</option>` +
    Array.from(new Set(values.filter(Boolean))).sort()
      .map(v => `<option value="${v}">${v}</option>`).join("");
}

function currentFilters() {
  return {
    type: document.getElementById("typeSelect").value.trim(),
    genre: document.getElementById("genreSelect").value.trim(),
    decade: document.getElementById("decadeSelect").value.trim(),
    platform: document.getElementById("platformSelect").value.trim(),
  };
}

function rowMatchesFilters(r, f) {
  // type
  const okType = !f.type || String(r[FIELD.type]).trim().toLowerCase() === f.type.toLowerCase();
  // genre exact-in-list
  const rGenres = splitGenres(r[FIELD.genre]);
  const okGenre = !f.genre || rGenres.some(g => g.toLowerCase() === f.genre.toLowerCase());
  // decade
  const rDecade = r[FIELD.decade] ? String(r[FIELD.decade]) : toDecade(r[FIELD.year]);
  const okDecade = !f.decade || rDecade === f.decade;
  // platform
  const plats = normalizePlatforms(r).toLowerCase().split(",").map(s => s.trim());
  const okPlat = !f.platform || plats.includes(f.platform.toLowerCase());

  return okType && okGenre && okDecade && okPlat;
}

function renderResults(rows) {
  const box = document.getElementById("results");
  if (!rows.length) {
    box.innerHTML = `<p class="meta">No results found.</p>`;
    return;
  }
  box.innerHTML = rows.slice(0, 400).map(r => {
    const title = r[FIELD.title] || "(Untitled)";
    const type = r[FIELD.type] || "";
    const year = r[FIELD.year] || "";
    const decade = r[FIELD.decade] || toDecade(year);
    const genres = splitGenres(r[FIELD.genre]).join(", ");
    const plats = normalizePlatforms(r);
    const duration = r[FIELD.duration] || "";
    let seasons = r[FIELD.seasons] ? String(r[FIELD.seasons]) : "";
    if (!seasons || seasons === "0" || /^nan$/i.test(seasons) || /^none$/i.test(seasons)) seasons = "—";
    const desc = r[FIELD.description] || "";

    return `
      <article class="card">
        <h3>🎬 ${title}</h3>
        <div class="meta">🎞️ ${[type, genres].filter(Boolean).join(" • ")}</div>
        <div class="meta">🗓 ${[year, decade, plats].filter(Boolean).join(" • ")}</div>
        <div class="meta">⏱ ${duration || "—"} &nbsp;&nbsp; 📺 ${seasons}</div>
        <p class="desc">${desc}</p>
      </article>
    `;
  }).join("");
}

function rebuildGenreOptions(data) {
  const { type, platform } = currentFilters();
  const set = new Set();
  data.forEach(r => {
    if (type && String(r[FIELD.type] || "").toLowerCase() !== type.toLowerCase()) return;
    if (platform) {
      const plats = normalizePlatforms(r).toLowerCase().split(",").map(s => s.trim());
      if (!plats.includes(platform.toLowerCase())) return;
    }
    splitGenres(r[FIELD.genre]).forEach(g => set.add(g));
  });
  populate("genreSelect", Array.from(set));
}

function initUI() {
  // Type
  populate("typeSelect",
    Array.from(new Set(DATA.map(r => String(r[FIELD.type] || "").trim()).filter(Boolean))));
  // Decade
  const decades = Array.from(new Set(DATA.map(r => r[FIELD.decade] || toDecade(r[FIELD.year]))))
    .filter(Boolean);
  populate("decadeSelect", decades);
  // Genre (dynamic based on selected type/platform)
  rebuildGenreOptions(DATA);

  // Bind events
  document.getElementById("typeSelect").addEventListener("change", () => { rebuildGenreOptions(DATA); });
  document.getElementById("platformSelect").addEventListener("change", () => { rebuildGenreOptions(DATA); });

  document.getElementById("applyBtn").addEventListener("click", () => {
    const f = currentFilters();
    const filtered = DATA.filter(r => rowMatchesFilters(r, f));
    renderResults(filtered);
  });

  // Optional search helper — shows results in its own box, does NOT replace main list.
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      const q = document.getElementById("searchInput").value.trim().toLowerCase();
      const box = document.getElementById("searchResults");
      if (!q) { box.innerHTML = ""; return; }
      const found = DATA.filter(r => String(r[FIELD.title] || "").toLowerCase().includes(q)).slice(0, 30);
      if (!found.length) { box.innerHTML = `<p class="meta">No matches.</p>`; return; }
      box.innerHTML = found.map(r => {
        const title = r[FIELD.title] || "(Untitled)";
        const plats = normalizePlatforms(r) || "—";
        const duration = r[FIELD.duration] || "";
        let seasons = r[FIELD.seasons] ? String(r[FIELD.seasons]) : "";
        if (!seasons || seasons === "0" || /^nan$/i.test(seasons) || /^none$/i.test(seasons)) seasons = "—";
        const desc = r[FIELD.description] || "";
        return `
          <div class="s-card">
            <div><strong>🎬 ${title}</strong></div>
            <div>📺 Platforms: ${plats}</div>
            <div>⏱ ${duration || "—"} &nbsp;&nbsp; 📺 ${seasons}</div>
            <div>🧾 ${desc}</div>
          </div>
        `;
      }).join("");
    });
  }

  // Show initial recommendations (like before):
  renderResults(DATA.slice(0, 100)); // initial feed can show some titles
}

function pickField(headers, candidates) {
  for (const c of candidates) {
    const idx = headers.findIndex(h => h.toLowerCase().trim() === c);
    if (idx !== -1) return headers[idx];
  }
  return null;
}

async function loadCSV() {
  const res = await fetch(CSV_PATH);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data;
  if (!rows.length) { console.warn("CSV empty"); return; }

  const headers = parsed.meta.fields.map(h => h?.trim() || "");

  // Resolve fields robustly to YOUR CSV
  FIELD.title       = pickField(headers, ["show_id","title","name"]) || "show_id";
  FIELD.type        = pickField(headers, ["type","content_type"]) || "type";
  FIELD.genre       = pickField(headers, ["listed_in","genre","genres"]) || "listed_in";
  FIELD.year        = pickField(headers, ["release_year","year"]) || "release_year";
  FIELD.duration    = pickField(headers, ["duration","runtime","runtime_minutes","duration_class"]) || "duration";
  FIELD.description = pickField(headers, ["description","overview","summary"]) || "description";
  FIELD.platformText= pickField(headers, ["platform","service"]) || "platform";
  FIELD.decade      = pickField(headers, ["decade"]) || "decade";
  FIELD.seasons     = pickField(headers, ["seasons","num_seasons"]) || "seasons";
  FIELD.disney      = pickField(headers, ["disney+","disney_plus","disney"]) || "disney+";
  FIELD.hulu        = pickField(headers, ["hulu"]) || "hulu";
  FIELD.netflix     = pickField(headers, ["netflix"]) || "netflix";
  FIELD.prime       = pickField(headers, ["prime_video","amazon_prime","amazon"]) || "prime_video";

  // Normalize year numeric + type casing
  rows.forEach(r => {
    if (FIELD.year && r[FIELD.year] != null) {
      const num = Number(String(r[FIELD.year]).replace(/[^0-9]/g,'')); 
      r[FIELD.year] = Number.isFinite(num) ? num : null;
    }
    if (FIELD.type && r[FIELD.type]) {
      const t = String(r[FIELD.type]).trim().toLowerCase();
      r[FIELD.type] = (t === "movie") ? "Movie" : (t.includes("tv") ? "TV Show" : r[FIELD.type]);
    }
  });

  DATA = rows;
  initUI();
}

document.addEventListener("DOMContentLoaded", () => {
  loadCSV().catch(e => console.error("Failed to load CSV", e));
});
