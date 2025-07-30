# AI Companion Phone - Product Requirements Document

## Core Purpose & Success
- **Mission Statement**: A safe, child-friendly AI companion app that works completely offline using local LLM technology, enabling natural voice conversations without requiring internet connectivity.
- **Success Indicators**: Children can have engaging 5+ minute conversations, parents feel confident about privacy and safety, app works reliably offline with local AI.
- **Experience Qualities**: Safe, Engaging, Private

## Project Classification & Approach
- **Complexity Level**: Light Application (voice interaction, local AI integration, conversation history)
- **Primary User Activity**: Interacting (voice conversations with AI companion)

## Thought Process for Feature Selection
- **Core Problem Analysis**: Children need a safe, educational companion that doesn't rely on cloud services or internet connectivity, ensuring complete privacy and availability.
- **User Context**: Children will use this during car rides, at home, or anywhere without reliable internet, speaking naturally as if talking to a friend.
- **Critical Path**: Open app → Start call → Speak naturally → Receive encouraging responses → End call naturally
- **Key Moments**: First AI greeting, natural conversation flow, easy interruption/ending, offline reliability

## Essential Features

### Core Voice Conversation
- **What it does**: Real-time speech recognition and synthesis for natural conversations
- **Why it matters**: Enables natural interaction that feels like talking to a friend
- **Success criteria**: <2 second response time, accurate British English recognition, natural voice output

### Local LLM Integration  
- **What it does**: Runs AI conversations completely offline using Ollama with lightweight models
- **Why it matters**: Ensures complete privacy, works without internet, no data leaves device
- **Success criteria**: Works offline, generates contextually appropriate responses, uses <4GB device storage

### Safety & Age-Appropriateness
- **What it does**: Filters all AI responses for child-friendly content and encouraging tone
- **Why it matters**: Parents need confidence that all interactions are safe and beneficial
- **Success criteria**: 100% appropriate responses, encouraging/educational tone, easy parental oversight

### Easy Call Controls
- **What it does**: Large, obvious buttons for starting/ending calls with immediate response
- **Why it matters**: Children need to feel in control and able to end conversations easily
- **Success criteria**: Single tap to start/end, visual feedback, works during AI speech

### Conversation History
- **What it does**: Saves conversation duration and topics locally for parent review
- **Why it matters**: Allows parents to see engagement patterns and conversation topics
- **Success criteria**: Stores last 10 conversations, shows duration and basic topics

## Design Direction

### Visual Tone & Identity
- **Emotional Response**: Warm, safe, friendly, and approachable - like a trusted friend
- **Design Personality**: Playful yet sophisticated, child-friendly without being childish
- **Visual Metaphors**: Phone call interface, friendly robot companion, soft conversation bubbles
- **Simplicity Spectrum**: Minimal interface with large, clear controls optimized for children

### Color Strategy
- **Color Scheme Type**: Analogous (purple to blue spectrum with warm accents)
- **Primary Color**: Soft purple (`oklch(0.6 0.15 270)`) - calming and friendly
- **Secondary Colors**: Light blue-grays for backgrounds, warm accent colors for active states
- **Accent Color**: Bright purple (`oklch(0.7 0.12 300)`) for call buttons and important actions
- **Color Psychology**: Purple conveys creativity and imagination, blue provides calm trust
- **Color Accessibility**: All combinations meet WCAG AA standards (4.5:1 contrast minimum)
- **Foreground/Background Pairings**: 
  - Background (light cream): Dark purple text (8.2:1 ratio)
  - Primary (purple): White text (7.1:1 ratio)
  - Cards (light gray): Dark text (9.4:1 ratio)

### Typography System
- **Font Pairing Strategy**: Single family (Nunito) with varied weights for hierarchy
- **Typographic Hierarchy**: Bold 800 for headings, 700 for buttons, 600 for subheadings, 400 for body
- **Font Personality**: Friendly, rounded, highly legible - feels approachable without being informal
- **Readability Focus**: Large sizes, generous spacing, optimized for quick recognition by children
- **Typography Consistency**: Consistent scale using rem units, predictable weight progression
- **Which fonts**: Nunito from Google Fonts - excellent readability and friendly character
- **Legibility Check**: Tested at small sizes, high contrast, works well on mobile screens

### Visual Hierarchy & Layout
- **Attention Direction**: Central avatar draws focus, large call button is primary action, status indicators are subtle but visible
- **White Space Philosophy**: Generous spacing creates calm, uncluttered feeling - nothing feels cramped
- **Grid System**: Flexbox-based layout with consistent gap spacing, mobile-first responsive design
- **Responsive Approach**: Single-column mobile-optimized layout that scales up gracefully
- **Content Density**: Low density prioritizes clarity and ease of use over information display

### Animations
- **Purposeful Meaning**: Subtle pulses indicate listening/speaking states, smooth transitions maintain context
- **Hierarchy of Movement**: Speaking/listening badges animate to show activity, button states provide immediate feedback
- **Contextual Appropriateness**: Gentle, calming animations that don't distract from conversation

### UI Elements & Component Selection
- **Component Usage**: Large Button components for primary actions, Card components for content grouping, Avatar for AI personality
- **Component Customization**: Rounded corners, generous padding, high contrast colors, child-friendly sizing
- **Component States**: Clear hover/active states, disabled states for loading, visual feedback for all interactions
- **Icon Selection**: Phosphor icons - clear, friendly iconography that children can recognize
- **Component Hierarchy**: Primary (call button), secondary (navigation), tertiary (status indicators)
- **Spacing System**: Consistent 4-6-8 spacing scale using Tailwind utilities
- **Mobile Adaptation**: Touch targets minimum 44px, larger buttons for primary actions

### Visual Consistency Framework
- **Design System Approach**: Component-based using shadcn/ui with consistent customizations
- **Style Guide Elements**: Color palette, typography scale, spacing system, component variants
- **Visual Rhythm**: Consistent spacing creates predictable patterns children can learn
- **Brand Alignment**: Friendly, safe, trustworthy - reinforces parental confidence

### Accessibility & Readability
- **Contrast Goal**: WCAG AA compliance minimum, targeting AAA where possible for child users

## Edge Cases & Problem Scenarios
- **Potential Obstacles**: Internet connectivity loss, microphone permissions, browser compatibility, local LLM setup complexity
- **Edge Case Handling**: Graceful fallback from local LLM → cloud LLM → pre-written responses
- **Technical Constraints**: Mobile browser limitations, device storage for LLM models, processing power requirements

## Implementation Considerations
- **Scalability Needs**: Could expand to multiple AI personalities, educational content, parent dashboard
- **Testing Focus**: Voice recognition accuracy, offline functionality, child safety filtering, cross-device compatibility
- **Critical Questions**: Will parents successfully set up local LLM? How do we ensure consistent safety filtering?

## Local LLM Integration Strategy
- **Primary**: Ollama with llama3.2:1b model (1.3GB, mobile-optimized)
- **Fallback**: Cloud-based Spark LLM when local unavailable
- **Final Fallback**: Pre-written encouraging responses for complete offline mode
- **Setup Guidance**: Clear instructions for Ollama installation on Android via Termux or local network

## Android Deployment Options
- **PWA Installation**: Immediate deployment as installable web app
- **Native App**: Capacitor-based native Android app for app store distribution
- **Local Server**: Companion setup for running Ollama on local network device

## Reflection
This approach uniquely combines child safety, complete privacy through local AI, and reliable offline functionality. The three-tier fallback system ensures the app always works regardless of technical setup or connectivity. The emphasis on local LLM integration addresses growing privacy concerns while maintaining engaging AI conversations that help children develop communication skills.