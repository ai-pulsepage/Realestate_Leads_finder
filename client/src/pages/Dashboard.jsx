import { useState } from 'react';
import { useNavigate, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, Mic, Mail, LogOut, Users } from 'lucide-react';
import EmailTemplates from './EmailTemplates';
import EmailCampaigns from './EmailCampaigns';
import CreateCampaign from './CreateCampaign';

// ... (imports)

// ... (inside Dashboard)
<nav className="p-4 space-y-2">
    <Link to="/" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
        <LayoutDashboard size={20} className="mr-3" />
        Overview
    </Link>
    <Link to="/voice-ai" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
        <Mic size={20} className="mr-3" />
        Voice Persona
    </Link>
    <Link to="/email/templates" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
        <Mail size={20} className="mr-3" />
        Email Templates
    </Link>
    <Link to="/email" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
        <Mail size={20} className="mr-3" />
        Campaigns
    </Link>
    <Link to="/leads" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
        <Users size={20} className="mr-3" />
        Leads
    </Link>
</nav>

{/* ... (Logout button) */ }

{/* Main Content */ }
<div className="flex-1 overflow-auto p-8">
    <Routes>
        <Route path="/" element={<h2 className="text-2xl font-bold">Welcome to Dashboard</h2>} />
        <Route path="/voice-ai" element={<VoicePersonaEditor />} />
        <Route path="/email/templates" element={<EmailTemplates />} />
        <Route path="/email" element={<EmailCampaigns />} />
        <Route path="/email/new" element={<CreateCampaign />} />
        <Route path="/leads" element={<h2 className="text-2xl font-bold">Leads Manager (Coming Soon)</h2>} />
    </Routes>
</div>

export default Dashboard;
