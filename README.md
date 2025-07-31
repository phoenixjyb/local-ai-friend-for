# AI Companion Phone 📱🤖

A warm, friendly AI companion app designed specifically for children, featuring British English voice support, local AI capabilities, and a child-friendly interface with cute animations and sound effects.

## 🌟 Features

- **Child-Friendly Design**: Warm gradient backgrounds, adorable AI avatar, and cute animations
- **Voice Interaction**: Full duplex voice chat with British English support
- **Local AI Support**: Designed to work with local Ollama deployment on Android
- **Visual Audio Feedback**: Real-time audio visualization to show when the system is listening
- **Multiple AI Personalities**: Different conversation styles for varied interactions
- **Drawing Feature**: Kids can create and share doodles with their AI friend
- **PWA Ready**: Installable web app with offline capabilities
- **Android APK Build**: Complete Android app build system included

## 🚀 Quick Start

### Web Version
```bash
npm install
npm run dev
```

### Android Version
```bash
# Install dependencies
npm install

# Build for Android
npm run build:android

# Generate APK
./setup-android.sh
```

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI Components**: shadcn/ui v4 with Tailwind CSS
- **Voice**: Web Speech API with British English support
- **Local AI**: Ollama integration for offline AI responses
- **Mobile**: Capacitor for Android app generation
- **PWA**: Service worker with offline support

## 📱 Android Development

### Prerequisites
- Node.js 18+
- Android Studio
- Java 17+
- Ollama installed on device (via Termux)

### Local AI Setup
1. Install Termux on Android device
2. Install Ollama in Termux: `pkg install ollama`
3. Download model: `ollama pull gemma2:2b`
4. Start Ollama server: `ollama serve`

### Building APK
The project includes automated Android build scripts:
- `setup-android.sh` - Complete setup and APK generation
- Optimized for Samsung Galaxy S24 Ultra
- Includes all necessary Android permissions and configurations

## 🎨 Design Features

- **Warm Color Palette**: Cream, peach, and sunny yellow tones
- **Cute Animations**: Floating, wiggling, and breathing effects
- **Child-Safe UI**: Large touch targets, clear visual feedback
- **Audio Visualization**: Real-time sound wave display
- **Responsive Design**: Works on all screen sizes

## 🔧 Configuration

### Environment Variables
- `VITE_OLLAMA_URL`: Local Ollama server URL (default: http://localhost:11434)
- `VITE_AI_PERSONALITY`: Default AI personality mode

### Voice Settings
- Language: British English (en-GB)
- Speech rate: Optimized for children
- Pitch: Friendly and warm tone

## 📚 Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn components
│   ├── AICompanionPhone.tsx
│   ├── AudioVisualizer.tsx
│   ├── DrawingCanvas.tsx
│   └── ParticleEffects.tsx
├── lib/
│   ├── ollama.ts          # Local AI integration
│   └── utils.ts
├── assets/
│   ├── images/
│   ├── audio/
│   └── icons/
└── android/               # Android app files

```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is designed for educational and personal use. Please ensure compliance with local regulations regarding AI applications for children.

## 🎯 Roadmap

- [ ] Enhanced AI personalities
- [ ] Voice training for better child recognition
- [ ] Offline drawing synchronization
- [ ] Parental controls dashboard
- [ ] Multi-language support
- [ ] Interactive games integration

## 🐛 Known Issues

- Web Speech API requires HTTPS in production
- Ollama integration requires manual setup on Android
- Some animations may impact performance on older devices

## 📞 Support

For support, please create an issue on GitHub or contact the development team.

---

Made with ❤️ for children and their AI companions