import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { Toaster } from 'react-hot-toast';

const DashboardLayout = () => {
    const token = localStorage.getItem('token');

    if (!token) {
        return <Navigate to="/" />;
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
            <Toaster position="top-right" />
            <Sidebar />
            <div className="flex flex-col flex-1 w-full overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
