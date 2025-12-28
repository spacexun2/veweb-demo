import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const token = localStorage.getItem('demo_token');

    if (!token) {
        // 未登录，跳转到登录页
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};
