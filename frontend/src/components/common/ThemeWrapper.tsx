import React, { useMemo } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useLanguage } from '../../context/LanguageContext';

export const ThemeWrapper = ({ children }: { children: React.ReactNode }) => {
    const { direction } = useLanguage();

    const theme = useMemo(() => createTheme({
        direction: direction,
    }), [direction]);

    return (
        <ThemeProvider theme={theme}>
            {children}
        </ThemeProvider>
    );
};
