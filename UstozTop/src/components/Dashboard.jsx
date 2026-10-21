import RoleDashboard from '../role/RoleDashboard.jsx'
import StudentDashboard from '../student/StudentDashboard.jsx'

// Rolga mos dashboard: STUDENT -> /student/dashboard, TEACHER va ADMIN -> role panel.
function Dashboard(props) {
  return props.user.role === 'STUDENT' ? <StudentDashboard {...props} /> : <RoleDashboard {...props} />
}

export default Dashboard
