import type { VideoCommand, VideoState } from './socketManager';

export interface VideoPlayer {
  id: string;
  platform: 'youtube' | 'peertube';
  iframe: HTMLIFrameElement;
  slideIndex: number;
  isReady: boolean;
  state: VideoState;
}

export class VideoManager {
  private players: Map<string, VideoPlayer> = new Map();
  private youtubeAPIReady = false;
  private currentSlideIndex = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadYouTubeAPI();
    }
  }

  private loadYouTubeAPI() {
    if (window.YT) {
      this.youtubeAPIReady = true;
      return;
    }

    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      this.youtubeAPIReady = true;
      // Initialize any pending YouTube players
      this.players.forEach(player => {
        if (player.platform === 'youtube' && !player.isReady) {
          this.initializeYouTubePlayer(player);
        }
      });
    };
  }

  setCurrentSlide(slideIndex: number) {
    // Pause videos on the previous slide
    if (this.currentSlideIndex !== slideIndex) {
      this.pauseVideosOnSlide(this.currentSlideIndex);
    }
    this.currentSlideIndex = slideIndex;
  }

  registerVideoElement(element: HTMLElement, slideIndex: number) {
    const iframe = element.querySelector('iframe');
    if (!iframe) {
      console.warn('🚨 No iframe found in video element');
      return;
    }

    const platform = element.getAttribute('data-video-platform') as 'youtube' | 'peertube';
    const videoId = element.getAttribute('data-video-id') || '';
    
    console.log('🎬 Registering video element:', { platform, videoId, slideIndex });
    
    const player: VideoPlayer = {
      id: videoId,
      platform,
      iframe,
      slideIndex,
      isReady: false,
      state: {
        videoId,
        playing: false,
        currentTime: 0,
        duration: 0,
        slideIndex
      }
    };

    this.players.set(videoId, player);
    console.log('📋 Total registered players:', this.players.size);

    if (platform === 'youtube') {
      console.log('▶️ Initializing YouTube player for:', videoId);
      this.initializeYouTubePlayer(player);
    } else if (platform === 'peertube') {
      console.log('▶️ Initializing PeerTube player for:', videoId);
      this.initializePeerTubePlayer(player);
    }
  }

  private initializeYouTubePlayer(player: VideoPlayer) {
    // YouTube players are already initialized via iframe with enablejsapi=1
    // We'll communicate via postMessage
    player.isReady = true;
    
    // Add click event listener to iframe container for play/pause toggle
    const container = player.iframe.parentElement;
    if (container) {
      console.log('🖱️ Adding click handler to video container:', player.id);
      const clickHandler = (event: Event) => {
        console.log('🖱️ Video container clicked:', player.id);
        event.stopPropagation(); // Prevent slide navigation
        if (player.state.playing) {
          console.log('⏸️ Video is playing, pausing...');
          this.pauseVideo(player);
        } else {
          console.log('▶️ Video is paused, playing...');
          this.playVideo(player);
        }
      };
      container.addEventListener('click', clickHandler);
      // Store the handler for cleanup if needed
      (container as any)._videoClickHandler = clickHandler;
    } else {
      console.warn('🚨 No container found for video iframe');
    }
  }

  private initializePeerTubePlayer(player: VideoPlayer) {
    // PeerTube players use postMessage API
    player.isReady = true;
  }

  async executeCommand(command: VideoCommand) {
    console.log('🎬 VideoManager executing command:', command);
    const player = this.players.get(command.videoId);
    
    if (!player) {
      console.warn('🚨 Player not found for videoId:', command.videoId);
      console.log('📋 Available players:', Array.from(this.players.keys()));
      return;
    }
    
    if (!player.isReady) {
      console.warn('🚨 Player not ready for videoId:', command.videoId);
      return;
    }

    console.log('✅ Executing video command for player:', player.platform, player.id);

    switch (command.command) {
      case 'video-play':
        this.playVideo(player);
        break;
      case 'video-pause':
        this.pauseVideo(player);
        break;
      case 'video-seek':
        if (command.seekTime !== undefined) {
          this.seekVideo(player, command.seekTime);
        }
        break;
      case 'video-restart':
        this.seekVideo(player, 0);
        this.playVideo(player);
        break;
    }
  }

  private playVideo(player: VideoPlayer) {
    console.log('▶️ Playing video:', player.id, player.platform);
    if (player.platform === 'youtube') {
      const message = '{"event":"command","func":"playVideo","args":""}';
      console.log('📤 Sending YouTube play command:', message);
      player.iframe.contentWindow?.postMessage(message, '*');
    } else if (player.platform === 'peertube') {
      const message = { method: 'play' };
      console.log('📤 Sending PeerTube play command:', message);
      player.iframe.contentWindow?.postMessage(message, '*');
    }
    player.state.playing = true;
  }

  private pauseVideo(player: VideoPlayer) {
    console.log('⏸️ Pausing video:', player.id, player.platform);
    if (player.platform === 'youtube') {
      const message = '{"event":"command","func":"pauseVideo","args":""}';
      console.log('📤 Sending YouTube pause command:', message);
      player.iframe.contentWindow?.postMessage(message, '*');
    } else if (player.platform === 'peertube') {
      const message = { method: 'pause' };
      console.log('📤 Sending PeerTube pause command:', message);
      player.iframe.contentWindow?.postMessage(message, '*');
    }
    player.state.playing = false;
  }

  private seekVideo(player: VideoPlayer, time: number) {
    if (player.platform === 'youtube') {
      player.iframe.contentWindow?.postMessage(
        `{"event":"command","func":"seekTo","args":[${time},true]}`,
        '*'
      );
    } else if (player.platform === 'peertube') {
      player.iframe.contentWindow?.postMessage(
        { method: 'seek', currentTime: time },
        '*'
      );
    }
    player.state.currentTime = time;
  }

  pauseAllVideos() {
    this.players.forEach(player => {
      if (player.state.playing) {
        this.pauseVideo(player);
      }
    });
  }

  pauseVideosOnSlide(slideIndex: number) {
    this.players.forEach(player => {
      if (player.slideIndex === slideIndex && player.state.playing) {
        this.pauseVideo(player);
      }
    });
  }

  getVideoOnSlide(slideIndex: number): VideoPlayer | undefined {
    for (const player of this.players.values()) {
      if (player.slideIndex === slideIndex) {
        return player;
      }
    }
    return undefined;
  }

  getVideoState(videoId: string): VideoState | undefined {
    return this.players.get(videoId)?.state;
  }

  dispose() {
    this.pauseAllVideos();
    this.players.clear();
  }
}

// Global instance for managing videos
export const videoManager = new VideoManager();