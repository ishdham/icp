import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            if (isLogin) {
                // If attempting to login, verify they have a backend profile
                try {
                    await client.get('/users/me');
                    navigate('/');
                    return;
                } catch (err) {
                    // Profile not found, sign out and show error
                    await signOut(auth);
                    throw new Error('Account does not exist. Please sign up first.');
                }
            }

            // Registration Mode (Sign Up)
            // Extract name from display name or email
            let firstName = 'User';
            let lastName = '';

            if (user.displayName) {
                const parts = user.displayName.split(' ');
                firstName = parts[0];
                lastName = parts.slice(1).join(' ');
            } else if (user.email) {
                const parts = user.email.split('@')[0].split('.');
                firstName = parts[0];
                lastName = parts[1] || '';
            }

            // Register/Update user in backend
            await client.post('/auth/register', {
                uid: user.uid,
                email: user.email,
                firstName: firstName,
                lastName: lastName,
                phone: { number: user.phoneNumber || '' }, // Google might provide phone
                discoverySource: 'Google Auth'
            });

            navigate('/');
        } catch (err: any) {
            console.error('Google Auth Error:', err);
            setError(err.message || 'Failed to sign in with Google');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);

                // Verify backend profile exists
                try {
                    await client.get('/users/me');
                } catch (err) {
                    await signOut(auth);
                    throw new Error('Account does not exist. Please sign up first.');
                }
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Call backend to create user profile
                // We'll use the email as a placeholder for names for now, or split it
                // In a real app, we'd add more fields to the signup form
                const [firstName, lastName] = email.split('@')[0].split('.');

                await client.post('/auth/register', {
                    uid: user.uid,
                    email: user.email,
                    firstName: firstName || 'User',
                    lastName: lastName || '',
                    phone: { number: '' } // Optional in backend
                });
            }
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        }
    };

    return (
        <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {isLogin ? 'Sign in to your account' : 'Create new account'}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                type="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-brand-blue focus:border-brand-blue focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-brand-blue focus:border-brand-blue focus:z-10 sm:text-sm"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-sm">{error}</div>}

                    <div className="space-y-4">
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-colors"
                        >
                            {isLogin ? 'Sign in' : 'Sign up'}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or continue with</span>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="flex items-center justify-center py-2 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-colors"
                            >
                                <img className="h-4 w-4 mr-2" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google logo" />
                                {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
                            </button>
                        </div>
                    </div>

                    <div className="text-center">
                        <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-brand-blue hover:text-brand-blue/80 font-medium">
                            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
