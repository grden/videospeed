import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// --- Firebase Configuration ---
// IMPORTANT: Replace with your app's Firebase project configuration.
// This configuration should be treated as public, but for enhanced security,
// configure Firebase Security Rules in your Firebase console.
const firebaseConfig = {
  apiKey: 'AIzaSyDN559kfe9kXkdZFVLfZONP2Xu-NElzny8',
  authDomain: 'speed-3d4d2.firebaseapp.com',
  projectId: 'speed-3d4d2',
  storageBucket: 'speed-3d4d2.firebasestorage.app',
  messagingSenderId: '295372451074',
  appId: '1:295372451074:web:7b78ccae840d97b9dba61b',
  measurementId: 'G-HSNHZ1Y5F0',
};

// --- Firebase Initialization ---
let db;
let firebaseInitialized = false;

try {
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  // Initialize Cloud Firestore and get a reference to the service
  db = getFirestore(app);
  firebaseInitialized = true;
  if (window.VSC && window.VSC.logger) {
    window.VSC.logger.info('Firebase initialized successfully.');
  } else {
    console.log('VSC: Firebase initialized successfully.');
  }
} catch (error) {
  if (window.VSC && window.VSC.logger) {
    window.VSC.logger.error('Firebase initialization failed:', error);
  } else {
    console.error('VSC: Firebase initialization failed:', error);
  }
}

/**
 * Logs response data to Firestore.
 * @param {object} data - The response data to log.
 * @returns {Promise<void>}
 */
async function logResponse(data) {
  if (!firebaseInitialized) {
    const errorMessage = 'Firebase is not initialized. Cannot log response.';
    if (window.VSC && window.VSC.logger) {
      window.VSC.logger.error(errorMessage);
    } else {
      console.error(`VSC: ${errorMessage}`);
    }
    throw new Error(errorMessage);
  }

  try {
    const docRef = await addDoc(collection(db, 'speed-change-responses'), data);
    if (window.VSC && window.VSC.logger) {
      window.VSC.logger.info('Document written with ID:', docRef.id);
    } else {
      console.log('VSC: Document written with ID:', docRef.id);
    }
  } catch (e) {
    if (window.VSC && window.VSC.logger) {
      window.VSC.logger.error('Error adding document:', e);
    } else {
      console.error('VSC: Error adding document: ', e);
    }
    throw e; // Re-throw to be caught by the caller
  }
}

// Expose logResponse globally for other modules
window.VSC = window.VSC || {};
window.VSC.firebase = {
  logResponse,
};
