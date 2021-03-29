ffmpeg -i output.avi -f f32le -ar 44100 -ac 2 -i song.raw -c:v libx264 -preset slow -crf 17 -c:a aac -movflags +faststart combined.mp4
