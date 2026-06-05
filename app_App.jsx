/**
 * ============================================================
 * ResponseLink OS™ — Root App Component
 * Run 9 — No Auth — Direct to Dashboard
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * AuthProvider removed — no login required for demo deployment.
 * ============================================================
 */

import { RouterProvider } from 'react-router-dom'
import { router } from './app_Router'

export default function App() {
  return <RouterProvider router={router} />
}
