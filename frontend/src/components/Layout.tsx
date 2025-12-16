import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
} from '@mui/material';
import { AccountCircle, Logout, Settings, Dashboard as DashboardIcon, Menu as MenuIcon } from '@mui/icons-material';
import { canSeeUsers } from '@shared/permissions';
import { LanguageSelector } from './common/LanguageSelector';

const Layout = () => {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);

    const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorElNav(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };

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
        { label: t('nav.dashboard'), path: '/' },
        { label: t('nav.solutions'), path: '/solutions' },
        { label: t('nav.reports'), path: '/reports' },
        { label: t('nav.partners'), path: '/partners' },
    ];

    if (user) {
        navItems.push({ label: t('nav.tickets'), path: '/tickets' });
    }

    if (canSeeUsers(user)) {
        navItems.push({ label: t('nav.users'), path: '/users' });
    }

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Container maxWidth="xl">
                    <Toolbar disableGutters>
                        <Box sx={{ flexGrow: 0, display: 'flex' }}>
                            <IconButton
                                size="large"
                                aria-label="navigation menu"
                                aria-controls="menu-appbar-nav"
                                aria-haspopup="true"
                                onClick={handleOpenNavMenu}
                                color="inherit"
                            >
                                <MenuIcon />
                            </IconButton>
                            <Menu
                                id="menu-appbar-nav"
                                anchorEl={anchorElNav}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'left',
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'left',
                                }}
                                open={Boolean(anchorElNav)}
                                onClose={handleCloseNavMenu}
                                sx={{
                                    display: 'block',
                                }}
                            >
                                {navItems.map((item) => (
                                    <MenuItem key={item.path} onClick={() => { handleCloseNavMenu(); navigate(item.path); }}>
                                        <Typography textAlign="center">{item.label}</Typography>
                                    </MenuItem>
                                ))}
                            </Menu>
                        </Box>

                        <DashboardIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1, ml: 1 }} />
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
                                    key={item.path}
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

                        <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center' }}>
                            <LanguageSelector />
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
                                            {t('nav.logout')}
                                        </MenuItem>
                                    </Menu>
                                </>
                            ) : (
                                <Button color="inherit" component={Link} to="/login">{t('nav.login')}</Button>
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
