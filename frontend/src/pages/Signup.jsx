import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Gift } from 'lucide-react';
import apiClient from '../api/client';

const Signup = () => {
    const [searchParams] = useSearchParams();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'investor' // Default role
    });
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [referralInfo, setReferralInfo] = useState(null);
    const [referralCode, setReferralCode] = useState('');
    const navigate = useNavigate();

    // Check for referral code in URL on mount
    useEffect(() => {
        const refCode = searchParams.get('ref');
        const roleParam = searchParams.get('role');

        if (refCode) {
            setReferralCode(refCode);
            validateReferralCode(refCode);
        }

        if (roleParam && (roleParam === 'investor' || roleParam === 'provider')) {
            setFormData(prev => ({ ...prev, role: roleParam }));
        }
    }, [searchParams]);

    const validateReferralCode = async (code) => {
        try {
            const response = await apiClient.get(`/referral/validate/${code}`);
            if (response.data.valid) {
                setReferralInfo(response.data);
                // Store in session for later use
                sessionStorage.setItem('referral_code', code);
            }
        } catch (error) {
            console.error('Error validating referral code:', error);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);

        try {
            // Register the user
            const response = await apiClient.post('/auth/signup', {
                email: formData.email,
                password: formData.password,
                full_name: formData.fullName,
                role: formData.role,
                referral_code: referralCode || sessionStorage.getItem('referral_code')
            });

            const { token, user } = response.data;

            // Store auth data and auto-login
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Track the referral signup if we have a code
            const storedCode = referralCode || sessionStorage.getItem('referral_code');
            if (storedCode) {
                try {
                    await apiClient.post('/referral/track-signup', {
                        user_id: user.user_id,
                        user_email: user.email,
                        user_name: user.full_name,
                        user_role: user.role,
                        referral_code: storedCode
                    });
                    sessionStorage.removeItem('referral_code');
                } catch (trackError) {
                    console.error('Error tracking referral:', trackError);
                }
            }

            // Redirect based on role
            if (user.role === 'admin') {
                navigate('/admin/dashboard');
            } else if (user.subscription_tier === 'investor' || user.role === 'investor') {
                navigate('/investor/dashboard');
            } else if (user.subscription_tier === 'provider' || user.role === 'provider') {
                navigate('/provider/dashboard');
            } else {
                navigate('/investor/dashboard');
            }

        } catch (err) {
            console.error('Signup error:', err);
            setError(err.response?.data?.error || 'Failed to create account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
                    Create your account
                </h2>
                <p className="mt-2 text-center text-sm text-slate-300">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300">
                        Sign in
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                {/* Referral Discount Banner */}
                {referralInfo && referralInfo.valid && (
                    <div className="mb-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                        <div className="bg-green-500/30 rounded-full p-2">
                            <Gift className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <div className="text-green-400 font-medium">
                                {referralInfo.discount?.message}
                            </div>
                            <div className="text-sm text-green-300/70">
                                Referred by {referralInfo.referrer_name}
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white/10 backdrop-blur-lg py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-white/20">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg" role="alert">
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}

                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-slate-200">
                                Full Name
                            </label>
                            <div className="mt-1">
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    required
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                                    placeholder="John Smith"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                                Email address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-slate-200">
                                I am a...
                            </label>
                            <div className="mt-1">
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                                >
                                    <option value="investor" className="bg-slate-800">Real Estate Investor</option>
                                    <option value="provider" className="bg-slate-800">Service Contractor (Roofer, HVAC, etc)</option>
                                </select>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                                {formData.role === 'investor'
                                    ? 'Access off-market leads, foreclosure data, and flipping tools.'
                                    : 'Access fresh homeowner leads, permit data, and job alerts.'}
                            </p>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200">
                                Confirm Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Hidden referral code field */}
                        {referralCode && (
                            <input type="hidden" name="referral_code" value={referralCode} />
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </div>
                    </form>

                    <p className="mt-6 text-center text-xs text-slate-400">
                        By signing up, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
