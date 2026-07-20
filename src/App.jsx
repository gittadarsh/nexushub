import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RequireStudent, RequireClubAdmin, RequireAuth } from './components/RouteGuards';

import Home from './pages/Home';
import Login from './pages/auth/Login';
import StudentSignup from './pages/auth/StudentSignup';
import ClubSignup from './pages/auth/ClubSignup';
import PendingApproval from './pages/club/PendingApproval';
import ClubDashboard from './pages/club/ClubDashboard';
import PostEvent from './pages/club/PostEvent';
import ClubEventView from './pages/club/ClubEventView';
import ClubPaymentQueue from './pages/club/ClubPaymentQueue';
import ClubDoubts from './pages/club/ClubDoubts';
import EventDetail from './pages/student/EventDetail';
import TeamFinder from './pages/student/TeamFinder';
import ExploreSearch from './pages/student/ExploreSearch';
import Subscriptions from './pages/student/Subscriptions';
import MyDoubts from './pages/student/MyDoubts';
import AdminClubApprovals from './pages/admin/AdminClubApprovals';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/explore" element={<RequireStudent><ExploreSearch /></RequireStudent>} />
          <Route path="/subscriptions" element={<RequireStudent><Subscriptions /></RequireStudent>} />
          <Route path="/my-doubts" element={<RequireStudent><MyDoubts /></RequireStudent>} />
          <Route path="/events/:eventId" element={<RequireStudent><EventDetail /></RequireStudent>} />
          <Route path="/events/:eventId/team-finder" element={<RequireStudent><TeamFinder /></RequireStudent>} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<StudentSignup />} />
          <Route path="/club/signup" element={<ClubSignup />} />
          <Route path="/club/pending" element={<PendingApproval />} />

          <Route path="/club/dashboard" element={<RequireClubAdmin><ClubDashboard /></RequireClubAdmin>} />
          <Route path="/club/post-event" element={<RequireClubAdmin><PostEvent /></RequireClubAdmin>} />
          <Route path="/club/events/:eventId" element={<RequireClubAdmin><ClubEventView /></RequireClubAdmin>} />
          <Route path="/club/events/:eventId/payments" element={<RequireClubAdmin><ClubPaymentQueue /></RequireClubAdmin>} />
          <Route path="/club/doubts" element={<RequireClubAdmin><ClubDoubts /></RequireClubAdmin>} />

          <Route path="/admin/clubs" element={<RequireAuth><AdminClubApprovals /></RequireAuth>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
