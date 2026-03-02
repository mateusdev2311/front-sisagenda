import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
    return (
        <div className="auth-layout">
            {/* We can inject universal login headers here if needed */}
            <Outlet />
        </div>
    );
};

export default AuthLayout;
