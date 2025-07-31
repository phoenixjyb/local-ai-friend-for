import { Toaster } from '@/components/ui/sonner'
import AICompanionPhone from '@/components/AICompanionPhone'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

function App() {
    return (
        <>
            <AICompanionPhone />
            <PWAInstallPrompt />
            <Toaster />
        </>
    )
}

export default App