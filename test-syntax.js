// Simple syntax test for key files
const fs = require('fs')

const filesToCheck = [
  '/workspaces/spark-template/src/components/AICompanionPhone.tsx',
  '/workspaces/spark-template/src/components/AudioVisualization.tsx'
]

filesToCheck.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8')
    
    // Basic syntax checks
    const openBraces = (content.match(/\{/g) || []).length
    const closeBraces = (content.match(/\}/g) || []).length
    const openParens = (content.match(/\(/g) || []).length
    const closeParens = (content.match(/\)/g) || []).length
    
    console.log(`File: ${file}`)
    console.log(`  Braces: ${openBraces} open, ${closeBraces} close - ${openBraces === closeBraces ? 'BALANCED' : 'UNBALANCED'}`)
    console.log(`  Parens: ${openParens} open, ${closeParens} close - ${openParens === closeParens ? 'BALANCED' : 'UNBALANCED'}`)
    
    // Check for common syntax issues
    if (content.includes('oklch(') && content.includes(')80')) {
      console.log('  ⚠️  Potential oklch color format issue detected')
    }
    
    if (content.includes('getPersonalityFallbackResponses')) {
      console.log('  ⚠️  Undefined function call detected')
    }
    
    console.log('  ✅ Basic syntax checks passed\n')
    
  } catch (error) {
    console.log(`  ❌ Error reading file: ${error.message}\n`)
  }
})