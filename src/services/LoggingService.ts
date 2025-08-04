/**
 * Comprehensive Logging Service for Samsung S24 Ultra AI Companion App
 * Provides local storage, file export, and device-specific logging capabilities
 */

import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'

export interface LogEntry {
  id: string
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error' | 'system'
  category: 'ASR' | 'TTS' | 'LLM' | 'UI' | 'SYSTEM' | 'NETWORK' | 'DEBUG'
  message: string
  details?: any
  deviceInfo?: DeviceInfo
  stackTrace?: string
}

export interface DeviceInfo {
  platform: string
  model: string
  operatingSystem: string
  osVersion: string
  batteryLevel?: number
  isVirtual: boolean
  memoryUsed?: number
  diskFree?: number
  networkStatus?: string
}

export interface LoggingConfig {
  maxLogEntries: number
  enableConsoleLogging: boolean
  enableLocalStorage: boolean
  enableFileExport: boolean
  logLevels: string[]
  autoExportThreshold: number
}

class LoggingService {
  private logs: LogEntry[] = []
  private config: LoggingConfig = {
    maxLogEntries: 1000,
    enableConsoleLogging: true,
    enableLocalStorage: true,
    enableFileExport: true,
    logLevels: ['debug', 'info', 'warn', 'error', 'system'],
    autoExportThreshold: 500
  }
  private deviceInfo: DeviceInfo | null = null

  constructor() {
    this.initializeDeviceInfo()
    this.loadLogsFromStorage()
  }

  private async initializeDeviceInfo(): Promise<void> {
    try {
      const deviceInfo = await Device.getInfo()
      const batteryInfo = await Device.getBatteryInfo()
      
      this.deviceInfo = {
        platform: deviceInfo.platform,
        model: deviceInfo.model,
        operatingSystem: deviceInfo.operatingSystem,
        osVersion: deviceInfo.osVersion,
        batteryLevel: batteryInfo.batteryLevel,
        isVirtual: deviceInfo.isVirtual,
        networkStatus: navigator.onLine ? 'online' : 'offline'
      }

      // Log initialization
      this.log('system', 'SYSTEM', 'Logging service initialized', {
        deviceInfo: this.deviceInfo,
        platform: Capacitor.getPlatform(),
        isNative: Capacitor.isNativePlatform()
      })
    } catch (error) {
      console.error('Failed to initialize device info:', error)
    }
  }

  /**
   * Primary logging method
   */
  log(level: LogEntry['level'], category: LogEntry['category'], message: string, details?: any): void {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      details,
      deviceInfo: this.deviceInfo || undefined,
      stackTrace: level === 'error' ? this.getStackTrace() : undefined
    }

    // Add to memory
    this.logs.push(logEntry)

