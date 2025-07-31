# Git Sync Instructions for AI Companion Phone

Since Git commands are restricted in this environment, here are the manual steps to set up Git synchronization for your AI Companion Phone project:

## 🚀 Initial Setup (Run these commands in your local terminal)

### 1. Initialize Git Repository
```bash
git init
```

### 2. Configure Git User
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 3. Add All Files
```bash
git add .
```

### 4. Create Initial Commit
```bash
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
```

## 🌐 Connect to Remote Repository

### 1. Create Repository on GitHub/GitLab
- Go to GitHub.com or your preferred Git hosting service
- Create a new repository named "ai-companion-phone" or similar
- Don't initialize with README (we already have one)
- Copy the repository URL

### 2. Add Remote Origin
```bash
git remote add origin https://github.com/yourusername/ai-companion-phone.git
```

### 3. Set Main Branch and Push
```bash
git branch -M main
git push -u origin main
```

## 🔄 Daily Git Workflow

### After making changes:
```bash
# Check what files changed
git status

# Add specific files or all changes
git add .
# or
git add specific-file.tsx

# Commit with descriptive message
git commit -m "Add audio visualization improvements"

# Push to remote repository
git push
```

### To get latest changes:
```bash
git pull
```

## 📁 Files Ready for Git

The project now includes:
- ✅ `.gitignore` - Excludes unnecessary files
- ✅ `README.md` - Complete project documentation  
- ✅ `git-setup.sh` - Automated setup script
- ✅ All source code and assets organized

## 🎯 Recommended Repository Structure

```
ai-companion-phone/
├── main branch (stable releases)
├── develop branch (active development)
└── feature branches (new features)
```

## 📝 Commit Message Guidelines

Use clear, descriptive commit messages:
- `feat: add new audio visualization component`
- `fix: resolve voice recognition timeout issue`
- `docs: update Android setup instructions`
- `style: improve button animations for kids`
- `refactor: optimize Ollama integration`

## 🔐 Important Notes

- Never commit sensitive data (API keys, passwords)
- The `.gitignore` file excludes build files and dependencies
- Consider using GitHub Actions for automated APK builds
- Tag releases for easy version tracking

## 🤝 Collaboration Tips

1. **Fork the repository** for contributions
2. **Create feature branches** for new functionality
3. **Submit pull requests** for code review
4. **Write descriptive commit messages**
5. **Keep commits focused** on single changes

Your AI Companion Phone project is now ready for Git synchronization! 🎉