<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  
  export let platform: 'youtube' | 'peertube';
  export let videoId: string;
  export let width: string = '100%';
  export let height: string = '450';
  export let autoplay: boolean = false;
  export let controls: boolean = true;
  
  const dispatch = createEventDispatcher();
  
  let player: any;
  let playerElement: HTMLDivElement;
  let isReady = false;
  let isPlaying = false;
  let currentTime = 0;
  let duration = 0;
  
  // Unique ID for this player instance
  const playerId = `video-player-${Math.random().toString(36).substr(2, 9)}`;
  
  // YouTube API methods
  async function loadYouTubeAPI() {
    if (!browser) return;
    
    if (window.YT && window.YT.Player) {
      initYouTubePlayer();
      return;
    }
    
    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    
    // Wait for API to be ready
    window.onYouTubeIframeAPIReady = () => {
      initYouTubePlayer();
    };
  }
  
  function initYouTubePlayer() {
    if (!playerElement) return;
    
    player = new window.YT.Player(playerId, {
      height: height,
      width: width,
      videoId: videoId,
      playerVars: {
        autoplay: autoplay ? 1 : 0,
        controls: controls ? 1 : 0,
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    });
  }
  
  function onPlayerReady(event: any) {
    isReady = true;
    duration = player.getDuration();
    dispatch('ready', { player });
    
    // Start time tracking
    if (platform === 'youtube') {
      setInterval(() => {
        if (player && player.getCurrentTime) {
          currentTime = player.getCurrentTime();
          dispatch('timeupdate', { currentTime, duration });
        }
      }, 1000);
    }
  }
  
  function onPlayerStateChange(event: any) {
    const state = event.data;
    
    switch (state) {
      case window.YT.PlayerState.PLAYING:
        isPlaying = true;
        dispatch('play');
        break;
      case window.YT.PlayerState.PAUSED:
        isPlaying = false;
        dispatch('pause');
        break;
      case window.YT.PlayerState.ENDED:
        isPlaying = false;
        dispatch('ended');
        break;
    }
    
    dispatch('statechange', { playing: isPlaying, state });
  }
  
  function onPlayerError(event: any) {
    console.error('Video player error:', event);
    dispatch('error', { error: event.data });
  }
  
  // PeerTube player methods
  function initPeerTubePlayer() {
    if (!playerElement) return;
    
    const iframe = playerElement.querySelector('iframe');
    if (!iframe) return;
    
    // PeerTube uses postMessage API for controls
    player = {
      iframe: iframe,
      postMessage: (action: string, args?: any) => {
        iframe.contentWindow?.postMessage({ 
          method: action, 
          args: args 
        }, '*');
      }
    };
    
    // Listen for PeerTube player messages
    window.addEventListener('message', handlePeerTubeMessage);
    
    isReady = true;
    dispatch('ready', { player });
  }
  
  function handlePeerTubeMessage(event: MessageEvent) {
    if (!event.data || typeof event.data !== 'object') return;
    
    const { method, args } = event.data;
    
    switch (method) {
      case 'play':
        isPlaying = true;
        dispatch('play');
        break;
      case 'pause':
        isPlaying = false;
        dispatch('pause');
        break;
      case 'timeupdate':
        if (args) {
          currentTime = args.currentTime;
          duration = args.duration;
          dispatch('timeupdate', { currentTime, duration });
        }
        break;
    }
  }
  
  // Public control methods
  export function play() {
    if (!isReady) return;
    
    if (platform === 'youtube' && player.playVideo) {
      player.playVideo();
    } else if (platform === 'peertube') {
      player.postMessage('play');
    }
  }
  
  export function pause() {
    if (!isReady) return;
    
    if (platform === 'youtube' && player.pauseVideo) {
      player.pauseVideo();
    } else if (platform === 'peertube') {
      player.postMessage('pause');
    }
  }
  
  export function seekTo(seconds: number) {
    if (!isReady) return;
    
    if (platform === 'youtube' && player.seekTo) {
      player.seekTo(seconds, true);
    } else if (platform === 'peertube') {
      player.postMessage('seek', { currentTime: seconds });
    }
  }
  
  export function restart() {
    seekTo(0);
    play();
  }
  
  export function getState() {
    return {
      isReady,
      isPlaying,
      currentTime,
      duration,
      platform,
      videoId
    };
  }
  
  function createPeerTubeEmbedUrl() {
    const instance = videoId.split('/')[0];
    const videoPath = videoId.split('/').slice(1).join('/');
    const embedUrl = `https://${instance}/videos/embed/${videoPath}?api=1`;
    
    if (autoplay) {
      return `${embedUrl}&autoplay=1`;
    }
    
    return embedUrl;
  }
  
  onMount(() => {
    if (platform === 'youtube') {
      loadYouTubeAPI();
    } else if (platform === 'peertube') {
      // Wait for iframe to load
      setTimeout(initPeerTubePlayer, 1000);
    }
  });
  
  onDestroy(() => {
    if (platform === 'youtube' && player && player.destroy) {
      player.destroy();
    } else if (platform === 'peertube') {
      window.removeEventListener('message', handlePeerTubeMessage);
    }
  });
</script>

<div bind:this={playerElement} class="video-player-wrapper" data-platform={platform}>
  {#if platform === 'youtube'}
    <div id={playerId}></div>
  {:else if platform === 'peertube'}
    <iframe
      src={createPeerTubeEmbedUrl()}
      width={width}
      height={height}
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      title="PeerTube Video"
    ></iframe>
  {/if}
  
  {#if !isReady}
    <div class="video-loading">
      <div class="spinner"></div>
      <p>Loading video player...</p>
    </div>
  {/if}
</div>

<script lang="ts" context="module">
  declare global {
    interface Window {
      YT: any;
      onYouTubeIframeAPIReady: () => void;
    }
  }
</script>

<style>
  .video-player-wrapper {
    position: relative;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }
  
  .video-loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: 8px;
    z-index: 10;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  :global(.video-player-wrapper iframe) {
    width: 100%;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
</style>