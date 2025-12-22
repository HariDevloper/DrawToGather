import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Gift } from 'lucide-react';
import './DailyRewards.css';

import { API_URL as BASE_API_URL } from '../config';

const API_URL = `${BASE_API_URL}/users`;

const DailyRewards = ({ user, onClose, onUpdateUser }) => {
    const [loading, setLoading] = useState(false);
    const { streak = 0, lastDailyClaim } = user;
    const [canClaim, setCanClaim] = useState(false);

    // If we cannot claim (already claimed today), the current visual streak should include today.
    // So if streak is 1, and we claimed, it means Day 1 is done.
    // If streak is 1, and we can claim, it means Day 1 is past, and we are aiming for Day 2? 
    // Wait, backend streak logic: "streak: 1" means you have a streak of 1 day.

    // So:
    // Case A: Streak 1, Can Claim. -> Day 1 done? No.
    // If you never claimed, streak is 0. 
    // Case B: Streak 1, Can Claim (Next day). -> Day 1 done. Target Day 2.
    // Case C: Streak 1, Cannot Claim (Just claimed). -> Day 1 done. Target Day 2 tomorrow.

    // Let's refine based on "streak" meaning "number of days completed in current streak".
    // Streak 0 -> Target Day 1.
    // Streak 1 -> One day done. Target Day 2.

    // IF canClaim is TRUE:
    // We are working towards (Streak + 1).
    // Days <= Streak are claimed.
    // Day (Streak + 1) is ACTIVE.

    // IF canClaim is FALSE:
    // We have completed (Streak) days today.
    // Days <= Streak are claimed.
    // Day (Streak + 1) is LOCKED (tomorrow).

    // Exception: If streak is 0 and canClaim is false? (New user, claimed today?)
    // Then Day 1 is claimed. Streak should represent that.

    // Let's just trust "streak" = "days claimed".
    // If streak=1, day 1 is claimed.
    // If streak=2, days 1 and 2 are claimed.

    // Visual Logic Redux:
    // targetDay = streak + (canClaim ? 1 : 0);
    // Actually, no. If I have streak 1, and I can claim, I am about to claim Day 2.
    // If I have streak 1, and I CANNOT claim, I just claimed Day 1 (or it's later in the day of Day 1).
    // WAIT. If I just claimed Day 1, my streak becomes 1.
    // If I just claimed Day 2, my streak becomes 2.

    // So:
    // Days <= Streak : CLAIMED (Green Check)
    // Day == Streak + 1 : 
    //    If canClaim ? XP/Active : Locked

    // Wait, let's look at Day 1.
    // New user: streak 0. canClaim = true.
    // Day 1: 1 <= 0 ? No. 
    // Day 1 == 1 ? Yes. canClaim? Active. -> CORRECT.

    // User claims Day 1.
    // Streak becomes 1. canClaim = false.
    // Day 1: 1 <= 1 ? YES. Claimed. -> CORRECT.
    // Day 2: 2 <= 1 ? No.
    // Day 2 == 2 ? Yes. canClaim? No. Locked. -> CORRECT.

    // User returns Day 2.
    // Streak 1. canClaim = true.
    // Day 1: 1 <= 1 ? Yes.
    // Day 2: 2 <= 1 ? No.
    // Day 2 == 2 ? Yes. canClaim? True -> Active. -> CORRECT.

    // User claims Day 2.
    // Streak 2. canClaim = false.
    // Day 2: 2 <= 2 ? Yes. Claimed. -> CORRECT.

    // Logic seems solid strictly based on "streak = completed count".

    // Issue might be if backend returns streak 0 after claim? No, it increments.
    // Or if initial state is weird.

    // Let's just simplify the visual mapping loop based on this deduction.

    useEffect(() => {
        // Check if can claim today
        const checkStatus = () => {
            if (!user.lastDailyClaim) {
                setCanClaim(true);
                return;
            }
            // Use UTC date comparison to match backend logic exactly
            // Backend resets at 00:00 UTC
            const nowUTC = new Date().toISOString().split('T')[0];
            const lastClaimUTC = lastDailyClaim ? new Date(lastDailyClaim).toISOString().split('T')[0] : null;

            if (nowUTC !== lastClaimUTC) {
                setCanClaim(true);
            } else {
                setCanClaim(false);
            }
        };
        checkStatus();
    }, [lastDailyClaim]);

    const handleClaim = async () => {
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/${user.id}/claim-daily`);
            onUpdateUser({
                ...user,
                credits: res.data.credits,
                streak: res.data.streak,
                lastDailyClaim: res.data.lastDailyClaim
            });
            setCanClaim(false);
            // alert(res.data.message);
        } catch (err) {
            console.error('Claim error:', err);

            // If error is 400, it means already claimed (or similar logic error from backend)
            // The backend sends back valuable data even in 400 (credits, streak, nextClaim)
            // So we can still update the UI to reflect the "Claimed" state.
            if (err.response && err.response.status === 400) {
                const data = err.response.data;
                if (data.alreadyClaimed) {
                    setCanClaim(false);
                    // Update parent user state so 'lastDailyClaim' is recognized as today
                    // Use today 'new Date()' string if backend didn't send a new claim date, 
                    // forcing the UI to see "today" matches "lastClaim".
                    onUpdateUser({
                        ...user,
                        credits: data.credits !== undefined ? data.credits : user.credits,
                        streak: data.streak !== undefined ? data.streak : user.streak,
                        // If we are already claimed, ensure lastDailyClaim prevents future clicks
                        lastDailyClaim: new Date().toISOString()
                    });
                }
            } else {
                // Real error
                // alert(err.response?.data?.message || 'Failed to claim');
            }
        } finally {
            setLoading(false);
        }
    };

    const days = [1, 2, 3, 4, 5, 6, 7];

    return (
        <div className="reward-modal-overlay">
            <motion.div
                className="reward-modal-content"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
            >
                <button className="close-btn" onClick={onClose}><X size={24} /></button>

                <div className="reward-header">
                    <h2>Daily Rewards</h2>
                    <p>Login daily to earn more credits!</p>
                </div>

                <div className="streak-grid">
                    {days.map(day => {
                        // Visual logic:
                        // 1. If day is less than current streak: It's a past claimed day.
                        // 2. If day equals current streak:
                        //    - If we CAN claim today, it's the next target (active).
                        //    - If we CANNOT claim today (already claimed), it means we JUST finished this day (claimed).
                        // 3. If day is greater than current streak + 1 (future), it's locked.

                        // BUT, the backend updates streak AFTER claiming.
                        // Example: 
                        // Start: Streak 0. Claim -> Streak 1.
                        // Next day: Streak 1. Claim -> Streak 2.

                        // So if I have streak 1:
                        // - If I can claim: I am about to claim Day 2.
                        // - If I cannot claim: I already claimed Day 1 today.

                        let status = 'locked';




                        // Logic based on User Streak = "Count of Completed Days"
                        if (day <= streak) {
                            status = 'claimed';
                        } else if (day === streak + 1) {
                            if (canClaim) {
                                status = 'active';
                            } else {
                                status = 'locked';
                            }
                        } else {
                            status = 'locked';
                        }

                        // Determine amount
                        let amount = 100;
                        if (day === 4) amount = 200;
                        if (day === 7) amount = 500;

                        return (
                            <motion.div
                                key={day}
                                className={`streak-day day-${day} ${status}`}
                                whileHover={status === 'active' ? { scale: 1.05 } : {}}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: day * 0.05 }}
                            >
                                <div className="day-label">Day {day}</div>
                                <div className="reward-icon">
                                    {day === 7 ? <Gift size={32} /> : <div className="coin-circle">¢</div>}
                                </div>
                                <div className="amount">+{amount}</div>
                                {status === 'claimed' && (
                                    <div className="claimed-overlay">
                                        <Check size={20} />
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                <div className="reward-action">
                    <button
                        className={`claim-btn ${!canClaim ? 'disabled' : ''}`}
                        onClick={handleClaim}
                        disabled={!canClaim || loading}
                    >
                        {loading ? 'Claiming...' : canClaim ? 'Claim Reward' : 'Come back tomorrow'}
                    </button>
                    {!canClaim && (
                        <p className="next-claim-text">Next reward available at 12:00 AM</p>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default DailyRewards;
