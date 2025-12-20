import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Calendar, Check, ArrowRight, ArrowLeft, Heart } from 'lucide-react';
import axios from 'axios';
import './Onboarding.css';

import { API_URL as BASE_API_URL } from '../config';

const API_URL = `${BASE_API_URL}/users`;
const AVATARS = Array.from({ length: 10 }, (_, i) => `avatar${i + 1}.png`);

const Onboarding = ({ user, onComplete }) => {
    // 1: Username, 2: Age, 3: Gender, 4: Avatar
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: user.username || '',
        age: '',
        gender: '',
        avatar: 'avatar1.png'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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
                        {step === 4 && "Choose your look"}
                    </h2>
                    <div className="step-indicator">
                        <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
                        <div className="step-line"></div>
                        <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
                        <div className="step-line"></div>
                        <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>3</div>
                        <div className="step-line"></div>
                        <div className={`step-dot ${step >= 4 ? 'active' : ''}`}>4</div>
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
                        {isLoading ? 'Saving...' : (step === 4 ? 'Get Started!' : 'Next Step')}
                        {!isLoading && step !== 4 && <ArrowRight size={20} />}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Onboarding;
