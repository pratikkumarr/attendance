import {
  UserDetails,
  DashboardAttendance,
  RegisteredCourse,
  TimetableEvent,
  Lecture,
  ExamSchedule,
  ExamScoreResponse,
} from '@/types/bunkbook'

export const DEMO_USER_DETAILS: UserDetails = {
  fullName: 'Pratik Kumar',
  registrationNumber: '2100290120145',
  rollNumber: '2100290120145',
  branchShortName: 'CSE',
  degreeName: 'B.Tech - Computer Science & Engineering',
  semesterName: 'Semester 5',
  admissionBatchName: '2022-2026',
  studentId: 10482,
  profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
}

export const DEMO_DASHBOARD_ATTENDANCE: DashboardAttendance = {
  presentPerc: 81.4,
  absentPerc: 18.6,
}

export const DEMO_REGISTERED_COURSES: RegisteredCourse[] = [
  {
    studentId: 10482,
    courseId: 501,
    courseCode: 'KCS501',
    courseName: 'Database Management Systems',
    studentCourseCompDetails: [
      {
        courseCompId: 1001,
        courseCompFacultyName: 'Dr. R. K. Sharma',
        presentLecture: 26,
        totalLecture: 30,
      },
    ],
  },
  {
    studentId: 10482,
    courseId: 502,
    courseCode: 'KCS502',
    courseName: 'Compiler Design',
    studentCourseCompDetails: [
      {
        courseCompId: 1002,
        courseCompFacultyName: 'Prof. Anjali Verma',
        presentLecture: 21,
        totalLecture: 28,
      },
    ],
  },
  {
    studentId: 10482,
    courseId: 503,
    courseCode: 'KCS503',
    courseName: 'Design and Analysis of Algorithms',
    studentCourseCompDetails: [
      {
        courseCompId: 1003,
        courseCompFacultyName: 'Dr. Manish Gupta',
        presentLecture: 22,
        totalLecture: 25,
      },
    ],
  },
  {
    studentId: 10482,
    courseId: 504,
    courseCode: 'KIT051',
    courseName: 'Web Technology',
    studentCourseCompDetails: [
      {
        courseCompId: 1004,
        courseCompFacultyName: 'Prof. Neha Singh',
        presentLecture: 23,
        totalLecture: 26,
      },
    ],
  },
  {
    studentId: 10482,
    courseId: 505,
    courseCode: 'KNC501',
    courseName: 'Constitution of India, Law & Engineering',
    studentCourseCompDetails: [
      {
        courseCompId: 1005,
        courseCompFacultyName: 'Dr. Vivek Mishra',
        presentLecture: 16,
        totalLecture: 20,
      },
    ],
  },
  {
    studentId: 10482,
    courseId: 506,
    courseCode: 'KCS551',
    courseName: 'DBMS Lab',
    studentCourseCompDetails: [
      {
        courseCompId: 1006,
        courseCompFacultyName: 'Dr. R. K. Sharma / Er. Priya',
        presentLecture: 8,
        totalLecture: 9,
      },
    ],
  },
  {
    studentId: 10482,
    courseId: 507,
    courseCode: 'KCS552',
    courseName: 'DAA Lab',
    studentCourseCompDetails: [
      {
        courseCompId: 1007,
        courseCompFacultyName: 'Dr. Manish Gupta',
        presentLecture: 8,
        totalLecture: 9,
      },
    ],
  },
  {
    studentId: 10482,
    courseId: 508,
    courseCode: 'KCS553',
    courseName: 'Mini Project Lab',
    studentCourseCompDetails: [
      {
        courseCompId: 1008,
        courseCompFacultyName: 'Department Faculty Committee',
        presentLecture: 7,
        totalLecture: 8,
      },
    ],
  },
]

const formatDemoDate = (offsetDays: number): string => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayStr = formatDemoDate(0)
const yesterdayStr = formatDemoDate(-1)
const twoDaysAgoStr = formatDemoDate(-2)
const threeDaysAgoStr = formatDemoDate(-3)

