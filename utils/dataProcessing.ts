import { TrainingRecord, EvaluationRecord, QuestionRecord, SurveyRecord, MultipleChoiceRecord, DashboardMetrics, EvaluationMetrics, QuestionMetrics, SurveyMetrics, MultipleChoiceMetrics } from "../types";

declare global {
  interface Window {
    XLSX: any;
  }
}

export interface ProcessedData {
  training: TrainingRecord[];
  evaluations: EvaluationRecord[];
  questions: QuestionRecord[];
  surveys: SurveyRecord[];
  multipleChoice: MultipleChoiceRecord[];
}

// Helper to find a value in a row by testing multiple possible keys (case-insensitive & trimmed)
const getValue = (row: any, ...keys: string[]): any => {
  if (!row) return undefined;
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
    if (foundKey !== undefined) return row[foundKey];
  }
  return undefined;
};

// Helper to find the header row (skipping potential metadata rows) and convert to JSON
const getJsonWithHeaders = (sheet: any): any[] => {
  const rawRows: any[][] = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (rawRows.length === 0) return [];

  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const row = rawRows[i];
    if (row && Array.isArray(row) && row.some(cell => {
      const val = String(cell || '').toLowerCase();
      return val.includes('usuario') || val.includes('nombre') || val.includes('email') || val.includes('pregunta') || val.includes('respuesta') || val.includes('%');
    })) {
      headerRowIndex = i;
      break;
    }
  }

  return window.XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });
};

