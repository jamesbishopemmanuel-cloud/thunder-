/**
 * Call Interface Component
 * Veylora - Connect • Create • Share
 */

<template>
  <div class="call-interface">
    <!-- Call Container -->
    <div class="call-container" :class="{ 'minimized': isMinimized }">
      <!-- Local Video -->
      <div class="video-container local">
        <video
          ref="localVideo"
          autoplay
          muted
          playsinline
          class="video-stream"
        ></video>
        <div class="video-label">You</div>
      </div>

      <!-- Remote Video -->
      <div class="video-container remote" v-if="remoteStreamActive">
        <video
          ref="remoteVideo"
          autoplay
          playsinline
          class="video-stream"
        ></video>
        <div class="video-label">{{ recipientName }}</div>
      </div>

      <!-- Audio Only Layout -->
      <div v-else-if="callType === 'audio'" class="audio-call">
        <div class="avatar-large">
          <img :src="recipientAvatar" :alt="recipientName">
        </div>
        <h2>{{ recipientName }}</h2>
        <p class="call-duration">{{ callDuration }}</p>
        <p class="call-status">{{ callStatus }}</p>
      </div>

      <!-- Call Controls -->
      <div class="call-controls">
        <!-- Mute/Unmute -->
        <button
          @click="toggleAudio"
          :class="{ active: audioEnabled }"
          class="control-btn mic-btn"
          :title="audioEnabled ? 'Mute' : 'Unmute'"
        >
          <i :class="audioEnabled ? 'icon-mic' : 'icon-mic-off'"></i>
        </button>

        <!-- Video On/Off (for video calls) -->
        <button
          v-if="callType === 'video'"
          @click="toggleVideo"
          :class="{ active: videoEnabled }"
          class="control-btn video-btn"
          :title="videoEnabled ? 'Stop Video' : 'Start Video'"
        >
          <i :class="videoEnabled ? 'icon-video' : 'icon-video-off'"></i>
        </button>

        <!-- Speaker On/Off -->
        <button
          @click="toggleSpeaker"
          :class="{ active: speakerEnabled }"
          class="control-btn speaker-btn"
          :title="speakerEnabled ? 'Mute Speaker' : 'Unmute Speaker'"
        >
          <i :class="speakerEnabled ? 'icon-volume' : 'icon-volume-off'"></i>
        </button>

        <!-- End Call -->
        <button
          @click="endCall"
          class="control-btn end-call-btn"
          title="End Call"
        >
          <i class="icon-phone-off"></i>
        </button>

        <!-- More Options -->
        <button
          @click="toggleOptions"
          class="control-btn options-btn"
          title="More Options"
        >
          <i class="icon-more"></i>
        </button>
      </div>

      <!-- Call Options Menu -->
      <div v-if="showOptions" class="call-options">
        <button @click="shareScreen" class="option-item">
          <i class="icon-share"></i> Share Screen
        </button>
        <button @click="recordCall" class="option-item" :class="{ recording: isRecording }">
          <i class="icon-record"></i> {{ isRecording ? 'Stop Recording' : 'Record' }}
        </button>
        <button @click="toggleMinimize" class="option-item">
          <i class="icon-minimize"></i> Minimize
        </button>
      </div>

      <!-- Incoming Call UI -->
      <div v-if="callStatus === 'incoming'" class="incoming-call">
        <div class="incoming-header">
          <img :src="recipientAvatar" :alt="recipientName" class="incoming-avatar">
          <h3>{{ recipientName }}</h3>
          <p>is calling...</p>
        </div>
        <div class="incoming-actions">
          <button @click="acceptCall" class="accept-btn">
            <i class="icon-phone"></i> Accept
          </button>
          <button @click="rejectCall" class="reject-btn">
            <i class="icon-phone-off"></i> Reject
          </button>
        </div>
      </div>

      <!-- Outgoing Call UI -->
      <div v-if="callStatus === 'calling'" class="outgoing-call">
        <div class="outgoing-header">
          <img :src="recipientAvatar" :alt="recipientName" class="outgoing-avatar">
          <h3>{{ recipientName }}</h3>
          <p>Calling...</p>
          <div class="calling-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
        <button @click="endCall" class="cancel-btn">
          <i class="icon-phone-off"></i> Cancel
        </button>
      </div>

      <!-- Minimize Button (when minimized) -->
      <button
        v-if="isMinimized"
        @click="toggleMinimize"
        class="restore-btn"
        :title="recipientName"
      >
        <span>{{ recipientName }} - {{ callDuration }}</span>
      </button>
    </div>

    <!-- Screen Share Container -->
    <div v-if="screenShareActive" class="screen-share-container">
      <div class="screen-content">
        <video
          ref="screenVideo"
          autoplay
          class="screen-stream"
        ></video>
      </div>
      <button @click="stopScreenShare" class="stop-share-btn">
        <i class="icon-x"></i> Stop Sharing
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CallInterface',
  props: {
    recipientId: {
      type: String,
      required: true
    },
    recipientName: {
      type: String,
      required: true
    },
    recipientAvatar: {
      type: String,
      required: true
    },
    callType: {
      type: String,
      enum: ['audio', 'video'],
      default: 'video'
    },
    callStatus: {
      type: String,
      enum: ['incoming', 'calling', 'active', 'ended'],
      default: 'calling'
    }
  },
  data() {
    return {
      audioEnabled: true,
      videoEnabled: this.callType === 'video',
      speakerEnabled: true,
      isMinimized: false,
      showOptions: false,
      isRecording: false,
      screenShareActive: false,
      remoteStreamActive: false,
      callDuration: '00:00',
      callStartTime: null,
      durationInterval: null,
      localStream: null,
      remoteStream: null,
      screenStream: null,
      peerConnection: null
    };
  },
  methods: {
    async acceptCall() {
      this.$emit('call-accepted');
      this.callStatus = 'active';
      await this.initializeLocalStream();
    },
    async rejectCall() {
      this.$emit('call-rejected');
      this.endCall();
    },
    async initializeLocalStream() {
      try {
        const constraints = {
          audio: this.audioEnabled,
          video: this.videoEnabled && this.callType === 'video'
        };

        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (this.$refs.localVideo) {
          this.$refs.localVideo.srcObject = this.localStream;
        }

        // Start call duration timer
        this.callStartTime = Date.now();
        this.startDurationTimer();

        this.$emit('stream-ready', this.localStream);
      } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Unable to access camera/microphone. Please check permissions.');
      }
    },
    startDurationTimer() {
      this.durationInterval = setInterval(() => {
        if (this.callStartTime) {
          const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
          const hours = Math.floor(elapsed / 3600);
          const minutes = Math.floor((elapsed % 3600) / 60);
          const seconds = elapsed % 60;

          if (hours > 0) {
            this.callDuration = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          } else {
            this.callDuration = `${minutes}:${String(seconds).padStart(2, '0')}`;
          }
        }
      }, 1000);
    },
    toggleAudio() {
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = !track.enabled;
        });
        this.audioEnabled = !this.audioEnabled;
      }
    },
    toggleVideo() {
      if (this.localStream) {
        this.localStream.getVideoTracks().forEach(track => {
          track.enabled = !track.enabled;
        });
        this.videoEnabled = !this.videoEnabled;
      }
    },
    toggleSpeaker() {
      if (this.$refs.remoteVideo) {
        this.$refs.remoteVideo.muted = !this.$refs.remoteVideo.muted;
      }
      this.speakerEnabled = !this.speakerEnabled;
    },
    async shareScreen() {
      try {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });

        if (this.$refs.screenVideo) {
          this.$refs.screenVideo.srcObject = this.screenStream;
        }

        this.screenShareActive = true;

        // Listen for when user stops sharing
        this.screenStream.getTracks()[0].onended = () => {
          this.stopScreenShare();
        };

        this.$emit('screen-shared', this.screenStream);
      } catch (error) {
        console.error('Error sharing screen:', error);
        if (error.name !== 'NotAllowedError') {
          alert('Unable to share screen.');
        }
      }
    },
    stopScreenShare() {
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;
        this.screenShareActive = false;
        this.$emit('screen-share-stopped');
      }
    },
    recordCall() {
      this.isRecording = !this.isRecording;
      this.$emit('recording-toggled', this.isRecording);
    },
    toggleOptions() {
      this.showOptions = !this.showOptions;
    },
    toggleMinimize() {
      this.isMinimized = !this.isMinimized;
    },
    async endCall() {
      // Clean up
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
      }
      if (this.durationInterval) {
        clearInterval(this.durationInterval);
      }

      this.$emit('call-ended');
    },
    setRemoteStream(stream) {
      this.remoteStream = stream;
      if (this.$refs.remoteVideo) {
        this.$refs.remoteVideo.srcObject = stream;
      }
      this.remoteStreamActive = true;
    }
  },
  async mounted() {
    if (this.callStatus === 'active') {
      await this.initializeLocalStream();
    }

    // Listen for remote stream
    window.addEventListener('remote-stream', (event) => {
      this.setRemoteStream(event.detail);
    });
  },
  beforeUnmount() {
    this.endCall();
  }
};
</script>

