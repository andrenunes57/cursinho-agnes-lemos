import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Sem `globals: true`, a Testing Library não registra a limpeza sozinha.
afterEach(() => {
  cleanup()
})
