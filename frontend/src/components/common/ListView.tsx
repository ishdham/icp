import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    TextField,
    Button,
    Box,
    InputAdornment,
    Toolbar,
    CircularProgress,
    IconButton,
    Tooltip
} from '@mui/material';
import { Search, FirstPage, LastPage, ChevronLeft, ChevronRight } from '@mui/icons-material';
import debounce from 'lodash.debounce';

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
    // Search
    onSearch?: (query: string) => void;
    onLiveSearch?: (query: string) => void; // Triggered on Type (debounced)
    // Pagination
    page?: number;
    totalPages?: number;
    totalItems?: number;
    onPageChange?: (page: number) => void;

    // Legacy support (optional, to avoid breaking if used elsewhere immediately)
    searchKeys?: string[];

    // Infinite Scroll / Load More support
    hasMore?: boolean;
    onLoadMore?: () => void;
}

const ListView: React.FC<ListViewProps> = ({
    title,
    items,
    columns,
    onSelect,
    onCreate,
    loading = false,
    onSearch,
    onLiveSearch,
    page = 1,
    totalPages = 1,
    totalItems,
    onPageChange,
    searchKeys = ['name', 'title'],
    hasMore,
    onLoadMore
}) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState(items);

    // Debounced Live Search
    const debouncedLiveSearch = React.useMemo(
        () => debounce((query: string) => {
            if (onLiveSearch) onLiveSearch(query);
        }, 300),
        [onLiveSearch]
    );

    useEffect(() => {
        return () => {
            debouncedLiveSearch.cancel();
        };
    }, [debouncedLiveSearch]);

    // Handle Input Change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);

        if (onLiveSearch) {
            debouncedLiveSearch(val);
        }
    };

    // If onSearch is provided, we rely on parent to filter/search. 
    // If NOT provided, we filter locally (legacy behavior).
    useEffect(() => {
        if (onSearch || onLiveSearch) {
            if (!onSearch && !onLiveSearch) setFilteredItems(items);
            setFilteredItems(items);
            return;
        }

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
    }, [searchTerm, items, searchKeys, onSearch, onLiveSearch]);

    const handleSearchSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        debouncedLiveSearch.cancel();
        if (onSearch) {
            onSearch(searchTerm);
        }
    };

    return (
        <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
            <Toolbar sx={{ pl: 2, pr: 1 }}>
                <Typography
                    sx={{ flex: '1 1 100%' }}
                    variant="h6"
                    id="tableTitle"
                    component="div"
                >
                    {title} {totalItems !== undefined && `(${totalItems})`}
                </Typography>
                {onCreate && (
                    <Button variant="contained" onClick={onCreate}>
                        {t('list.create_new')}
                    </Button>
                )}
            </Toolbar>

            <Box sx={{ px: 2, pb: 2 }} component="form" onSubmit={handleSearchSubmit}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder={onSearch || onLiveSearch ? t('list.search_placeholder') : "Filter..."}
                    value={searchTerm}
                    onChange={handleInputChange}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search color="action" />
                            </InputAdornment>
                        ),
                        endAdornment: onSearch && (
                            <InputAdornment position="end">
                                <Button type="submit" variant="text" size="small">{t('list.go')}</Button>
                            </InputAdornment>
                        )
                    }}
                    size="small"
                    sx={{ mb: 2 }}
                />
            </Box>

            <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader aria-label="sticky table">
                    <TableHead>
                        <TableRow>
                            {columns.map((col) => (
                                <TableCell key={col.key} sx={{ fontWeight: 'bold' }}>
                                    {col.label}
                                </TableCell>
                            ))}
                            <TableCell align="right" /> {/* Action column placeholder */}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + 1} align="center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + 1} align="center">
                                    {loading ? 'Searching...' : 'No records found'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map((item, index) => (
                                <TableRow
                                    hover
                                    role="checkbox"
                                    tabIndex={-1}
                                    key={item.id || index}
                                    onClick={() => onSelect(item)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    {columns.map((col) => (
                                        <TableCell key={col.key}>
                                            {col.render ? col.render(item[col.key], item) : item[col.key]}
                                        </TableCell>
                                    ))}
                                    <TableCell align="right">
                                        <Typography variant="body2" color="primary">
                                            {t('list.view_action')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {/* Loading Overlay or Row if needed, but table body usually clears on new fetch */}
                        {loading && items.length > 0 && (
                            <TableRow>
                                <TableCell colSpan={columns.length + 1} align="center">
                                    <CircularProgress size={20} /> Updating...
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Load More Button (Legacy/Infinite Scroll) */}
            {hasMore && onLoadMore && (
                <Box display="flex" justifyContent="center" p={2}>
                    <Button onClick={onLoadMore} disabled={loading} variant="outlined">
                        {loading ? 'Loading...' : 'Load More'}
                    </Button>
                </Box>
            )}

            {/* Pagination Controls */}
            {onPageChange && (
                <Box display="flex" justifyContent="center" alignItems="center" p={2} gap={1}>
                    <Tooltip title="First Page">
                        <span>
                            <IconButton onClick={() => onPageChange(1)} disabled={page <= 1 || loading}>
                                <FirstPage />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title="Previous Page">
                        <span>
                            <IconButton onClick={() => onPageChange(page - 1)} disabled={page <= 1 || loading}>
                                <ChevronLeft />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Typography variant="body2" sx={{ mx: 2 }}>
                        {t('list.page_label')} {page} / {totalPages || 1}
                    </Typography>

                    <Tooltip title="Next Page">
                        <span>
                            <IconButton onClick={() => onPageChange(page + 1)} disabled={page >= totalPages || loading}>
                                <ChevronRight />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title="Last Page">
                        <span>
                            <IconButton onClick={() => onPageChange(totalPages)} disabled={page >= totalPages || loading}>
                                <LastPage />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            )}
        </Paper>
    );
};

export default ListView;
