import { useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface Translatable {
    translations?: Record<string, any>;
    [key: string]: any;
}

/**
 * A hook that returns a localized version of an entity.
 * It merges the `translations` for the current language (if available)
 * onto the base object, effectively overriding the default (English) fields.
 * 
 * @param data The entity object containing a `translations` map.
 * @returns The localized entity.
 */
export const useTranslated = <T extends Translatable>(data: T | null | undefined): T | null | undefined => {
    const { language } = useLanguage();

    return useMemo(() => {
        if (!data) return data;

        // If English (default), return as-is
        if (language === 'en') return data;

        const translation = data.translations?.[language];

        // If translation exists, merge it
        if (translation) {
            return {
                ...data,
                ...translation
            };
        }

        // Fallback to default
        return data;
    }, [data, language]);
};

/**
 * A hook that returns a localized version of a list of entities.
 * @param list The array of entity objects.
 * @returns The localized list of entities.
 */
export const useTranslatedList = <T extends Translatable>(list: T[]): T[] => {
    const { language } = useLanguage();

    return useMemo(() => {
        if (!list) return list;
        if (language === 'en') return list;

        return list.map(item => {
            const translation = item.translations?.[language];
            return translation ? { ...item, ...translation } : item;
        });
    }, [list, language]);
};
