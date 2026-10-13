import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCpQpJIUHy40BWHlzU-Z2FIVYBPc8QW1I4',
  authDomain: 'topdanci.firebaseapp.com',
  projectId: 'topdanci',
  storageBucket: 'topdanci.firebasestorage.app',
  messagingSenderId: '258880606563',
  appId: '1:258880606563:web:a2ec5f5a5e65e280324356',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
