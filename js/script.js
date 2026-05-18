
// javascript/script.js
const API = "https://pokeapi.co/api/v2";

// --- Helper: fetch JSON con manejo de errores
const fetchJson = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
    return await res.json();
  } catch (err) {
    console.warn(`fetchJson error: ${err}`);
    return null;
  }
};

// --- Obtener datos de un Pokémon
const getPokemonData = async (name) => {
  try {
    const pokemon = await fetchJson(`${API}/pokemon/${name}`);
    const species = await fetchJson(`${API}/pokemon-species/${name}`);
    if (!pokemon || !species) return null;

    const image = pokemon.sprites?.other?.["official-artwork"]?.front_default || pokemon.sprites.front_default || null;

    // descripción: preferencia español -> inglés -> primer disponible
    let description = "Sin descripción.";
    const entries = species.flavor_text_entries || [];
    for (const e of entries) {
      if (e.language?.name === "es") { description = e.flavor_text; break; }
    }
    if (description === "Sin descripción." && entries.length > 0) description = entries[0].flavor_text;

    const types = (pokemon.types || []).map(t => t.type.name).join(", ") || "N/A";
    const height = pokemon.height != null ? `${pokemon.height / 10} m` : "N/A";
    const weight = pokemon.weight != null ? `${pokemon.weight / 10} kg` : "N/A";

    return { name: pokemon.name, image, description: description.replace(/\n|\f/g, " ").trim(), types, height, weight };
  } catch (err) {
    console.warn(`getPokemonData failed for ${name}: ${err}`);
    return null;
  }
};

// --- Cargar icons del nav

const loadNavIcons = async () => {
  try {
    // Traemos la Pokebola y los Pokémon iniciales
    const [pokeball, s, c, b, p] = await Promise.all([
      fetchJson(`${API}/item/1`),         // Pokebola
      getPokemonData("squirtle"),
      getPokemonData("charmander"),
      getPokemonData("bulbasaur"),
      getPokemonData("pikachu")
    ]);

    // Logo principal -> Pokebola
    if (pokeball?.sprites?.default) {
      document.getElementById("nav-icon-home").src = pokeball.sprites.default;
    } else {
      document.getElementById("nav-icon-home").src =
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";
    }

    // Resto de iconos
    if (s?.image) document.getElementById("nav-icon-1").src = s.image;
    if (c?.image) document.getElementById("nav-icon-2").src = c.image;
    if (b?.image) document.getElementById("nav-icon-3").src = b.image;
    if (p?.image) document.getElementById("nav-icon-4").src = p.image;
  } catch (err) {
    console.warn(`loadNavIcons failed: ${err}`);
  }
};


// --- fondo del hero
const setHeroBackground = async (name="pikachu") => {
  try {
    const p = await getPokemonData(name);
    const hero = document.querySelector(".hero");
    if (p?.image && hero) hero.style.backgroundImage = `url("${p.image}")`;
  } catch (err) {
    console.warn(`setHeroBackground failed: ${err}`);
  }
};

// ---  8 Pokémones de una generación
const getGenerationPokemons = async (genId, limit=8) => {
  const gen = await fetchJson(`${API}/generation/${genId}`);
  if (!gen) return [];
  const species = (gen.pokemon_species || []).slice(0, limit);
  const results = await Promise.all(species.map(s => getPokemonData(s.name)));
  return results.filter(r => r !== null);
};

// --- Renderizar carrusel de generaciones
const renderGenerations = (gensArrays) => {
  const container = document.getElementById("carouselContent");
  container.innerHTML = "";

  gensArrays.forEach((pokemons, idx) => {
    const active = idx === 0 ? "active" : "";
    const cardsHtml = pokemons.map(p => `
      <div class="col-12 col-sm-6 col-lg-3 col-md-4 mb-4 d-flex">
        <div class="card flex-fill">
          <img src="${p.image || 'https://via.placeholder.com/140x140?text=No+Image'}" class="card-img-top" alt="${p.name}">
          <div class="card-body d-flex flex-column">
            <div>
              <h6 class="card-title text-capitalize">${p.name}</h6>
              <p class="poke-desc">${p.description}</p>
            </div>
            <div class=" text-muted-small ">
              <div>Tipo: ${p.types}</div>
              <div>Alt: ${p.height} • Peso: ${p.weight}</div>
            </div>
          </div>
        </div>
      </div>`).join("");

    const slide = `<div class="carousel-item ${active}"><div class="row gx-3">${cardsHtml}</div></div>`;
    container.insertAdjacentHTML("beforeend", slide);
  });
};

// --- Regiones
const regionImages = {
  kanto: "https://archives.bulbagarden.net/media/upload/thumb/7/7d/PE_Kanto_Map.png/800px-PE_Kanto_Map.png",
  johto: "https://archives.bulbagarden.net/media/upload/thumb/6/64/JohtoMap.png/800px-JohtoMap.png",
  hoenn: "https://archives.bulbagarden.net/media/upload/thumb/8/85/Hoenn_ORAS.png/300px-Hoenn_ORAS.png"
};

const loadRegions = async (ids=[1,2,3]) => {
  const container = document.getElementById("regionsContainer");
  container.innerHTML = "";
  for (const id of ids) {
    const r = await fetchJson(`${API}/region/${id}`);
    if (!r) continue;
    const key = r.name.toLowerCase();
    const img = regionImages[key] || "https://via.placeholder.com/300x180?text=Region";
    const html = `
      <div class="col-12 col-sm-4 col-md-4 mb-4 d-flex">
        <div class="card flex-fill text-center p-3">
          <img src="${img}" class="region-img" alt="${r.name}">
          <div class="card-body">
            <h5 class="card-title text-capitalize">${r.name}</h5>
            <p class="text-muted-small">Localizaciones: ${r.locations?.length ?? 0}</p>
            <p class="text-muted-small">Generación: ${r.main_generation?.name ?? "N/A"}</p>
          </div>
        </div>
      </div>`;
    container.insertAdjacentHTML("beforeend", html);
  }
};

// --- Items no tiene texto en español solo en los coste
const loadItems = async (ids=[1,2,3,4,5,6]) => {
  const container = document.getElementById("itemsContainer");
  container.innerHTML = "";
  for (const id of ids) {
    const it = await fetchJson(`${API}/item/${id}`);
    if (!it) continue;
    const img = it.sprites?.default || "https://via.placeholder.com/140x140?text=Item";
    const effect = (it.effect_entries || []).find(e => e.language?.name === "en")?.short_effect || "Sin descripción";
    const html = `
      <div class="col-12 col-sm-6 col-md-4 col-lg-4 mb-4 d-flex">
        <div class="card flex-fill text-center p-2">
          <img src="${img}" class="item-img" alt="${it.name}">
          <div class=" card-body">
            <h6 class="card-title text-capitalize">${it.name}</h6>
            <p class="text-muted-small">${effect}</p>
            <p class="text-muted-small">Coste: ${it.cost ?? "N/A"}</p>
          </div>
        </div>
      </div>`;
    container.insertAdjacentHTML("beforeend", html);
  }
};

// --- Inicialización principal
(async () => {
  try {
    await loadNavIcons();
    await setHeroBackground("pikachu");

    const [g1, g2, g3] = await Promise.all([
      getGenerationPokemons(1,8),
      getGenerationPokemons(2,8),
      getGenerationPokemons(3,8)
    ]);
    renderGenerations([g1,g2,g3]);

    await loadRegions([1,2,3]);
    await loadItems([1,2,3,4,5,6]);
  } catch (err) {
    console.error(`Init failed: ${err}`);
  }
})();
