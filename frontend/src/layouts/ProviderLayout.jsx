import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function ProviderLayout() {
    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-indigo-900 text-white hidden md:flex flex-col">
                <div className="h-16 flex items-center px-6 font-bold text-xl border-b border-indigo-800">
                    Service Pro
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    <Link to="/provider/dashboard" className="block px-4 py-2 rounded hover:bg-indigo-800">Dashboard</Link>
                    <Link to="/provider/leads" className="block px-4 py-2 rounded hover:bg-indigo-800">New Homeowners</Link>
                    <Link to="/provider/projects" className="block px-4 py-2 rounded hover:bg-indigo-800">Project Board</Link>
                    <Link to="/provider/bids" className="block px-4 py-2 rounded hover:bg-indigo-800">My Bids</Link>
                    <Link to="/provider/tools" className="block px-4 py-2 rounded hover:bg-indigo-800">Tools & AI</Link>
                    <Link to="/provider/profile" className="block px-4 py-2 rounded hover:bg-indigo-800">Profile & SEO</Link>
                </nav>
                <div className="p-4 border-t border-indigo-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500"></div>
                        <div>
                            <div className="text-sm font-medium">Contractor Joe</div>
                            <div className="text-xs text-indigo-300">Verified Pro</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8">
                    <h1 className="text-xl font-semibold text-gray-800">Overview</h1>
                    <div className="flex items-center space-x-4">
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Active</span>
                    </div>
                </header>
                <main className="flex-1 p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
