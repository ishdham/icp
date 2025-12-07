import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface Column {
    key: string;
    label: string;
    render?: (value: any, item: any) => React.ReactNode;
}

interface ListViewProps {
    title: string;
    items: any[];
    columns: Column[];
    onSelect: (item: any) => void;
    onCreate?: () => void;
    loading?: boolean;
    searchKeys?: string[]; // Keys to search in
}

const ListView: React.FC<ListViewProps> = ({
    title,
    items,
    columns,
    onSelect,
    onCreate,
    loading = false,
    searchKeys = ['name', 'title']
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState(items);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredItems(items);
            return;
        }

        const lowerTerm = searchTerm.toLowerCase();
        const filtered = items.filter(item =>
            searchKeys.some(key => {
                const val = item[key];
                return val && String(val).toLowerCase().includes(lowerTerm);
            })
        );
        setFilteredItems(filtered);
    }, [searchTerm, items, searchKeys]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {onCreate && (
                    <button
                        onClick={onCreate}
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Create New
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                    type="text"
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {loading ? (
                        <li className="px-4 py-4 text-center text-gray-500">Loading...</li>
                    ) : filteredItems.length === 0 ? (
                        <li className="px-4 py-4 text-center text-gray-500">No items found.</li>
                    ) : (
                        filteredItems.map((item, index) => (
                            <li
                                key={item.id || index}
                                onClick={() => onSelect(item)}
                                className="hover:bg-gray-50 cursor-pointer transition duration-150 ease-in-out"
                            >
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        {columns.map((col, idx) => (
                                            <div key={col.key} className={`${idx === 0 ? 'flex-1 font-medium text-indigo-600' : 'ml-4 flex-shrink-0 text-gray-500'}`}>
                                                {col.render ? col.render(item[col.key], item) : item[col.key]}
                                            </div>
                                        ))}
                                        <div className="ml-2 flex-shrink-0">
                                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
};

export default ListView;
