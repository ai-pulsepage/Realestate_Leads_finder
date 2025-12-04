import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center">
                        <Link to="/" className="text-2xl font-bold text-blue-600">BizLeadFinders</Link>
                    </div>
                    <nav className="hidden md:flex space-x-8">
                        <Link to="/investors" className="text-gray-600 hover:text-blue-600">Investors</Link>
                        <Link to="/service-providers" className="text-gray-600 hover:text-blue-600">Service Providers</Link>
                        <Link to="/marketplace" className="text-gray-600 hover:text-blue-600">Marketplace</Link>
                    </nav>
                    <div className="flex items-center space-x-4">
                        <Link to="/login" className="text-gray-600 hover:text-gray-900">Log in</Link>
                        <Link to="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Get Started</Link>
                    </div>
                </div>
            </header>
            <main>
                <Outlet />
            </main>
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">BizLeadFinders</h3>
                            <p className="text-gray-400">Connecting investors, contractors, and homeowners with data-driven insights.</p>
                        </div>
                        {/* Footer links would go here */}
                    </div>
                    <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
                        &copy; {new Date().getFullYear()} BizLeadFinders. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
