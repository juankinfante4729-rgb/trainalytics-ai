import { GoogleGenAI, Type } from "@google/genai";
import { DashboardMetrics, AIInsight } from "../types";

// Initialize Gemini Client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateTrainingInsights = async (metrics: DashboardMetrics): Promise<AIInsight[]> => {
  const ai = getClient();
  if (!ai) return [];

  // Construct a concise summary for the AI to analyze
  const prompt = `
    Actúa como un analista experto en Recursos Humanos y Capacitación Corporativa.
    Analiza los siguientes datos métricos de un programa de capacitación y genera 3 insights estratégicos y accionables.
    
    Datos del Dashboard:
    - Tasa de Completitud Global (Promedio de Avance): ${metrics.completionRate.toFixed(1)}%
    - Certificados Emitidos: ${metrics.certificatesIssued} de ${metrics.totalEmployees} usuarios.
    - Promedio de Horas de Reproducción: ${metrics.averageTrainingHours.toFixed(2)} horas por usuario.
    - Rendimiento por Departamento (Baja completitud): ${JSON.stringify(metrics.departmentPerformance.filter(d => d.completionRate < 80))}
    - Estado de Completitud (SI vs NO): ${JSON.stringify(metrics.completionDistribution)}
    - Feedback Abierto: ${metrics.surveyMetrics ? `Se han recibido ${metrics.surveyMetrics.totalResponses} comentarios.` : 'Sin datos.'}
    - Encuestas Múltiples: ${metrics.multipleChoiceMetrics ? `Se han respondido ${metrics.multipleChoiceMetrics.totalResponses} preguntas de opción múltiple.` : 'Sin datos.'}

    Genera una respuesta en formato JSON con la siguiente estructura:
    Un arreglo de objetos, donde cada objeto tiene:
    - "title": Título corto del insight (ej. "Brecha de Certificación").
    - "description": Explicación detallada y recomendación (ej. "Solo el 40% tiene certificado. Se sugiere recordatorios...").
    - "type": Uno de estos valores: "success" (si es algo positivo), "warning" (si requiere acción urgente), "info" (observación general).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["success", "warning", "info"] }
            },
            required: ["title", "description", "type"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as AIInsight[];
  } catch (error) {
    console.error("Error generating insights:", error);
    return [
      {
        title: "Error de Análisis",
        description: "No se pudieron generar recomendaciones automáticas en este momento.",
        type: "info"
      }
    ];
  }
};