# GastroMap Setup Instructions

## Environment Variables

This project uses environment variables to keep sensitive API keys secure. Follow these steps to set up your environment:

### 1. Create Environment File

Copy the `.env.example` file to create your own `.env` file:

```bash
cp .env.example .env
```

### 2. Configure API Keys

Edit the `.env` file and add your API keys:

#### Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Copy the API key to `VITE_GOOGLE_MAPS_API_KEY` in your `.env` file

#### Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > General
4. Scroll down to "Your apps" section
5. Copy the Firebase configuration values to your `.env` file:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`

### 3. Important Security Notes

- **Never commit** your `.env` file to version control (it's already in `.gitignore`)
- The `.env.example` file is safe to commit (it contains no real values)
- API keys are already configured with fallback values for development
- For production, always use environment variables from your hosting platform

### 4. Development

After setting up your `.env` file, start the development server:

```bash
npm install
npm run dev
```

The environment variables will be automatically loaded by Vite.

### 5. Production Deployment

When deploying to production (Vercel, Netlify, etc.):

1. Add all environment variables to your hosting platform's environment settings
2. Make sure to prefix all variables with `VITE_` (required by Vite)
3. Never expose your `.env` file publicly

## Current Configuration

The app is now properly configured with:
- ✅ Separate Google Maps API Key (`AIzaSyDE4SM9roZ4PthOaAxpnToXMjLBEd99xD8`)
- ✅ Separate Firebase API Key
- ✅ Environment variable support
- ✅ Fallback values for development
- ✅ `.gitignore` configured to protect `.env`

## Troubleshooting

### Map Not Loading
- Check that your Google Maps API Key is valid
- Verify that the Maps JavaScript API is enabled in Google Cloud Console
- Check browser console for specific error messages

### Firebase Errors
- Verify all Firebase configuration values are correct
- Ensure Firebase services (Auth, Firestore, Storage) are enabled
- Check Firebase console for any security rules blocking requests