export const processExcelFile = async (file: File): Promise<ProcessedData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!window.XLSX) {
          reject(new Error("XLSX library not loaded"));
          return;
        }
        // cellDates: true ensures dates are parsed as JS Date objects correctly
        const workbook = window.XLSX.read(data, { type: 'binary', cellDates: true });

        // --- 1. Process "Curso" Sheet ---
        const sheetNameCurso = workbook.SheetNames.find((n: string) => n.toLowerCase().trim().includes('curso')) || workbook.SheetNames[0];
        const sheetCurso = workbook.Sheets[sheetNameCurso];
        const jsonCurso = getJsonWithHeaders(sheetCurso);

        const trainingRecords: TrainingRecord[] = jsonCurso.map((row: any, index: number) => {
          // Progress Parsing
          let progressVal = 0;
          const rawProgress = getValue(row, '% de Progreso del Curso', 'Progreso', '% Progreso');
          if (typeof rawProgress === 'number') {
            progressVal = rawProgress;
          } else if (typeof rawProgress === 'string') {
            progressVal = parseFloat(rawProgress.replace('%', '').trim()) || 0;
          }

          // Hours Parsing (Horas de Reproducción)
          let hoursVal = 0;
          const rawHours = getValue(row, 'Horas de Reproducción', 'Duración Curso', 'Duración');
          if (typeof rawHours === 'number') {
            hoursVal = rawHours;
          } else if (typeof rawHours === 'string') {
            hoursVal = parseDuration(rawHours);
          }

          // Status & Certificate Raw
          const completedVal = String(getValue(row, 'Curso completado', 'Completado') || 'No').trim();
          const certVal = String(getValue(row, 'Certificado obtenido', 'Certificado') || 'No').trim();

          // Derived Status for internal logic/color coding if needed
          let status: TrainingRecord['status'] = 'No Iniciado';
          if (['si', 'yes', 'completado', 'aprobado'].includes(completedVal.toLowerCase())) {
            status = 'Completado';
          } else if (progressVal > 0) {
            status = 'En Progreso';
          } else {
            const stateVal = String(getValue(row, 'Estado Curso', 'Estado') || '').toLowerCase();
            if (stateVal.includes('reprobado') || stateVal.includes('fail')) {
              status = 'Reprobado';
            } else {
              status = 'No Iniciado';
            }
          }

          let department = getValue(row, 'Info extra', 'País', 'Departamento');
          if (!department || String(department).trim() === '') {
            department = 'General';
          }

          let score = 0;
          const rawScore = getValue(row, 'Estado evaluación - Mejor intento', 'Puntaje', 'Nota');
          if (typeof rawScore === 'number') {
            score = rawScore;
          } else if (typeof rawScore === 'string') {
            const clean = rawScore.replace('%', '').split('/')[0];
            score = parseFloat(clean) || 0;
          }

          return {
            id: String(getValue(row, 'ID Curso', 'ID') || `row-${index}`),
            employeeName: getValue(row, 'Usuario', 'Nombre', 'Email') || 'Desconocido',
            department: String(department),
            courseName: getValue(row, 'Curso', 'Nombre del curso') || 'Curso General',
            status: status,
            courseCompletedRaw: completedVal,
            certificateObtained: certVal,
            score: score,
            progress: progressVal,
            dateAssigned: formatDate(getValue(row, 'Fecha de inscripción', 'Fecha')),
            completionDate: formatDate(getValue(row, 'Fecha de Completitud', 'F. Completitud')),
            reproductionHours: hoursVal
          };
        });

        // --- 2. Process "Resultados Ev. final" Sheet ---
        let evaluationRecords: EvaluationRecord[] = [];
        const sheetNameEv = workbook.SheetNames.find((n: string) => n.toLowerCase().includes('resultados') || n.toLowerCase().includes('ev'));

        if (sheetNameEv) {
          const sheetEv = workbook.Sheets[sheetNameEv];
          const jsonEv = getJsonWithHeaders(sheetEv);

          evaluationRecords = jsonEv.map((row: any) => ({
            userName: getValue(row, 'Usuario', 'Nombre') || 'Anon',
            email: getValue(row, 'Email', 'Correo') || '',
            attempts: parseInt(getValue(row, 'Cantidad de intentos rendidos', 'Intentos') || '1', 10),
            firstAttemptDate: formatDate(getValue(row, 'Fecha del primer intento', 'Fecha Inicio')),
            lastAttemptDate: formatDate(getValue(row, 'Fecha del último intento', 'Fecha Fin')),
            correctAnswers: parseInt(getValue(row, 'Respuestas correctas - Mejor intento', 'Correctas') || '0', 10),
            incorrectAnswers: parseInt(getValue(row, 'Respuestas erróneas - Mejor intento', 'Erróneas', 'Incorrectas') || '0', 10),
            totalQuestions: parseInt(getValue(row, 'Total preguntas - Mejor intento', 'Total Preguntas') || '0', 10),
            score: parseFloat(String(getValue(row, 'Puntaje - Mejor intento', 'Puntaje', 'Nota') || '0').replace('%', '')),
            status: getValue(row, 'Estado evaluación - Mejor intento', 'Estado') || 'Desconocido',
            durationStr: getValue(row, 'Duración de resolución', 'Duración') || '',
            courseName: getValue(row, 'Nombre del curso', 'Curso') || 'General'
          }));
        }

        // --- 3. Process "Preguntas y respuestas Ev. fina" Sheet ---
        let questionRecords: QuestionRecord[] = [];
        const sheetNameQA = workbook.SheetNames.find((n: string) => n.toLowerCase().includes('preguntas') || n.toLowerCase().includes('respuestas'));

        if (sheetNameQA) {
          const sheetQA = workbook.Sheets[sheetNameQA];
          const jsonQA = getJsonWithHeaders(sheetQA);

          questionRecords = jsonQA.map((row: any) => {
            const statusStr = String(getValue(row, 'Estado', 'Resultado') || '').toLowerCase();
            let status: QuestionRecord['status'] = 'Desconocido';
            if (statusStr.includes('correcta') || statusStr === 'correct') status = 'Correcta';
            if (statusStr.includes('incorrecta') || statusStr === 'incorrect') status = 'Incorrecta';

            return {
              userName: getValue(row, 'Usuario', 'Nombre') || 'Anon',
              email: getValue(row, 'Email', 'Correo') || '',
              question: getValue(row, 'Pregunta') || 'Sin pregunta',
              userAnswer: getValue(row, 'Respuesta del último intento', 'Respuesta', 'Comentario') || '',
              status: status,
              courseName: getValue(row, 'Nombre del curso', 'Curso') || 'General'
            };
          });
        }

        // --- 4. Process "Encuestas Abiertas" Sheet ---
        let surveyRecords: SurveyRecord[] = [];
        const sheetNameSurvey = workbook.SheetNames.find((n: string) => {
          const lower = n.toLowerCase();
          return lower.includes('abiertas') || lower.includes('feedback') || lower.includes('comentarios') || (lower.includes('encuesta') && !lower.includes('multi'));
        });

        if (sheetNameSurvey) {
          const sheetSurvey = workbook.Sheets[sheetNameSurvey];
          const jsonSurvey = getJsonWithHeaders(sheetSurvey);

          surveyRecords = jsonSurvey.map((row: any) => ({
            email: getValue(row, 'Email', 'Correo', 'Usuario') || 'Anon',
            courseName: getValue(row, 'Curso', 'Nombre del curso') || 'General',
            surveyId: String(getValue(row, 'Id Survey', 'Id Encuesta') || ''),
            questionId: String(getValue(row, 'Id Pregunta') || ''),
            question: getValue(row, 'Pregunta') || 'Sin pregunta',
            answer: getValue(row, 'Respuesta', 'Comentario', 'Texto', 'Respuesta Abierta', 'F') || ''
          }));
        }

        // --- 5. Process "Encuestas Multiples" Sheet ---
        let multipleChoiceRecords: MultipleChoiceRecord[] = [];
        const sheetNameMulti = workbook.SheetNames.find((n: string) => n.toLowerCase().includes('multiples') || n.toLowerCase().includes('múltiples') || (n.toLowerCase().includes('encuestas') && n.toLowerCase().includes('multi')));

        if (sheetNameMulti) {
          const sheetMulti = workbook.Sheets[sheetNameMulti];
          const jsonMulti = getJsonWithHeaders(sheetMulti);

          multipleChoiceRecords = jsonMulti.map((row: any) => ({
            email: getValue(row, 'Email', 'Correo', 'Usuario') || 'Anon',
            courseName: getValue(row, 'Curso', 'Nombre del curso') || 'General',
            surveyId: String(getValue(row, 'Id Survey', 'Id Encuesta') || ''),
            questionId: String(getValue(row, 'Id Pregunta') || ''),
            question: getValue(row, 'Pregunta') || 'Sin pregunta',
            choice: getValue(row, 'Elección', 'Respuesta', 'Opción') || 'Sin elección'
          }));
        }

        resolve({
          training: trainingRecords,
          evaluations: evaluationRecords,
          questions: questionRecords,
          surveys: surveyRecords,
          multipleChoice: multipleChoiceRecords
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

// Helper to format dates consistently
const formatDate = (dateVal: any): string => {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  return String(dateVal);
};

// Helper to parse duration strings like "2h 30m" or numbers
const parseDuration = (duration: any): number => {
  if (typeof duration === 'number') return duration;
  if (!duration) return 0;

  const str = String(duration).toLowerCase();

  const hMatch = str.match(/(\d+)\s*h/);
  const mMatch = str.match(/(\d+)\s*m/);

  let total = 0;
  if (hMatch) total += parseInt(hMatch[1], 10);
  if (mMatch) total += parseInt(mMatch[1], 10) / 60;

  if (total === 0) {
    const floatVal = parseFloat(str);
    if (!isNaN(floatVal)) return floatVal;
  }

  return total;
};

// List of common Spanish Stop Words
const STOP_WORDS_ES = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas', 'algo', 'nosotros', 'mi', 'mis', 'tú', 'te', 'ti', 'tu', 'tus', 'ellas', 'nosotras', 'vosotros', 'vosotras', 'os', 'mío', 'mía', 'míos', 'mías', 'tuyo', 'tuya', 'tuyos', 'tuyas', 'suyo', 'suya', 'suyos', 'suyas', 'nuestro', 'nuestra', 'nuestros', 'nuestras', 'vuestro', 'vuestra', 'vuestros', 'vuestras', 'es', 'son', 'fue', 'era', 'está', 'están', 'ser', 'hacer', 'tener', 'curso', 'capacitación', 'taller', 'sesión', 'bueno', 'malo', 'regular', 'excelente', 'bien', 'gracias', 'hola', 'día', 'días',
  'atención', 'interés', 'deseo', 'acción', 'aida'
]);

