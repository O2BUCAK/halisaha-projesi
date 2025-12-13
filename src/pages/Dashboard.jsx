import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PrivateRoute from '../components/PrivateRoute';

// Sub-pages
import Overview from './dashboard/Overview';
import GroupList from './dashboard/GroupList';
import GroupCreate from './dashboard/GroupCreate';
import GroupDetail from './dashboard/GroupDetail';
import MatchCreate from './dashboard/MatchCreate';
import MatchDetail from './dashboard/MatchDetail';

const Dashboard = () => {
    const location = useLocation();
    const { currentUser } = useAuth();

    const isActive = (path) => {
        return location.pathname === path ? 'var(--accent-primary)' : 'var(--text-secondary)';
    };

    return (
        <div className="container">
            <div className="dashboard-layout">
                {/* Sidebar / Menu */}
                {currentUser && (
                    <aside className="dashboard-sidebar">
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
                )}

                {/* Main Content Area */}
                <div className="dashboard-content">
                    <Routes>
                        <Route path="/" element={<PrivateRoute><Overview /></PrivateRoute>} />
                        <Route path="/groups" element={<PrivateRoute><GroupList /></PrivateRoute>} />
                        <Route path="/groups/create" element={<PrivateRoute><GroupCreate /></PrivateRoute>} />
                        <Route path="/groups/:groupId" element={<GroupDetail />} />
                        <Route path="/groups/:groupId/matches/create" element={<PrivateRoute><MatchCreate /></PrivateRoute>} />
                        <Route path="/matches/:matchId" element={<MatchDetail />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
