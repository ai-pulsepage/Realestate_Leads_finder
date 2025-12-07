import React, { useState } from 'react';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';

/**
 * Landing Page V2 - Revised Recommendations
 * Dual Audience: Investors & Service Contractors
 */
const LandingPageRevised = () => {
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('investor'); // 'investor' or 'contractor'

    // Video Controls (Admin placeholder)
    // In a real backend, these would come from an API call like /api/admin/settings
    const contentSettings = {
        demoVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder
        walkthroughVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" // Placeholder
    };

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">

            {/* 1. Sticky Header & Hero */}
            <Header onJoin={() => setShowModal(true)} />
            <Hero onJoin={() => setShowModal(true)} />

            {/* 2. Problem Statement */}
            <ProblemSection />

            {/* Platform Separator */}
            <div className="py-16 bg-gradient-to-r from-blue-900 to-green-900 text-center text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Two Platforms. One Powerful System.</h2>
                <p className="text-xl opacity-90">Built specifically for your business model.</p>
            </div>

            {/* 3. SAAS Models (Tabs or Split) */}
            <div className="py-20 max-w-7xl mx-auto px-6">
                <div className="flex justify-center mb-12">
                    <div className="bg-gray-100 p-1 rounded-full inline-flex">
                        <button
                            onClick={() => setActiveTab('investor')}
                            className={`px-8 py-3 rounded-full text-lg font-bold transition ${activeTab === 'investor' ? 'bg-blue-800 text-white shadow-lg' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            For Investors
                        </button>
                        <button
                            onClick={() => setActiveTab('contractor')}
                            className={`px-8 py-3 rounded-full text-lg font-bold transition ${activeTab === 'contractor' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            For Contractors
                        </button>
                    </div>
                </div>

                {activeTab === 'investor' ? <InvestorSuite /> : <ContractorSuite />}
            </div>

            {/* 4. Token System */}
            <TokenSystem />

            {/* 5. Pricing Plans */}
            <PlansComparison />

            {/* 6. Coverage Map */}
            <CoverageMap />

            {/* 7. How It Works */}
            <HowItWorks activeTab={activeTab} />

            {/* 8. FAQ */}
            <FAQ activeTab={activeTab} />

            {/* 9. Final CTA */}
            <FinalCTA onJoin={() => setShowModal(true)} />

            {/* Footer */}
            <Footer />

            {/* Waitlist Modal */}
            <WaitlistModal isOpen={showModal} onClose={() => setShowModal(false)} />

        </div>
    );
};

// --- Sub-Components ---

const Header = ({ onJoin }) => (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="text-2xl font-extrabold tracking-tight">
                <span className="text-blue-900">Biz</span>
                <span className="text-green-600">Lead</span>
                <span className="text-gray-800">Finders</span>
            </div>
            <button
                onClick={onJoin}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full transition shadow-md"
            >
                Join Waitlist
            </button>
        </div>
    </header>
);

const Hero = ({ onJoin }) => (
    <section className="relative pt-20 pb-32 overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-1.2.1&auto=format&fit=crop&w=2850&q=80')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div>
                <span className="inline-block py-1 px-3 rounded bg-blue-500/20 text-blue-300 text-sm font-bold tracking-wider mb-6 border border-blue-500/30">
                    BETA ACCESS JANUARY 2026
                </span>
                <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
                    Fresh Leads. <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">AI That Calls for You.</span><br />
                    Booked Automatically.
                </h1>
                <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl">
                    For <strong>Real Estate Investors</strong> and <strong>Service Contractors</strong> in Miami-Dade County.
                    Stop buying stale leads. Mine fresh public records daily, then let our AI voice assistant call, qualify, and book appointments while you work.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={onJoin}
                        className="bg-green-500 hover:bg-green-600 text-white text-lg font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-green-500/30 transform hover:-translate-y-1 transition border-b-4 border-green-700"
                    >
                        Join the Waitlist
                    </button>
                    <button className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-lg font-medium py-4 px-8 rounded-full backdrop-blur-sm transition border border-white/10">
                        <span>▶</span> Watch Demo
                    </button>
                </div>
                <div className="mt-8 flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full bg-gray-600 border-2 border-slate-900"></div>
                        ))}
                    </div>
                    <div>
                        <span className="text-white font-bold">412+</span> Professionals waiting
                    </div>
                </div>
            </div>
            {/* Visual: Split Hero Image Simulation */}
            <div className="relative h-[600px] hidden lg:block">
                {/* Abstract representation of the 'Split' visual */}
                <div className="absolute top-10 left-0 w-80 h-96 bg-blue-900/80 rounded-2xl border border-blue-700 shadow-2xl backdrop-blur-md transform -rotate-6 z-10 p-6">
                    <div className="text-blue-200 text-xs font-bold uppercase mb-2">Investor View</div>
                    <div className="h-4 w-24 bg-blue-500/50 rounded mb-4"></div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-blue-800/50 p-2 rounded">
                            <div className="w-8 h-8 rounded bg-blue-500"></div>
                            <div className="h-2 w-20 bg-blue-400/30 rounded"></div>
                        </div>
                        <div className="flex justify-between items-center bg-blue-800/50 p-2 rounded border border-green-500/50">
                            <div className="w-8 h-8 rounded bg-green-500 animate-pulse"></div>
                            <div className="h-2 w-20 bg-green-400/30 rounded"></div>
                        </div>
                    </div>
                </div>
                <div className="absolute top-20 right-10 w-80 h-96 bg-green-900/80 rounded-2xl border border-green-700 shadow-2xl backdrop-blur-md transform rotate-3 z-20 p-6">
                    <div className="text-green-200 text-xs font-bold uppercase mb-2">Contractor View</div>
                    <div className="h-4 w-32 bg-green-500/50 rounded mb-4"></div>
                    <div className="space-y-2">
                        <div className="h-16 bg-black/20 rounded border-l-4 border-green-500 p-2">
                            <div className="h-2 w-16 bg-white/40 rounded mb-1"></div>
                            <div className="h-2 w-32 bg-white/20 rounded"></div>
                        </div>
                        <div className="h-16 bg-black/20 rounded border-l-4 border-blue-500 p-2">
                            <div className="h-2 w-16 bg-white/40 rounded mb-1"></div>
                            <div className="h-2 w-32 bg-white/20 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

