import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, Users, Gift, DollarSign, Settings, BarChart3, Menu, X, Database } from 'lucide-react';

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                setUser(userData);
                // Check if user is admin
                if (userData.role !== 'admin') {
                    navigate('/login');
                }
            } catch (e) {
                navigate('/login');
            }
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const navItems = [
        { path: '/admin/dashboard', label: 'Dashboard', icon: Home },
        { path: '/admin/referrers', label: 'Referrers', icon: Users },
        { path: '/admin/data-import', label: 'Data Import', icon: Database },
        { path: '/admin/coupons', label: 'Coupons', icon: Gift },
        { path: '/admin/commissions', label: 'Commissions', icon: DollarSign },
        { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
        { path: '/admin/settings', label: 'Settings', icon: Settings },
    ];

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    if (!user || user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-gradient-to-b from-gray-900 to-gray-950 text-white hidden md:flex flex-col">
                <div className="h-16 flex items-center px-6 font-bold text-xl border-b border-gray-800">
                    <span className="text-2xl mr-2">⚙️</span>
                    Admin Panel
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1">
                    {navItems.map(({ path, label, icon: Icon }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${isActive(path)
                                ? 'bg-purple-600/30 text-white font-medium border-l-4 border-purple-500'
                                : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            {label}
                        </Link>
                    ))}
                </nav>

                {/* User Profile Section */}
                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'A'}
                            </div>
                            <div>
                                <div className="text-sm font-medium truncate max-w-[120px]">
                                    {user?.full_name || user?.email?.split('@')[0] || 'Admin'}
                                </div>
                                <div className="text-xs text-purple-300">
                                    Administrator
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white h-14 flex items-center justify-between px-4">
                <span className="font-bold text-lg">⚙️ Admin Panel</span>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-gray-900/95 pt-14">
                    <nav className="p-4 space-y-2">
                        {navItems.map(({ path, label, icon: Icon }) => (
                            <Link
                                key={path}
                                to={path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg ${isActive(path) ? 'bg-purple-600/30 text-white' : 'text-gray-300'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                {label}
                            </Link>
                        ))}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/20 w-full"
                        >
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </nav>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:pt-0 pt-14">
                <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8 hidden md:flex">
                    <h1 className="text-xl font-semibold text-gray-800">
                        {navItems.find(item => isActive(item.path))?.label || 'Admin'}
                    </h1>
                    <div className="flex items-center space-x-4">
                        <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            ● Admin Mode
                        </span>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