export const DEMO_LECTURES: Record<number, Lecture[]> = {
  501: [
    { planLecDate: todayStr, topicCovered: 'Transaction Management & ACID Properties', attendance: 'PRESENT', timeSlot: '09:10 - 10:00 AM' },
    { planLecDate: yesterdayStr, topicCovered: 'Concurrency Control Protocols (2PL, Timestamp)', attendance: 'PRESENT', timeSlot: '09:10 - 10:00 AM' },
    { planLecDate: twoDaysAgoStr, topicCovered: 'Deadlock Handling & Wait-for Graphs', attendance: 'PRESENT', timeSlot: '09:10 - 10:00 AM' },
    { planLecDate: threeDaysAgoStr, topicCovered: 'Query Optimization & Cost Evaluation', attendance: 'ABSENT', timeSlot: '09:10 - 10:00 AM' },
    { planLecDate: '2026-10-31', topicCovered: 'Transaction Management & ACID Properties', attendance: 'PRESENT', timeSlot: '09:10 - 10:00 AM' },
    { planLecDate: '2026-10-29', topicCovered: 'Concurrency Control Protocols (2PL, Timestamp)', attendance: 'PRESENT', timeSlot: '11:00 - 11:50 AM' },
    { planLecDate: '2026-10-27', topicCovered: 'Deadlock Handling & Wait-for Graphs', attendance: 'ABSENT', timeSlot: '09:10 - 10:00 AM' },
    { planLecDate: '2026-10-24', topicCovered: 'Query Optimization & Cost Evaluation', attendance: 'PRESENT', timeSlot: '02:00 - 02:50 PM' },
    { planLecDate: '2026-10-22', topicCovered: 'Relational Algebra and Calculus Operations', attendance: 'PRESENT', timeSlot: '09:10 - 10:00 AM' },
    { planLecDate: '2026-10-20', topicCovered: 'Normalization: 1NF, 2NF, 3NF, BCNF', attendance: 'PRESENT', timeSlot: '10:05 - 10:55 AM' },
    { planLecDate: '2026-10-18', topicCovered: 'Functional Dependencies and Lossless Join', attendance: 'ABSENT', timeSlot: '09:10 - 10:00 AM' },
    { planLecDate: '2026-10-15', topicCovered: 'Entity Relationship Modeling and ER-to-Relational', attendance: 'PRESENT', timeSlot: '11:00 - 11:50 AM' },
  ],
  502: [
    { planLecDate: todayStr, topicCovered: 'LR(1) and LALR(1) Parsing Table Construction', attendance: 'PRESENT', timeSlot: '10:05 - 10:55 AM' },
    { planLecDate: yesterdayStr, topicCovered: 'Shift-Reduce Conflicts and Operator Precedence', attendance: 'ABSENT', timeSlot: '10:05 - 10:55 AM' },
    { planLecDate: twoDaysAgoStr, topicCovered: 'Syntax Directed Translation Schemes', attendance: 'PRESENT', timeSlot: '10:05 - 10:55 AM' },
    { planLecDate: '2026-10-31', topicCovered: 'LR(1) and LALR(1) Parsing Table Construction', attendance: 'PRESENT', timeSlot: '10:05 - 10:55 AM' },
    { planLecDate: '2026-10-28', topicCovered: 'Shift-Reduce Conflicts and Operator Precedence', attendance: 'ABSENT', timeSlot: '01:05 - 01:55 PM' },
    { planLecDate: '2026-10-26', topicCovered: 'Syntax Directed Translation Schemes', attendance: 'PRESENT', timeSlot: '10:05 - 10:55 AM' },
    { planLecDate: '2026-10-23', topicCovered: 'Intermediate Code Generation (Three-Address Code)', attendance: 'ABSENT', timeSlot: '09:10 - 10:00 AM' },
    { planLecDate: '2026-10-21', topicCovered: 'Lexical Analysis with Lex/Flex tools', attendance: 'PRESENT', timeSlot: '11:00 - 11:50 AM' },
  ],
  503: [
    { planLecDate: todayStr, topicCovered: 'Dynamic Programming: 0/1 Knapsack & LCS', attendance: 'PRESENT', timeSlot: '11:00 - 11:50 AM' },
    { planLecDate: yesterdayStr, topicCovered: 'Greedy Strategy: Huffman Coding & Spanning Trees', attendance: 'PRESENT', timeSlot: '11:00 - 11:50 AM' },
    { planLecDate: twoDaysAgoStr, topicCovered: 'Divide and Conquer: Strassen Matrix Multiplication', attendance: 'PRESENT', timeSlot: '11:00 - 11:50 AM' },
    { planLecDate: '2026-10-30', topicCovered: 'Dynamic Programming: 0/1 Knapsack & LCS', attendance: 'PRESENT', timeSlot: '11:00 - 11:50 AM' },
    { planLecDate: '2026-10-28', topicCovered: 'Greedy Strategy: Huffman Coding & Spanning Trees', attendance: 'PRESENT', timeSlot: '02:00 - 02:50 PM' },
    { planLecDate: '2026-10-25', topicCovered: 'Divide and Conquer: Strassen Matrix Multiplication', attendance: 'PRESENT', timeSlot: '11:00 - 11:50 AM' },
    { planLecDate: '2026-10-21', topicCovered: 'Asymptotic Notations (Big-O, Omega, Theta)', attendance: 'ABSENT', timeSlot: '01:05 - 01:55 PM' },
  ],
  504: [
    { planLecDate: todayStr, topicCovered: 'Modern Web Architecture & REST APIs', attendance: 'ABSENT', timeSlot: '01:05 - 01:55 PM' },
    { planLecDate: yesterdayStr, topicCovered: 'DOM Manipulation and React Virtual DOM', attendance: 'PRESENT', timeSlot: '01:05 - 01:55 PM' },
    { planLecDate: twoDaysAgoStr, topicCovered: 'State Management and Component Lifecycle', attendance: 'PRESENT', timeSlot: '01:05 - 01:55 PM' },
    { planLecDate: '2026-10-31', topicCovered: 'Responsive CSS Grid & Flexbox Systems', attendance: 'PRESENT', timeSlot: '01:05 - 01:55 PM' },
    { planLecDate: '2026-10-28', topicCovered: 'ES6+ JavaScript Promises & Async/Await', attendance: 'ABSENT', timeSlot: '01:05 - 01:55 PM' },
  ],
  505: [
    { planLecDate: todayStr, topicCovered: 'Preamble, Fundamental Rights and Duties', attendance: 'PRESENT', timeSlot: '02:00 - 02:50 PM' },
    { planLecDate: yesterdayStr, topicCovered: 'Directive Principles of State Policy', attendance: 'PRESENT', timeSlot: '02:00 - 02:50 PM' },
    { planLecDate: twoDaysAgoStr, topicCovered: 'Intellectual Property Rights for Engineers', attendance: 'PRESENT', timeSlot: '02:00 - 02:50 PM' },
    { planLecDate: '2026-10-30', topicCovered: 'Cyber Law and IT Act Provisions', attendance: 'PRESENT', timeSlot: '02:00 - 02:50 PM' },
    { planLecDate: '2026-10-27', topicCovered: 'Professional Ethics in Engineering Practice', attendance: 'ABSENT', timeSlot: '02:00 - 02:50 PM' },
  ],
}

