import { Routes, Route } from "react-router-dom";
import "./App.css";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Pages
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Floors from "./pages/Floors";
import Rooms from "./pages/Rooms";
import Beds from "./pages/Beds";
import Tenants from "./pages/Tenants";
import Stays from "./pages/Stays";
import RentDue from "./pages/RentDue";
import Payments from "./pages/Payments";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Tenant Pages
import TenantLogin from "./pages/TenantLogin";
import TenantDashboard from "./pages/TenantDashboard";
import TenantRentDues from "./pages/TenantRentDues";
import TenantPayments from "./pages/TenantPayments";
import TenantProfile from "./pages/TenantProfile";
import TenantProtectedRoute from "./components/TenantProtectedRoute";
import TenantLayout from "./components/TenantLayout";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="properties" element={<Properties />} />
        <Route path="floors" element={<Floors />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="beds" element={<Beds />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="stays" element={<Stays />} />
        <Route path="rent-dues" element={<RentDue />} />
        <Route path="payments" element={<Payments />} />
      </Route>

      {/* Tenant Routes */}
      <Route path="/tenant/login" element={<TenantLogin />} />
      <Route path="/tenant" element={
        <TenantProtectedRoute>
          <TenantLayout />
        </TenantProtectedRoute>
      }>
        <Route index element={<TenantDashboard />} />
        <Route path="rent" element={<TenantRentDues />} />
        <Route path="payments" element={<TenantPayments />} />
        <Route path="profile" element={<TenantProfile />} />
      </Route>
    </Routes>
  );
}

export default App;