const ProblemSection = () => (
    <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-6">The Problem: You're Losing Deals While You're Busy Working</h2>
                <p className="text-xl text-gray-600">The old way is broken. Stop chasing stale leads and missing calls.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
                {/* Investor Pain Points */}
                <div className="bg-white p-10 rounded-2xl shadow-xl border-t-4 border-blue-600">
                    <div className="flex items-center gap-3 mb-8">
                        <span className="text-4xl">📉</span>
                        <h3 className="text-2xl font-bold text-blue-900">Real Estate Investors</h3>
                    </div>
                    <ul className="space-y-4 text-gray-700">
                        <li className="flex items-start gap-3">
                            <span className="text-red-500 text-xl font-bold">❌</span>
                            <p>Bought a lead list from PropStream—350 leads, 6 weeks old, everyone has already called them.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-red-500 text-xl font-bold">❌</span>
                            <p>Spent 8 hours cold calling just to find 1 motivated seller.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-red-500 text-xl font-bold">❌</span>
                            <p>Lost a foreclosure deal because another investor called the day it was filed.</p>
                        </li>
                    </ul>
                </div>

                {/* Contractor Pain Points */}
                <div className="bg-white p-10 rounded-2xl shadow-xl border-t-4 border-green-600">
                    <div className="flex items-center gap-3 mb-8">
                        <span className="text-4xl">🛠️</span>
                        <h3 className="text-2xl font-bold text-green-900">Service Contractors</h3>
                    </div>
                    <ul className="space-y-4 text-gray-700">
                        <li className="flex items-start gap-3">
                            <span className="text-red-500 text-xl font-bold">❌</span>
                            <p>Paid $45/lead from HomeAdvisor, half were tire kickers, needed to bid against 5 others.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-red-500 text-xl font-bold">❌</span>
                            <p>Missed 3 calls while on a ladder—all became your competitor's jobs.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-red-500 text-xl font-bold">❌</span>
                            <p>Spent $800/month on Ads, got 12 leads, closed 2 jobs.</p>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Solution Bridge */}
            <div className="mt-16 bg-gradient-to-r from-purple-100 to-indigo-100 p-8 rounded-2xl border border-purple-200 text-center">
                <h3 className="text-2xl font-bold text-purple-900 mb-6">The Solution: Fresh Data + AI Voice Assistant</h3>
                <div className="grid md:grid-cols-2 gap-4 text-left max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm">
                        <span className="text-green-500 text-xl font-bold">✅</span>
                        <p className="text-sm font-medium">System scraped yesterday's filings, AI called 50 properties overnight.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm">
                        <span className="text-green-500 text-xl font-bold">✅</span>
                        <p className="text-sm font-medium">AI answered 23 calls over the weekend, booked appointments.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

