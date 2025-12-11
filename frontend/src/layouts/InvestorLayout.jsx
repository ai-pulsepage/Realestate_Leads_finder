import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, Search, Building2, Megaphone, Mail, Settings, Calculator, Menu, X, Bell } from 'lucide-react';
import RoleSwitcher from '../components/RoleSwitcher';

export default function InvestorLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                setUser(JSON.parse(userStr));
            } catch (e) {
                console.error('Error parsing user data');
            }
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const navItems = [
        { path: '/investor/dashboard', label: 'Dashboard', icon: Home },
        { path: '/investor/search', label: 'Lead Search', icon: Search },
        { path: '/investor/fsbo', label: 'FSBO Leads', icon: Building2 },
        { path: '/investor/campaigns', label: 'Campaigns', icon: Megaphone },
        { path: '/investor/marketing', label: 'Email Marketing', icon: Mail },
        { path: '/investor/tools', label: 'Tools & AI', icon: Settings },
        { path: '/investor/calculator', label: 'Flip Calculator', icon: Calculator },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white hidden md:flex flex-col">
                <div className="h-16 flex items-center px-6 font-bold text-xl border-b border-slate-800">
                    <span className="text-2xl mr-2">📊</span>
                    Investor Portal
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1">
                    {navItems.map(({ path, label, icon: Icon }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${isActive(path)
                                ? 'bg-blue-600/30 text-white font-medium border-l-4 border-blue-500'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            {label}
                        </Link>
                    ))}
                </nav>

                {/* User Profile Section */}
                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                                {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                                <div className="text-sm font-medium truncate max-w-[120px]">
                                    {user?.full_name || user?.email?.split('@')[0] || 'User'}
                                </div>
                                <div className="text-xs text-slate-400 capitalize">
                                    {user?.subscription_tier || user?.role || 'Investor'}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white h-14 flex items-center justify-between px-4">
                <span className="font-bold text-lg">📊 Investor Portal</span>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-slate-900/95 pt-14">
                    <nav className="p-4 space-y-2">
                        {navItems.map(({ path, label, icon: Icon }) => (
                            <Link
                                key={path}
                                to={path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg ${isActive(path) ? 'bg-blue-600/30 text-white' : 'text-slate-300'
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
                        {navItems.find(item => isActive(item.path))?.label || 'Dashboard'}
                    </h1>
                    <div className="flex items-center space-x-4">
                        <RoleSwitcher />
                        <button className="p-2 text-gray-400 hover:text-gray-600 relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
