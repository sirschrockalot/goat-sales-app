# Tech Stack & Architecture

## Core Technologies

### Next.js
- **Version**: [To be specified]
- **App Router**: Using the App Router architecture
- **Purpose**: Main web framework for the application

### Vapi
- **Purpose**: AI voice assistant integration
- **Integration**: Handled in `src/lib/vapi/`
- **Configuration**: Environment variables required

### Deepgram
- **Purpose**: Speech-to-text transcription
- **Integration**: Handled in `src/lib/deepgram/`
- **API Key**: Required in environment variables

### Pinecone
- **Purpose**: Vector database for AI embeddings
- **Integration**: Handled in `src/lib/pinecone/`
- **Configuration**: API key and index name required

## Architecture Overview

### Frontend
- **Framework**: Next.js with App Router
- **Components**: React components in `src/components/`
- **Routes**: Defined in `src/app/`

### Backend/API
- **API Routes**: Next.js API routes in `src/app/api/`
- **Server Actions**: Next.js server actions for data mutations

### AI Integration
- **Voice**: Vapi for voice interactions
- **Transcription**: Deepgram for speech-to-text
- **Vector Search**: Pinecone for semantic search

## Environment Variables
See `.env.example` for required configuration.

## Deployment
- **Container**: Dockerfile provided for containerization
- **Targets**: GCP, AWS, or other cloud providers
- **Mobile**: Capacitor for native mobile wrapping
