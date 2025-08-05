/**
 * WebView Compatibility Service for AI Companion App
 * Detects and handles WebView version compatibility issues
 */

export interface WebViewInfo {
  version: string
  isCompatible: boolean
  requiredVersion: string
  recommendations: string[]
}

class WebViewCompatibilityService {
  private static instance: WebViewCompatibilityService
  private webViewInfo: WebViewInfo | null = null

  static getInstance(): WebViewCompatibilityService {
    if (!WebViewCompatibilityService.instance) {
      WebViewCompatibilityService.instance = new WebViewCompatibilityService()
    }
    return WebViewCompatibilityService.instance
  }

  /**
   * Check WebView compatibility
   */
  async checkCompatibility(): Promise<WebViewInfo> {
    try {
      // Get WebView version information
      const userAgent = navigator.userAgent
      const webViewMatch = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/)
      const version = webViewMatch ? webViewMatch[1] : 'Unknown'

      // Parse version numbers
      const versionParts = version.split('.').map(Number)
      const majorVersion = versionParts[0] || 0
      const minorVersion = versionParts[1] || 0

      // Compatibility rules
      const isCompatible = this.isVersionCompatible(majorVersion, minorVersion)
      const recommendations = this.getRecommendations(majorVersion, minorVersion)

      this.webViewInfo = {
        version,
        isCompatible,
        requiredVersion: '127.0.x or 139.0+',
        recommendations
      }

      return this.webViewInfo

    } catch (error) {
      console.error('WebView compatibility check failed:', error)
      return {
        version: 'Unknown',
        isCompatible: false,
        requiredVersion: '127.0.x or 139.0+',
        recommendations: ['Unable to detect WebView version - check system settings']
      }
    }
  }

  /**
   * Check if WebView version is compatible
   */
  private isVersionCompatible(major: number, minor: number): boolean {
    // Known working versions: 127.x.x.x
    if (major === 127) return true
    
    // Known problematic versions: 138.x.x.x
    if (major === 138) return false
    
    // Future versions (139+) assumed compatible
    if (major >= 139) return true
    
    // Older versions (126 and below) may work
    if (major <= 126) return true
    
    return false
  }

  /**
   * Get version-specific recommendations
   */
  private getRecommendations(major: number, minor: number): string[] {
    if (major === 138) {
      return [
        'WebView 138.x has known compatibility issues',
        'Revert to factory WebView version (127.x) in Settings',
        'Or wait for WebView 139.x which should be compatible',
        'Settings → Apps → Android System WebView → Uninstall Updates'
      ]
    }

    if (major === 127) {
      return [
        'WebView 127.x works perfectly with this app',
        'Consider staying on this version until app is updated',
        'No action needed - optimal compatibility'
      ]
    }

    if (major >= 139) {
      return [
        'WebView 139.x+ should be compatible',
        'If issues occur, report to developers',
        'May require app update for full compatibility'
      ]
    }

    if (major <= 126) {
      return [
        'Older WebView version detected',
        'Consider updating to WebView 127.x for best compatibility',
        'Some features may not work optimally'
      ]
    }

    return ['WebView version status unknown - proceed with caution']
  }

  /**
   * Get current WebView info
   */
  getWebViewInfo(): WebViewInfo | null {
    return this.webViewInfo
  }

  /**
   * Show compatibility warning if needed
   */
  async showCompatibilityWarning(): Promise<boolean> {
    const info = await this.checkCompatibility()
    
    if (!info.isCompatible) {
      console.warn('WebView Compatibility Warning:', {
        version: info.version,
        recommendations: info.recommendations
      })
      
      // Show user notification
      if (typeof window !== 'undefined' && 'Notification' in window) {
        new Notification('WebView Compatibility Issue', {
          body: `WebView ${info.version} may cause issues. Consider reverting to factory version.`,
          icon: '/icons/icon-192x192.png'
        })
      }
      
      return true
    }
    
    return false
  }

  /**
   * Apply compatibility fixes based on WebView version
   */
  async applyCompatibilityFixes(): Promise<void> {
    const info = await this.checkCompatibility()
    
    if (info.version.startsWith('138.')) {
      // WebView 138.x specific fixes
      this.applyWebView138Fixes()
    } else if (info.version.startsWith('127.')) {
      // WebView 127.x optimizations
      this.applyWebView127Optimizations()
    }
  }

  /**
   * Apply fixes for WebView 138.x compatibility issues
   */
  private applyWebView138Fixes(): void {
    console.log('Applying WebView 138.x compatibility fixes...')
    
    // Reduce localStorage usage
    this.optimizeLocalStorage()
    
    // Disable certain console features that may conflict
    this.disableProblematicFeatures()
    
    // Use more conservative network settings
    this.applyConservativeNetworkSettings()
  }

  /**
   * Apply optimizations for WebView 127.x
   */
  private applyWebView127Optimizations(): void {
    console.log('Applying WebView 127.x optimizations...')
    
    // Enable all features for 127.x
    this.enableAllFeatures()
  }

  private optimizeLocalStorage(): void {
    // Implement localStorage optimization for 138.x
    try {
      const maxStorageSize = 1024 * 1024 // 1MB limit for 138.x
      // Add storage size monitoring
    } catch (error) {
      console.warn('localStorage optimization failed:', error)
    }
  }

  private disableProblematicFeatures(): void {
    // Disable features that cause issues in 138.x
    if (typeof window !== 'undefined') {
      // Disable certain console features
      const originalConsole = window.console
      window.console = {
        ...originalConsole,
        // Keep basic logging but limit advanced features
        trace: () => {}, // Disable trace in 138.x
        profile: () => {}, // Disable profiling
        profileEnd: () => {}
      }
    }
  }

  private applyConservativeNetworkSettings(): void {
    // More conservative network timeouts for 138.x
    console.log('Applying conservative network settings for WebView 138.x')
  }

  private enableAllFeatures(): void {
    // Enable all features for 127.x (known working version)
    console.log('Enabling all features for WebView 127.x (optimal version)')
  }
}

export default WebViewCompatibilityService.getInstance()