const InvestorSuite = () => (
    <div className="animate-fade-in-up">
        <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-blue-900 mb-4">Real Estate Investor Suite</h3>
            <p className="text-xl text-gray-600">For Wholesalers, Flippers, and Cash Buyers.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-12">
                <FeatureBlock
                    icon="🧠"
                    title="Smart Distress Data Mining"
                    desc="Daily automated collection from Miami-Dade records: Tax delinquencies, Foreclosures, Code Violations, Probate. Fresh data within 24 hours."
                    color="blue"
                />
                <FeatureBlock
                    icon="🔥"
                    title="Multi-Signal Distress Scoring"
                    desc="Our algorithm scores leads. Score 95 = Foreclosure auction soon + Tax Lien. Your team calls the hottest prospects first."
                    color="blue"
                />
                <FeatureBlock
                    icon="📞"
                    title="AI Voice Assistant (Outbound)"
                    desc="Stop cold calling. AI calls 200-300 leads/day, pre-qualifies motivation, and transfers hot leads to your agents."
                    color="blue"
                />
                <FeatureBlock
                    icon="🔍"
                    title="Auto Skip Tracing (92% Success)"
                    desc="Public records give addresses. We find the mobile numbers. Automatic enrichment included."
                    color="blue"
                />
            </div>
            {/* Visual Placeholder for Investor UI */}
            <div className="bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-700 min-h-[500px] flex items-center justify-center relative">
                <div className="absolute inset-0 bg-blue-900/10"></div>
                <div className="text-center p-8">
                    <div className="text-6xl mb-4">🖥️</div>
                    <p className="text-blue-200 font-mono">Investor Dashboard Interface</p>
                    <p className="text-sm text-gray-500">(Visual of Pipeline & Map would go here)</p>
                </div>
            </div>
        </div>
    </div>
);

