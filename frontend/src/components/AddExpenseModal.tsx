'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { UploadCloud, AlertTriangle, FileText, Loader2, Sparkles, PenLine, X, FileImage } from 'lucide-react';
import ReviewForm from './ReviewForm';
import StepProgress from './StepProgress';

export default function AddExpenseModal() {
  const { user } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [initialAccountId, setInitialAccountId] = useState<string>('');

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  
  const [proposedData, setProposedData] = useState<any>(null);
  const [partialError, setPartialError] = useState<string>('');
  
  const [manualMode, setManualMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpen = (e: CustomEvent) => {
      setIsOpen(true);
      resetState();
      if (e.detail?.accountId) {
        setInitialAccountId(e.detail.accountId);
      }
    };
    
    const handleClose = () => {
      setIsOpen(false);
      resetState();
    };

    window.addEventListener('open-add-expense', handleOpen as EventListener);
    window.addEventListener('close-add-expense', handleClose as EventListener);

    return () => {
      window.removeEventListener('open-add-expense', handleOpen as EventListener);
      window.removeEventListener('close-add-expense', handleClose as EventListener);
    };
  }, []);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const resetState = () => {
    setFile(null);
    setPreviewUrl(null);
    setIsDragging(false);
    setScanning(false);
    setProposedData(null);
    setPartialError('');
    setManualMode(false);
  };

  if (!user || !isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPartialError('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
        setPartialError('');
      }
    }
  };

  const handleScan = async () => {
    if (!file) return;
    
    setScanning(true);
    setPartialError('');
    setProposedData(null);
    setManualMode(false);
    
    const formData = new FormData();
    formData.append('receipt', file);
    
    try {
      const res = await api.post('/api/expenses/scan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setProposedData(res.data.data.proposal);
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.error?.partialData) {
        setPartialError('We couldn\'t fully read this receipt. Please review and fill in the missing details.');
        setProposedData(err.response.data.error.partialData);
      } else {
        setPartialError(err.response?.data?.message || 'Failed to scan receipt. You can still enter the details manually.');
        setManualMode(true);
      }
    } finally {
      setScanning(false);
    }
  };

  const startManualMode = () => {
    setManualMode(true);
    setProposedData({}); 
    setPartialError('');
  };

  const handleSuccess = () => {
    setIsOpen(false);
    resetState();
    // Refresh page or trigger a data refetch event depending on the current page
    window.dispatchEvent(new CustomEvent('expense-added'));
  };

  const step = (proposedData || manualMode) ? 2 : (scanning ? 2 : 1);

  const handleClose = () => {
    window.dispatchEvent(new CustomEvent('close-add-expense'));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-y-auto pt-20 pb-10">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-5xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-full">
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10 shrink-0">
           <div>
             <h1 className="text-xl font-bold text-foreground">Add Expense</h1>
             <p className="text-muted-foreground text-sm">Upload a receipt file or enter details manually.</p>
           </div>
           <button 
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-input text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          <StepProgress step={step} label1="Upload" label2="Review" />

          {partialError && (
            <div className="mb-6 p-4 rounded-xl border-l-4 border-l-yellow-500 flex items-start gap-3 bg-yellow-500/10">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-700 dark:text-yellow-400 font-medium text-sm">Action Required</h3>
                <p className="text-muted-foreground text-sm mt-1">{partialError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            {/* Left Side - Upload */}
            <div className="flex flex-col gap-6">
              <div className={`p-6 rounded-2xl border bg-card transition-all duration-300 ${step === 1 ? 'ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/5 border-emerald-500/30' : 'border-border'}`}>
                <h2 className="text-lg font-semibold text-foreground mb-4">1. Upload Image</h2>
                
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all min-h-[260px] relative overflow-hidden group
                    ${isDragging ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02]' : ''}
                    ${file ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border hover:border-emerald-500/30 bg-muted/30 hover:bg-input cursor-pointer'}
                  `}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  
                  {file && previewUrl ? (
                    <div className="absolute inset-0 w-full h-full p-2">
                      <div className="relative w-full h-full rounded-lg overflow-hidden border border-border bg-black/5">
                        <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-contain" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); setFile(null); }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-500/80 backdrop-blur-sm transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 flex items-center justify-between">
                           <span className="text-white text-xs truncate max-w-[200px]">{file.name}</span>
                           <span className="text-white/80 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 flex flex-col items-center justify-center w-full h-full pointer-events-none">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${isDragging ? 'bg-emerald-500 text-white scale-110' : 'bg-input text-muted-foreground group-hover:scale-110 group-hover:bg-emerald-500/10 group-hover:text-emerald-500'}`}>
                        <UploadCloud className="w-7 h-7" />
                      </div>
                      <p className="text-foreground font-medium text-sm mb-1">
                        {isDragging ? 'Drop receipt here' : 'Click or drag receipt to upload'}
                      </p>
                      <p className="text-muted-foreground text-xs">JPEG, PNG, WEBP</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleScan}
                  disabled={!file || scanning}
                  className="w-full mt-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
                >
                  {scanning ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Extracting...</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> Extract Data</>
                  )}
                </button>
                
                <div className="mt-4 flex items-center justify-center">
                  <button 
                    onClick={startManualMode}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  >
                    <PenLine className="w-4 h-4" /> Enter details manually instead
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side - Review */}
            <div className="flex flex-col gap-6">
              <div className={`p-6 rounded-2xl border bg-card transition-all duration-500 h-full ${step === 2 ? 'ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/5 border-emerald-500/30 translate-y-0' : 'border-border translate-y-4'}`}>
                <div className={`transition-all duration-500 ${step === 2 ? 'opacity-100 pointer-events-auto' : 'opacity-50 pointer-events-none'}`}>
                  <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">2. Review & Confirm</h2>
                </div>
                
                {scanning ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-14 bg-input rounded-lg border border-border/50"></div>
                      <div className="h-14 bg-input rounded-lg border border-border/50"></div>
                    </div>
                    <div className="h-14 bg-input rounded-lg border border-border/50"></div>
                    <div className="h-14 bg-input rounded-lg border border-border/50"></div>
                    <div className="h-14 bg-input rounded-lg border border-border/50"></div>
                    <div className="h-10 bg-input rounded-lg border border-border/50 mt-4 w-full"></div>
                    <div className="flex justify-center mt-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Groq is analyzing your receipt...
                      </span>
                    </div>
                  </div>
                ) : (!proposedData && !manualMode) ? (
                  <div className="h-[280px] flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-muted/20 px-6 text-center">
                    <FileImage className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-foreground font-medium">Awaiting Receipt Data</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Upload a receipt or select manual entry <br/> to fill out data here.
                    </p>
                  </div>
                ) : (
                  <ReviewForm 
                    initialData={{...proposedData, accountId: initialAccountId || proposedData?.accountId}} 
                    source={manualMode ? "MANUAL" : "AI"} 
                    aiConfidence={proposedData?.aiConfidence || 0.95}
                    onSuccess={handleSuccess}
                  />
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
