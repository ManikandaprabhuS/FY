import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const AdminOnlyRoute: React.FC = () => {
  const { user } = useAuth();

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/admin/overview" replace />;
  }

  return <Outlet />;
};

export default AdminOnlyRoute;