const ContractorSuite = () => (
    <div className="animate-fade-in-up">
        <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-green-900 mb-4">Service Contractor Suite</h3>
            <p className="text-xl text-gray-600">For Roofers, HVAC, Plumbers, Solar, and Remodelers.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 min-h-[500px] flex items-center justify-center relative bg-gradient-to-br from-green-50 to-white">
                <div className="text-center p-8">
                    <div className="text-6xl mb-4">📱</div>
                    <p className="text-green-800 font-mono">Mobile App Interface</p>
                    <p className="text-sm text-gray-500">(Visual of 'New Job Alert' popup)</p>
                </div>
            </div>

            <div className="order-1 md:order-2 space-y-12">
                <FeatureBlock
                    icon="🏡"
                    title="Fresh Homeowner & Permit Data"
                    desc="Target homeowners with immediate needs: New permits (roof/HVAC), new sales, or code violations."
                    color="green"
                />
                <FeatureBlock
                    icon="🤖"
                    title="AI Virtual Secretary (Inbound)"
                    desc="Never miss a lead while on a job site. AI answers calls 24/7, qualifies customers, and books estimates on your calendar."
                    color="green"
                />
                <FeatureBlock
                    icon="🎯"
                    title="Targeted Lead Gen"
                    desc="Don't cold call randoms. Call people who just filed a roof permit. They are comparing quotes NOW."
                    color="green"
                />
                <FeatureBlock
                    icon="⭐"
                    title="Google Reviews Automation"
                    desc="System automatically texts happy customers for reviews after job completion. Build your 5-star reputation."
                    color="green"
                />
            </div>
        </div>
    </div>
);

const FeatureBlock = ({ icon, title, desc, color }) => (
    <div className="flex gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
            {icon}
        </div>
        <div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">{title}</h4>
            <p className="text-gray-600 leading-relaxed">{desc}</p>
        </div>
    </div>
);

const TokenSystem = () => (
    <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                    <h2 className="text-4xl font-bold mb-6">Why Tokens? <span className="text-yellow-400">Lower Costs, Maximum Flexibility.</span></h2>
                    <p className="text-lg text-gray-300 mb-8">
                        Most CRMs charge $200-500/mo whether you use them or not. We built a smarter system.
                        Only pay for the actions you take.
                    </p>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                            <span>AI Outbound Call</span>
                            <span className="font-mono text-yellow-400">5 Tokens</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                            <span>AI Inbound Call Handling</span>
                            <span className="font-mono text-yellow-400">3 Tokens</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                            <span>Skip Trace Lead</span>
                            <span className="font-mono text-yellow-400">2 Tokens</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                            <span>Email Campaign (100 leads)</span>
                            <span className="font-mono text-yellow-400">10 Tokens</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 relative">
                    <div className="absolute -top-6 -right-6 bg-yellow-500 text-slate-900 font-bold py-2 px-4 rounded-lg transform rotate-6 shadow-lg">
                        Waitlist Rate Locked 🔒
                    </div>
                    <h3 className="text-2xl font-bold mb-6">Example Monthly Cost</h3>

                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">Traditional CRM Subscription</span>
                            <span className="text-red-400 line-through">$499/mo</span>
                        </div>
                        <div className="flex justify-between items-center text-xl font-bold">
                            <span>BizLeadFinders (Avg Usage)</span>
                            <span className="text-green-400">~$150/mo</span>
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 italic">
                        *Based on 300 AI calls, 400 skip traces, and email campaigns. Unused tokens roll over.
                    </p>
                </div>
            </div>
        </div>
    </section>
);

const PlansComparison = () => (
    <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-16">Choose Your Plan</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="p-6 border-b-2 border-gray-100">Feature</th>
                            <th className="p-6 border-b-2 border-blue-600 bg-blue-50 text-blue-900 rounded-t-xl">
                                <div className="text-xl font-bold">Pro Plan</div>
                                <div className="text-sm font-normal text-blue-700">Solo User</div>
                            </th>
                            <th className="p-6 border-b-2 border-purple-600 bg-purple-50 text-purple-900 rounded-t-xl">
                                <div className="text-xl font-bold">Corporate Plan</div>
                                <div className="text-sm font-normal text-purple-700">Teams (5 Seats)</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <tr>
                            <td className="p-4 font-medium">User Seats</td>
                            <td className="p-4 text-center">1</td>
                            <td className="p-4 text-center">5</td>
                        </tr>
                        <tr>
                            <td className="p-4 font-medium">AI Voice Assistant</td>
                            <td className="p-4 text-center text-green-600">✓ Full Access</td>
                            <td className="p-4 text-center text-green-600">✓ Full Access</td>
                        </tr>
                        <tr>
                            <td className="p-4 font-medium">CRM Access</td>
                            <td className="p-4 text-center text-green-600">✓ Included</td>
                            <td className="p-4 text-center text-green-600">✓ Included</td>
                        </tr>
                        <tr>
                            <td className="p-4 font-medium">Team Features</td>
                            <td className="p-4 text-center text-gray-400">-</td>
                            <td className="p-4 text-center text-green-600">✓ Analytics & Territory</td>
                        </tr>
                        <tr>
                            <td className="p-4 font-medium">Token Discount</td>
                            <td className="p-4 text-center text-gray-400">-</td>
                            <td className="p-4 text-center text-green-600">15% Volume Discount</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </section>
);

