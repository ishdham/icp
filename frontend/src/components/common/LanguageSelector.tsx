import React from 'react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../../context/LanguageContext';
import type { LanguageCode } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext'; // To access API/Token if needed for profile update
import { updateUserProfile } from '../../api/users'; // Assuming this exists or generic update

export const LanguageSelector: React.FC = () => {
    const { language, setLanguage } = useLanguage();
    const { user, refreshUser } = useAuth();

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLang = e.target.value as LanguageCode;
        setLanguage(newLang);

        if (user) {
            try {
                // Update user profile
                await updateUserProfile(user.uid, { language: newLang });
                // We don't necessarily need to refreshUser immediately as local state handles it, 
                // but nice to sync.
                refreshUser();
            } catch (error) {
                console.error('Failed to save language preference', error);
            }
        }
    };

    return (
        <div style={{ marginRight: '1rem' }}>
            <select
                value={language}
                onChange={handleChange}
                style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    border: '1px solid #ccc',
                    backgroundColor: 'white',
                    fontSize: '0.875rem'
                }}
            >
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => (
                    <option key={code} value={code}>
                        {info.name}
                    </option>
                ))}
            </select>
        </div>
    );
};
