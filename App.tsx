import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { StatCard } from './components/StatCard';
import { LoginPage } from './components/LoginPage';
import { AuthModal } from './components/AuthModal';
import { processExcelFile, calculateMetrics } from './utils/dataProcessing';
import { DashboardMetrics, TrainingRecord } from './types';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import pptxgen from "pptxgenjs";
import {
  StatusPieChart,
  DepartmentBarChart,
  TrendLineChart,
  AttemptsBarChart,
  AccuracyPieChart,
  HardestQuestionsChart,
  SurveyVolumeChart,
  MultipleChoiceChart,
  SimpleWordCloud
} from './components/Charts';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ training: TrainingRecord[], evaluations: any[], questions: any[], surveys: any[], multipleChoice: any[] } | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Tab State: 'general' | 'evaluations' | 'questions' | 'surveys' | 'multiple'
  const [activeTab, setActiveTab] = useState<'general' | 'evaluations' | 'questions' | 'surveys' | 'multiple'>('general');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const processedData = await processExcelFile(file);
      setData(processedData);

      const calculatedMetrics = calculateMetrics(
        processedData.training,
        processedData.evaluations,
        processedData.questions,
        processedData.surveys,
        processedData.multipleChoice
      );
      setMetrics(calculatedMetrics);

      // Default to general tab
      setActiveTab('general');

    } catch (error) {
      console.error(error);
      alert("Error al procesar el archivo. Verifica que contiene las hojas requeridas.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (onlyCurrentTab = true) => {
    setIsExporting(true);
    setShowExportMenu(false);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const captureTab = async (tabName: string, isFirstPage: boolean) => {
        if (!isFirstPage) pdf.addPage();

        const element = document.getElementById('dashboard-content');
        if (!element) return;

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#f3f4f6'
        });

        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
      };

      if (onlyCurrentTab) {
        await captureTab(activeTab, true);
      } else {
        const tabs: ('general' | 'evaluations' | 'questions' | 'surveys' | 'multiple')[] = ['general', 'evaluations', 'questions', 'surveys', 'multiple'];
        const originalTab = activeTab;

        for (let i = 0; i < tabs.length; i++) {
          const tab = tabs[i];
          // Check if tab has data
          const hasData =
            tab === 'general' ||
            (tab === 'evaluations' && metrics?.evaluationMetrics) ||
            (tab === 'questions' && metrics?.questionMetrics) ||
            (tab === 'surveys' && metrics?.surveyMetrics) ||
            (tab === 'multiple' && metrics?.multipleChoiceMetrics);

          if (hasData) {
            setActiveTab(tab);
            // Wait for render
            await new Promise(resolve => setTimeout(resolve, 500));
            await captureTab(tab, i === 0);
          }
        }
        setActiveTab(originalTab);
      }

      const fileName = onlyCurrentTab ? `reporte-${activeTab}.pdf` : 'reporte-completo.pdf';
      pdf.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un error al generar el PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPPT = async () => {
    setIsExporting(true);
    setShowExportMenu(false);

    try {
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_WIDE';

      const tabs: ('general' | 'evaluations' | 'questions' | 'surveys' | 'multiple')[] = ['general', 'evaluations', 'questions', 'surveys', 'multiple'];
      const tabLabels: Record<string, string> = {
        'general': 'Resumen de Cursos',
        'evaluations': 'Resultados de Evaluaciones',
        'questions': 'Análisis de Preguntas',
        'surveys': 'Feedback Abierto',
        'multiple': 'Encuestas Estructuradas'
      };

      const originalTab = activeTab;

      for (const tab of tabs) {
        const hasData =
          tab === 'general' ||
          (tab === 'evaluations' && metrics?.evaluationMetrics) ||
          (tab === 'questions' && metrics?.questionMetrics) ||
          (tab === 'surveys' && metrics?.surveyMetrics) ||
          (tab === 'multiple' && metrics?.multipleChoiceMetrics);

        if (hasData) {
          setActiveTab(tab);
          await new Promise(resolve => setTimeout(resolve, 600)); // Wait for render

          const element = document.getElementById('dashboard-content');
          if (element) {
            const canvas = await html2canvas(element, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#f3f4f6'
            });

            const imgData = canvas.toDataURL('image/png');
            const slide = pptx.addSlide();

            // Add Title centered
            slide.addText(tabLabels[tab], {
              x: 0, y: 0.4, w: '100%',
              align: 'center', fontSize: 24, color: '363636', bold: true
            });
            slide.addText(`TrainAlytics - ${metrics?.primaryCourseName}`, {
              x: 0, y: 0.8, w: '100%',
              align: 'center', fontSize: 12, color: '666666'
            });

            // Add Image centered (Wide layout is 13.33 x 7.5 inches)
            // Centering a 10-inch image horizontally: (13.33 - 10) / 2 = 1.66
            slide.addImage({
              data: imgData,
              x: 1.66, y: 1.4, w: 10.0, h: 5.5
            });
          }
        }
      }

      setActiveTab(originalTab);
      const safeName = (metrics?.primaryCourseName || 'reporte-capacitacion').replace(/[^a-z0-9áéíóúñ]/gi, '-').replace(/-+/g, '-');

      // Manual download to guarantee filename and extension
      const blob = await pptx.write({ outputType: 'blob' }) as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PowerPoint:", error);
      alert("Hubo un error al generar el PowerPoint.");
    } finally {
      setIsExporting(false);
    }
  };

  const resetDashboard = () => {
    setData(null);
    setMetrics(null);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    resetDashboard();
  };

  const handleChangeCredentials = () => {
    setShowAuthModal(true);
  };

  const saveCredentials = (newEmail: string, newPassword: string) => {
    localStorage.setItem('auth_email', newEmail);
    localStorage.setItem('auth_password', newPassword);
    setShowAuthModal(false);
    alert('Credenciales actualizadas correctamente.');
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">TrainAlytics</h1>
          <p className="text-gray-500">Transforma tus reportes de Cursos, Evaluaciones y Encuestas en indicadores visuales.</p>
        </div>
        <FileUpload onFileUpload={handleFileUpload} isLoading={loading} />

        <div className="mt-8 max-w-2xl text-center text-sm text-gray-400 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="font-semibold mb-2">Estructura esperada del Excel:</p>
          <ul className="text-left space-y-1 list-disc list-inside">
            <li>Hoja 1: <strong>Curso</strong> (Progreso %, Horas de Reproducción, Curso completado (Si/No), Certificado obtenido (Si/No)...)</li>
            <li>Hoja 2: <strong>Resultados Ev. final</strong> (Intentos, Puntaje...)</li>
            <li>Hoja 3: <strong>Preguntas y respuestas...</strong> (Pregunta, Respuesta, Estado...)</li>
            <li>Hoja 4: <strong>Encuestas Abiertas</strong> (Email, Curso, Pregunta, Respuesta...)</li>
            <li>Hoja 5: <strong>Encuestas Multiples</strong> (Email, Curso, Pregunta, Elección...)</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 font-sans pb-12">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">TrainAlytics</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={isExporting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${isExporting ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {isExporting ? (
                    <>Exportando...</>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Opciones de Exportación
                      <svg className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[100] animate-in fade-in zoom-in duration-200">
                    <button
                      onClick={() => handleDownloadPDF(true)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      PDF (Pestaña actual)
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(false)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      PDF (Todo el reporte)
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={handleDownloadPPT}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 13v-4h3a2 2 0 110 4H9z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      PowerPoint (Presentación)
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={resetDashboard}
                className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
              >
                Subir nuevo
              </button>
              <button
                onClick={handleChangeCredentials}
                className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
              >
                Credenciales
              </button>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSave={saveCredentials}
        initialEmail={localStorage.getItem('auth_email') || 'obarragan@alphabuildershq.com'}
      />

      {/* Main Content with ID for PDF Capture */}
      <main id="dashboard-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-slate-50">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Dashboard de Capacitación - {metrics.primaryCourseName}
            </h2>
            <p className="text-gray-500">
              {activeTab === 'general' && 'Vista general de progreso y cumplimiento.'}
              {activeTab === 'evaluations' && 'Análisis detallado de resultados y exámenes.'}
              {activeTab === 'questions' && 'Identificación de brechas de conocimiento por pregunta.'}
              {activeTab === 'surveys' && 'Opiniones y feedback cualitativo de los usuarios.'}
              {activeTab === 'multiple' && 'Resultados de encuestas estructuradas y de opción múltiple.'}
            </p>
          </div>

          {/* Tabs Switcher - Hidden during export if you want cleaner PDF, but keeping it visible provides context */}
          <div data-html2canvas-ignore="true" className="bg-gray-100 p-1 rounded-lg inline-flex overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'general' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Cursos
            </button>
            <button
              onClick={() => setActiveTab('evaluations')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'evaluations' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Evaluaciones
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'questions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Preguntas
            </button>
            <button
              onClick={() => setActiveTab('surveys')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'surveys' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Feedback Abierto
            </button>
            <button
              onClick={() => setActiveTab('multiple')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'multiple' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Encuestas Estructuradas
            </button>
          </div>
        </div>

        {/* --- TAB 1: GENERAL OVERVIEW --- */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Tasa de Completitud (Promedio)"
                value={`${metrics.completionRate.toFixed(1)}%`}
                colorClass="text-green-600 bg-green-500"
                icon={<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
              <StatCard
                title="Certificados Emitidos"
                value={metrics.certificatesIssued}
                trend={`${((metrics.certificatesIssued / metrics.totalEmployees) * 100).toFixed(0)}%`}
                colorClass="text-blue-600 bg-blue-500"
                icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              />
              <StatCard
                title="Promedio Horas"
                value={`${metrics.averageTrainingHours.toFixed(1)} h`}
                colorClass="text-purple-600 bg-purple-500"
                icon={<svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
              <StatCard
                title="Total Usuarios"
                value={metrics.totalEmployees}
                colorClass="text-orange-600 bg-orange-500"
                icon={<svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-6">Rendimiento por Departamento / País</h3>
                  <DepartmentBarChart data={metrics.departmentPerformance} />
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-6">Tendencia Mensual de Completitud</h3>
                  <TrendLineChart data={metrics.monthlyProgress} />
                </div>
              </div>
              <div className="space-y-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Distribución de Completitud</h3>
                  <p className="text-xs text-gray-400 mb-2">Usuarios con curso "Completado" vs "No"</p>
                  <StatusPieChart data={metrics.completionDistribution} />
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Distribución de Certificados</h3>
                  <p className="text-xs text-gray-400 mb-2">Usuarios con certificado emitido</p>
                  <StatusPieChart data={metrics.certificateDistribution} />
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Curso Evaluado</h3>
                  <div className="space-y-4">
                    {metrics.topCourses.map((course, idx) => (
                      <div key={idx} className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                          <div className="max-w-[70%] text-xs font-medium text-gray-600 truncate">{course.name}</div>
                          <div className="text-xs font-semibold text-indigo-600">{course.students}</div>
                        </div>
                        <div className="overflow-hidden h-1.5 mb-1 text-xs flex rounded bg-indigo-50">
                          <div style={{ width: `${(course.students / metrics.totalEmployees) * 100}%` }} className="shadow-none flex flex-col bg-indigo-500"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: EVALUATION DETAILS --- */}
        {activeTab === 'evaluations' && metrics.evaluationMetrics && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title="Tasa de Aprobación"
                value={`${metrics.evaluationMetrics.passRate.toFixed(1)}%`}
                colorClass="text-indigo-600 bg-indigo-500"
                icon={<svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
              <StatCard
                title="Promedio de Intentos"
                value={metrics.evaluationMetrics.avgAttempts.toFixed(1)}
                colorClass="text-amber-600 bg-amber-500"
                icon={<svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
              />
              <StatCard
                title="Precisión Global"
                value={`${((metrics.evaluationMetrics.globalAccuracy.correct / (metrics.evaluationMetrics.globalAccuracy.correct + metrics.evaluationMetrics.globalAccuracy.incorrect || 1)) * 100).toFixed(0)}%`}
                colorClass="text-emerald-600 bg-emerald-500"
                icon={<svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
              />
              <StatCard
                title="Personal Evaluado"
                value={metrics.evaluationMetrics.totalEvaluations}
                colorClass="text-pink-600 bg-pink-500"
                icon={<svg className="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Distribución de Intentos</h3>
                <AttemptsBarChart data={metrics.evaluationMetrics.attemptsDistribution} />
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Distribución de Resultados (Usuarios)</h3>
                <StatusPieChart data={metrics.evaluationMetrics.passDistribution} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Top Performers (Mejores Puntajes)</h3>
                <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Evaluados</span>
                  <span className="text-lg font-bold text-indigo-700 leading-none">{metrics.evaluationMetrics.totalEvaluations}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm whitespace-nowrap">
                  <thead className="uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-gray-500 font-semibold">Usuario</th>
                      <th scope="col" className="px-6 py-4 text-gray-500 font-semibold">Curso</th>
                      <th scope="col" className="px-6 py-4 text-gray-500 font-semibold text-right">Puntaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.evaluationMetrics.topPerformers.map((p, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                        <td className="px-6 py-4 text-gray-500">{p.course}</td>
                        <td className="px-6 py-4 text-right font-bold text-indigo-600">{p.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: QUESTION ANALYSIS --- */}
        {activeTab === 'questions' && metrics.questionMetrics && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 border-l-4 border-l-red-500">
                <h3 className="text-gray-500 text-sm font-medium uppercase">Preguntas Falladas</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {metrics.questionMetrics.hardestQuestions.length}
                </p>
                <p className="text-xs text-red-500 mt-1">Con al menos 1 error registrado</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-gray-500 text-sm font-medium uppercase">Total Registros Analizados</h3>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {metrics.questionMetrics.totalQuestionsAnswered}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Preguntas con Mayor Tasa de Error</h3>
              <p className="text-sm text-gray-400 mb-6">Identifica los temas donde los usuarios tienen más dificultades.</p>
              <HardestQuestionsChart data={metrics.questionMetrics.hardestQuestions} />
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Detalle de Preguntas Críticas</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-gray-500 font-semibold w-1/2">Pregunta</th>
                      <th scope="col" className="px-6 py-4 text-gray-500 font-semibold">Curso Asociado</th>
                      <th scope="col" className="px-6 py-4 text-gray-500 font-semibold text-center">Fallos / Intentos</th>
                      <th scope="col" className="px-6 py-4 text-gray-500 font-semibold text-right">Tasa de Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {metrics.questionMetrics.hardestQuestions.map((q, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {q.question.length > 100 ? q.question.substring(0, 100) + '...' : q.question}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{q.course}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-red-50 text-red-600 px-2 py-1 rounded-full text-xs font-bold">
                            {q.incorrectCount} / {q.totalAttempts}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-red-600">
                          {q.failureRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 4: SURVEY FEEDBACK --- */}
        {activeTab === 'surveys' && metrics.surveyMetrics && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatCard
                title="Feedback Recibido (Total)"
                value={metrics.surveyMetrics.totalResponses}
                colorClass="text-violet-600 bg-violet-500"
                icon={<svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>}
              />
              <StatCard
                title="Usuarios Participantes"
                value={metrics.surveyMetrics.uniqueRespondents}
                colorClass="text-cyan-600 bg-cyan-500"
                icon={<svg className="w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
              />
            </div>

            {/* Word Cloud Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Palabras Más Frecuentes</h3>
              <p className="text-sm text-gray-400 mb-6">Términos recurrentes en los comentarios abiertos.</p>
              <SimpleWordCloud data={metrics.surveyMetrics.topWords} />
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Volumen de Feedback por Curso</h3>
              <p className="text-sm text-gray-400 mb-6">¿Qué cursos generan más comentarios u opiniones?</p>
              <SurveyVolumeChart data={metrics.surveyMetrics.responsesByCourse} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Visor de Respuestas</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Agrupado por pregunta</span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {metrics.surveyMetrics.groupedQuestions.map((group, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                      <h4 className="font-semibold text-gray-900">{group.question}</h4>
                      <span className="text-xs text-gray-500 mt-1 block">Curso: {group.course}</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-0">
                      <ul className="divide-y divide-gray-100">
                        {group.answers.map((ans, ansIdx) => (
                          <li key={ansIdx} className="px-6 py-3 text-sm text-gray-600 hover:bg-gray-50">
                            "{ans}"
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-gray-50 px-6 py-2 text-xs text-gray-400 text-right border-t border-gray-100">
                      {group.answers.length} respuestas
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 5: MULTIPLE CHOICE SURVEYS --- */}
        {activeTab === 'multiple' && metrics.multipleChoiceMetrics && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Resultados de Encuestas Estructuradas</h3>
              <div className="text-sm text-gray-500">
                Total Respuestas: <span className="font-semibold text-indigo-600">{metrics.multipleChoiceMetrics.totalResponses}</span>
              </div>
            </div>

            {/* Changed from 3 columns to 2 to prevent overcrowding with long text */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {metrics.multipleChoiceMetrics.questionsAnalysis.map((q, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow duration-200">
                  <div className="mb-4">
                    <h4 className="font-bold text-gray-800 text-base mb-1 leading-snug">{q.question}</h4>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{q.course}</p>
                  </div>
                  <div className="flex-grow pt-2">
                    <MultipleChoiceChart data={q.distribution} total={q.totalAnswers} />
                  </div>
                  <div className="mt-5 pt-3 border-t border-gray-50 text-xs text-gray-400 flex justify-between items-center">
                    <span className="bg-gray-50 px-2 py-1 rounded">Total: <strong>{q.totalAnswers}</strong></span>
                    <span className="max-w-[60%] text-right truncate">Líder: <span className="text-indigo-600 font-medium">{q.distribution[0]?.name || 'N/A'}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback for Empty Tabs */}
        {activeTab === 'evaluations' && !metrics.evaluationMetrics && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-gray-400 mb-2">No se encontraron datos de evaluaciones.</div>
            <p className="text-sm text-gray-400">Verifica la hoja "Resultados Ev. final".</p>
          </div>
        )}
        {activeTab === 'questions' && !metrics.questionMetrics && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-gray-400 mb-2">No se encontraron datos de preguntas.</div>
            <p className="text-sm text-gray-400">Verifica la hoja "Preguntas y respuestas...".</p>
          </div>
        )}
        {activeTab === 'surveys' && !metrics.surveyMetrics && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-gray-400 mb-2">No se encontraron datos de encuestas abiertas.</div>
            <p className="text-sm text-gray-400">Verifica la hoja "Encuestas Abiertas".</p>
          </div>
        )}
        {activeTab === 'multiple' && !metrics.multipleChoiceMetrics && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-gray-400 mb-2">No se encontraron datos de encuestas múltiples.</div>
            <p className="text-sm text-gray-400">Verifica la hoja "Encuestas Multiples".</p>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;