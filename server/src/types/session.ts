export interface Session {
  id: string;
  studentId: string;
  persona: string;
  startTime: Date;
  active: boolean;
  connectedFaculty: string[];
}

export interface Message {
  type: 'student' | 'ai' | 'faculty';
  content: string;
  timestamp: Date;
  sessionId: string;
  senderId: string; // Can be studentId or facultyId
} 