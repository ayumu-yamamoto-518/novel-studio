import './index.css'
import { startApp } from './start-app'

// バックエンドを持たないため、API は MSW で再現する
async function startMocking() {
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass' })
}

void startApp(document.getElementById('root')!, startMocking)
