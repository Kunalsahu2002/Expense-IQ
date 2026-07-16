'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Camera, CheckCircle, AlertTriangle, FileText, Loader2, Sparkles, X } from 'lucide-react';
import ReviewForm from '../../components/ReviewForm';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import StepProgress from '../../components/StepProgress';

export default function ScanPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // The AI proposed expense data
  const [proposedData, setProposedData] = useState<any>(null);
  const [partialError, setPartialError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    return () => stopCamera(); // Cleanup on unmount
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

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera API not supported. Are you on HTTP?");
        fileInputRef.current?.click();
        return;
      }

      // Request high resolution for better OCR
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(mediaStream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(e => console.error("Play failed", e));
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      fileInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
          setFile(newFile);
          stopCamera();
          setPartialError('');
        }
      }, 'image/jpeg', 1.0); // max quality for OCR
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  if (loading || !user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPartialError('');
    }
  };

  const handleScan = async () => {
    if (!file) return;

    setScanning(true);
    setPartialError('');
    setProposedData(null);

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
        setPartialError(err.response?.data?.message || 'Failed to scan receipt. Please try again.');
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-8 animate-in">
      <PageHeader
        title="Scan Receipt"
        subtitle={<>Take a photo of your receipt. <br /><span className="text-emerald-600 dark:text-emerald-400 font-medium">AI proposes, you decide.</span></>}
      />

      <StepProgress step={proposedData || scanning ? 2 : 1} label1="Capture" label2="Review" />

      {partialError && (
        <div className="mb-6 p-4 rounded-xl border-l-4 border-l-yellow-500 flex items-start gap-3 bg-yellow-500/10">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-yellow-700 dark:text-yellow-400 font-medium text-sm">Action Required</h3>
            <p className="text-muted-foreground text-sm mt-1">{partialError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side - Upload */}
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="text-lg font-semibold text-foreground mb-4">1. Take Photo</h2>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {!stream && !file ? (
              <div
                onClick={startCamera}
                className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all border-border hover:border-emerald-500/30 bg-muted/30 hover:bg-input"
              >
                <div className="w-12 h-12 rounded-full bg-input flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium text-sm">Tap to open camera</p>
                <p className="text-muted-foreground text-xs mt-1">We'll scan the receipt automatically</p>
              </div>
            ) : stream ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center border border-border">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4 z-10">
                  <button
                    onClick={stopCamera}
                    className="p-3 rounded-full bg-black/50 text-white backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <button
                    onClick={capturePhoto}
                    className="w-14 h-14 rounded-full bg-white border-4 border-emerald-500 shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
                  >
                  </button>
                </div>
              </div>
            ) : file && previewUrl ? (
              <div className="border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 rounded-xl p-4 flex flex-col items-center text-center relative overflow-hidden group">
                <div className="absolute inset-0 w-full h-full p-2">
                  <div className="relative w-full h-full rounded-lg overflow-hidden border border-border bg-black/5">
                    <img src={previewUrl} alt="Captured receipt" className="w-full h-full object-contain" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); startCamera(); }}
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
                {/* Invisible spacer to maintain height */}
                <div className="p-8 flex flex-col items-center justify-center w-full min-h-[200px] pointer-events-none opacity-0">
                </div>
              </div>
            ) : null}

            <button
              onClick={handleScan}
              disabled={!file || scanning}
              className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scanning ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Extract Data</>
              )}
            </button>
          </Card>
        </div>

        {/* Right Side - Review */}
        <div className="flex flex-col gap-6">
          <Card className={`transition-all duration-500 h-full ${proposedData || scanning ? 'ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/5 translate-y-0' : 'translate-y-4'}`}>
            <div className={`transition-all duration-500 ${proposedData || scanning ? 'opacity-100 pointer-events-auto' : 'opacity-50 pointer-events-none'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">2. Review & Confirm</h2>
              </div>

              {!proposedData ? (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-muted/20 text-center px-6">
                  <Camera className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-foreground font-medium">Awaiting Receipt Photo</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Take a photo of a receipt <br /> to review the extracted data here.
                  </p>
                </div>
              ) : (
                <ReviewForm
                  initialData={proposedData}
                  source="AI"
                  aiConfidence={proposedData.aiConfidence || 0.95}
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
