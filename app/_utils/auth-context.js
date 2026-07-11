"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
	onAuthStateChanged,
	signInWithPopup,
	signOut,
	GoogleAuthProvider,
	FacebookAuthProvider,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
    // Determines if user is admin or member
	const [roleId, setRoleId] = useState(null);

	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			try {
				setUser(firebaseUser);

				if (!firebaseUser) {
					setRoleId(null);
					setLoading(false);
					return;
				}
                
                // get firebase token so backend can verify user
				const token = await firebaseUser.getIdToken();

                // calls our API to get roleId from DB
				const res = await fetch("/api/auth/me", {
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

                // if backend fails, just treat user as member
				if (!res.ok) {
					setRoleId(null);
					setLoading(false);
					return;
				}

                const data = await res.json();
                
                // store roleId from DB so the rest of the app can use it
				setRoleId(data?.user?.roleId ?? null);
			} catch (error) {
				console.error("AuthContext error:", error);
                // just in case it fails, never assumes user is admin
				setRoleId(null);
			} finally {
				setLoading(false);
			}
		});

		return () => unsubscribe();
	}, []);

	const googleSignIn = async () => {
		const provider = new GoogleAuthProvider();
		await signInWithPopup(auth, provider);
	};

	const facebookSignIn = async () => {
		const provider = new FacebookAuthProvider();
		await signInWithPopup(auth, provider);
	};

	const emailSignUp = async (email, password) => {
		return createUserWithEmailAndPassword(auth, email, password);
	};

	const emailSignIn = async (email, password) => {
		return signInWithEmailAndPassword(auth, email, password);
	};

	const firebaseSignOut = async () => {
		await signOut(auth);
		setUser(null);
		setRoleId(null);
		window.location.href = "/";
	};

	const resetPassword = (email) => {
		return sendPasswordResetEmail(auth, email);
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				roleId,
				loading,
				googleSignIn,
				facebookSignIn,
				emailSignUp,
				emailSignIn,
				firebaseSignOut,
				resetPassword,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useUserAuth() {
	return useContext(AuthContext);
}