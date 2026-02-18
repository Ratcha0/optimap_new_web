import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import TripHistory from './TripHistory';
import OverviewTab from './OverviewTab';
import TechnicianList from './TechnicianList';
import JobList from './JobList';
import StatCard from './StatCard';
import AdminMap from './AdminMap';
import UserProfile from '../../modals/UserProfile';
import ManageTechnicianModal from '../../modals/ManageTechnicianModal';
import logo from '../../../assets/logo/Logo_optimap.jpg';
import {
    FiUsers,
    FiActivity,
    FiClock,
    FiChevronRight,
    FiBox,
    FiSettings,
    FiLogOut,
    FiMenu,
    FiX,
    FiMap
} from 'react-icons/fi';

const AdminDashboard = ({ user, userProfile }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({
        totalTechs: 0,
        onlineTechs: 0,
        activeJobs: 0,
        completedJobs: 0
    });

    const [techs, setTechs] = useState([]);
    const [users, setUsers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [localProfile, setLocalProfile] = useState(userProfile);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [jobSearch, setJobSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [selectedTech, setSelectedTech] = useState(null);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    const handleManageTech = (tech) => {
        setSelectedTech(tech);
        setIsManageModalOpen(true);
    };

    useEffect(() => {
        fetchData();

        let refreshTimeout;
        const debouncedRefresh = () => {
            clearTimeout(refreshTimeout);
            refreshTimeout = setTimeout(() => fetchData(true), 2000);
        };

        const techSub = supabase.channel('tech-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, debouncedRefresh)
            .subscribe();

        const jobSub = supabase.channel('job-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, debouncedRefresh)
            .subscribe();

        const carStatusSub = supabase.channel('car-status-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'car_status' }, debouncedRefresh)
            .subscribe();

        const profileSub = supabase.channel(`current-profile-${user?.id}`)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user?.id}` },
                (payload) => setLocalProfile(payload.new)
            ).subscribe();

        return () => {
            clearTimeout(refreshTimeout);
            supabase.removeChannel(techSub);
            supabase.removeChannel(jobSub);
            supabase.removeChannel(carStatusSub);
            supabase.removeChannel(profileSub);
        };
    }, [user?.id]);

    const fetchData = async (silent = false) => {
        if (!user?.id) return;
        if (!silent) setLoading(true);
        try {
            const [profileRes, allProfilesRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('profiles').select('*, car_status(*)')
            ]);

            if (profileRes.data) setLocalProfile(profileRes.data);
            const allProfiles = allProfilesRes.data || [];

            // Filter techs and users
            const rawTechs = allProfiles.filter(p => p.role === 'technician');
            const currentUsers = allProfiles.filter(p => p.role === 'user');

            // ดึงข้อมูลทีม: งานที่ยังไม่จบ + assignments ที่ accepted
            const { data: activeTickets } = await supabase
                .from('support_tickets')
                .select('id, technician_id')
                .not('technician_id', 'is', null)
                .in('status', ['pending', 'accepted', 'in_progress', 'arrived', 'working']);

            const ticketIds = (activeTickets || []).map(t => t.id);
            let activeAssignments = [];
            if (ticketIds.length > 0) {
                const { data } = await supabase
                    .from('ticket_assignments')
                    .select('ticket_id, technician_id, status, role');
                activeAssignments = (data || []).filter(a => ticketIds.includes(a.ticket_id));
            }

            
            

            // สร้าง Map หัวหน้าทีมของแต่ละ ticket
            const ticketLeaderMap = {};
            (activeTickets || []).forEach(t => {
                const leader = rawTechs.find(tech => tech.id === t.technician_id);
                ticketLeaderMap[t.id] = { leaderId: t.technician_id, leaderName: leader?.full_name || 'ไม่ทราบ' };
            });

            // เพิ่มข้อมูลทีมให้ช่างแต่ละคน
            const currentTechs = rawTechs.map(tech => {
                // เช็คว่าเป็นหัวหน้าทีมหรือไม่
                const headTicket = (activeTickets || []).find(t => t.technician_id === tech.id);
                if (headTicket) {
                    const memberCount = activeAssignments.filter(a => a.ticket_id === headTicket.id).length;
                    return { ...tech, active_ticket_id: headTicket.id, is_primary: true, team_leader_name: null, team_member_count: memberCount };
                }

                // เช็คว่าเป็นลูกทีมหรือไม่
                const myAssignment = activeAssignments.find(a => a.technician_id === tech.id);
                if (myAssignment) {
                    const leader = ticketLeaderMap[myAssignment.ticket_id];
                    return { ...tech, active_ticket_id: myAssignment.ticket_id, is_primary: false, team_leader_name: leader?.leaderName || null, team_member_count: 0 };
                }

                return { ...tech, active_ticket_id: null, is_primary: false, team_leader_name: null, team_member_count: 0 };
            });

            

            setTechs(currentTechs);
            setUsers(currentUsers);
            const { data: detailedJobs, error: detailedErr } = await supabase
                .from('support_tickets')
                .select(`
                    *,
                    customer:user_id(full_name, phone, email),
                    technician:technician_id(full_name)
                `)
                .order('created_at', { ascending: false });

            let finalJobs = [];
            if (detailedErr) {
                const { data: simpleJobs } = await supabase
                    .from('support_tickets')
                    .select('*')
                    .order('created_at', { ascending: false });
                finalJobs = simpleJobs || [];
            } else {
                finalJobs = detailedJobs || [];
            }
            setJobs(finalJobs);

            // เพิ่มจำนวนงานให้ผู้ใช้แต่ละคน
            const usersWithJobs = currentUsers.map(u => ({
                ...u,
                jobCount: finalJobs.filter(j => j.user_id === u.id).length
            }));
            setUsers(usersWithJobs);

            const active = finalJobs.filter(j => ['pending', 'accepted', 'in_progress'].includes(j.status)).length;
            const completed = finalJobs.filter(j => j.status === 'completed').length;
            const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const onlineCount = currentTechs.filter(t => t.last_updated && t.last_updated > fiveMinsAgo).length;

            setStats({
                totalTechs: currentTechs.length,
                onlineTechs: onlineCount,
                totalUsers: currentUsers.length,
                activeJobs: active,
                completedJobs: completed
            });
        } catch (err) {
            
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const SidebarItem = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => {
                setActiveTab(id);
                setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'text-gray-500 hover:bg-gray-100'
                }`}
        >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
            {activeTab === id && <FiChevronRight className="ml-auto" />}
        </button>
    );

    return (
        <div className="flex h-[100dvh] bg-gray-50 text-gray-900 font-sans overflow-hidden relative">
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl shadow-lg overflow-hidden border border-gray-100 flex items-center justify-center bg-white">
                        <img src={logo} alt="Logo" className="w-full h-full object-cover scale-150" />
                    </div>
                    <span className="font-bold text-lg">OptiMap</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                    <FiMenu size={24} />
                </button>
            </header>

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-100 p-6 flex flex-col z-[10001] transition-transform duration-300
                lg:relative lg:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex items-center justify-between mb-10 px-2 lg:justify-start lg:gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl shadow-lg overflow-hidden border border-gray-100 flex items-center justify-center bg-white">
                            <img src={logo} alt="OptiMap Logo" className="w-full h-full object-cover scale-150" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">OptiMap</h1>
                            <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">ระบบจัดการหลังบ้าน</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden p-2 text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <nav className="flex-1 space-y-2">
                    <SidebarItem id="overview" icon={FiActivity} label="ภาพรวมระบบ" />
                    <SidebarItem id="trips" icon={FiClock} label="ประวัติการเดินทาง" />
                    <SidebarItem id="technicians" icon={FiUsers} label="จัดการช่าง" />
                    <SidebarItem id="users" icon={FiUsers} label="จัดการผู้ใช้" />
                    <SidebarItem id="jobs" icon={FiBox} label="งานทั้งหมด" />
                    <div className="my-6 border-t border-gray-100" />
                    <SidebarItem id="map" icon={FiMap} label="แผนที่" />
                </nav>

                <div className="mt-auto space-y-4">
                    <div
                        onClick={() => setIsProfileOpen(true)}
                        className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex items-center gap-3 cursor-pointer hover:bg-white hover:shadow-lg hover:border-blue-100 transition-all duration-300"
                    >
                        <div className="relative">
                            <img
                                src={localProfile?.avatar_url || `https://ui-avatars.com/api/?name=${localProfile?.full_name || user?.email}&background=0D8ABC&color=fff`}
                                className="w-10 h-10 rounded-2xl object-cover border-2 border-white shadow-sm"
                                alt="Admin Avatar"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">แอดมิน</p>
                            <p className="text-sm font-bold text-gray-900 truncate">
                                {localProfile?.full_name || 'ผู้ดูแลระบบ'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                        <FiLogOut size={16} />
                        <span className="text-sm font-bold">ออกจากระบบ</span>
                    </button>
                </div>
            </aside>


            <UserProfile
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                user={user}
                onUpdate={fetchData}
            />

            <ManageTechnicianModal
                isOpen={isManageModalOpen}
                onClose={() => setIsManageModalOpen(false)}
                technician={selectedTech}
                onUpdate={fetchData}
                jobs={jobs}
            />

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 pt-24 pb-20 lg:pt-10">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                            {activeTab === 'overview' && 'รายละเอียด'}
                            {activeTab === 'trips' && 'ประวัติการเดินทาง'}
                            {activeTab === 'technicians' && 'จัดการช่าง'}
                            {activeTab === 'users' && 'จัดการผู้ใช้'}
                            {activeTab === 'jobs' && 'งานทั้งหมด'}
                            {activeTab === 'map' && 'ตำแหน่งช่างแบบเรียลไทม์'}
                        </h2>
                    </div>
                </header>

                {activeTab === 'overview' && (
                    <div className="flex sm:grid sm:grid-cols-5 gap-1.5 sm:gap-6 mb-4 sm:mb-10 overflow-x-auto scrollbar-hide pb-2">
                        <div className="min-w-[75px] flex-1 sm:min-w-0">
                            <StatCard label={<span>ช่าง<span className="hidden sm:inline">ทั้งหมด</span></span>} value={stats.totalTechs} sub="คน" color="blue" />
                        </div>
                        <div className="min-w-[75px] flex-1 sm:min-w-0">
                            <StatCard label={<span>ออนไลน์<span className="hidden sm:inline">ขณะนี้</span></span>} value={stats.onlineTechs} sub="คน" color="green" />
                        </div>
                        <div className="min-w-[75px] flex-1 sm:min-w-0">
                            <StatCard label={<span>ผู้ใช้<span className="hidden sm:inline">ทั้งหมด</span></span>} value={stats.totalUsers} sub="คน" color="cyan" />
                        </div>
                        <div className="min-w-[75px] flex-1 sm:min-w-0">
                            <StatCard label={<span>งาน<span className="hidden sm:inline">ทั้งหมด</span></span>} value={stats.activeJobs} sub="งาน" color="orange" />
                        </div>
                        <div className="min-w-[75px] flex-1 sm:min-w-0">
                            <StatCard label={<span>งานที่<span className="hidden sm:inline">เสร็จสิ้น</span></span>} value={stats.completedJobs} sub="งาน" color="purple" />
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-2 sm:p-6 min-h-[400px] sm:min-h-[600px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && <OverviewTab techs={techs} jobs={jobs} />}
                            {activeTab === 'trips' && <TripHistory />}
                            {activeTab === 'technicians' && (
                                <TechnicianList
                                    techs={techs}
                                    onManage={handleManageTech}
                                    searchTerm={userSearch}
                                    setSearchTerm={setUserSearch}
                                    type="technician"
                                />
                            )}
                            {activeTab === 'users' && (
                                <TechnicianList
                                    techs={users}
                                    onManage={handleManageTech}
                                    searchTerm={userSearch}
                                    setSearchTerm={setUserSearch}
                                    type="user"
                                />
                            )}
                            {activeTab === 'jobs' && (
                                <JobList
                                    jobs={jobs}
                                    searchTerm={jobSearch}
                                    setSearchTerm={setJobSearch}
                                />
                            )}
                            {activeTab === 'map' && <AdminMap techs={techs} />}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
