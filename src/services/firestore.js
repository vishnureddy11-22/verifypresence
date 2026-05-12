/**
 * Safe Firestore wrappers — silently no-op / error when Firebase is not configured.
 * All pages already have localStorage fallbacks, so demo mode works seamlessly.
 */
import { FIREBASE_AVAILABLE } from './firebase';
import {
  doc as _doc,
  collection as _collection,
  setDoc as _setDoc,
  getDoc as _getDoc,
  addDoc as _addDoc,
  deleteDoc as _deleteDoc,
  onSnapshot as _onSnapshot,
} from 'firebase/firestore';

const NOOP_UNSUB = () => {};

// When Firebase is configured, use real functions. Otherwise use stubs.
export const safeDoc = FIREBASE_AVAILABLE
  ? _doc
  : () => null;

export const safeCollection = FIREBASE_AVAILABLE
  ? _collection
  : () => null;

export const safeSetDoc = FIREBASE_AVAILABLE
  ? _setDoc
  : async () => { throw new Error('Firebase not configured'); };

export const safeGetDoc = FIREBASE_AVAILABLE
  ? _getDoc
  : async () => { throw new Error('Firebase not configured'); };

export const safeAddDoc = FIREBASE_AVAILABLE
  ? _addDoc
  : async () => { throw new Error('Firebase not configured'); };

export const safeDeleteDoc = FIREBASE_AVAILABLE
  ? _deleteDoc
  : async () => { throw new Error('Firebase not configured'); };

/**
 * Safe onSnapshot — when Firebase is unavailable, immediately calls the error
 * callback so components fall back to their localStorage path.
 */
export const safeOnSnapshot = FIREBASE_AVAILABLE
  ? _onSnapshot
  : (_ref, successOrObserver, errorCb) => {
      const cb = typeof successOrObserver === 'function' ? errorCb : successOrObserver?.error;
      if (cb) setTimeout(() => cb(new Error('Firebase not configured — using local data')), 50);
      else if (typeof errorCb === 'function') setTimeout(() => errorCb(new Error('Firebase not configured — using local data')), 50);
      return NOOP_UNSUB;
    };
