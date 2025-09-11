import Plyr from 'plyr';
import { animate } from 'animejs';
import type { VideoCommand, VideoState } from './socketManager';

export interface PlyrVideoPlayer {
  id: string;
  platform: 'youtube' | 'peertube';
  plyr: Plyr;
  slideIndex: number;
  isReady: boolean;
  state: VideoState;
  container: HTMLElement;
  originalRect?: DOMRect;
  isFullscreen?: boolean;
}

export class PlyrVideoManager {
  private players: Map<string, PlyrVideoPlayer> = new Map();
  private currentSlideIndex = 0;

  constructor() {
    // Initialize Plyr CSS
    this.injectPlyrStyles();
  }

  private injectPlyrStyles() {
    if (typeof window !== 'undefined' && !document.querySelector('#plyr-styles')) {
      const link = document.createElement('link');
      link.id = 'plyr-styles';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.plyr.io/3.7.8/plyr.css';
      document.head.appendChild(link);
    }
  }

  setCurrentSlide(slideIndex: number) {
    // Pause videos on the previous slide
    if (this.currentSlideIndex !== slideIndex) {
      this.pauseVideosOnSlide(this.currentSlideIndex);
    }
    this.currentSlideIndex = slideIndex;
  }

  registerVideoElement(element: HTMLElement, slideIndex: number) {
    const plyrElement = element.querySelector('.plyr__video-embed');
    if (!plyrElement) {
      console.warn('🚨 No Plyr video element found');
      console.log('🔍 Element HTML:', element.innerHTML);
      return;
    }

    const platform = element.getAttribute('data-video-platform') as 'youtube' | 'peertube';
    const videoId = element.getAttribute('data-video-id') || '';
    
    // Don't re-register if already exists
    if (this.players.has(videoId)) {
      console.log('🔄 Player already registered for:', videoId);
      return;
    }
    
    console.log('🎬 Registering Plyr video element:', { platform, videoId, slideIndex });
    console.log('🔍 Found plyr element:', plyrElement);
    
    try {
      // Initialize Plyr
      const plyr = new Plyr(plyrElement as HTMLElement, {
        controls: [
          'play-large', // The large play button in the center
          'restart', // Restart playback
          'rewind', // Rewind by the seek time (default 10 seconds)
          'play', // Play/pause playback
          'fast-forward', // Fast forward by the seek time (default 10 seconds)
          'progress', // The progress bar and scrub for playback and buffering
          'current-time', // The current time of playback
          'duration', // The full duration of the media
          'mute', // Toggle mute
          'volume', // Volume control
          'captions', // Toggle captions
          'settings', // Settings menu
          'pip', // Picture-in-picture (currently Safari only)
          'airplay', // Airplay (currently Safari only)
          'fullscreen', // Toggle fullscreen
        ],
        youtube: {
          noCookie: true, // Use youtube-nocookie.com
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          modestbranding: 1
        },
        vimeo: {
          byline: false,
          portrait: false,
          title: false,
          speed: true,
          transparent: false
        }
      });

      const player: PlyrVideoPlayer = {
        id: videoId,
        platform,
        plyr,
        slideIndex,
        isReady: false,
        container: element,
        isFullscreen: false,
        state: {
          videoId,
          playing: false,
          currentTime: 0,
          duration: 0,
          slideIndex
        }
      };

      this.players.set(videoId, player);
      console.log('📋 Total registered Plyr players:', this.players.size);

      // Set up event listeners
      plyr.on('ready', () => {
        console.log('✅ Plyr ready for:', videoId);
        player.isReady = true;
        player.state.duration = plyr.duration;
      });

      plyr.on('loadstart', () => {
        console.log('🔄 Plyr loadstart for:', videoId);
      });

      plyr.on('canplay', () => {
        console.log('🎵 Plyr canplay for:', videoId);
        if (!player.isReady) {
          player.isReady = true;
          console.log('✅ Marking player as ready via canplay:', videoId);
        }
      });

      plyr.on('error', (event) => {
        console.error('🚨 Plyr error for:', videoId, event);
      });

      plyr.on('play', () => {
        console.log('▶️ Plyr play event for:', videoId);
        player.state.playing = true;
        // Animate video to fullscreen
        this.expandVideoToFullscreen(player);
        // Trigger custom event for overlay updates
        this.dispatchVideoStateChange(videoId, 'play');
      });

      plyr.on('pause', () => {
        console.log('⏸️ Plyr pause event for:', videoId);
        player.state.playing = false;
        // Animate video back to normal size
        this.shrinkVideoToOriginal(player);
        // Trigger custom event for overlay updates
        this.dispatchVideoStateChange(videoId, 'pause');
      });

      plyr.on('timeupdate', () => {
        player.state.currentTime = plyr.currentTime;
      });

      plyr.on('ended', () => {
        player.state.playing = false;
        // Trigger custom event for overlay updates
        this.dispatchVideoStateChange(videoId, 'ended');
      });

      // Add click event listener for spacebar-like functionality
      const container = element;
      const clickHandler = (event: Event) => {
        // Check if click is on the video area, not controls
        const target = event.target as HTMLElement;
        if (!target.closest('.plyr__controls')) {
          console.log('🖱️ Video area clicked:', videoId);
          event.stopPropagation(); // Prevent slide navigation
          if (player.state.playing) {
            this.pauseVideo(player);
          } else {
            this.playVideo(player);
          }
        }
      };
      container.addEventListener('click', clickHandler);

      // Fallback: Mark as ready after 2 seconds if not ready yet
      setTimeout(() => {
        if (!player.isReady) {
          console.warn('⏰ Plyr ready timeout, marking as ready anyway:', videoId);
          player.isReady = true;
        }
      }, 2000);

    } catch (error) {
      console.error('🚨 Error initializing Plyr:', error);
    }
  }

