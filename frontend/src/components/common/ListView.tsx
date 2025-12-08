import React, { useState, useEffect } from 'react';
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
    Toolbar
} from '@mui/material';
import { Search } from '@mui/icons-material';

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
    searchKeys?: string[];
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
        <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
            <Toolbar sx={{ pl: 2, pr: 1 }}>
                <Typography
                    sx={{ flex: '1 1 100%' }}
                    variant="h6"
                    id="tableTitle"
                    component="div"
                >
                    {title}
                </Typography>
                {onCreate && (
                    <Button variant="contained" onClick={onCreate}>
                        Create New
                    </Button>
                )}
            </Toolbar>

            <Box sx={{ px: 2, pb: 2 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search color="action" />
                            </InputAdornment>
                        ),
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
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + 1} align="center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + 1} align="center">
                                    No records found
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
                                            View
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default ListView;
