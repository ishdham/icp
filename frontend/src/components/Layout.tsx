import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    IconButton,
    Menu,
    MenuItem,
    Container,
    Box,
    // Avatar removed
    // Avatar removed
} from '@mui/material';
import { AccountCircle, Logout, Settings, Dashboard as DashboardIcon } from '@mui/icons-material';
import { canSeeUsers } from '../utils/permissions';

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        handleClose();
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Failed to logout', error);
        }
    };

    const navItems = [
        { label: 'Dashboard', path: '/' },
        { label: 'Solutions', path: '/solutions' },
        { label: 'Partners', path: '/partners' },
    ];

    if (user) {
        navItems.push({ label: 'Tickets', path: '/tickets' });
    }

    if (canSeeUsers(user)) {
        navItems.push({ label: 'Users', path: '/users' });
    }

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Container maxWidth="xl">
                    <Toolbar disableGutters>
                        <DashboardIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
                        <Typography
                            variant="h6"
                            noWrap
                            component={Link}
                            to="/"
                            sx={{
                                mr: 2,
                                display: { xs: 'none', md: 'flex' },
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                letterSpacing: '.3rem',
                                color: 'inherit',
                                textDecoration: 'none',
                            }}
                        >
                            ICP
                        </Typography>

                        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
                            {navItems.map((item) => (
                                <Button
                                    key={item.label}
                                    component={Link}
                                    to={item.path}
                                    sx={{
                                        my: 2,
                                        color: 'white',
                                        display: 'block',
                                        borderBottom: location.pathname === item.path ? '2px solid white' : 'none',
                                        borderRadius: 0
                                    }}
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </Box>

                        <Box sx={{ flexGrow: 0 }}>
                            {user ? (
                                <>
                                    <IconButton
                                        size="large"
                                        aria-label="account of current user"
                                        aria-controls="menu-appbar"
                                        aria-haspopup="true"
                                        onClick={handleMenu}
                                        color="inherit"
                                    >
                                        <AccountCircle />
                                        <Typography variant="body2" sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
                                            {user.email}
                                        </Typography>
                                    </IconButton>
                                    <Menu
                                        id="menu-appbar"
                                        anchorEl={anchorEl}
                                        anchorOrigin={{
                                            vertical: 'top',
                                            horizontal: 'right',
                                        }}
                                        keepMounted
                                        transformOrigin={{
                                            vertical: 'top',
                                            horizontal: 'right',
                                        }}
                                        open={Boolean(anchorEl)}
                                        onClose={handleClose}
                                    >
                                        <MenuItem onClick={() => { handleClose(); navigate('/profile'); }}>
                                            <Settings fontSize="small" sx={{ mr: 1 }} />
                                            Profile
                                        </MenuItem>
                                        <MenuItem onClick={handleLogout}>
                                            <Logout fontSize="small" sx={{ mr: 1 }} />
                                            Sign out
                                        </MenuItem>
                                    </Menu>
                                </>
                            ) : (
                                <Button color="inherit" component={Link} to="/login">Login</Button>
                            )}
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Outlet />
            </Container>
        </Box>
    );
};

export default Layout;