const CoverageMap = () => (
    <section className="py-24 bg-gray-50 text-center">
        <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold mb-4">Serving All of Miami-Dade County</h2>
            <p className="text-xl text-gray-600 mb-12">2.7 Million Residents. 900,000+ Properties. Fresh Data Daily.</p>

            {/* Map Placeholder */}
            <div className="bg-blue-100 rounded-2xl h-80 flex items-center justify-center border border-blue-200 mb-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Miami-Dade_County_Florida_Incorporated_and_Unincorporated_areas_Coral_Gables_Highlighted.svg/2000px-Miami-Dade_County_Florida_Incorporated_and_Unincorporated_areas_Coral_Gables_Highlighted.svg.png')] bg-contain bg-center bg-no-repeat opacity-40"></div>
                <div className="relative z-10 bg-white/80 backdrop-blur px-6 py-4 rounded-lg shadow-lg">
                    <p className="font-bold text-blue-900">Covering 34 Municipalities</p>
                    <p className="text-sm">Miami, Hialeah, Coral Gables, Homestead, Doral...</p>
                </div>
            </div>

            <p className="text-gray-500 text-sm">Expanding to Broward & Palm Beach in 2026.</p>
        </div>
    </section>
);

const HowItWorks = ({ activeTab }) => {
    const isInvestor = activeTab === 'investor';
    return (
        <section className="py-24 bg-white">
            <div className="max-w-5xl mx-auto px-6">
                <h2 className="text-3xl font-bold text-center mb-16">
                    From Public Records to Booked Appointments in 24 Hours
                </h2>

                <div className="space-y-12 relative">
                    {/* Vertical Line */}
                    <div className="absolute left-8 top-0 bottom-0 w-1 bg-gray-100 hidden md:block"></div>

                    <Step
                        num="01"
                        title="Data Collection"
                        desc={isInvestor ? "System scrapes Miami-Dade records at 6am. Finds 50-100 new distressed leads daily." : "System monitors building permits, code violations, and new home sales daily."}
                        icon="📂"
                    />
                    <Step
                        num="02"
                        title="Contact Enrichment"
                        desc="Auto skip-tracing finds mobile numbers and emails with 92% success rate."
                        icon="🔎"
                    />
                    <Step
                        num="03"
                        title={isInvestor ? "Lead Scoring" : "AI Outreach"}
                        desc={isInvestor ? "Algorithm scores leads based on distress. Flags hottest prospects." : "AI calls homeowners: 'I see a roof permit was filed...'"}
                        icon={isInvestor ? "📊" : "🤖"}
                    />
                    <Step
                        num="04"
                        title={isInvestor ? "AI Pre-Qualification" : "Appointment Booking"}
                        desc={isInvestor ? "AI calls leads, identifies motivation, transfers to agent." : "AI qualifies interest, checks calendar, books estimate."}
                        icon={isInvestor ? "📞" : "📅"}
                    />
                    <Step
                        num="05"
                        title="Close Deal"
                        desc={isInvestor ? "Agent takes live transfer of motivated seller." : "You arrive at pre-qualified appointment and close."}
                        icon="🤝"
                    />
                </div>
            </div>
        </section>
    );
};

