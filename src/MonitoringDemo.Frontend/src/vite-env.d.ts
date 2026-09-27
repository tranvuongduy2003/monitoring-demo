/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_PUBLIC_URL?: string
  readonly VITE_GRAFANA_URL?: string
  readonly VITE_PROMETHEUS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