<style scoped>
.call-interface {
  display: flex;
  height: 100%;
  background: #000;
  position: relative;
}

.call-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.call-container.minimized {
  width: 320px;
  height: 180px;
  border: 2px solid #007bff;
  border-radius: 8px;
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.video-container {
  position: absolute;
  overflow: hidden;
  background: #000;
}

.video-container.local {
  width: 120px;
  height: 120px;
  bottom: 20px;
  right: 20px;
  border-radius: 8px;
  border: 2px solid #007bff;
  z-index: 10;
}

.video-container.remote {
  width: 100%;
  height: 100%;
}

.call-container.minimized .video-container.remote {
  display: none;
}

.call-container.minimized .video-container.local {
  width: 100%;
  height: 100%;
  position: static;
  border-radius: 8px;
  bottom: auto;
  right: auto;
}

.video-stream {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-label {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.audio-call {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: white;
}

.avatar-large {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #007bff;
}

.avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.audio-call h2 {
  font-size: 28px;
  margin: 0;
}

.call-duration {
  font-size: 24px;
  font-weight: 300;
  color: #ccc;
  margin: 0;
}

.call-status {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.call-controls {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 15px;
  z-index: 20;
}

.call-container.minimized .call-controls {
  display: none;
}

.control-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.control-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
}

.control-btn.active {
  background: #007bff;
}

.end-call-btn {
  background: #dc3545;
}

.end-call-btn:hover {
  background: #c82333;
}

.call-options {
  position: absolute;
  bottom: 100px;
  right: 30px;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 8px;
  overflow: hidden;
  z-index: 20;
  min-width: 180px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.option-item:last-child {
  border-bottom: none;
}

.option-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.option-item.recording {
  color: #dc3545;
}

.incoming-call,
.outgoing-call {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30px;
  color: white;
}

.incoming-header,
.outgoing-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.incoming-avatar,
.outgoing-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #007bff;
}

.incoming-header h3,
.outgoing-header h3 {
  font-size: 24px;
  margin: 0;
}

.incoming-header p,
.outgoing-header p {
  font-size: 14px;
  color: #ccc;
  margin: 0;
}

.calling-dots {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.calling-dots span {
  width: 8px;
  height: 8px;
  background: #007bff;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

.calling-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.calling-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.incoming-actions {
  display: flex;
  gap: 20px;
}

.accept-btn,
.reject-btn,
.cancel-btn {
  padding: 12px 32px;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.accept-btn {
  background: #28a745;
  color: white;
}

.accept-btn:hover {
  background: #218838;
  transform: scale(1.05);
}

.reject-btn,
.cancel-btn {
  background: #dc3545;
  color: white;
}

.reject-btn:hover,
.cancel-btn:hover {
  background: #c82333;
  transform: scale(1.05);
}

.restore-btn {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  z-index: 30;
}

.screen-share-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.screen-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.screen-stream {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.stop-share-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: #dc3545;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10;
}

.stop-share-btn:hover {
  background: #c82333;
}
</style>
