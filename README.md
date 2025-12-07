# TraceBook

A beautiful photo-based location tracking app built with React, Mapbox GL, and Firebase.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Create `.env` File

Create a file named `.env` in the project root:

```env
VITE_MAPBOX_ACCESS_TOKEN=pk.YOUR_MAPBOX_TOKEN_HERE
VITE_FOURSQUARE_API_KEY=YOUR_FOURSQUARE_KEY_HERE
```

**Get your API keys:**
- Mapbox: https://account.mapbox.com/
- Foursquare: https://foursquare.com/developers/

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
```

## Features

- 📍 Interactive map with Mapbox GL
- 📸 Photo-based location markers with custom styling
- 🔍 Place search powered by Foursquare
- 👥 Multi-user shared maps
- 🎨 Multiple map themes (Satellite, Roadmap, Dark)
- 📱 Mobile-responsive design
- 🔥 Firebase authentication and real-time database

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS
- **Maps:** Mapbox GL JS
- **Places API:** Foursquare Places API
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Build:** Vite

## Project Structure

```
├── components/       # React components
├── hooks/           # Custom React hooks
├── services/        # API services (Foursquare)
├── utils/           # Utility functions
├── public/          # Static assets
└── App.tsx          # Main application
```
