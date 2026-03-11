import { CobblPublicClient } from './public'
export { CobblPublicClient }

declare global {
  interface Window {
    Cobbl: { CobblPublicClient: typeof CobblPublicClient }
  }
}

if (typeof window !== 'undefined') {
  window.Cobbl = { CobblPublicClient }
}
