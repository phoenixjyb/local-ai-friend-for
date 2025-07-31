import { Toaster } from '@/components/ui/sonner'
import AICompanionPhone from '@/components/AICompanionPhone'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

function App() {
    return (
        <>
            {/* Debug indicator to confirm changes are loading */}
            <div className="fixed top-0 right-0 z-50 bg-green-500 text-white p-2 text-xs rounded-bl-lg shadow-lg">
                ✓ Voice System Fixed v3.0 - Enhanced Recognition & Status
            </div>
            <AICompanionPhone />
            <PWAInstallPrompt />
            <Toaster />
        </>
    )
}

export default App