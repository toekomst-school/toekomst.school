import type { MarkedExtension, Tokens } from 'marked';

interface VideoOptions {
  width?: string;
  height?: string;
  autoplay?: boolean;
}

/**
 * Parse video options from markdown syntax
 * Example: ![video|width:800|height:450](youtube:VIDEO_ID)
 */
function parseVideoOptions(alt: string): { title: string; options: VideoOptions } {
  const parts = alt.split('|');
  const title = parts[0] || 'video';
  const options: VideoOptions = {};

  for (let i = 1; i < parts.length; i++) {
    const [key, value] = parts[i].split(':');
    if (key === 'width') options.width = value;
    if (key === 'height') options.height = value;
    if (key === 'autoplay') options.autoplay = value === 'true';
  }

  return { title, options };
}

/**
 * Custom Marked extension for video embeds
 * Supports:
 * - YouTube: ![video](youtube:VIDEO_ID)
 * - PeerTube: ![video](peertube:INSTANCE/VIDEO_ID)
 */
export const videoExtension: MarkedExtension = {
  name: 'video',
  level: 'inline',
  start(src) {
    return src.match(/!\[.*?\]\((youtube|peertube):/)?.index;
  },
  tokenizer(src, tokens) {
    const match = /^!\[([^\]]*)\]\((youtube|peertube):([^)]+)\)/.exec(src);
    if (match) {
      const [fullMatch, alt, platform, videoId] = match;
      const { title, options } = parseVideoOptions(alt);
      
      return {
        type: 'video',
        raw: fullMatch,
        platform,
        videoId,
        title,
        options
      };
    }
    return false;
  },
  renderer(token) {
    if (token.type !== 'video') return false;
    
    const { platform, videoId, options } = token;
    let embedHtml = '';
    let dataAttributes = `data-video-platform="${platform}" data-video-id="${videoId}"`;

    if (options.width) dataAttributes += ` data-video-width="${options.width}"`;
    if (options.height) dataAttributes += ` data-video-height="${options.height}"`;
    if (options.autoplay) dataAttributes += ` data-video-autoplay="true"`;

    switch (platform) {
      case 'youtube':
        embedHtml = createYouTubeEmbed(videoId, options);
        break;
      case 'peertube':
        embedHtml = createPeerTubeEmbed(videoId, options);
        break;
      default:
        return false;
    }

    // Wrap in a container div for better control
    return `<div class="video-embed-container" ${dataAttributes}>
      ${embedHtml}
    </div>`;
  }
};

function createYouTubeEmbed(videoId: string, options: VideoOptions): string {
  const width = options.width || '100%';
  const height = options.height || '450px';
  const autoplay = options.autoplay ? 'data-plyr-autoplay' : '';
  
  return `
    <div class="plyr-video-wrapper" style="width: ${width}; height: ${height};">
      <div 
        class="plyr__video-embed" 
        id="plyr-${videoId}"
        data-plyr-provider="youtube" 
        data-plyr-embed-id="${videoId}"
        ${autoplay}
      >
        <iframe
          src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0"
          allowfullscreen
          allowtransparency
          allow="autoplay">
        </iframe>
      </div>
    </div>
  `;
}

function createPeerTubeEmbed(instanceAndId: string, options: VideoOptions): string {
  const width = options.width || '100%';
  const height = options.height || '450px';
  
  // Parse instance and video ID
  const parts = instanceAndId.split('/');
  if (parts.length < 2) {
    console.error('Invalid PeerTube video format. Expected: instance.com/VIDEO_ID');
    return '<div class="video-error">Invalid PeerTube video URL</div>';
  }

  const instance = parts[0];
  const videoId = parts.slice(1).join('/');
  const autoplay = options.autoplay ? 'data-plyr-autoplay' : '';
  const embedUrl = `https://${instance}/videos/embed/${videoId}`;
  
  return `
    <div class="plyr-video-wrapper" style="width: ${width}; height: ${height};">
      <div 
        class="plyr__video-embed" 
        id="plyr-peertube-${videoId.replace(/\//g, '-')}"
        data-plyr-provider="vimeo"
        data-plyr-embed-id="${embedUrl}"
        ${autoplay}
      >
        <iframe
          src="${embedUrl}?api=1"
          allowfullscreen
          allowtransparency
          allow="autoplay">
        </iframe>
      </div>
    </div>
  `;
}

// CSS styles for Plyr video containers
export const videoStyles = `
  .video-embed-container {
    position: relative;
    width: 100%;
    max-width: 800px;
    margin: 1rem auto;
  }

  .plyr-video-wrapper {
    position: relative;
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    background: rgba(0, 0, 0, 0.05);
  }

  .video-error {
    padding: 2rem;
    background: #fee;
    color: #c00;
    border-radius: 8px;
    text-align: center;
  }

  /* Plyr custom styling */
  .plyr {
    border-radius: 12px;
  }

  .plyr__video-wrapper {
    border-radius: 12px;
    overflow: hidden;
  }

  .plyr--video .plyr__controls {
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }

  .plyr__control--overlaid {
    background: rgba(59, 163, 155, 0.9);
    border-radius: 50%;
    transition: all 0.3s ease;
  }

  .plyr__control--overlaid:hover {
    background: rgba(59, 163, 155, 1);
    transform: scale(1.1);
  }

  .plyr__control:hover {
    background: rgba(59, 163, 155, 0.2);
  }

  .plyr__progress__played {
    background: #3ba39b;
  }

  .plyr__volume--display {
    color: #3ba39b;
  }

  /* Responsive video containers */
  @media (max-width: 768px) {
    .plyr-video-wrapper {
      max-height: 300px;
    }
  }
`;