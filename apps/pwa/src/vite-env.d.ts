/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_COMPANION_PORT?: string
  readonly VITE_OSM_OVERPASS_ENDPOINT?: string
  readonly VITE_WORKER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
