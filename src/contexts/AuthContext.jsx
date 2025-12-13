import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in, fetch additional details from Firestore
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    setCurrentUser({ ...user, ...userDoc.data() });
                } else {
                    // Fallback if firestore doc doesn't exist (e.g. first google login)
                    setCurrentUser(user);
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const register = async (name, nickname, email, password) => {
        try {
            const { user } = await createUserWithEmailAndPassword(auth, email, password);

            // Update display name in Firebase Auth (use nickname if provided, else name)
            await updateFirebaseProfile(user, { displayName: nickname || name });

            // Create user document in Firestore
            const userData = {
                id: user.uid,
                name: name,
                nickname: nickname || name, // Default to name if empty
                email: email,
                createdAt: new Date().toISOString(),
                bio: '',
                socialLinks: { instagram: '', twitter: '', facebook: '', linkedin: '' },
                role: 'user'
            };

            await setDoc(doc(db, 'users', user.uid), userData);

            // Update local state immediately
            setCurrentUser({ ...user, ...userData });

            return { success: true };
        } catch (error) {
            console.error("Registration Error:", error);
            let errorMessage = "Kayıt oluşturulurken bir hata oluştu.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Bu e-posta adresi zaten kullanımda.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Şifre çok zayıf. En az 6 karakter olmalı.";
            }
            return { success: false, error: errorMessage };
        }
    };

    const login = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            console.error("Login Error:", error);
            let errorMessage = "Giriş yapılırken bir hata oluştu.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorMessage = "Hatalı e-posta veya şifre.";
            }
            return { success: false, error: errorMessage };
        }
    };

    const loginWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const { user } = await signInWithPopup(auth, provider);

            // Check if user document exists
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                // Create new user document for Google user
                const userData = {
                    id: user.uid,
                    name: user.displayName,
                    email: user.email,
                    createdAt: new Date().toISOString(),
                    bio: '',
                    socialLinks: { instagram: '', twitter: '', facebook: '', linkedin: '' },
                    photoURL: user.photoURL,
                    role: 'user'
                };
                await setDoc(userDocRef, userData);
                setCurrentUser({ ...user, ...userData });
            }

            return { success: true };
        } catch (error) {
            console.error("Google Login Error:", error);
            return { success: false, error: "Google ile giriş yapılamadı." };
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: "Çıkış yapılamadı." };
        }
    };

    const updateProfile = async (data) => {
        if (!currentUser) return { success: false, error: 'Giriş yapılmamış.' };

        try {
            const userDocRef = doc(db, 'users', currentUser.uid || currentUser.id);
            await updateDoc(userDocRef, data);

            // Also update Firebase Auth profile if name/nickname changed
            if ((data.name || data.nickname) && auth.currentUser) {
                await updateFirebaseProfile(auth.currentUser, { displayName: data.nickname || data.name });
            }

            // Update local state
            setCurrentUser(prev => ({ ...prev, ...data }));
            return { success: true };
        } catch (error) {
            console.error("Update Profile Error:", error);
            return { success: false, error: "Profil güncellenemedi." };
        }
    };

    // Legacy support for verification (not needed with Firebase but keeping interface)
    const verifyEmail = async (email, code) => {
        return { success: true }; // Auto-verify or implement Firebase email verification later
    };

    const value = {
        currentUser,
        login,
        register,
        verifyEmail,
        loginWithGoogle,
        logout,
        updateProfile,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
