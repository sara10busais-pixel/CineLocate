let movies = [];

fetch('cleaned_streaming_titles_final.csv')
  .then(response => response.text())
  .then(data => {
    const rows = data.split('\n').slice(1);
    movies = rows.map(row => {
      const cols = row.split(',');
      return {
        title: cols[0]?.trim(),
        type: cols[1]?.trim(),
        genre: cols[3]?.trim(),
        description: cols[4]?.trim(),
        platform: cols[6]?.trim(),
        decade: cols[7]?.trim(),
        duration: cols[8]?.trim(),
        seasons: cols[9]?.trim()
      };
    });
  });

function filterMovies() {
  const type = document.getElementById('typeFilter').value;
  const genre = document.getElementById('genreFilter')?.value?.toLowerCase() || "";
  const decade = document.getElementById('decadeFilter').value;
  const platform = document.getElementById('platformFilter').value;

  const filtered = movies.filter(movie => {
    return (
      (type === "All" || movie.type === type) &&
      (genre === "" || movie.genre?.toLowerCase().includes(genre)) &&
      (decade === "All" || movie.decade === decade) &&
      (platform === "All" || movie.platform === platform)
    );
  });

  displayMovies(filtered);
}

function searchTitle() {
  const input = document.getElementById('searchInput').value.toLowerCase().trim();
  const results = movies.filter(m => m.title && m.title.toLowerCase().includes(input));
  displayMovies(results);
}

function displayMovies(list) {
  const container = document.getElementById('resultsContainer');
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = "<p>No results found.</p>";
    return;
  }

  list.forEach(movie => {
    container.innerHTML += `
      <div class="result-card">
        <h3>${movie.title}</h3>
        <p><b>Type:</b> ${movie.type}</p>
        <p><b>Genre:</b> ${movie.genre}</p>
        <p><b>Platform:</b> ${movie.platform}</p>
        <p><b>Decade:</b> ${movie.decade}</p>
        <p><b>Duration:</b> ${movie.duration || "-"}</p>
        <p><b>Seasons:</b> ${movie.seasons || "-"}</p>
        <p><b>Description:</b> ${movie.description}</p>
      </div>
      <hr>
    `;
  });
}
