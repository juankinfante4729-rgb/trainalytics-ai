import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file: File) => {
    if (file.type.includes('sheet') || file.type.includes('excel') || file.name.endsWith('.csv')) {
      onFileUpload(file);
    } else {
      alert("Por favor sube un archivo Excel (.xlsx, .xls) o CSV válido.");
    }
  };

  return (
    <div 
      className={`w-full max-w-2xl mx-auto p-12 border-2 border-dashed rounded-xl transition-all duration-300 text-center cursor-pointer
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' 
          : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50 bg-white'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInput} 
        className="hidden" 
        accept=".xlsx,.xls,.csv"
      />
      
      {isLoading ? (
        <div className="flex flex-col items-center animate-pulse">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Procesando datos...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="bg-indigo-100 p-4 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Sube tu archivo de capacitación</h3>
          <p className="text-gray-500 mb-6">Arrastra y suelta tu Excel aquí, o haz clic para explorar.</p>
          <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded">
            Formatos soportados: .xlsx, .csv
          </div>
        </div>
      )}
    </div>
  );
};