import React from 'react';

const FSBO = () => {
    return (
        <div className="p-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="text-6xl mb-4">🏡</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">FSBO Leads Scraper</h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                    We are currently building our web scraper to aggregate "For Sale By Owner" listings from Zillow, Realtor.com, and other sources.
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full font-medium">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
                    Coming Soon in Sprint 12
                </div>
            </div>
        </div>
    );
};

export default FSBO;
