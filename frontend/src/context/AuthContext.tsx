import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../config/firebase';

// Extend User type to include role
export interface AuthUser extends User {
    role?: string;
    language?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType>({ user: null, loading: true, logout: async () => { }, refreshUser: async () => { } });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log('AuthStateChanged:', firebaseUser?.email);
            if (firebaseUser) {
                const tokenResult = await firebaseUser.getIdTokenResult();
                const role = tokenResult.claims.role as string;
                // Currently language is stored in user profile doc, not commonly in auth token claims unless we put it there.
                // But for now let's assume it might be in claims if we want it here, OR we trust the component to fetch profile.
                // If LanguageContext checks user.language, it expects it here.
                // Let's rely on api/users fetch? No, AuthContext should be lightweight.
                // Let's add language to claims or just ignore for now and let LanguageContext use valid defaults?
                // LanguageContext uses user?.language. 
                // We should probably fetch the user profile here or ensure it's in claims.
                // For MVP, if not in claims, we might need to fetch `users/{uid}`.
                // Let's keep it simple: if not present, LanguageContext falls back to localStorage.
                const safeUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    emailVerified: firebaseUser.emailVerified,
                    isAnonymous: firebaseUser.isAnonymous,
                    providerData: firebaseUser.providerData,
                    metadata: firebaseUser.metadata,
                    phoneNumber: firebaseUser.phoneNumber,
                    tenantId: firebaseUser.tenantId,
                    role,
                    language: (tokenResult.claims.language as string) || undefined,
                    // Preserve useful methods by binding them if possible, or expect consumers to use auth.currentUser for methods
                    getIdToken: () => firebaseUser.getIdToken(),
                    getIdTokenResult: () => firebaseUser.getIdTokenResult(),
                    reload: () => firebaseUser.reload(),
                    toJSON: () => firebaseUser.toJSON(),
                    delete: () => firebaseUser.delete(),
                } as unknown as AuthUser;
                setUser(safeUser);
            } else {
                setUser(null);
            }
            console.log('Setting loading false (auth change)');
            setLoading(false);
        });

        // Safety timeout in case Firebase is blocked or slow
        const timer = setTimeout(() => {
            console.log('Auth check timed out, forcing load');
            setLoading(false);
        }, 2000);

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const logout = async () => {
        await signOut(auth);
    };

    const refreshUser = async () => {
        if (auth.currentUser) {
            await auth.currentUser.reload();
            const tokenResult = await auth.currentUser.getIdTokenResult(true);
            const role = tokenResult.claims.role as string;
            const updatedUser = {
                uid: auth.currentUser.uid,
                email: auth.currentUser.email,
                displayName: auth.currentUser.displayName,
                photoURL: auth.currentUser.photoURL,
                emailVerified: auth.currentUser.emailVerified,
                isAnonymous: auth.currentUser.isAnonymous,
                providerData: auth.currentUser.providerData,
                metadata: auth.currentUser.metadata,
                phoneNumber: auth.currentUser.phoneNumber,
                tenantId: auth.currentUser.tenantId,
                role: role,
                language: (tokenResult.claims.language as string) || undefined,
                getIdToken: () => auth.currentUser!.getIdToken(),
                getIdTokenResult: () => auth.currentUser!.getIdTokenResult(),
                reload: () => auth.currentUser!.reload(),
                toJSON: () => auth.currentUser!.toJSON(),
                delete: () => auth.currentUser!.delete(),
            } as unknown as AuthUser;
            setUser(updatedUser);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
