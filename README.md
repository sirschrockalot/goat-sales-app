# 🐐 Goat Sales Training App

AI-powered sales training application based on Eric Cline's Sales Goat Framework. This app provides real-time voice conversation training with AI personas to help sales reps master the 5-step GOAT methodology.

## Features

- **AI Voice Training**: Real-time voice conversations powered by Vapi.ai
- **Dual Persona System**: 
  - **Acquisition Mode**: Skeptical Seller persona
  - **Disposition Mode**: Savvy Investor persona
- **Live HUD**: Real-time tracking of GOAT Framework steps and Approval/Denial logic gates
- **Mobile Ready**: Configured for Capacitor native app wrapping

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Vapi.ai** for voice AI integration
- **Capacitor** for mobile app support

## Getting Started

### Prerequisites

- Node.js 20+ 
- npm or yarn
- Vapi.ai API key

### Installation

1. Clone the repository and navigate to the project:
```bash
cd goat-sales-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your Vapi API key to `.env.local`:
```
NEXT_PUBLIC_VAPI_API_KEY=your_vapi_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## GOAT Framework

The app enforces Eric Cline's 5-Step Sales Goat Framework:

1. **The Introduction (The Setup)**
   - Identify yourself
   - Assume the sale
   - Set expectations (Approval or Denial)

2. **Fact-Finding (The Why)**
   - Uncover the real problem before discussing price
   - AI resists giving price until problem is revealed

3. **The House (The What)**
   - Ask "What will I see when I walk through the front door?"
   - AI provides specific repairs to test rep's math

4. **Negotiation (The Inches)**
   - AI negotiates in small increments
   - Tests rep's negotiation skills

5. **The Clinch (The Close)**
   - Use Step 2 information to overcome objections
   - Final close based on discovered problem

## Project Structure

```
goat-sales-app/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   ├── LiveHUD.tsx   # Real-time training HUD
│   │   ├── VoiceButton.tsx # Voice call controls
│   │   └── PersonaToggle.tsx # Persona mode selector
│   └── lib/              # Core logic
│       ├── vapi-client.ts # Vapi.ai integration
│       └── personas.ts   # Persona configurations
├── docs/                 # Documentation
│   ├── GOAT_FRAMEWORK.md # Sales methodology
│   ├── TECH_STACK.md     # Architecture details
│   └── ROADMAP.md        # Future plans
└── capacitor.config.json # Mobile app config
```

## Mobile App (Capacitor)

To build for mobile:

1. Install Capacitor CLI:
```bash
npm install -g @capacitor/cli
```

2. Add platforms:
```bash
npx cap add ios
npx cap add android
```

3. Build the Next.js app:
```bash
npm run build
```

4. Sync with Capacitor:
```bash
npx cap sync
```

5. Open in native IDE:
```bash
npx cap open ios
# or
npx cap open android
```

## Environment Variables

See `.env.example` for all required environment variables:

- `NEXT_PUBLIC_VAPI_API_KEY`: Your Vapi.ai API key (required)
- `VAPI_ASSISTANT_ID`: Optional assistant ID if using pre-configured assistant

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

The app includes a Dockerfile for containerized deployment:

```bash
docker build -t goat-sales-app .
docker run -p 3000:3000 goat-sales-app
```

## Documentation

- [GOAT Framework](./docs/GOAT_FRAMEWORK.md) - Sales methodology details
- [Tech Stack](./docs/TECH_STACK.md) - Architecture and integrations
- [Roadmap](./docs/ROADMAP.md) - Future development plans

## License

[Add your license here]
