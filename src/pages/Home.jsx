import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Activity, Users, Trophy } from 'lucide-react';

const Home = () => {
    const { currentUser } = useAuth();

    if (currentUser) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="container">
            <section style={{ padding: '4rem 0', textAlign: 'center' }}>
                <h1 style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '1.5rem', lineHeight: 1.2 }}>
                    Halı Saha Maçlarınızı <br />
                    <span className="text-gradient">Profesyonelce Yönetin</span>
                </h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
                    Arkadaş grubunuzu kurun, maçlarınızı organize edin, oyuncuları puanlayın ve detaylı istatistiklerle rekabeti artırın. Tamamen ücretsiz.
                </p>
                <div className="flex-center" style={{ gap: '1rem' }}>
                    <Link to="/register" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                        Hemen Başla <ArrowRight size={20} />
                    </Link>
                    <Link to="/login" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                        Giriş Yap
                    </Link>
                </div>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', padding: '4rem 0' }}>
                <FeatureCard
                    icon={<Users size={32} color="var(--accent-primary)" />}
                    title="Grup Yönetimi"
                    desc="Arkadaşlarınızla özel gruplar oluşturun. Sadece grup üyeleri maçları ve istatistikleri görebilir."
                />
                <FeatureCard
                    icon={<Activity size={32} color="var(--accent-secondary)" />}
                    title="Detaylı İstatistikler"
                    desc="Gol, asist, galibiyet sayıları ve maç başına puan ortalamaları otomatik hesaplanır."
                />
                <FeatureCard
                    icon={<Trophy size={32} color="var(--accent-success)" />}
                    title="Puanlama Sistemi"
                    desc="Maç sonrası oyuncular birbirine puan verir. Haftanın ve ayın en iyi oyuncularını belirleyin."
                />
            </section>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }) => (
    <div className="card" style={{ textAlign: 'left' }}>
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', display: 'inline-block' }}>
            {icon}
        </div>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)' }}>{desc}</p>
    </div>
);

export default Home;
