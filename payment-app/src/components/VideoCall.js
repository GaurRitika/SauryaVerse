import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import './VideoCall.css';

const SERVER_URL = 'http://localhost:5000'; // Adjust this to your server URL
const socket = io(SERVER_URL);

const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function VideoCall() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [error, setError] = useState(null);
  const peerConnection = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const createPeerConnection = useCallback(() => {
    try {
      const pc = new RTCPeerConnection(configuration);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { candidate: event.candidate, roomId });
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote track');
        setRemoteStream(event.streams[0]);
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
      };

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      peerConnection.current = pc;
      console.log('PeerConnection created');
    } catch (err) {
      console.error('Error creating PeerConnection:', err);
      setError('Failed to create peer connection');
    }
  }, [localStream, roomId]);

  const handleCreateRoom = useCallback(() => {
    createPeerConnection();
    socket.emit('create-room');
  }, [createPeerConnection]);

  const handleJoinRoom = useCallback(() => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    createPeerConnection();
    socket.emit('join-room', roomId);
  }, [createPeerConnection, roomId]);

  const handleRoomCreated = useCallback((room) => {
    console.log('Room created:', room);
    setRoomId(room);
    setIsInCall(true);
  }, []);

  const handleRoomJoined = useCallback((room) => {
    console.log('Room joined:', room);
    setIsInCall(true);
    setRoomId(room);
  }, []);

  const handleInitiateCall = useCallback(async () => {
    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit('offer', { offer, roomId });
    } catch (err) {
      console.error('Error creating offer:', err);
      setError('Failed to create offer');
    }
  }, [roomId]);

  const handleOffer = useCallback(async (offer) => {
    if (!peerConnection.current) createPeerConnection();
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit('answer', { answer, roomId });
    } catch (err) {
      console.error('Error handling offer:', err);
      setError('Failed to handle offer');
    }
  }, [createPeerConnection, roomId]);

  const handleAnswer = useCallback(async (answer) => {
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error handling answer:', err);
      setError('Failed to handle answer');
    }
  }, []);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        console.log('User media accessed successfully');
        setLocalStream(stream);
        if (localVideoRef.current) {
          console.log('Setting local video source');
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error('Error accessing media devices:', err);
        setError('Failed to access camera and microphone');
      });

    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);
    socket.on('initiate_call', handleInitiateCall);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', (candidate) => {
      console.log('Received ICE candidate');
      if (peerConnection.current) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(err => console.error('Error adding ICE candidate:', err));
      } else {
        console.warn('Received ICE candidate before peer connection was created');
      }
    });

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('room-joined', handleRoomJoined);
      socket.off('initiate_call', handleInitiateCall);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate');
    };
  }, [handleRoomCreated, handleRoomJoined, handleInitiateCall, handleOffer, handleAnswer]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="video-call-container">
      <h2>Video Call</h2>
      {error && <p className="error-message">{error}</p>}
      <div className="video-grid">
        <div className="video-wrapper">
          <video ref={localVideoRef} autoPlay muted playsInline className="video-element" />
        </div>
        <div className="video-wrapper">
          <video ref={remoteVideoRef} autoPlay playsInline className="video-element" />
        </div>
      </div>
      {!isInCall ? (
        <div className="controls">
          <button onClick={handleCreateRoom}>Create Room</button>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Room ID"
          />
          <button onClick={handleJoinRoom}>Join Room</button>
        </div>
      ) : (
        <p className="room-info">In call. Room ID: {roomId}</p>
      )}
    </div>
  );
}

export default VideoCall;
