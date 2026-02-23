export interface TrainingRecord {
  id: string;
  employeeName: string;
  department: string;
  courseName: string;
  status: 'Completado' | 'En Progreso' | 'No Iniciado' | 'Reprobado'; // Calculated status logic (kept for fallback/color)
  courseCompletedRaw: string; // "Si", "No", etc. from "Curso completado"
  certificateObtained: string; // "Si", "No" from "Certificado obtenido"
  score: number;
  progress: number;
  dateAssigned: string;
  completionDate?: string;
  reproductionHours: number; // Raw "Horas de Reproducción"
}

export interface EvaluationRecord {
  userName: string;
  email: string;
  attempts: number;
  firstAttemptDate: string;
  lastAttemptDate: string;
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  score: number; // Best attempt
  status: string; // Best attempt
  durationStr: string;
  courseName: string;
}

export interface QuestionRecord {
  userName: string;
  email: string;
  question: string;
  userAnswer: string;
  status: 'Correcta' | 'Incorrecta' | 'Desconocido';
  courseName: string;
}

export interface SurveyRecord {
  email: string;
  courseName: string;
  surveyId: string;
  questionId: string;
  question: string;
  answer: string;
}

export interface MultipleChoiceRecord {
  email: string;
  courseName: string;
  surveyId: string;
  questionId: string;
  question: string;
  choice: string;
}

export interface EvaluationMetrics {
  totalEvaluations: number;
  avgAttempts: number;
  avgScore: number;
  passRate: number;
  globalAccuracy: { correct: number; incorrect: number };
  passDistribution: { name: string; value: number; color: string }[];
  attemptsDistribution: { attempts: string; count: number }[];
  topPerformers: { name: string; score: number; course: string }[];
}

export interface QuestionMetrics {
  totalQuestionsAnswered: number;
  hardestQuestions: {
    question: string;
    course: string;
    failureRate: number;
    incorrectCount: number;
    totalAttempts: number
  }[];
}

export interface SurveyMetrics {
  totalResponses: number;
  uniqueRespondents: number;
  responsesByCourse: { name: string; count: number }[];
  groupedQuestions: {
    question: string;
    course: string;
    answers: string[];
  }[];
  topWords: { text: string; value: number }[];
}

export interface MultipleChoiceMetrics {
  totalResponses: number;
  uniqueRespondents: number;
  questionsAnalysis: {
    question: string;
    course: string;
    totalAnswers: number;
    distribution: { name: string; value: number }[];
  }[];
}

export interface DashboardMetrics {
  totalEmployees: number;
  completionRate: number; // Avg of % Progress
  averageTrainingHours: number; // Avg of "Horas de Reproducción"
  certificatesIssued: number; // Count of "Si"

  // Charts Data
  completionDistribution: { name: string; value: number; color: string }[]; // Yes/No Completed
  certificateDistribution: { name: string; value: number; color: string }[]; // Yes/No Cert

  departmentPerformance: { name: string; avgScore: number; completionRate: number }[];
  topCourses: { name: string; students: number }[];
  monthlyProgress: { month: string; completed: number }[];
  primaryCourseName: string;

  evaluationMetrics?: EvaluationMetrics;
  questionMetrics?: QuestionMetrics;
  surveyMetrics?: SurveyMetrics;
  multipleChoiceMetrics?: MultipleChoiceMetrics;
}

export interface AIInsight {
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info';
}