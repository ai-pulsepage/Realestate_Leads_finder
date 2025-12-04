import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function InvestorLayout() {
    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
                <div className="h-16 flex items-center px-6 font-bold text-xl border-b border-slate-800">
                    Investor Portal
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    <Link to="/investor/dashboard" className="block px-4 py-2 rounded hover:bg-slate-800">Dashboard</Link>
                    <Link to="/investor/search" className="block px-4 py-2 rounded hover:bg-slate-800">Lead Search (Grid)</Link>
                    <Link to="/investor/campaigns" className="block px-4 py-2 rounded hover:bg-slate-800">Campaigns</Link>
                    <Link to="/investor/calculator" className="block px-4 py-2 rounded hover:bg-slate-800">Flipping Calculator</Link>
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500"></div>
                        <div>
                            <div className="text-sm font-medium">Investor User</div>
                            <div className="text-xs text-gray-400">Pro Plan</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8">
                    <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
                    <div className="flex items-center space-x-4">
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                            <span className="sr-only">Notifications</span>
                            🔔
                        </button>
                    </div>
                </header>
                <main className="flex-1 p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
