import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getAuth, type Auth } from "firebase/auth"

// Firebase collections
export const MESSAGES_COLLECTION = "messages"
export const USERS_COLLECTION = "users"
export const AUTH_COLLECTION = "auth_users"
export const ADMIN_COLLECTION = "admin"
export const ADMIN_DOCUMENT = "settings"

// Types
export interface Message {
  id: string
  username: string
  text: string
  timestamp: number
  fileURL?: string
  fileName?: string
  fileType?: string
  fileSize?: number
}

export interface User {
  username: string
  lastSeen: number
  online: boolean
}

export interface AuthUser {
  username: string
  passwordHash: string
  createdAt: number
  lastLogin?: number
}

export interface AdminSettings {
  lastClearTimestamp: number
}

// Initialize Firebase only if it hasn't been initialized yet
let app: FirebaseApp | undefined
let firestore: Firestore | undefined
let auth: Auth | undefined

try {
  // Check if Firebase is already initialized
  if (getApps().length === 0) {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }

    // Log the config for debugging (remove in production)
    console.log("Firebase config:", {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "✓ Set" : "✗ Missing",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "✓ Set" : "✗ Missing",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "✓ Set" : "✗ Missing",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "✓ Set" : "✗ Missing",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "✓ Set" : "✗ Missing",
    })

    app = initializeApp(firebaseConfig)
    console.log("Firebase initialized successfully")
  } else {
    app = getApps()[0]
    console.log("Using existing Firebase app")
  }

  firestore = getFirestore(app)
  console.log("Firestore initialized successfully")

  auth = getAuth(app)
  console.log("Auth initialized successfully")
} catch (error) {
  console.error("Error initializing Firebase:", error)
}

export const db = firestore
export const firebaseAuth = auth

// Helper function to check if Firebase is initialized
export function isFirebaseInitialized() {
  const initialized = !!app && !!firestore

  if (!initialized) {
    console.warn("Firebase not fully initialized:", {
      hasApp: !!app,
      hasFirestore: !!firestore,
    })
  }

  return initialized
}

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// Helper function to check if a file is an image
export function isImageFile(fileType: string): boolean {
  return fileType.startsWith("image/")
}

// Helper function to check if a file is a video
export function isVideoFile(fileType: string): boolean {
  return fileType.startsWith("video/")
}

// Helper function to check if a file is an audio
export function isAudioFile(fileType: string): boolean {
  return fileType.startsWith("audio/")
}

