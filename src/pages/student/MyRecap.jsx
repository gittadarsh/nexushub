import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Rss, Heart, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import { listRegistrationsForStudent } from '../../services/registrations';
import { getEventsByIds } from '../../services/events';
import { getClubsByIds } from '../../services/clubs';
import { listMyPosts } from '../../services/teamFinder';
import StudentNav from '../../components/StudentNav';

/**
 * Deliberately scoped to what the schema can actually back up — no
 * "events you attended" (only registration is tracked, not check-in;
 * QR attendance is still unbuilt), no "this semester" framing (there's
 * no date-range concept anywhere in the data), so this is all-time
 * since signup instead. Everything shown here is a real, direct count.
 */
export default function MyRecap() {
  const { firebaseUser } = useAuth();
  const { studentProfile } = useStudentProfile();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const [eventsById, setEventsById] = useState({});
  const [clubsById, setClubsById] = useState({});
  const [teamFinderCount, setTeamFinderCount] = useState(0);

  useEffect(() => {
    if (!firebaseUser || !studentProfile) return;
    (async () => {
      const regs = await listRegistrationsForStudent(firebaseUser.uid);
      setRegistrations(regs);

      const likedIds = studentProfile.likedEvents || [];
      const allEventIds = [...regs.map((r) => r.eventId), ...likedIds];
      const [eventsMap, clubsMap, myPosts] = await Promise.all([
        getEventsByIds(allEventIds),
        getClubsByIds(studentProfile.subscribedClubs || []),
        listMyPosts(firebaseUser.uid)
      ]);
      setEventsById(eventsMap);
      setClubsById(clubsMap);
      setTeamFinderCount(myPosts.length);
      setLoading(false);
    })();
  }, [firebaseUser, studentProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <StudentNav />
        <div className="max-w-2xl mx-auto p-6 text-muted">Loading…</div>
      </div>
    );
  }

  const likedEvents = (studentProfile.likedEvents || []).map((id) => eventsById[id]).filter(Boolean);
  const subscribedClubs = Object.values(clubsById);

  return (
    <div className="min-h-screen bg-paper">
      <StudentNav />
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-signal font-semibold text-sm uppercase tracking-wide mb-2">Your activity</p>
        <h1 className="font-display text-3xl mb-1">My time on NexusHub</h1>
        <p className="text-muted mb-8">Everything you've done here since you signed up — not just this semester.</p>

        <Link to="/profile" className="text-sm text-muted underline mb-6 inline-block">← Back to profile</Link>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="card p-4 text-center">
            <p className="font-display text-3xl">{registrations.length}</p>
            <p className="text-xs text-muted mt-1">Events registered for</p>
          </div>
          <div className="card p-4 text-center">
            <p className="font-display text-3xl">{subscribedClubs.length}</p>
            <p className="text-xs text-muted mt-1">Clubs subscribed to</p>
          </div>
          <div className="card p-4 text-center">
            <p className="font-display text-3xl">{likedEvents.length}</p>
            <p className="text-xs text-muted mt-1">Events liked</p>
          </div>
          <div className="card p-4 text-center">
            <p className="font-display text-3xl">{teamFinderCount}</p>
            <p className="text-xs text-muted mt-1">Team-finder cards posted</p>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="font-semibold text-sm flex items-center gap-1.5 mb-2"><CalendarCheck size={15} /> Events you registered for</h2>
            {registrations.length === 0 ? (
              <p className="text-sm text-muted">Nothing yet.</p>
            ) : (
              <ul className="space-y-1">
                {registrations.map((r) => (
                  <li key={r.id} className="text-sm border-b border-line pb-1.5">
                    {eventsById[r.eventId]?.title || 'An event'}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-semibold text-sm flex items-center gap-1.5 mb-2"><Rss size={15} /> Clubs you're subscribed to</h2>
            {subscribedClubs.length === 0 ? (
              <p className="text-sm text-muted">Nothing yet.</p>
            ) : (
              <ul className="space-y-1">
                {subscribedClubs.map((c) => (
                  <li key={c.id} className="text-sm border-b border-line pb-1.5">{c.name}</li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-semibold text-sm flex items-center gap-1.5 mb-2"><Heart size={15} /> Events you liked</h2>
            {likedEvents.length === 0 ? (
              <p className="text-sm text-muted">Nothing yet.</p>
            ) : (
              <ul className="space-y-1">
                {likedEvents.map((e) => (
                  <li key={e.id} className="text-sm border-b border-line pb-1.5">{e.title}</li>
                ))}
              </ul>
            )}
          </section>

          {teamFinderCount > 0 && (
            <section>
              <h2 className="font-semibold text-sm flex items-center gap-1.5 mb-2"><Users size={15} /> Team-finder activity</h2>
              <p className="text-sm text-muted">
                You've posted {teamFinderCount} team-finder card{teamFinderCount === 1 ? '' : 's'} looking for or offering a spot on a team.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
