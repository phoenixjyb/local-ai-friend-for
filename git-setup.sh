#!/bin/bash

# Git Setup Script for AI Companion Phone Project
# Run this script to initialize Git and prepare for repository sync

echo "🔧 Setting up Git for AI Companion Phone project..."

# Initialize git repository if not already initialized
if [ ! -d ".git" ]; then
    echo "📝 Initializing Git repository..."
    git init
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

# Configure git user (customize these)
echo "👤 Setting up Git user configuration..."
echo "Please enter your Git username:"
read git_username
echo "Please enter your Git email:"
read git_email

git config user.name "$git_username"
git config user.email "$git_email"
echo "✅ Git user configured"

# Add all files to git
echo "📁 Adding all project files to Git..."
git add .

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: AI Companion Phone project

Features:
- Child-friendly AI companion interface
- Voice chat with British English support
- Local Ollama AI integration
- Real-time audio visualization
- Cute animations and particle effects
- Drawing/doodle feature for kids
- PWA and Android APK support
- Optimized for Samsung Galaxy S24 Ultra"

echo "✅ Initial commit created"

# Instructions for adding remote repository
echo ""
echo "🚀 Next steps to sync with remote repository:"
echo ""
echo "1. Create a new repository on GitHub/GitLab/etc."
echo "2. Copy the repository URL"
echo "3. Run: git remote add origin <repository-url>"
echo "4. Run: git branch -M main"
echo "5. Run: git push -u origin main"
echo ""
echo "Example:"
echo "git remote add origin https://github.com/yourusername/ai-companion-phone.git"
echo "git branch -M main"
echo "git push -u origin main"
echo ""
echo "📋 Your project is now ready for Git synchronization!"

# Show current status
echo ""
echo "📊 Current Git status:"
git status --short
git log --oneline -n 5