const Step = ({ num, title, desc, icon }) => (
    <div className="relative flex items-start gap-8">
        <div className="hidden md:flex flex-shrink-0 w-16 h-16 bg-white border-2 border-blue-600 rounded-full items-center justify-center font-bold text-blue-600 z-10 relative">
            {num}
        </div>
        <div className="flex-1 bg-gray-50 p-8 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-4 mb-4">
                <div className="md:hidden w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">{num}</div>
                <div className="text-3xl">{icon}</div>
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            </div>
            <p className="text-gray-600">{desc}</p>
        </div>
    </div>
);

const FAQ = ({ activeTab }) => (
    <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <div className="space-y-6">
                <FAQItem q="How is this different from PropStream?" a="They sell 60-day old lists. We scrape daily. You get the lead 24h after filing." />
                <FAQItem q="Can the AI speak Spanish?" a="Yes! It handles English and Spanish seamlessly, perfect for Miami." />
                <FAQItem q="Do I need a contract?" a="No. Month-to-month. Cancel anytime." />
                <FAQItem q="What if I'm on a roof when AI calls?" a="AI handles the whole booking. You just get a notification." />
            </div>
        </div>
    </section>
);

const FAQItem = ({ q, a }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h4 className="font-bold text-lg mb-2 text-gray-900">{q}</h4>
        <p className="text-gray-600">{a}</p>
    </div>
);

const FinalCTA = ({ onJoin }) => (
    <section className="py-24 bg-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">Stop Competing on Stale Leads.</h2>
            <p className="text-2xl text-blue-200 mb-12">Join 412 Miami-Dade Professionals on the Waitlist.</p>

            <button
                onClick={onJoin}
                className="bg-green-500 hover:bg-green-600 text-white text-xl font-bold py-5 px-12 rounded-full shadow-lg transform hover:scale-105 transition"
            >
                Secure Your Spot
            </button>
            <p className="mt-8 text-sm text-gray-400">Beta Launches January 2026 • Limited to first 500 members</p>
        </div>
    </section>
);

const Footer = () => (
    <footer className="bg-slate-950 text-gray-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 text-center md:text-left grid md:grid-cols-4 gap-8">
            <div>
                <div className="text-xl font-bold text-white mb-4">BizLeadFinders</div>
                <p className="text-sm">Powering Miami's Real Estate Economy with AI.</p>
            </div>
            {/* Links placeholder */}
        </div>
        <div className="text-center mt-12 text-sm text-gray-600">
            © 2025 BizLeadFinders. All rights reserved.
        </div>
    </footer>
);

const WaitlistModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    // Form logic state
    const [status, setStatus] = useState('idle');
    const [formData, setFormData] = useState({ name: '', email: '', role: 'investor' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('submitting');
        try {
            await apiClient.post('/waitlist', formData); // Use existing Endpoint
            setStatus('success');
            setTimeout(() => { onClose(); setStatus('idle'); }, 2500);
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>

                {status === 'success' ? (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-4">🎉</div>
                        <h3 className="text-2xl font-bold">You're In!</h3>
                        <p className="text-gray-600">Watch your email for the beta invite.</p>
                    </div>
                ) : (
                    <>
                        <h3 className="text-2xl font-bold mb-2">Join Early Access</h3>
                        <p className="text-gray-600 mb-6">Lock in your founding member token rates.</p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                className="w-full border p-3 rounded-lg"
                                placeholder="Full Name"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                            <input
                                className="w-full border p-3 rounded-lg"
                                placeholder="Email Address"
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                            <select
                                className="w-full border p-3 rounded-lg"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="investor">Real Estate Investor</option>
                                <option value="contractor">Service Contractor</option>
                            </select>
                            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">
                                {status === 'submitting' ? 'Joining...' : 'Join Waitlist'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default LandingPageRevised;
