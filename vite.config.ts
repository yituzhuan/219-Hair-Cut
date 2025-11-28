import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  // Safe check for API_KEY presence during build time
  const hasApiKey = !!process.env.API_KEY;
  if (!hasApiKey) {
    console.warn("⚠️  WARNING: API_KEY is missing in build environment. The app will fail to make API calls.");
    console.warn("   Please verify you have set 'API_KEY' in your Vercel Project Settings > Environment Variables.");
  } else {
    console.log("✅ API_KEY detected in build environment.");
  }

  return {
    plugins: [react()],
    define: {
      // Ensures process.env.API_KEY is replaced with the actual value during build
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    },
  };
});