// Generate weekly schedule relative to current date
export const getDemoWeeklySchedule = (): TimetableEvent[] => {
  const events: TimetableEvent[] = []
  const today = new Date()

  // Days: 0 (Sun) to 6 (Sat)
  // Let's create classes for weekdays
  const periods = [
    { start: '09:10:00', end: '10:00:00', code: 'KCS501', name: 'Database Management Systems', faculty: 'Dr. R. K. Sharma' },
    { start: '10:05:00', end: '10:55:00', code: 'KCS502', name: 'Compiler Design', faculty: 'Prof. Anjali Verma' },
    { start: '11:00:00', end: '11:50:00', code: 'KCS503', name: 'Design & Analysis of Algorithms', faculty: 'Dr. Manish Gupta' },
    { start: '13:05:00', end: '13:55:00', code: 'KIT051', name: 'Web Technology', faculty: 'Prof. Neha Singh' },
    { start: '14:00:00', end: '14:50:00', code: 'KNC501', name: 'Constitution of India', faculty: 'Dr. Vivek Mishra' },
  ]

  for (let offset = -2; offset <= 5; offset++) {
    const d = new Date(today)
    d.setDate(today.getDate() + offset)
    const dayOfWeek = d.getDay()

    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${day}`

    if (dayOfWeek === 0) {
      // Sunday Holiday
      events.push({
        type: 'HOLIDAY',
        start: `${dateStr} 00:00:00`,
        end: `${dateStr} 23:59:59`,
        courseName: 'Sunday Holiday',
        facultyName: null,
        classRoom: null,
        courseCode: null,
        title: 'Weekly Holiday',
        content: 'No classes on Sunday. Take rest!',
      })
      continue
    }

    if (dayOfWeek === 6) {
      // Saturday Labs
      events.push({
        type: 'CLASS',
        start: `${dateStr} 09:10:00`,
        end: `${dateStr} 11:50:00`,
        courseName: 'DBMS Lab (Batch A) / DAA Lab (Batch B)',
        facultyName: 'Dr. R. K. Sharma',
        classRoom: null,
        courseCode: 'KCS551',
        title: 'Laboratory Session',
        content: 'Practical experimentation and query execution',
      })
      continue
    }

    // Normal Weekdays
    periods.forEach((p) => {
      events.push({
        type: 'CLASS',
        start: `${dateStr} ${p.start}`,
        end: `${dateStr} ${p.end}`,
        courseName: p.name,
        facultyName: p.faculty,
        classRoom: null,
        courseCode: p.code,
        title: p.name,
        content: 'Regular lecture session',
      })
    })
  }

  return events
}

export const DEMO_EXAM_SCHEDULE: ExamSchedule[] = [
  {
    strExamDate: '2026-11-20',
    courseName: 'Database Management Systems',
    evalLevelComponentName: 'Pre-University Examination (PUE)',
    courseCode: 'KCS501',
    strExamTime: '09:30 AM - 12:30 PM',
    examMode: 'OFFLINE / WRITTEN',
    examVenueName: 'Auditorium Hall C-102',
    courseComponentName: 'THEORY',
  },
  {
    strExamDate: '2026-11-22',
    courseName: 'Compiler Design',
    evalLevelComponentName: 'Pre-University Examination (PUE)',
    courseCode: 'KCS502',
    strExamTime: '09:30 AM - 12:30 PM',
    examMode: 'OFFLINE / WRITTEN',
    examVenueName: 'Auditorium Hall C-102',
    courseComponentName: 'THEORY',
  },
  {
    strExamDate: '2026-11-24',
    courseName: 'Design and Analysis of Algorithms',
    evalLevelComponentName: 'Pre-University Examination (PUE)',
    courseCode: 'KCS503',
    strExamTime: '09:30 AM - 12:30 PM',
    examMode: 'OFFLINE / WRITTEN',
    examVenueName: 'Auditorium Hall C-102',
    courseComponentName: 'THEORY',
  },
  {
    strExamDate: '2026-11-26',
    courseName: 'Web Technology',
    evalLevelComponentName: 'Pre-University Examination (PUE)',
    courseCode: 'KIT051',
    strExamTime: '09:30 AM - 12:30 PM',
    examMode: 'OFFLINE / WRITTEN',
    examVenueName: 'Block B Room 301',
    courseComponentName: 'THEORY',
  },
  {
    strExamDate: '2026-11-28',
    courseName: 'Constitution of India, Law & Engineering',
    evalLevelComponentName: 'Pre-University Examination (PUE)',
    courseCode: 'KNC501',
    strExamTime: '02:00 PM - 04:00 PM',
    examMode: 'OFFLINE / MCQ',
    examVenueName: 'Block B Room 301',
    courseComponentName: 'THEORY',
  },
]

export const DEMO_EXAM_SCORES: ExamScoreResponse = {
  cgpa: 8.54,
  fullName: 'Pratik Kumar',
  enrollmentNo: '2100290120145',
  studentSemesterWiseMarksDetailsList: [
    {
      semesterName: 'Semester 4',
      sgpa: 8.72,
      studentMarksDetailsDTO: [
        {
          courseCode: 'KCS401',
          courseName: 'Operating Systems',
          resultSort: 'PASS',
          courseCompDTOList: [{ courseCompName: 'THEORY', compSessionLevelMarks: [{ grade: 'A+', result: 'PASS', compCredits: 4, compEgp: 36 }] }],
        },
        {
          courseCode: 'KCS402',
          courseName: 'Theory of Automata & Formal Languages',
          resultSort: 'PASS',
          courseCompDTOList: [{ courseCompName: 'THEORY', compSessionLevelMarks: [{ grade: 'A', result: 'PASS', compCredits: 4, compEgp: 32 }] }],
        },
        {
          courseCode: 'KCS403',
          courseName: 'Microprocessor',
          resultSort: 'PASS',
          courseCompDTOList: [{ courseCompName: 'THEORY', compSessionLevelMarks: [{ grade: 'A', result: 'PASS', compCredits: 3, compEgp: 24 }] }],
        },
      ],
    },
    {
      semesterName: 'Semester 3',
      sgpa: 8.36,
      studentMarksDetailsDTO: [
        {
          courseCode: 'KCS301',
          courseName: 'Data Structures',
          resultSort: 'PASS',
          courseCompDTOList: [{ courseCompName: 'THEORY', compSessionLevelMarks: [{ grade: 'A+', result: 'PASS', compCredits: 4, compEgp: 36 }] }],
        },
        {
          courseCode: 'KCS302',
          courseName: 'Computer Organization & Architecture',
          resultSort: 'PASS',
          courseCompDTOList: [{ courseCompName: 'THEORY', compSessionLevelMarks: [{ grade: 'B+', result: 'PASS', compCredits: 4, compEgp: 28 }] }],
        },
        {
          courseCode: 'KCS303',
          courseName: 'Discrete Mathematics',
          resultSort: 'PASS',
          courseCompDTOList: [{ courseCompName: 'THEORY', compSessionLevelMarks: [{ grade: 'A', result: 'PASS', compCredits: 4, compEgp: 32 }] }],
        },
      ],
    },
  ],
}
