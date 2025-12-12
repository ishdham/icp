import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type LanguageCode = 'en' | 'hi' | 'bn' | 'te' | 'mr' | 'ta' | 'ur' | 'gu' | 'kn' | 'ml' | 'pa';

export interface LanguageContextType {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    direction: 'ltr' | 'rtl';
    t: (text: string) => string; // Placeholder for UI strings translation
}

const LANGUAGES: Record<LanguageCode, { name: string; dir: 'ltr' | 'rtl' }> = {
    'en': { name: 'English', dir: 'ltr' },
    'hi': { name: 'Hindi', dir: 'ltr' },
    'bn': { name: 'Bengali', dir: 'ltr' },
    'te': { name: 'Telugu', dir: 'ltr' },
    'mr': { name: 'Marathi', dir: 'ltr' },
    'ta': { name: 'Tamil', dir: 'ltr' },
    'ur': { name: 'Urdu', dir: 'rtl' },
    'gu': { name: 'Gujarati', dir: 'ltr' },
    'kn': { name: 'Kannada', dir: 'ltr' },
    'ml': { name: 'Malayalam', dir: 'ltr' },
    'pa': { name: 'Punjabi', dir: 'ltr' }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [language, setLanguageState] = useState<LanguageCode>('en');

    // Initialize from user profile if available, else local storage, else 'en'
    useEffect(() => {
        if (user?.language) {
            setLanguageState(user.language as LanguageCode);
        } else {
            const saved = localStorage.getItem('app_language') as LanguageCode;
            if (saved && LANGUAGES[saved]) {
                setLanguageState(saved);
            }
        }
    }, [user?.language]);

    const setLanguage = (lang: LanguageCode) => {
        setLanguageState(lang);
        localStorage.setItem('app_language', lang);

        // Update user profile if logged in
        // We'll trust the component calling this to trigger the API update or we do it here?
        // Let's do it here for convenience if user is logged in.
        // But we need an API client. For now, we'll just update state and localStorage.
        // The Selector component can handle the API call or we can add it here if we had api client imported.
    };

    const direction = LANGUAGES[language].dir;

    // UI Dictionary
    const DICTIONARY: Record<LanguageCode, Record<string, string>> = {
        'en': {
            'nav.dashboard': 'Dashboard',
            'nav.solutions': 'Solutions',
            'nav.partners': 'Partners',
            'nav.tickets': 'Tickets',
            'nav.users': 'Users',
            'nav.reports': 'Reports',
            'nav.login': 'Login / Register',
            'nav.logout': 'Logout',
            'common.back': 'Back',
            'common.save': 'Save',
            'common.cancel': 'Cancel',
            'common.full_catalog': 'Full Catalog',
            'common.back_to_list': 'Back to List',
            'common.ai_import': 'AI Assisted Import',
            'dashboard.total_solutions': 'Total Solutions',
            'dashboard.active_partners': 'Active Partners',
            'dashboard.my_tickets': 'My Tickets',
            'common.view_all': 'View All',
            'dashboard.quick_actions': 'Quick Actions',
            'dashboard.submit_solution': 'Submit a Solution',
            'dashboard.submit_desc': 'Share your innovative solution with the platform.',
            'dashboard.propose_partner': 'Propose a Partner',
            'dashboard.propose_desc': 'Recommend a new partner organization.',
            'solutions.title': 'Solutions',
            'solutions.submit_new': 'Submit New Solution',
            'solutions.details': 'Solution Details',
            'partners.title': 'Partners',
            'partners.propose_new': 'Propose New Partner',
            'partners.details': 'Partner Details',
            'tickets.title': 'Tickets',
            'tickets.submit_new': 'Submit New Ticket',
            'tickets.details': 'Ticket Details',
            'tickets.approve_request': 'Approve Request',
            'reports.title': 'Solutions Report',
            'reports.back_to_solutions': 'Back to Solutions',
            'reports.status_filter': 'Solution Status',
            'reports.by_domain': 'Solutions by Domain',
            'reports.by_provider': 'Solutions by Provider',
            'reports.found': 'Solutions Found',
            'reports.no_match': 'No solutions match the selected criteria.',
            'list.view_action': 'View',
            'list.column_name': 'Name',
            'list.column_domain': 'Domain',
            'list.column_status': 'Status',
            'list.column_org': 'Organization',
            'list.column_type': 'Type',
            'list.column_proposed_by': 'Proposed By',
            'list.column_title': 'Title',
            'list.toggle_list': 'List',
            'list.toggle_ai': 'AI Assistant',
            'list.search_placeholder': 'Search...',
            'list.go': 'Go',
            'list.create_new': 'Create New',
            'list.page_label': 'Page',
            // Enums
            'domain.Water': 'Water',
            'domain.Health': 'Health',
            'domain.Energy': 'Energy',
            'domain.Education': 'Education',
            'domain.Livelihood': 'Livelihood',
            'domain.Sustainability': 'Sustainability',
            'status.PROPOSED': 'PROPOSED',
            'status.DRAFT': 'DRAFT',
            'status.PENDING': 'PENDING',
            'status.APPROVED': 'APPROVED',
            'status.MATURE': 'MATURE',
            'status.PILOT': 'PILOT',
            'status.REJECTED': 'REJECTED',
            'status.NEW': 'NEW',
            'status.IN_PROGRESS': 'IN_PROGRESS',
            'status.RESOLVED': 'RESOLVED',
            'status.CLOSED': 'CLOSED',
            // Partner Entity Types
            'entity_type.NGO': 'NGO',
            'entity_type.Social Impact Entity': 'Social Impact Entity',
            'entity_type.Academic': 'Academic',
            'entity_type.Corporate': 'Corporate',
            // Form Titles & Labels (Explicit mapping, though redundant if key==value, useful for strict t())
            'System Info': 'System Info',
            'Solution Overview': 'Solution Overview',
            'Impact & Benefits': 'Impact & Benefits',
            'Implementation Details': 'Implementation Details',
            'Resources': 'Resources',
            'Attachments': 'Attachments',
            'ID': 'ID',
            'Created At': 'Created At',
            'Updated At': 'Updated At',
            'Solution Name': 'Solution Name',
            'Summary (One Line)': 'Summary (One Line)',
            'Detailed Description': 'Detailed Description',
            'Domain': 'Domain',
            'Vertical Domain': 'Vertical Domain',
            'Unique Value Proposition (Benefit)': 'Unique Value Proposition (Benefit)',
            'Cost and Effort': 'Cost and Effort',
            'Return on Investment (ROI)': 'Return on Investment (ROI)',
            'Launch Year': 'Launch Year',
            'Target Beneficiaries': 'Target Beneficiaries',
            'References (Links)': 'References (Links)',
            'Status': 'Status',
            'Provided By Partner ID': 'Provided By Partner ID',
            'Provided By Partner Name': 'Provided By Partner Name',
            'Proposed By User ID': 'Proposed By User ID',
            'Proposed By User Name': 'Proposed By User Name',
            // Partner Form Labels
            'Organization Details': 'Organization Details',
            'Contact Details': 'Contact Details',
            'Location': 'Location',
            'Organization Name': 'Organization Name',
            'Entity Type': 'Entity Type',
            'Website URL': 'Website URL',
            'Contact Information': 'Contact Information',
            'Address': 'Address',
            'Email': 'Email',
            'Phone': 'Phone',
            'City': 'City',
            'Country': 'Country',
            'Proposer ID': 'Proposer ID',
            'Proposed By': 'Proposed By'
        },
        'hi': {
            'nav.dashboard': 'डैशबोर्ड',
            'nav.solutions': 'समाधान',
            'nav.partners': 'साझेदार',
            'nav.tickets': 'टिकट',
            'nav.users': 'उपयोगकर्ता',
            'nav.reports': 'रिपोर्ट',
            'nav.login': 'लॉग इन / रजिस्टर',
            'nav.logout': 'लॉग आउट',
            'common.back': 'वापस',
            'common.save': 'सहेजें',
            'common.cancel': 'रद्द करें',
            'common.full_catalog': 'पूर्ण सूची',
            'common.back_to_list': 'सूची पर वापस जाएं',
            'common.ai_import': 'एआई सहायता प्राप्त आयात',
            'dashboard.total_solutions': 'कुल समाधान',
            'dashboard.active_partners': 'सक्रिय साझेदार',
            'dashboard.my_tickets': 'मेरे टिकट',
            'common.view_all': 'सभी देखें',
            'dashboard.quick_actions': 'त्वरित कार्रवाई',
            'dashboard.submit_solution': 'एक समाधान जमा करें',
            'dashboard.submit_desc': 'मंच के साथ अपना विचार साझा करें।',
            'dashboard.propose_partner': 'एक साथी प्रस्तावित करें',
            'dashboard.propose_desc': 'एक नए भागीदार संगठन की सिफारिश करें।',
            'solutions.title': 'समाधान',
            'solutions.submit_new': 'नया समाधान जमा करें',
            'solutions.details': 'समाधान विवरण',
            'partners.title': 'साझेदार',
            'partners.propose_new': 'नया साथी प्रस्तावित करें',
            'partners.details': 'साझेदार विवरण',
            'tickets.title': 'टिकट',
            'tickets.submit_new': 'नया टिकट जमा करें',
            'tickets.details': 'टिकट विवरण',
            'tickets.approve_request': 'अनुरोध स्वीकार करें',
            'reports.title': 'समाधान रिपोर्ट',
            'reports.back_to_solutions': 'समाधान पर वापस',
            'reports.status_filter': 'समाधान स्थिति',
            'reports.by_domain': 'डोमेन द्वारा समाधान',
            'reports.by_provider': 'प्रदाता द्वारा समाधान',
            'reports.found': 'समाधान मिले',
            'reports.no_match': 'चयनित मानदंड से कोई समाधान मेल नहीं खाता।',
            'list.view_action': 'देखें',
            'list.column_name': 'नाम',
            'list.column_domain': 'डोमेन',
            'list.column_status': 'स्थिति',
            'list.column_org': 'संगठन',
            'list.column_type': 'प्रकार',
            'list.column_proposed_by': 'प्रस्तावित द्वारा',
            'list.column_title': 'शीर्षक',
            'list.toggle_list': 'सूची',
            'list.toggle_ai': 'एआई सहायक',
            'list.search_placeholder': 'खोजें...',
            'list.go': 'जाएं',
            'list.create_new': 'नया बनाएँ',
            'list.page_label': 'पृष्ठ',
            // Enums
            'domain.Water': 'जल',
            'domain.Health': 'स्वास्थ्य',
            'domain.Energy': 'ऊर्जा',
            'domain.Education': 'शिक्षा',
            'domain.Livelihood': 'आजीविका',
            'domain.Sustainability': 'स्थिरता',
            'status.PROPOSED': 'प्रस्तावित',
            'status.DRAFT': 'मसौदा',
            'status.PENDING': 'लंबित',
            'status.APPROVED': 'स्वीकृत',
            'status.MATURE': 'परिपक्व',
            'status.PILOT': 'पायलट',
            'status.REJECTED': 'अस्वीकृत',
            'status.NEW': 'नया',
            'status.IN_PROGRESS': 'प्रगति पर',
            'status.RESOLVED': 'सुलझाया हुआ',
            'status.CLOSED': 'बंद',
            // Partner Entity Types
            'entity_type.NGO': 'एनजीओ (NGO)',
            'entity_type.Social Impact Entity': 'सामाजिक प्रभाव इकाई',
            'entity_type.Academic': 'अकादमिक',
            'entity_type.Corporate': 'कॉर्पोरेट',
            // Form Titles & Labels
            'System Info': 'सिस्टम जानकारी',
            'Solution Overview': 'समाधान अवलोकन',
            'Impact & Benefits': 'प्रभाव और लाभ',
            'Implementation Details': 'कार्यान्वयन विवरण',
            'Resources': 'संसाधन',
            'Attachments': 'संलग्नक',
            'ID': 'आईडी',
            'Created At': 'बनाया गया',
            'Updated At': 'अद्यतित',
            'Solution Name': 'समाधान का नाम',
            'Summary (One Line)': 'सारांश (एक पंक्ति)',
            'Detailed Description': 'विस्तृत विवरण',
            'Domain': 'डोमेन',
            'Vertical Domain': 'लंबवत डोमेन (Vertical Domain)',
            'Unique Value Proposition (Benefit)': 'अद्वितीय मूल्य प्रस्ताव (लाभ)',
            'Cost and Effort': 'लागत और प्रयास',
            'Return on Investment (ROI)': 'निवेश पर वापसी (ROI)',
            'Launch Year': 'लॉन्च वर्ष',
            'Target Beneficiaries': 'लक्षित लाभार्थी',
            'References (Links)': 'संदर्भ (लिंक)',
            'Status': 'स्थिति',
            'Provided By Partner ID': 'साझेदार आईडी द्वारा प्रदान किया गया',
            'Provided By Partner Name': 'साझेदार नाम द्वारा प्रदान किया गया',
            'Proposed By User ID': 'प्रस्तावित उपयोगकर्ता आईडी',
            'Proposed By User Name': 'प्रस्तावित उपयोगकर्ता नाम',
            // Partner Form Labels
            'Organization Details': 'संगठन विवरण',
            'Contact Details': 'संपर्क विवरण',
            'Location': 'स्थान',
            'Organization Name': 'संगठन का नाम',
            'Entity Type': 'इकाई का प्रकार',
            'Website URL': 'वेबसाइट यूआरएल',
            'Email': 'ईमेल',
            'Phone': 'फ़ोन',
            'City': 'शहर',
            'Country': 'देश',
            'Proposer ID': 'प्रस्तावक आईडी',
            'Proposed By': 'द्वारा प्रस्तावित'
        },
        // Fallback for others (keep basic nav)
        'bn': {
            'nav.dashboard': 'ড্যাশবোর্ড',
            'nav.solutions': 'সমাধান',
            'nav.partners': 'অংশীদার',
            'nav.tickets': 'টিকেট',
            'nav.users': 'ব্যবহারকারী',
            'nav.reports': 'রিপোর্ট',
            'nav.login': 'লগইন / রেজিস্টার',
            'nav.logout': 'লগআউট',
            'common.back': 'ফিরে যান',
            'common.save': 'সংরক্ষণ',
            'common.cancel': 'বাতিল',
            'common.view_all': 'সব দেখুন',
            'dashboard.submit_solution': 'একটি সমাধান জমা দিন',
            'dashboard.propose_partner': 'নতুন অংশীদার প্রস্তাব করুন',
            'solutions.title': 'সমাধান',
            'partners.title': 'অংশীদার',
            'list.search_placeholder': 'অনুসন্ধান...',
            // Enums
            'domain.Water': 'জল',
            'domain.Health': 'স্বাস্থ্য',
            'domain.Energy': 'শক্তি',
            'domain.Education': 'শিক্ষা',
            'domain.Livelihood': 'জীবিকা',
            'domain.Sustainability': 'স্থায়িত্ব',
            'status.PROPOSED': 'প্রস্তাবিত',
            'status.APPROVED': 'অনুমোদিত',
            'status.REJECTED': 'প্রত্যাখ্যাত',
            'status.MATURE': 'পরিপক্ক',
            'entity_type.NGO': 'এনজিও',
            'entity_type.Social Impact Entity': 'সামাজিক প্রভাব সংস্থা',
            'entity_type.Academic': 'একাডেমিক',
            'entity_type.Corporate': 'কর্পোরেট',
            // Labels
            'Organization Name': 'প্রতিষ্ঠানের নাম',
            'Entity Type': 'সংস্থার ধরন',
            'Location': 'অবস্থান',
            'Contact Details': 'যোগাযোগের বিবরণ',
            'Solution Name': 'সমাধানের নাম',
            'Summary (One Line)': 'সারসংক্ষেপ (এক লাইন)',
            'Description': 'বিবরণ',
            'Domain': 'ডোমেইন'
        },
        'te': {
            'nav.dashboard': 'డాష్‌బోర్డ్',
            'nav.solutions': 'పరిష్కారాలు',
            'nav.partners': 'భాగస్వామ్యులు',
            'nav.tickets': 'టిక్కెట్లు',
            'nav.users': 'వినియోగదారులు',
            'nav.reports': 'నివేదికలు',
            'nav.login': 'లాగిన్ / నమోదు',
            'nav.logout': 'లాగ్ అవుట్',
            'common.back': 'వెనుకకు',
            'common.save': 'సేవ్ చేయండి',
            'common.cancel': 'రద్దు చేయండి',
            'common.view_all': 'అన్నీ చూడండి',
            'dashboard.submit_solution': 'పరిష్కారాన్ని సమర్పించండి',
            'dashboard.propose_partner': 'భాగస్వామిని ప్రతిపాదించండి',
            'solutions.title': 'పరిష్కారాలు',
            'partners.title': 'భాగస్వామ్యులు',
            'list.search_placeholder': 'శోధించండి...',
            // Enums
            'domain.Water': 'నీరు',
            'domain.Health': 'ఆరోగ్యం',
            'domain.Energy': 'శక్తి',
            'domain.Education': 'విద్య',
            'domain.Livelihood': 'జీవనోపాధి',
            'domain.Sustainability': 'సుస్థిరత',
            'status.PROPOSED': 'ప్రతిపాదించబడింది',
            'status.APPROVED': 'ఆమోదించబడింది',
            'status.REJECTED': 'తిరస్కరించబడింది',
            'status.MATURE': 'పరిపక్వ',
            'entity_type.NGO': 'NGO',
            'entity_type.Social Impact Entity': 'సామాజిక ప్రభావ సంస్థ',
            'entity_type.Academic': 'అకాడమిక్',
            'entity_type.Corporate': 'కార్పొరేట్',
            // Labels
            'Organization Name': 'సంస్థ పేరు',
            'Entity Type': 'సంస్థ రకం',
            'Location': 'స్థానం',
            'Contact Details': 'సంప్రదింపు వివరాలు',
            'Solution Name': 'పరిష్కారం పేరు',
            'Summary (One Line)': 'సారాంశం (ఒక లైన్)',
            'Description': 'వి వివరణ',
            'Domain': 'డొమైన్'
        },
        'mr': { 'nav.dashboard': 'डॅशबोर्ड', 'nav.solutions': 'उपाय' },
        'ta': { 'nav.dashboard': 'டாஷ்போர்டு', 'nav.solutions': 'தீர்வுகள்' },
        'ur': { 'nav.dashboard': 'ڈیش بورڈ', 'nav.solutions': 'حل' },
        'gu': { 'nav.dashboard': 'ડેશબોર્ડ', 'nav.solutions': 'ઉકેલો' },
        'kn': { 'nav.dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', 'nav.solutions': 'ಪರಿಹಾರಗಳು' },
        'ml': { 'nav.dashboard': 'ഡാഷ്ബോർഡ്', 'nav.solutions': 'പരിഹാരങ്ങൾ' },
        'pa': { 'nav.dashboard': 'ਡੈਸ਼ਬੋਰਡ', 'nav.solutions': 'ਹੱਲ' }
    } as any;

    const t = (text: string): string => {
        const langDict = DICTIONARY[language];
        const enDict = DICTIONARY['en'];
        // Fallback: Language Specific -> English -> Original Key
        return langDict?.[text] || enDict?.[text] || text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, direction, t }}>
            <div dir={direction} style={{ minHeight: '100vh', width: '100%' }}>
                {children}
            </div>
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export const SUPPORTED_LANGUAGES = LANGUAGES;
