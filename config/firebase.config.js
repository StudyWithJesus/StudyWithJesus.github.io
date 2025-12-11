/**
 * Firebase Configuration
 * 
 * This file contains the Firebase project configuration for the StudyWithJesus app.
 * Used for leaderboard functionality.
 */

// Firebase configuration object
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCAz3KAFSkzhTsYNO2kQIham0La5iwYlCU",
  authDomain: "studywithjesus.firebaseapp.com",
  projectId: "studywithjesus",
  storageBucket: "studywithjesus.firebasestorage.app",
  messagingSenderId: "337617037196",
  appId: "1:337617037196:web:0dbee62021320cffecd8a9"
  // measurementId removed - Analytics not configured on server
};

// Leaderboard configuration
// These settings control how the leaderboard feature behaves
window.LEADERBOARD_CONFIG = {
  // Set to true to enable Firebase integration
  firebaseEnabled: true,
  
  // Alternative: REST API backend URL (set to null to use Firebase or sample data)
  backendUrl: null,
  
  // Number of top scores to display per module
  topN: 10,
  
  // Available modules (update if modules change)
  modules: ['270201', '270202', '270203', '270204'],
  
  // Module display names
  moduleNames: {
    '270201': 'Engine Systems',
    '270202': 'Driveline & Drivetrain',
    '270203': 'Hydraulics & Air Brakes',
    '270204': 'Electrical, Auto Body & Mobile Equipment'
  }
};
