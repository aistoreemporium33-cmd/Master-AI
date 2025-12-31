
export type Role = 'user' | 'assistant';
export type UserStatus = 'Online' | 'Busy';
export type TaskStatus = 'To-Do' | 'In Progress' | 'Done';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizData {
  questions: QuizQuestion[];
}

export interface SuggestedAction {
  label: string;
  prompt: string;
  icon: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  imageUrl?: string;
  videoUrl?: string;
  quiz?: QuizData;
  isBroadcasted?: boolean;
  suggestions?: SuggestedAction[];
}

export interface QuickTool {
  id: string;
  title: string;
  description: string;
  icon: string;
  prompt: string;
}

export interface StudySession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

export interface CrewMember {
  id: string;
  name: string;
  status: UserStatus;
  avatarColor: string;
  reputation: number;
}

export interface SharedMission {
  id: string;
  creator: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timestamp: Date;
}

export interface CrewTask {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  status: TaskStatus;
  timestamp: Date;
}
