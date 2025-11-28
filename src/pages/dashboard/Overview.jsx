import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Trophy, Activity, Calendar } from 'lucide-react';
import InvitationsList from '../../components/InvitationsList';
import GroupList from './GroupList';
import AdSenseBanner from '../../components/AdSenseBanner';

const Overview = () => {
    const { currentUser } = useAuth();
    const { getMyGroups, matches } = useData();
    const myGroups = getMyGroups();

    // Calculate user statistics
    const myGroupIds = myGroups.map(g => g.id);
    const myMatches = matches.filter(m => myGroupIds.includes(m.groupId) && m.status === 'played');

    // Calculate total goals scored by current user
    const totalGoals = myMatches.reduce((sum, match) => {
        const userStats = match.stats?.[currentUser.uid || currentUser.id];
        return sum + (userStats?.goals || 0);
    }, 0);

    return (
        <div>
            <div className="mb-8">
                <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Hoşgeldin, {currentUser?.name} 👋</h2>
                <p className="text-gray-600">Halısaha istatistiklerini buradan takip edebilirsin.</p>
            </div>

            <InvitationsList />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <StatCard
                    icon={<Trophy size={24} color="var(--accent-primary)" />}
                    label="Toplam Maç"
                    value={myMatches.length}
                />
                <StatCard
                    icon={<Activity size={24} color="var(--accent-success)" />}
                    label="Gol Sayısı"
                    value={totalGoals}
                />
                <StatCard
                    icon={<Calendar size={24} color="var(--accent-secondary)" />}
                    label="Aktif Gruplar"
                    value={myGroups.length}
                />
            </div>

            <GroupList groups={myGroups} />
            <AdSenseBanner />
        </div>
    );
};

const StatCard = ({ icon, label, value }) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</div>
        </div>
    </div>
);

export default Overview;
