'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Camera, Mic, AlertTriangle, CheckCircle } from 'lucide-react';

interface MediaPermissionCheckProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

export function MediaPermissionCheck({ onPermissionGranted, onPermissionDenied }: MediaPermissionCheckProps) {
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
    checking: true
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      setPermissions(prev => ({ ...prev, checking: true }));
      setError(null);

      // Check camera permission
      let cameraPermission = false;
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraPermission = true;
        cameraStream.getTracks().forEach(track => track.stop());
      } catch (cameraError) {
        console.log('Camera permission denied or not available');
      }

      // Check microphone permission
      let microphonePermission = false;
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphonePermission = true;
        micStream.getTracks().forEach(track => track.stop());
      } catch (micError) {
        console.log('Microphone permission denied or not available');
      }

      setPermissions({
        camera: cameraPermission,
        microphone: microphonePermission,
        checking: false
      });

      if (cameraPermission && microphonePermission) {
        onPermissionGranted();
      } else if (!cameraPermission && !microphonePermission) {
        setError('Camera and microphone access are required for video calls. Please enable them in your browser settings.');
        onPermissionDenied();
      } else {
        setError('Some media permissions are missing. Video calls may have limited functionality.');
        onPermissionDenied();
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setError('Unable to check media permissions. Please ensure your browser supports video calling.');
      setPermissions(prev => ({ ...prev, checking: false }));
      onPermissionDenied();
    }
  };

  const requestPermissions = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      // Check what we actually got
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      setPermissions({
        camera: videoTracks.length > 0,
        microphone: audioTracks.length > 0,
        checking: false
      });

      // Stop the stream
      stream.getTracks().forEach(track => track.stop());

      if (videoTracks.length > 0 && audioTracks.length > 0) {
        onPermissionGranted();
      } else {
        setError('Please allow both camera and microphone access for the best experience.');
        onPermissionDenied();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setError('Permission denied. Please allow camera and microphone access in your browser settings.');
      onPermissionDenied();
    }
  };

  if (permissions.checking) {
    return (
      <Alert className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Checking media permissions...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Media permissions are required for video calls.'}
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          <span>Camera:</span>
          {permissions.camera ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          <span className={permissions.camera ? 'text-green-600' : 'text-red-600'}>
            {permissions.camera ? 'Allowed' : 'Denied'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4" />
          <span>Microphone:</span>
          {permissions.microphone ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          <span className={permissions.microphone ? 'text-green-600' : 'text-red-600'}>
            {permissions.microphone ? 'Allowed' : 'Denied'}
          </span>
        </div>
      </div>

      {(!permissions.camera || !permissions.microphone) && (
        <Button onClick={requestPermissions} className="w-full">
          Grant Media Permissions
        </Button>
      )}

      <div className="text-sm text-gray-600">
        <p>If permissions are denied:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Click the camera/microphone icon in your browser's address bar</li>
          <li>Select "Allow" for camera and microphone access</li>
          <li>Refresh the page and try again</li>
        </ul>
      </div>
    </div>
  );
}
