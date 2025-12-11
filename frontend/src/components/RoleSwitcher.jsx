import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Hammer, ChevronDown, Check } from 'lucide-react';
import apiClient from '../api/client';

/**
 * RoleSwitcher - Dropdown to switch between Investor and Provider dashboards
 * Only shows if user has access to multiple tiers
 */
const RoleSwitcher = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [switching, setSwitching] = useState(false);

    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user) return null;

    const accessibleTiers = user.accessible_tiers || [user.subscription_tier];
    const activeTier = user.active_tier || user.subscription_tier;
    const isAdmin = user.role === 'admin';

    // If user only has one tier and is not admin, don't show switcher
    if (accessibleTiers.length <= 1 && !isAdmin) {
        return null;
    }

    const tiers = [
        { id: 'investor', label: 'Investor', icon: Building2, path: '/investor/dashboard', color: 'blue' },
        { id: 'provider', label: 'Provider', icon: Hammer, path: '/provider/dashboard', color: 'green' },
    ];

    // Admin can see all tiers
    const availableTiers = isAdmin
        ? tiers
        : tiers.filter(t => accessibleTiers.includes(t.id));

    const currentTier = tiers.find(t => t.id === activeTier) || tiers[0];

    const handleSwitch = async (tier) => {
        if (tier.id === activeTier) {
            setIsOpen(false);
            return;
        }

        setSwitching(true);
        try {
            // Call API to switch tier
            await apiClient.post('/auth/switch-tier', {
                user_id: user.user_id,
                new_tier: tier.id
            });

            // Update localStorage
            const updatedUser = { ...user, active_tier: tier.id };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Navigate to new dashboard
            navigate(tier.path);
            window.location.reload(); // Refresh to update all components
        } catch (error) {
            console.error('Failed to switch tier:', error);
        } finally {
            setSwitching(false);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={switching}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
            >
                <currentTier.icon className="w-4 h-4" />
                <span>{currentTier.label}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                        <div className="py-1">
                            {availableTiers.map((tier) => (
                                <button
                                    key={tier.id}
                                    onClick={() => handleSwitch(tier)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${tier.id === activeTier ? 'bg-gray-50' : ''
                                        }`}
                                >
                                    <tier.icon className={`w-5 h-5 text-${tier.color}-600`} />
                                    <span className="flex-1 font-medium text-gray-700">{tier.label}</span>
                                    {tier.id === activeTier && (
                                        <Check className="w-4 h-4 text-green-600" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Admin badge if applicable */}
                        {isAdmin && (
                            <div className="border-t border-gray-100 px-4 py-2 bg-purple-50">
                                <span className="text-xs text-purple-600 font-medium">
                                    ⚙️ Admin: Full Access
                                </span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default RoleSwitcher;