export const calculateMetrics = (
  data: TrainingRecord[],
  evData: EvaluationRecord[],
  qaData: QuestionRecord[],
  surveyData: SurveyRecord[],
  multiData: MultipleChoiceRecord[]
): DashboardMetrics => {
  // --- Training Metrics ---
  const totalEmployees = new Set(data.map(d => d.employeeName)).size;
  const completed = data.filter(d => d.status === 'Completado');

  // 1. Completion Rate: Average of normalized progress
  const maxProgress = Math.max(...data.map(d => d.progress));
  const isDecimal = maxProgress <= 1.0 && maxProgress > 0;

  const normalizedData = data.map(d => ({
    ...d,
    normalizedProgress: (isDecimal && d.progress <= 1) ? d.progress * 100 : d.progress
  }));

  const totalProgress = normalizedData.reduce((sum, d) => sum + d.normalizedProgress, 0);
  const completionRate = normalizedData.length > 0 ? totalProgress / normalizedData.length : 0;

  // 2. Average Training Hours (Horas de Reproducción)
  const totalHours = normalizedData.reduce((sum, r) => sum + (r.reproductionHours || 0), 0);
  const averageTrainingHours = normalizedData.length > 0 ? totalHours / normalizedData.length : 0;

  // 3. Certificates
  const certificatesIssued = normalizedData.filter(d => ['si', 'yes', 'true'].includes(d.certificateObtained.toLowerCase())).length;
  const certificatesNotIssued = normalizedData.length - certificatesIssued;

  // 4. Status Distribution (Based STRICTLY on "Curso completado" column)
  let completedCount = 0;
  let notCompletedCount = 0;
  normalizedData.forEach(d => {
    const val = d.courseCompletedRaw.toLowerCase();
    if (['si', 'yes', 'true', 'completado'].includes(val)) {
      completedCount++;
    } else {
      notCompletedCount++;
    }
  });

  const completionDistribution = [
    { name: 'Completado (SI)', value: completedCount, color: '#10B981' },
    { name: 'No Completado', value: notCompletedCount, color: '#EF4444' }
  ].filter(d => d.value > 0);

  const certificateDistribution = [
    { name: 'Con Certificado', value: certificatesIssued, color: '#3B82F6' },
    { name: 'Sin Certificado', value: certificatesNotIssued, color: '#9CA3AF' }
  ].filter(d => d.value > 0);

  // Department Performance
  const depts = Array.from(new Set(data.map(d => d.department)));
  const departmentPerformance = depts.map(dept => {
    const deptData = normalizedData.filter(d => d.department === dept);

    // Average Progress
    const deptTotalProg = deptData.reduce((sum, d) => sum + d.normalizedProgress, 0);
    const rate = deptData.length > 0 ? deptTotalProg / deptData.length : 0;

    // Avg Score (Keep for table info if needed, though removed from KPIs)
    const deptScores = deptData.filter(d => d.status === 'Completado' || d.score > 0).map(d => d.score);
    const avg = deptScores.reduce((sum, d) => sum + d, 0) / (deptScores.length || 1);

    return { name: dept, avgScore: avg, completionRate: rate };
  }).sort((a, b) => b.completionRate - a.completionRate);

  // Top Courses
  const courseCounts = data.reduce((acc, curr) => {
    acc[curr.courseName] = (acc[curr.courseName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCourses = Object.entries(courseCounts)
    .map(([name, students]) => ({ name, students }))
    .sort((a, b) => b.students - a.students)
    .slice(0, 5);

  // Monthly Progress
  const monthlyData: Record<string, number> = {};
  completed.forEach(d => {
    const dateStr = d.completionDate || d.dateAssigned;
    if (!dateStr) return;
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const key = date.toLocaleString('es-ES', { month: 'short' });
        monthlyData[key] = (monthlyData[key] || 0) + 1;
      }
    } catch (e) { }
  });

  const monthlyProgress = Object.entries(monthlyData).map(([month, completed]) => ({
    month, completed
  }));

  // Primary Course Name (The one with most students)
  const primaryCourseName = topCourses.length > 0 ? topCourses[0].name : "General";

  // --- Metrics Sub-calculations (Evaluations, Questions, Surveys) remain same ---

  let evaluationMetrics: EvaluationMetrics | undefined;
  if (evData.length > 0) {
    // Deduplicate by user to ensure metrics reflect unique individuals (best attempt)
    const uniqueUsersMap = new Map<string, EvaluationRecord>();
    evData.forEach(e => {
      const key = (e.email || e.userName).toLowerCase().trim();
      if (!uniqueUsersMap.has(key) || e.score > (uniqueUsersMap.get(key)?.score || 0)) {
        uniqueUsersMap.set(key, e);
      }
    });
    const dedupedEvData = Array.from(uniqueUsersMap.values());

    const totalEvals = dedupedEvData.length;
    const avgAttempts = dedupedEvData.reduce((sum, e) => sum + e.attempts, 0) / totalEvals;
    const avgEvScore = dedupedEvData.reduce((sum, e) => sum + e.score, 0) / totalEvals;
    const passedEvs = dedupedEvData.filter(e => e.status.toLowerCase().includes('aprobado') || e.status.toLowerCase().includes('pass') || e.score >= 70);
    const passRate = (passedEvs.length / totalEvals) * 100;
    const totalCorrect = dedupedEvData.reduce((sum, e) => sum + e.correctAnswers, 0);
    const totalIncorrect = dedupedEvData.reduce((sum, e) => sum + e.incorrectAnswers, 0);

    const attemptMap: Record<string, number> = {};
    dedupedEvData.forEach(e => { const key = e.attempts >= 5 ? '5+' : String(e.attempts); attemptMap[key] = (attemptMap[key] || 0) + 1; });
    const attemptsDistribution = Object.entries(attemptMap).map(([attempts, count]) => ({ attempts, count })).sort((a, b) => (a.attempts === '5+' ? 1 : b.attempts === '5+' ? -1 : Number(a.attempts) - Number(b.attempts)));

    const approvedCount = passedEvs.length;
    const failedCount = totalEvals - approvedCount;
    const passDistribution = [
      { name: 'Aprobados', value: approvedCount, color: '#10B981' },
      { name: 'Reprobados', value: failedCount, color: '#EF4444' }
    ].filter(d => d.value > 0);

    const topPerformers = dedupedEvData.sort((a, b) => b.score - a.score).map(e => ({ name: e.userName, score: e.score, course: e.courseName }));

    evaluationMetrics = { totalEvaluations: totalEvals, avgAttempts, avgScore: avgEvScore, passRate, globalAccuracy: { correct: totalCorrect, incorrect: totalIncorrect }, passDistribution, attemptsDistribution, topPerformers };
  }

  let questionMetrics: QuestionMetrics | undefined;
  if (qaData.length > 0) {
    const qMap = new Map<string, { total: number, incorrect: number, course: string }>();
    qaData.forEach(q => {
      const key = q.question.trim();
      const current = qMap.get(key) || { total: 0, incorrect: 0, course: q.courseName };
      current.total++;
      if (q.status === 'Incorrecta') current.incorrect++;
      qMap.set(key, current);
    });
    const hardestQuestions = Array.from(qMap.entries()).map(([question, stats]) => ({ question, course: stats.course, failureRate: (stats.incorrect / stats.total) * 100, incorrectCount: stats.incorrect, totalAttempts: stats.total })).filter(q => q.totalAttempts > 0 && q.incorrectCount > 0).sort((a, b) => b.failureRate - a.failureRate).slice(0, 10);
    questionMetrics = { totalQuestionsAnswered: qaData.length, hardestQuestions };
  }

  let surveyMetrics: SurveyMetrics | undefined;
  if (surveyData.length > 0) {
    const uniqueRespondents = new Set(surveyData.map(s => s.email)).size;
    const surveyCourseCounts = surveyData.reduce((acc, curr) => { acc[curr.courseName] = (acc[curr.courseName] || 0) + 1; return acc; }, {} as Record<string, number>);
    const responsesByCourse = Object.entries(surveyCourseCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const qMap = new Map<string, { course: string, answers: string[] }>();

    // Word Counter for Cloud
    const wordCounts: Record<string, number> = {};

    const processText = (text: any) => {
      if (!text) return;
      const words = String(text)
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS_ES.has(w));

      words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    };

    surveyData.forEach(s => {
      const key = s.question;
      const current = qMap.get(key) || { course: s.courseName, answers: [] };
      if (s.answer && String(s.answer).trim() !== '') {
        current.answers.push(String(s.answer));
        processText(s.answer);
      }
      qMap.set(key, current);
    });

    const topWords = Object.entries(wordCounts)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50); // Top 50 words

    const groupedQuestions = Array.from(qMap.entries()).map(([question, data]) => ({ question, course: data.course, answers: data.answers })).filter(q => q.answers.length > 0);
    surveyMetrics = { totalResponses: surveyData.length, uniqueRespondents, responsesByCourse, groupedQuestions, topWords };
  }

  let multipleChoiceMetrics: MultipleChoiceMetrics | undefined;
  if (multiData.length > 0) {
    const uniqueRespondents = new Set(multiData.map(m => m.email)).size;
    const qMap = new Map<string, { course: string, counts: Record<string, number> }>();
    multiData.forEach(m => { const key = m.question.trim(); const current = qMap.get(key) || { course: m.courseName, counts: {} }; const choice = m.choice.trim() || 'Sin respuesta'; current.counts[choice] = (current.counts[choice] || 0) + 1; qMap.set(key, current); });
    const questionsAnalysis = Array.from(qMap.entries()).map(([question, data]) => { const totalAnswers = Object.values(data.counts).reduce((a, b) => a + b, 0); const distribution = Object.entries(data.counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); return { question, course: data.course, totalAnswers, distribution }; });
    multipleChoiceMetrics = { totalResponses: multiData.length, uniqueRespondents, questionsAnalysis };
  }

  return {
    totalEmployees,
    completionRate,
    averageTrainingHours,
    certificatesIssued,
    completionDistribution,
    certificateDistribution,
    departmentPerformance,
    topCourses,
    monthlyProgress,
    primaryCourseName,
    evaluationMetrics,
    questionMetrics,
    surveyMetrics,
    multipleChoiceMetrics
  };
};