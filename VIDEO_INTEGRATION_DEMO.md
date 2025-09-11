# Video Player Integration Demo

This demonstrates the new video player integration for YouTube and PeerTube videos in slideshows with remote control capabilities.

## How to Use

### 1. Adding Videos to Slides

Use the new markdown syntax in your slide content:

#### YouTube Video
```markdown
# My Presentation Slide

Here's an introduction to our topic.

![video](youtube:dQw4w9WgXcQ)

Some content after the video.
```

#### PeerTube Video
```markdown
# Another Slide

Check out this PeerTube video:

![video](peertube:framatube.org/videos/watch/0b04f13d-1e18-4f1d-814e-4979aa7c9c44)
```

#### Custom Video Dimensions
```markdown
![video|width:800|height:450](youtube:dQw4w9WgXcQ)
```

### 2. Remote Control Features

When presenting slides with videos:

1. **Automatic Detection**: The remote controller detects when the current slide contains a video
2. **Video Controls**: Shows Play, Pause, and Restart buttons
3. **Status Display**: Shows current playback status and time
4. **Synchronized Control**: Commands from remote are executed on the presenter screen

### 3. Presenter Features

- **Auto-pause**: Videos pause when leaving a slide
- **Click Control**: Click videos to play/pause
- **Socket Sync**: All video state changes are synchronized across devices

## Technical Implementation

### Architecture

- **Marked Extension**: Custom markdown parser for video embed syntax
- **Video Manager**: Handles multiple video players and lifecycle
- **Socket Communication**: Real-time commands between devices
- **YouTube API**: Full integration with YouTube IFrame API
- **PeerTube API**: PostMessage communication with PeerTube embeds

### Supported Platforms

- ✅ **YouTube**: Full API integration with play/pause/seek controls
- ✅ **PeerTube**: PostMessage API for basic controls
- 🔄 **Future**: Vimeo, Dailymotion, custom video files

### Security

- Uses YouTube's privacy-enhanced mode (youtube-nocookie.com)
- Validates video URLs and IDs
- Sandboxed iframe embeds for PeerTube
- CSP-compliant implementation

### Performance

- Lazy loading of video players
- YouTube API loaded on demand
- Video registration only on slide entry
- Automatic cleanup on slide exit

## Example Lesson

Here's a complete example of a lesson with embedded videos:

```markdown
# Introduction to Web Development

Welcome to our web development course!

---

# What is HTML?

HTML stands for HyperText Markup Language.

![video](youtube:UB1O30fR-EE)

Let's watch this introduction to HTML basics.

---

# CSS Fundamentals  

Now let's learn about styling with CSS:

![video|width:100%|height:400](youtube:yfoY53QXEnI)

Note: This video explains CSS selectors and properties.

---

# JavaScript Interactivity

Finally, let's see JavaScript in action:

![video](peertube:framatube.org/videos/watch/javascript-basics-tutorial)

JavaScript adds interactivity to web pages.

---

# Practice Time

Now it's time to practice what we've learned!

Try building your first webpage.
```

## Remote Control Usage

1. Connect to the presentation session
2. When a slide with video appears, video controls automatically show
3. Use Play/Pause/Restart buttons to control video playback
4. Video status shows current playback time
5. Controls hide when navigating to slides without videos

## Future Enhancements

- [ ] Video seek bar for precise time control
- [ ] Volume controls
- [ ] Fullscreen video mode
- [ ] Video annotations and chapters
- [ ] Custom video file support
- [ ] Thumbnail previews
- [ ] Accessibility features (captions, keyboard navigation)