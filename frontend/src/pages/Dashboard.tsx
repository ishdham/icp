import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FileText, Users, CheckSquare, PlusCircle } from 'lucide-react';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        solutions: 0,
        partners: 0,
        tickets: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // In a real app, we might have a dedicated stats endpoint
                // For now, we'll fetch lists and count. Not efficient but works for MVP.
                const [solRes, partnerRes, ticketRes] = await Promise.all([
                    client.get('/solutions'),
                    client.get('/partners'),
                    client.get('/tickets')
                ]);

                setStats({
                    solutions: solRes.data.items?.length || 0,
                    partners: partnerRes.data?.length || 0,
                    tickets: ticketRes.data?.length || 0
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchStats();
        } else {
            setLoading(false);
        }
    }, [user]);

    if (!user) {
        return (
            <div className="text-center py-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to ICP</h1>
                <p className="text-xl text-gray-600 mb-8">Impact Collaboration Platform</p>
                <div className="space-x-4">
                    <Link to="/login" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-brand-blue hover:bg-brand-blue/90">
                        Get Started
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <FileText className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Solutions</dt>
                                    <dd className="text-lg font-medium text-gray-900">{loading ? '...' : stats.solutions}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm">
                            <Link to="/solutions" className="font-medium text-brand-blue hover:text-brand-blue/80">View all</Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Users className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Active Partners</dt>
                                    <dd className="text-lg font-medium text-gray-900">{loading ? '...' : stats.partners}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm">
                            <Link to="/partners" className="font-medium text-brand-blue hover:text-brand-blue/80">View all</Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <CheckSquare className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">My Tickets</dt>
                                    <dd className="text-lg font-medium text-gray-900">{loading ? '...' : stats.tickets}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm">
                            <Link to="/tickets" className="font-medium text-brand-blue hover:text-brand-blue/80">View all</Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
                <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Link to="/solutions" className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                        <div className="flex-shrink-0">
                            <PlusCircle className="h-6 w-6 text-brand-blue" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="absolute inset-0" aria-hidden="true" />
                            <p className="text-sm font-medium text-gray-900">Submit a Solution</p>
                            <p className="text-sm text-gray-500">Share your innovative solution with the platform.</p>
                        </div>
                    </Link>

                    <Link to="/partners" className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                        <div className="flex-shrink-0">
                            <PlusCircle className="h-6 w-6 text-brand-blue" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="absolute inset-0" aria-hidden="true" />
                            <p className="text-sm font-medium text-gray-900">Propose a Partner</p>
                            <p className="text-sm text-gray-500">Recommend a new partner organization.</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
