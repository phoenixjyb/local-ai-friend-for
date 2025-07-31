import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error)
  console.error('Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  })
  // Prevent the default browser error handling
  event.preventDefault()
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection caught:', event.reason)
  // Prevent the error from appearing in the console as "Uncaught"
  event.preventDefault()
})

// Import spark with error handling - must be async
const initializeSpark = async () => {
  try {
    await import("@github/spark/spark")
    console.log('✅ Spark module loaded successfully')
  } catch (error) {
    console.warn('Failed to load spark module:', error)
    // Create a minimal fallback spark object if needed
    if (!window.spark) {
      (window as any).spark = {
        llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => {
          return strings.reduce((result, string, i) => {
            return result + string + (values[i] || '')
          }, '')
        },
        llm: async () => {
          throw new Error('Spark LLM not available')
        },
        user: async () => ({ avatarUrl: '', email: '', id: '', isOwner: false, login: '' }),
        kv: {
          keys: async () => [],
          get: async () => undefined,
          set: async () => {},
          delete: async () => {}
        }
      }
    }
  }
}

// Initialize spark
initializeSpark()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
  </ErrorBoundary>
)
