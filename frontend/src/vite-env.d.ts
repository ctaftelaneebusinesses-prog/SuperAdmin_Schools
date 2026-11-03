/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SOCKET_URL: string;
  /** Base URL of the linked school project (e.g. https://school.example.com). */
  readonly VITE_SCHOOL_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
