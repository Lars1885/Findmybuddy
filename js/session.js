// js/session.js
// Hjælpefunktioner til en 100% midlertidig session (ingen localStorage/sessionStorage).

function fmbGetParams() {
  return new URLSearchParams(window.location.search);
}

function fmbBuildUrl(path, state = {}) {
  const params = new URLSearchParams();

  Object.entries(state).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function fmbNavigate(path, state = {}) {
  window.location.href = fmbBuildUrl(path, state);
}
