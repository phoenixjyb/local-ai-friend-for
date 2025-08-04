import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ollamaService } from '@/services/OllamaService'
import { loggingService } from '@/services/LoggingService'
import { Bug, Wifi, RefreshCw, Download, Copy, Share, FileText } from 'lucide-react'
import { Capacitor } from '@capacitor/core'

interface DebugPanelProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

function DebugPanel({ isOpen = false, onOpenChange }: DebugPanelProps) {
  const [localConnectivity, setLocalConnectivity] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  // Get current logs
  useEffect(() => {
    const currentLogs = loggingService.getLogs()
    setLogs(currentLogs.map(log => `[${log.timestamp}] ${log.level}: ${log.message} ${log.details ? JSON.stringify(log.details) : ''}`))
  }, [isOpen])

  const checkOllamaConnectivity = async () => {
    setIsChecking(true)
    try {
      console.log('🔍 [DebugPanel] Manual Ollama connectivity check initiated')
      
      // Add specific debugging for your setup
      console.log('🔍 [DebugPanel] Testing direct 0.0.0.0:11434 first (your working endpoint)')
      
      try {
        const directTest = await fetch('http://0.0.0.0:11434/api/tags', { 
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        })
        console.log('🔍 [DebugPanel] Direct 0.0.0.0 test result:', directTest.status)
        if (directTest.ok) {
          const data = await directTest.json()
          console.log('🔍 [DebugPanel] Direct test found models:', data.models?.length || 0)
        }
      } catch (directError) {
        console.log('🔍 [DebugPanel] Direct 0.0.0.0 test failed:', directError.message)
      }
      
      // Force reconnection attempt
      const connectionResult = await ollamaService.forceReconnect()
      console.log('🔍 [DebugPanel] Connection result:', connectionResult)
      
      // Get detailed diagnostics
      const diagnostics = await ollamaService.getConnectionDiagnostics()
      console.log('🔍 [DebugPanel] Diagnostics:', diagnostics)
      
      setLocalConnectivity({
        connected: connectionResult,
        ...diagnostics
      })
      
      if (connectionResult) {
        toast.success('✅ Ollama connected successfully!')
      } else {
        toast.error('❌ Ollama connection failed - check Termux setup')
      }
    } catch (error) {
      console.error('🔍 [DebugPanel] Connectivity check error:', error)
      toast.error('❌ Connectivity check failed')
    } finally {
      setIsChecking(false)
    }
  }

  const refreshLogs = () => {
    const currentLogs = loggingService.getLogs()
    setLogs(currentLogs.map(log => `[${log.timestamp}] ${log.level}: ${log.message} ${log.details ? JSON.stringify(log.details) : ''}`))
    toast.success('Logs refreshed')
  }

  const clearLogs = () => {
    loggingService.clearLogs()
    setLogs([])
    toast.success('Logs cleared')
  }

  const generateLogReport = async () => {
    const timestamp = new Date().toISOString()
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      screen: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      capacitorPlatform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform()
    }

    // Use the logging service's export method for comprehensive logs
    const baseReport = await loggingService.exportLogs('txt')
    
    const connectivityReport = localConnectivity ? `

=== OLLAMA CONNECTIVITY TEST RESULTS ===
Platform: ${localConnectivity.platform || 'Unknown'}
Connected: ${localConnectivity.connected ? 'YES' : 'NO'}
Working URL: ${localConnectivity.workingUrl || 'None'}

Tested URLs:
${localConnectivity.testedUrls ? localConnectivity.testedUrls.map(test => 
  `  ${test.url} - ${test.status}${test.error ? ` (${test.error})` : ''}`
).join('\n') : 'No tests performed'}

Available Models: ${localConnectivity.modelsFound ? localConnectivity.modelsFound.join(', ') : 'None found'}
Preferred Model Available: ${localConnectivity.preferredModelAvailable ? 'YES' : 'NO'}
` : ''

    return baseReport + connectivityReport + `

=== CURRENT SESSION INFO ===
Browser Info: ${deviceInfo.userAgent}
Screen: ${deviceInfo.screen}
Viewport: ${deviceInfo.viewport}
Language: ${deviceInfo.language}
Online: ${deviceInfo.online}

Report generated: ${timestamp}
`
  }

  const downloadLogReport = async () => {
    try {
      const report = await generateLogReport()
      const blob = new Blob([report], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `s24-ai-debug-${Date.now()}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('📁 Log report downloaded!')
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Download failed')
    }
  }

  const copyLogsToClipboard = async () => {
    try {
      const report = await generateLogReport()
      await navigator.clipboard.writeText(report)
      toast.success('📋 Logs copied to clipboard!')
    } catch (error) {
      console.error('Copy failed:', error)
      toast.error('Copy failed - try download instead')
    }
  }

  const shareLogReport = async () => {
    try {
      const report = await generateLogReport()
      
      if (Capacitor.isNativePlatform() && navigator.share) {
        await navigator.share({
          title: 'Samsung S24 Ultra AI Debug Report',
          text: 'Debug logs from AI Companion app',
          files: [new File([report], `s24-ai-debug-${Date.now()}.txt`, { type: 'text/plain' })]
        })
        toast.success('📤 Report shared!')
      } else {
        // Fallback to clipboard
        await copyLogsToClipboard()
      }
    } catch (error) {
      console.error('Share failed:', error)
      // Fallback to download
      await downloadLogReport()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bug className="h-4 w-4" />
          Debug
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[95vw] h-[90vh] max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Bug className="h-4 w-4" />
            Debug Panel - S24 Ultra AI
          </DialogTitle>
          <DialogDescription className="text-xs">
            Debug tools for troubleshooting local AI connectivity
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="connectivity" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="connectivity" className="text-xs">Connect</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
            <TabsTrigger value="system" className="text-xs">System</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="connectivity" className="space-y-2 h-full overflow-y-auto p-1">
            <Card className="border-thin">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Wifi className="h-4 w-4" />
                  Ollama Test
                </CardTitle>
                <CardDescription className="text-xs">
                  Test local Ollama in Termux
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex gap-2">
                  <Button 
                    onClick={checkOllamaConnectivity} 
                    disabled={isChecking}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                    {isChecking ? 'Testing...' : 'Test Ollama Connection'}
                  </Button>
                </div>

                {localConnectivity && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={localConnectivity.connected ? 'default' : 'destructive'}>
                        {localConnectivity.connected ? '✅ Connected' : '❌ Disconnected'}
                      </Badge>
                    </div>

                    {localConnectivity.platform && (
                      <div>
                        <strong>Platform:</strong> {localConnectivity.platform}
                      </div>
                    )}

                    {localConnectivity.testedUrls && (
                      <div>
                        <strong>Tested URLs:</strong>
                        <div className="mt-2 space-y-1">
                          {localConnectivity.testedUrls.map((test: any, index: number) => (
                            <div key={index} className="text-sm p-2 bg-muted rounded">
                              <span className="font-mono">{test.url}</span>
                              <Badge variant={test.status.includes('✅') ? 'default' : 'destructive'} className="ml-2">
                                {test.status}
                              </Badge>
                              {test.error && <div className="text-red-500 text-xs mt-1">{test.error}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {localConnectivity.workingUrl && (
                      <div>
                        <strong>Working URL:</strong> 
                        <Badge variant="default" className="ml-2">{localConnectivity.workingUrl}</Badge>
                      </div>
                    )}

                    {localConnectivity.modelsFound && (
                      <div>
                        <strong>Available Models:</strong>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {localConnectivity.modelsFound.map((model: string, index: number) => (
                            <Badge key={index} variant="outline">{model}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {localConnectivity.preferredModelAvailable !== undefined && (
                      <div>
                        <strong>Preferred Model (gemma2:2b):</strong>
                        <Badge 
                          variant={localConnectivity.preferredModelAvailable ? 'default' : 'destructive'}
                          className="ml-2"
                        >
                          {localConnectivity.preferredModelAvailable ? 'Available' : 'Not Found'}
                        </Badge>
                      </div>
                    )}

                    {localConnectivity.error && (
                      <div className="text-red-500">
                        <strong>Error:</strong> {localConnectivity.error}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Termux Setup Guide */}
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  🐧 Termux Ollama Setup Guide
                </CardTitle>
                <CardDescription className="text-orange-700">
                  Instructions for fixing Ollama connectivity in Termux on Samsung S24 Ultra
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-semibold text-orange-800">Current Issue:</h4>
                  <p className="text-orange-700">
                    Your Ollama is running in Termux but bound to localhost only. Android apps can't access localhost from external processes.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-orange-800">Solution:</h4>
                  <div className="bg-black text-green-400 p-3 rounded font-mono text-xs space-y-1">
                    <div># Stop current Ollama if running</div>
                    <div>pkill ollama</div>
                    <div></div>
                    <div># Start Ollama bound to all interfaces</div>
                    <div>OLLAMA_HOST=0.0.0.0:11434 ollama serve</div>
                    <div></div>
                    <div># OR use your specific WiFi IP:</div>
                    <div>OLLAMA_HOST=172.16.31.157:11434 ollama serve</div>
                    <div></div>
                    <div># In another Termux session, verify:</div>
                    <div>curl http://172.16.31.157:11434/api/tags</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-orange-800">Alternative (if above doesn't work):</h4>
                  <div className="bg-black text-green-400 p-3 rounded font-mono text-xs space-y-1">
                    <div># Try different port</div>
                    <div>OLLAMA_HOST=0.0.0.0:8080 ollama serve</div>
                    <div></div>
                    <div># Or use specific IP (check with: ip addr)</div>
                    <div>OLLAMA_HOST=192.168.1.XXX:11434 ollama serve</div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                  <h4 className="font-semibold text-blue-800 mb-2">After changing Ollama binding:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
                    <li>Click "Test Ollama Connection" button above</li>
                    <li>The app will try multiple network addresses</li>
                    <li>Look for ✅ success in the tested URLs</li>
                    <li>Once connected, the "Local AI Offline" badge should disappear</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
            </TabsContent>

            <TabsContent value="logs" className="space-y-2 h-full overflow-y-auto p-1">
            <Card>
              <CardHeader>
                <CardTitle>Application Logs</CardTitle>
                <CardDescription>
                  View detailed logs for debugging connectivity and performance issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button onClick={refreshLogs} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={clearLogs} variant="outline" size="sm">
                    Clear Logs
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <Button onClick={downloadLogReport} variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Report
                  </Button>
                  <Button onClick={copyLogsToClipboard} variant="outline" size="sm" className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </Button>
                  {Capacitor.isNativePlatform() && (
                    <Button onClick={shareLogReport} variant="outline" size="sm" className="gap-2">
                      <Share className="h-4 w-4" />
                      Share Report
                    </Button>
                  )}
                </div>
                
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Export Options for Mac Sync:
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• <strong>Download:</strong> Saves file to Downloads folder - transfer via USB/cloud</div>
                    <div>• <strong>Copy:</strong> Copy text to paste in messaging apps or email to Mac</div>
                    <div>• <strong>Share:</strong> Send via Android share menu (email, messaging, cloud storage)</div>
                  </div>
                </div>
                
                <ScrollArea className="h-[400px] w-full border rounded p-4">
                  {logs.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                      No logs available. Start using the app to generate logs.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log, index) => (
                        <div key={index} className="text-xs font-mono whitespace-pre-wrap">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
            </TabsContent>

            <TabsContent value="system" className="space-y-2 h-full overflow-y-auto p-1">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  Device and environment information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <strong>User Agent:</strong>
                  <div className="text-sm text-muted-foreground break-all">
                    {navigator.userAgent}
                  </div>
                </div>
                <Separator />
                <div>
                  <strong>Platform:</strong> {navigator.platform}
                </div>
                <div>
                  <strong>Online Status:</strong> {navigator.onLine ? 'Online' : 'Offline'}
                </div>
                <div>
                  <strong>Language:</strong> {navigator.language}
                </div>
                <div>
                  <strong>Screen:</strong> {screen.width} x {screen.height}
                </div>
                <div>
                  <strong>Viewport:</strong> {window.innerWidth} x {window.innerHeight}
                </div>
              </CardContent>
            </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default DebugPanel
