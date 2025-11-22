import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Plus } from 'lucide-react';

// Sub-pages
import Overview from './dashboard/Overview';
import GroupList from './dashboard/GroupList';
import GroupCreate from './dashboard/GroupCreate';
import GroupDetail from './dashboard/GroupDetail';
import MatchCreate from './dashboard/MatchCreate';
import MatchDetail from './dashboard/MatchDetail';

const Dashboard = () => {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path ? 'var(--accent-primary)' : 'var(--text-secondary)';
    };

    return (
        <div className="container">
            <div style={{ display: 'flex', gap: '2rem', padding: '2rem 0' }}>
                {/* Sidebar / Menu */}
                <aside style={{ width: '250px', flexShrink: 0 }}>
                    <div className="card" style={{ padding: '1rem' }}>
                        <h3 style={{ marginBottom: '1rem', paddingLeft: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase' }}>Menu</h3>
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Link to="/dashboard" className="btn btn-secondary" style={{ justifyContent: 'flex-start', borderColor: 'transparent', color: isActive('/dashboard') }}>
                                <LayoutDashboard size={20} /> Genel Bakış
                            </Link>
                            <Link to="/dashboard/groups" className="btn btn-secondary" style={{ justifyContent: 'flex-start', borderColor: 'transparent', color: isActive('/dashboard/groups') }}>
                                <Users size={20} /> Gruplarım
                            </Link>
                            <Link to="/dashboard/groups/create" className="btn btn-secondary" style={{ justifyContent: 'flex-start', borderColor: 'transparent', color: isActive('/dashboard/groups/create') }}>
                                <Plus size={20} /> Grup Oluştur
                            </Link>
                        </nav>
                    </div>
                </aside>

                {/* Main Content Area */}
                <div style={{ flex: 1 }}>
                    <Routes>
                        <Route path="/" element={<Overview />} />
                        <Route path="/groups" element={<GroupList />} />
                        <Route path="/groups/create" element={<GroupCreate />} />
                        <Route path="/groups/:groupId" element={<GroupDetail />} />
                        <Route path="/groups/:groupId/matches/create" element={<MatchCreate />} />
                        <Route path="/matches/:matchId" element={<MatchDetail />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
