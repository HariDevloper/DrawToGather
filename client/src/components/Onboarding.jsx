import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Calendar, Check, ArrowRight, ArrowLeft, Globe } from 'lucide-react';
import axios from 'axios';
import './Onboarding.css';

import { API_URL as BASE_API_URL } from '../config';

const API_URL = `${BASE_API_URL}/users`;
const AVATARS = Array.from({ length: 10 }, (_, i) => `avatar${i + 1}.png`);

import { COUNTRIES } from '../data/countries';

const Onboarding = ({ user, onComplete }) => {
    // 1: Username, 2: Age, 3: Gender, 4: Country, 5: Avatar
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: user.username || '',
        age: '',
        gender: '',
        country: '',
        timezone: '',
        avatar: 'avatar1.png'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Try to auto-detect timezone on mount
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (tz) {
                setFormData(prev => ({ ...prev, timezone: tz }));
            }
        } catch (e) {
            console.log('Timezone detection failed', e);
        }
    }, []);

    // Filter countries
    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleNext = () => {
        if (step === 1) {
            if (!formData.username) {
                setError('Username is required');
                return;
            }
            if (formData.username.length < 3) {
                setError('Username must be at least 3 characters');
                return;
            }
            setError('');
            setStep(2);
        } else if (step === 2) {
            if (!formData.age) {
                setError('Please enter your age');
                return;
            }
            if (formData.age < 5 || formData.age > 100) {
                setError('Please enter a valid age (5-100)');
                return;
            }
            setError('');
            setStep(3);
        } else if (step === 3) {
            if (!formData.gender) {
                setError('Please select your gender');
                return;
            }
            setError('');
            setStep(4);
        } else if (step === 4) {
            if (!formData.country) {
                setError('Please select your country');
                return;
            }
            setError('');
            setStep(5);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
            setError('');
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const res = await axios.put(`${API_URL}/${user.id}/update`, {
                ...formData,
                isProfileComplete: true
            });
            onComplete(res.data.user);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="onboarding-container">
            <motion.div
                className="onboarding-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="onboarding-header">
                    <button className="onboarding-logout-btn" onClick={() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.reload();
                    }}>
                        <ArrowLeft size={16} /> Logout
                    </button>
                    <h2>
                        {step === 1 && "What's your name?"}
                        {step === 2 && "How old are you?"}
                        {step === 3 && "What's your gender?"}
                        {step === 4 && "Where are you from?"}
                        {step === 5 && "Choose your look"}
                    </h2>
                    <div className="step-indicator">
                        <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
                        <div className="step-line"></div>
                        <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
                        <div className="step-line"></div>
                        <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>3</div>
                        <div className="step-line"></div>
                        <div className={`step-dot ${step >= 4 ? 'active' : ''}`}>4</div>
                        <div className="step-line"></div>
                        <div className={`step-dot ${step >= 5 ? 'active' : ''}`}>5</div>
                    </div>
                </div>

                <div className="step-content-wrapper">
                    <AnimatePresence mode='wait'>
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="form-step"
                            >
                                <div className="input-group">
                                    <label>Pick a cool username</label>
                                    <div className="input-wrapper">
                                        <User size={20} />
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            placeholder="eg: MasterPainter"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="form-step"
                            >
                                <div className="input-group">
                                    <label>Your age lets us personalize your fun</label>
                                    <div className="input-wrapper">
                                        <Calendar size={20} />
                                        <input
                                            type="number"
                                            value={formData.age}
                                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                            placeholder="Your Age"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="form-step"
                            >
                                <div className="input-group">
                                    <label>How do you identify?</label>
                                    <div className="gender-select-vertical">
                                        {['male', 'female', 'other'].map(g => (
                                            <button
                                                key={g}
                                                className={`gender-option ${formData.gender === g ? 'selected' : ''}`}
                                                onClick={() => setFormData({ ...formData, gender: g })}
                                            >

                                                <span className="gender-label">
                                                    {g.charAt(0).toUpperCase() + g.slice(1)}
                                                </span>
                                                {formData.gender === g && <Check className="check-icon" size={20} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="form-step"
                            >
                                <p style={{ color: '#666', marginBottom: '15px', fontSize: '0.9rem' }}>This helps us give you credits at the right local time!</p>
                                <div className="input-group">
                                    <label>Select your Country</label>
                                    <input
                                        type="text"
                                        placeholder="Search country..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="country-search-input"
                                        style={{
                                            width: '100%',
                                            padding: '10px 15px',
                                            borderRadius: '12px',
                                            border: '2px solid #eee',
                                            marginBottom: '10px',
                                            fontSize: '1rem',
                                            outline: 'none'
                                        }}
                                    />
                                    <div className="countries-grid">
                                        {filteredCountries.map(c => (
                                            <button
                                                key={c.code}
                                                className={`country-option ${formData.country === c.name ? 'selected' : ''}`}
                                                onClick={() => {
                                                    const newTz = formData.timezone || c.timezone;
                                                    setFormData({ ...formData, country: c.name, timezone: newTz });
                                                }}
                                            >
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '1.2rem' }}>{c.flag}</span>
                                                    {c.name}
                                                </span>
                                                {formData.country === c.name && <Check size={16} />}
                                            </button>
                                        ))}
                                        {filteredCountries.length === 0 && (
                                            <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#999', padding: '20px' }}>No countries found</p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 5 && (
                            <motion.div
                                key="step5"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="avatar-step"
                            >
                                <div className="preview-large">
                                    <img src={`/profiles/${formData.avatar}`} alt="Preview" />
                                </div>
                                <div className="avatars-grid">
                                    {AVATARS.map(avatar => (
                                        <div
                                            key={avatar}
                                            className={`avatar-choice ${formData.avatar === avatar ? 'selected' : ''}`}
                                            onClick={() => setFormData({ ...formData, avatar })}
                                        >
                                            <img src={`/profiles/${avatar}`} alt="choice" loading="lazy" />
                                            {formData.avatar === avatar && <div className="check-overlay"><Check size={16} /></div>}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {error && <p className="error-message">{error}</p>}

                <div className="nav-buttons">
                    {step > 1 && (
                        <button className="back-btn" onClick={handleBack} disabled={isLoading}>
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <button className="next-btn" onClick={handleNext} disabled={isLoading}>
                        {isLoading ? 'Saving...' : (step === 5 ? 'Get Started!' : 'Next Step')}
                        {!isLoading && step !== 5 && <ArrowRight size={20} />}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Onboarding;
