import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { DashboardMetrics, EvaluationMetrics, QuestionMetrics, SurveyMetrics } from '../types';

interface ChartsProps {
  data: DashboardMetrics;
}

const COLORS = ['#10B981', '#3B82F6', '#9CA3AF', '#EF4444', '#8B5CF6', '#F59E0B'];

export const StatusPieChart: React.FC<{ data: DashboardMetrics['completionDistribution'] }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          isAnimationActive={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
        />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export const DepartmentBarChart: React.FC<{ data: DashboardMetrics['departmentPerformance'] }> = ({ data }) => {
  // Take top 8 depts
  const chartData = data.slice(0, 8);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: '#F3F4F6' }}
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
        />
        <Bar dataKey="completionRate" name="Completitud %" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const TrendLineChart: React.FC<{ data: DashboardMetrics['monthlyProgress'] }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <Line type="monotone" dataKey="completed" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} isAnimationActive={false} />
        <CartesianGrid stroke="#E5E7EB" strokeDasharray="5 5" vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// --- New Charts for Evaluations ---

export const AttemptsBarChart: React.FC<{ data: EvaluationMetrics['attemptsDistribution'] }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis
          dataKey="attempts"
          tickLine={false}
          tick={{ fontSize: 12 }}
          label={{ value: 'Nº Intentos', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#6B7280' }}
        />
        <YAxis tickLine={false} tick={{ fontSize: 12 }} />
        <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px' }} />
        <Bar dataKey="count" name="Evaluaciones" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={30} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const AccuracyPieChart: React.FC<{ data: EvaluationMetrics['globalAccuracy'] }> = ({ data }) => {
  const chartData = [
    { name: 'Correctas', value: data.correct, color: '#10B981' },
    { name: 'Incorrectas', value: data.incorrect, color: '#EF4444' }
  ];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
          isAnimationActive={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: '8px' }} />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
};

// --- Question Analysis Charts ---

export const HardestQuestionsChart: React.FC<{ data: QuestionMetrics['hardestQuestions'] }> = ({ data }) => {
  // Truncate overly long questions for display
  const chartData = data.slice(0, 5).map(q => ({
    ...q,
    shortName: q.question.length > 50 ? q.question.substring(0, 50) + '...' : q.question
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
        <YAxis dataKey="shortName" type="category" width={220} tick={{ fontSize: 11 }} />
        <Tooltip
          cursor={{ fill: '#FEF2F2' }}
          contentStyle={{ borderRadius: '8px', border: '1px solid #EF4444' }}
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Tasa de Error']}
        />
        <Bar dataKey="failureRate" name="Tasa de Error" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={25} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// --- Survey Charts ---

export const SurveyVolumeChart: React.FC<{ data: SurveyMetrics['responsesByCourse'] }> = ({ data }) => {
  const chartData = data.slice(0, 8); // Top 8 courses with feedback

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px' }} />
        <Bar dataKey="count" name="Respuestas" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={40} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Visual representation of top words ("Tag Cloud" style)
export const SimpleWordCloud: React.FC<{ data: { text: string; value: number }[] }> = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-center text-gray-400">Sin datos suficientes</div>;

  const maxVal = Math.max(...data.map(d => d.value));
  const minVal = Math.min(...data.map(d => d.value));

  const getFontSize = (val: number) => {
    // Linear scale between 12px and 32px
    if (maxVal === minVal) return 16;
    const size = 12 + ((val - minVal) / (maxVal - minVal)) * 24;
    return Math.round(size);
  };

  const getWeight = (val: number) => {
    return val > maxVal * 0.7 ? 700 : val > maxVal * 0.4 ? 600 : 400;
  };

  const getColor = (val: number) => {
    if (val > maxVal * 0.8) return '#4F46E5'; // Indigo 600
    if (val > maxVal * 0.5) return '#6366F1'; // Indigo 500
    if (val > maxVal * 0.3) return '#818CF8'; // Indigo 400
    return '#9CA3AF'; // Gray 400
  };

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center items-center p-4">
      {data.map((word, idx) => (
        <span
          key={idx}
          style={{
            fontSize: `${getFontSize(word.value)}px`,
            fontWeight: getWeight(word.value),
            color: getColor(word.value)
          }}
          className="cursor-default transition-all hover:scale-110"
          title={`${word.value} ocurrencias`}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
};

export const MultipleChoiceChart: React.FC<{ data: { name: string; value: number }[], total: number }> = ({ data, total }) => {
  return (
    <div className="flex flex-col space-y-4 w-full">
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        const color = COLORS[index % COLORS.length];

        return (
          <div key={index} className="w-full">
            <div className="flex justify-between items-end mb-1">
              <span className="text-sm text-gray-700 font-medium leading-tight max-w-[85%]">
                {item.name}
              </span>
              <span className="text-xs font-bold text-gray-500 whitespace-nowrap ml-2">
                {percentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percentage}%`, backgroundColor: color }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1 text-right">
              {item.value} votos
            </div>
          </div>
        );
      })}
    </div>
  );
};