// Turns an audit-log row into a short human sentence.
const RESOURCE_WORD = {
  events: 'event', students: 'student', categories: 'category', venues: 'venue', organizers: 'organizer',
  registrations: 'registration', attendance: 'attendance', feedback: 'feedback', users: 'user',
}
export function describeActivity(a) {
  if (a.action === 'login') return <><b>{a.userName}</b> signed in</>
  if (a.resource === 'users' && a.label.endsWith('signed up')) return <><b>{a.label}</b></>
  return <><b>{a.userName}</b> {a.action} {RESOURCE_WORD[a.resource] || a.resource} <em>{a.label}</em></>
}