    // Maintain max log entries
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries)
    }

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(logEntry)
    }

    // Local storage
    if (this.config.enableLocalStorage) {
      this.saveLogsToStorage()
    }

    // Auto export if threshold reached
    if (this.logs.length >= this.config.autoExportThreshold) {
      this.autoExportLogs()
    }
  }

  /**
   * Convenience methods for different log levels
   */
  debug(category: LogEntry['category'], message: string, details?: any): void {
    this.log('debug', category, message, details)
  }

  info(category: LogEntry['category'], message: string, details?: any): void {
    this.log('info', category, message, details)
  }

  warn(category: LogEntry['category'], message: string, details?: any): void {
    this.log('warn', category, message, details)
  }

  error(category: LogEntry['category'], message: string, details?: any): void {
    this.log('error', category, message, details)
  }

  system(message: string, details?: any): void {
    this.log('system', 'SYSTEM', message, details)
  }

  /**
   * ASR-specific logging
   */
  logASR(message: string, details?: any): void {
    this.log('info', 'ASR', message, details)
  }

  logASRError(message: string, error?: any): void {
    this.log('error', 'ASR', message, { error: error?.message || error })
  }

  /**
   * TTS-specific logging
   */
  logTTS(message: string, details?: any): void {
    this.log('info', 'TTS', message, details)
  }

  logTTSError(message: string, error?: any): void {
    this.log('error', 'TTS', message, { error: error?.message || error })
  }

  /**
   * LLM-specific logging
   */
  logLLM(message: string, details?: any): void {
    this.log('info', 'LLM', message, details)
  }

  logLLMError(message: string, error?: any): void {
    this.log('error', 'LLM', message, { error: error?.message || error })
  }

  /**
   * Network-specific logging
   */
  logNetwork(message: string, details?: any): void {
    this.log('info', 'NETWORK', message, details)
  }

  logNetworkError(message: string, error?: any): void {
    this.log('error', 'NETWORK', message, { error: error?.message || error })
  }

  private logToConsole(entry: LogEntry): void {
    const emoji = this.getLogEmoji(entry.level, entry.category)
    const timestamp = new Date(entry.timestamp).toLocaleTimeString()
    const prefix = `${emoji} [${timestamp}] [${entry.category}]`

    switch (entry.level) {
      case 'error':
        console.error(prefix, entry.message, entry.details || '')
        if (entry.stackTrace) console.error('Stack:', entry.stackTrace)
        break
      case 'warn':
        console.warn(prefix, entry.message, entry.details || '')
        break
      case 'debug':
        console.debug(prefix, entry.message, entry.details || '')
        break
      default:
        console.log(prefix, entry.message, entry.details || '')
    }
  }

  private getLogEmoji(level: string, category: string): string {
    const categoryEmojis: Record<string, string> = {
      ASR: '🎤',
      TTS: '🗣️',
      LLM: '🤖',
      UI: '📱',
      SYSTEM: '⚙️',
      NETWORK: '🌐',
      DEBUG: '🔍'
    }

    const levelEmojis: Record<string, string> = {
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      system: '🚀'
    }

    return categoryEmojis[category] || levelEmojis[level] || '📝'
  }

  private getStackTrace(): string {
    try {
      throw new Error()
    } catch (e: any) {
      return e.stack || 'Stack trace not available'
    }
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Storage management
   */
  private saveLogsToStorage(): void {
    try {
      localStorage.setItem('ai_companion_logs', JSON.stringify({
        logs: this.logs.slice(-500), // Store only last 500 logs
        lastUpdate: Date.now()
      }))
    } catch (error) {
      console.error('Failed to save logs to storage:', error)
    }
  }

  private loadLogsFromStorage(): void {
    try {
      const stored = localStorage.getItem('ai_companion_logs')
      if (stored) {
        const data = JSON.parse(stored)
        this.logs = data.logs || []
        this.info('SYSTEM', 'Loaded logs from storage', { count: this.logs.length })
      }
    } catch (error) {
      console.error('Failed to load logs from storage:', error)
    }
  }

  /**
   * Export and sharing
   */
  async exportLogs(format: 'json' | 'txt' = 'txt'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify({
        exportDate: new Date().toISOString(),
        deviceInfo: this.deviceInfo,
        totalLogs: this.logs.length,
        logs: this.logs
      }, null, 2)
    }

    // Text format
    let output = `Samsung S24 Ultra AI Companion App - Debug Logs\n`
    output += `Export Date: ${new Date().toISOString()}\n`
    output += `Device: ${this.deviceInfo?.model || 'Unknown'} (${this.deviceInfo?.platform || 'Unknown'})\n`
    output += `OS: ${this.deviceInfo?.operatingSystem || 'Unknown'} ${this.deviceInfo?.osVersion || ''}\n`
    output += `Total Logs: ${this.logs.length}\n`
    output += `${'='.repeat(80)}\n\n`

    this.logs.forEach(entry => {
      const timestamp = new Date(entry.timestamp).toLocaleString()
      const emoji = this.getLogEmoji(entry.level, entry.category)
      output += `${emoji} [${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]\n`
      output += `   ${entry.message}\n`
      if (entry.details) {
        output += `   Details: ${JSON.stringify(entry.details)}\n`
      }
      if (entry.stackTrace && entry.level === 'error') {
        output += `   Stack: ${entry.stackTrace.split('\n')[1] || 'N/A'}\n`
      }
      output += '\n'
    })

    return output
  }

  async shareLogsAsFile(): Promise<void> {
    try {
      const logContent = await this.exportLogs('txt')
      const filename = `ai_companion_logs_${new Date().toISOString().split('T')[0]}.txt`
      
      if (Capacitor.isNativePlatform()) {
        // Native platform: Create and share file
        const blob = new Blob([logContent], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        
        // Use native sharing if available
        if (navigator.share) {
          await navigator.share({
            title: 'AI Companion Debug Logs',
            text: 'Debug logs from Samsung S24 Ultra AI Companion App',
            files: [new File([logContent], filename, { type: 'text/plain' })]
          })
        } else {
          // Fallback to download
          this.downloadFile(logContent, filename)
        }
      } else {
        // Web platform: Download file
        this.downloadFile(logContent, filename)
      }

      this.info('SYSTEM', 'Logs exported successfully', { filename })
    } catch (error) {
      this.error('SYSTEM', 'Failed to export logs', error)
    }
  }

  private downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  private async autoExportLogs(): Promise<void> {
    try {
      const logContent = await this.exportLogs('json')
      localStorage.setItem('ai_companion_auto_export', logContent)
      this.info('SYSTEM', 'Auto-exported logs to storage', { count: this.logs.length })
    } catch (error) {
      this.error('SYSTEM', 'Auto-export failed', error)
    }
  }

  /**
   * Query and filtering
   */
  getLogs(options?: {
    level?: LogEntry['level']
    category?: LogEntry['category']
    since?: number
    limit?: number
  }): LogEntry[] {
    let filtered = [...this.logs]

    if (options?.level) {
      filtered = filtered.filter(log => log.level === options.level)
    }

    if (options?.category) {
      filtered = filtered.filter(log => log.category === options.category)
    }

    if (options?.since) {
      filtered = filtered.filter(log => log.timestamp >= options.since!)
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit)
    }

    return filtered.reverse() // Most recent first
  }

  getRecentLogs(minutes: number = 10): LogEntry[] {
    const since = Date.now() - (minutes * 60 * 1000)
    return this.getLogs({ since, limit: 100 })
  }

  getErrorLogs(): LogEntry[] {
    return this.getLogs({ level: 'error', limit: 50 })
  }

  getLogsSummary(): {
    total: number
    byLevel: Record<string, number>
    byCategory: Record<string, number>
    recentErrors: number
  } {
    const byLevel: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    let recentErrors = 0

    this.logs.forEach(log => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1
      byCategory[log.category] = (byCategory[log.category] || 0) + 1
      
      if (log.level === 'error' && log.timestamp > oneHourAgo) {
        recentErrors++
      }
    })

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      recentErrors
    }
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = []
    localStorage.removeItem('ai_companion_logs')
    localStorage.removeItem('ai_companion_auto_export')
    this.info('SYSTEM', 'All logs cleared')
  }

  /**
   * Get formatted log summary for quick diagnostics
   */
  getLogSummary(): string {
    const errorCount = this.logs.filter(log => log.level === 'error').length
    const warnCount = this.logs.filter(log => log.level === 'warn').length
    const llmLogs = this.logs.filter(log => log.category === 'LLM').length
    const networkLogs = this.logs.filter(log => log.category === 'NETWORK').length
    
    return `Log Summary:
Total: ${this.logs.length} entries
Errors: ${errorCount}
Warnings: ${warnCount}
LLM Events: ${llmLogs}
Network Events: ${networkLogs}
Device: ${this.deviceInfo?.model || 'Unknown'} (${this.deviceInfo?.platform || 'Unknown'})`
  }

  /**
   * Configuration
   */
  updateConfig(newConfig: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.info('SYSTEM', 'Logging configuration updated', newConfig)
  }

  getConfig(): LoggingConfig {
    return { ...this.config }
  }
}

// Create singleton instance
export const loggingService = new LoggingService()

// Export for testing and manual usage
export { LoggingService }