  async executeCommand(command: VideoCommand) {
    console.log('🎬 PlyrVideoManager executing command:', command);
    const player = this.players.get(command.videoId);
    
    if (!player) {
      console.warn('🚨 Plyr player not found for videoId:', command.videoId);
      console.log('📋 Available players:', Array.from(this.players.keys()));
      return;
    }
    
    if (!player.isReady) {
      console.warn('🚨 Plyr player not ready for videoId:', command.videoId);
      return;
    }

    console.log('✅ Executing Plyr command for player:', player.platform, player.id);

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

  private playVideo(player: PlyrVideoPlayer) {
    console.log('▶️ Playing Plyr video:', player.id, player.platform);
    console.log('🔍 Plyr ready state:', player.isReady);
    console.log('🔍 Plyr instance:', player.plyr);
    console.log('🔍 Plyr paused state:', player.plyr.paused);
    console.log('🔍 Plyr playing state:', player.plyr.playing);
    console.log('🔍 Plyr duration:', player.plyr.duration);
    console.log('🔍 Plyr current time:', player.plyr.currentTime);
    
    try {
      if (!player.isReady) {
        console.warn('🚨 Plyr not ready, waiting...');
        setTimeout(() => this.playVideo(player), 100);
        return;
      }
      
      // Try multiple approaches to start playback
      console.log('🎯 Attempting to play video...');
      
      // First try the direct play method
      const result = player.plyr.play();
      console.log('🎬 Play result:', result);
      
      // Also try triggering a click on the play button as fallback
      setTimeout(() => {
        if (player.plyr.paused) {
          console.log('🔄 Video still paused, trying play button click');
          const playButton = player.container.querySelector('.plyr__control--overlaid');
          if (playButton) {
            (playButton as HTMLElement).click();
          }
        }
      }, 500);
      
      // Handle promise-based play
      if (result && typeof result.then === 'function') {
        result.then(() => {
          console.log('✅ Video play promise resolved');
          player.state.playing = true;
        }).catch((error) => {
          console.error('🚨 Video play promise rejected:', error);
          console.log('🔄 Trying alternative play method...');
          // Try clicking the play button
          const playButton = player.container.querySelector('.plyr__control--overlaid');
          if (playButton) {
            (playButton as HTMLElement).click();
          }
        });
      } else {
        player.state.playing = true;
      }
    } catch (error) {
      console.error('🚨 Error playing video:', error);
    }
  }

  private pauseVideo(player: PlyrVideoPlayer) {
    console.log('⏸️ Pausing Plyr video:', player.id, player.platform);
    console.log('🔍 Plyr ready state:', player.isReady);
    console.log('🔍 Plyr paused state:', player.plyr.paused);
    
    try {
      if (!player.isReady) {
        console.warn('🚨 Plyr not ready for pause');
        return;
      }
      
      player.plyr.pause();
      console.log('✅ Pause command sent');
      player.state.playing = false;
    } catch (error) {
      console.error('🚨 Error pausing video:', error);
    }
  }

  private seekVideo(player: PlyrVideoPlayer, time: number) {
    console.log('⏩ Seeking Plyr video to:', time, 'seconds');
    try {
      player.plyr.currentTime = time;
      player.state.currentTime = time;
    } catch (error) {
      console.error('🚨 Error seeking video:', error);
    }
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

  getVideoOnSlide(slideIndex: number): PlyrVideoPlayer | undefined {
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

  private expandVideoToFullscreen(player: PlyrVideoPlayer) {
    if (player.isFullscreen) return;

    console.log('🎬 Entering fullscreen with Plyr API');
    
    player.isFullscreen = true;
    player.plyr.fullscreen.enter();

    console.log('✨ Video fullscreen entered');
  }

  private shrinkVideoToOriginal(player: PlyrVideoPlayer) {
    if (!player.isFullscreen) return;

    console.log('🎬 Exiting fullscreen with Plyr API');
    player.isFullscreen = false;
    
    player.plyr.fullscreen.exit();

    console.log('✨ Video fullscreen exited');
  }

  dispose() {
    this.pauseAllVideos();
    
    // Clean up any fullscreen videos
    this.players.forEach(player => {
      if (player.isFullscreen) {
        player.container.style.transform = '';
        player.container.style.position = '';
        player.container.style.zIndex = '';
      }
      
      try {
        player.plyr.destroy();
      } catch (error) {
        console.warn('Error disposing Plyr player:', error);
      }
    });
    
    this.players.clear();
  }

  private dispatchVideoStateChange(videoId: string, event: 'play' | 'pause' | 'ended') {
    // Dispatch custom event for components to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plyr-video-state-change', {
        detail: { videoId, event }
      }));
    }
  }
}

// Global instance for managing Plyr videos
export const plyrVideoManager = new PlyrVideoManager();