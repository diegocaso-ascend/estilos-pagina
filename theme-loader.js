// ============================================================
// ASCEND THEME LOADER
// Carga automáticamente el tema CSS según el locationId
// ============================================================

(() => {
  const GITHUB_OWNER = 'diegocaso-ascend';
  const CACHE_KEY = 'ascend_theme_cache_v1';
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

  // Mapeo de temas a repos (debe coincidir con el Worker de Cloudflare)
  const THEME_REPOS = [
    'ascend-style-white',           // Tema 1
    'ascend-style-Black-Purple',    // Tema 2
    'ascend-style-Dark-Navy',       // Tema 3
    'ascend-style-Dark-Green',      // Tema 4
    'ascend-style-Dark-Gray',       // Tema 5
    'ascend-style-Dark-Night'       // Tema 6
  ];

  let appliedTheme = null;

  // Obtener locationId de la URL o localStorage
  function getLocationId() {
    const match = location.href.match(/\/location\/([a-zA-Z0-9]+)/);
    if (match?.[1]) return match[1];
    
    const params = new URLSearchParams(location.search);
    return params.get('locationId') || 
           params.get('location') || 
           localStorage.getItem('locationId');
  }

  // Buscar en qué repo está el locationId
  async function findThemeForLocation(locationId) {
    try {
      // Verificar caché
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && 
          cached.locationId === locationId && 
          (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        return cached.theme;
      }

      // Buscar en todos los repos
      for (const repo of THEME_REPOS) {
        const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${repo}/main/clients.json?t=${Date.now()}`;
        
        try {
          const response = await fetch(url, { cache: 'no-store' });
          if (!response.ok) continue;
          
          const data = await response.json();
          const client = data.clients?.find(c => 
            c.locationId === locationId || c.accountId === locationId
          );
          
          if (client) {
            const themeData = { repo, locationId };
            
            // Guardar en caché
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              locationId,
              theme: themeData,
              timestamp: Date.now()
            }));
            
            return themeData;
          }
        } catch (err) {
          console.warn(`Error checking ${repo}:`, err);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding theme:', error);
      return null;
    }
  }

  // Cargar el CSS del tema
  function loadThemeCSS(repo) {
    if (appliedTheme === repo) return; // Ya está cargado
    
    // Remover tema anterior si existe
    const oldStyle = document.getElementById('ascend-theme-css');
    if (oldStyle) oldStyle.remove();
    
    // Crear nuevo link usando GitHub Pages (evita problemas de CORS)
    const link = document.createElement('link');
    link.id = 'ascend-theme-css';
    link.rel = 'stylesheet';
    link.href = `https://${GITHUB_OWNER}.github.io/${repo}/dark.css?t=${Date.now()}`;
    
    document.head.appendChild(link);
    appliedTheme = repo;
    
    console.log(`✅ Ascend Theme loaded: ${repo}`);
  }

  // Aplicar tema
  async function applyTheme() {
    const locationId = getLocationId();
    
    if (!locationId) {
      console.warn('⚠️ No locationId found');
      return;
    }
    
    console.log(`🔍 Looking for theme for locationId: ${locationId}`);
    
    const theme = await findThemeForLocation(locationId);
    
    if (theme) {
      loadThemeCSS(theme.repo);
    } else {
      console.log('ℹ️ No custom theme found for this location');
    }
  }

  // Ejecutar al cargar
  applyTheme();

  // Re-aplicar cuando cambie el DOM (para SPAs)
  const observer = new MutationObserver(() => {
    const currentLocationId = getLocationId();
    if (currentLocationId && appliedTheme) {
      // Verificar si el tema sigue siendo válido
      const cachedData = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!cachedData || cachedData.locationId !== currentLocationId) {
        applyTheme();
      }
    }
  });

  observer.observe(document.documentElement, { 
    childList: true, 
    subtree: true 
  });

  // Refrescar caché cada 10 minutos
  setInterval(() => {
    localStorage.removeItem(CACHE_KEY);
    applyTheme();
  }, CACHE_TTL_MS);

  console.log('🎨 Ascend Theme Loader initialized');
})();
