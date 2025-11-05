let csvData = [];

fetch('cleaned_streaming_titles_final.csv')
  .then(response => response.text())
  .then(data => {
    const rows = data.split('\n').slice(1);
    csvData = rows.map(row => {
      const cols = row.split(',');
      return {
        title: cols[1]?.trim(),
        type: cols[2]?.trim(),
        release_year: cols[3]?.trim(),
        duration: cols[4]?.trim(),
        genre: cols[5]?.trim(),
        description: cols[6]?.trim(),
        disney: cols[11]?.trim(),
        hulu: cols[12]?.trim(),
        netflix: cols[13]?.trim(),
        prime: cols[14]?.trim(),
        seasons: cols[10]?.trim()
      };
    });
    populateFilters();
  });

function populateFilters() {
  const genres = [...new Set(csvData.map(d => d.genre).filter(Boolean))];
  const genreSelect = document.getElementById('genreFilter');
  genres.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    genreSelect.appendChild(opt);
  });

  const decades = [...new Set(csvData.map(d => d.release_year?.slice(0,3) + '0s').filter(Boolean))];
  const decadeSelect = document.getElementById('decadeFilter');
  decades.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.slice(0,3);
    opt.textContent = d;
    decadeSelect.appendChild(opt);
  });
}

function searchTitle() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const results = csvData.filter(item => item.title?.toLowerCase().includes(query));
  displayResults(results);
}

function filterData() {
  const type = document.getElementById('typeFilter').value;
  const genre = document.getElementById('genreFilter').value;
  const decade = document.getElementById('decadeFilter').value;
  const platform = document.getElementById('platformFilter').value;

  const results = csvData.filter(item => {
    let matches = true;
    if (type && item.type !== type) matches = false;
    if (genre && !item.genre.includes(genre)) matches = false;
    if (decade && !item.release_year.startsWith(decade)) matches = false;
    if (platform) {
      if (platform === 'Netflix' && item.netflix !== '1') matches = false;
      if (platform === 'Hulu' && item.hulu !== '1') matches = false;
      if (platform === 'Disney+' && item.disney !== '1') matches = false;
      if (platform === 'Prime Video' && item.prime !== '1') matches = false;
    }
    return matches;
  });

  displayResults(results);
}

function displayResults(data) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';
  if (!data.length) {
    resultsDiv.innerHTML = '<p>No results found.</p>';
    return;
  }
  data.forEach(item => {
    const card = document.createElement('div');
    card.classList.add('result-card');
    card.innerHTML = `
      <h2>🎬 ${item.title || 'Unknown Title'}</h2>
      <p>🎞️ Type: ${item.type || 'N/A'}</p>
      <p>📺 Platforms: ${getPlatforms(item)}</p>
      <p>⏱ Duration: ${item.duration || item.seasons || '—'}</p>
      <p>📆 Year: ${item.release_year || '—'}</p>
      <p>🧾 Description: ${item.description || 'No description available.'}</p>
    `;
    resultsDiv.appendChild(card);
  });
}

function getPlatforms(item) {
  const platforms = [];
  if (item.netflix === '1') platforms.push('Netflix');
  if (item.hulu === '1') platforms.push('Hulu');
  if (item.disney === '1') platforms.push('Disney+');
  if (item.prime === '1') platforms.push('Prime Video');
  return platforms.length ? platforms.join(', ') : '—';
}
