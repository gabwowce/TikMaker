#!/bin/bash
cd /Users/gabwowce/TikMaker
F=public/assets/custom/city-flight-game-played-claude-code-mw9l7aio.mp4
O=out/agent/project-1794303393643/gf
mkdir -p "$O"
ffprobe -v error -show_entries stream=width,height,r_frame_rate,duration -of compact "$F"
for t in 2 5 6 8 10 12 14.3 15 17 19; do
  ffmpeg -v error -y -ss "$t" -i "$F" -frames:v 1 -vf scale=360:-1 "$O/f$t.png"
done
cd "$O"
ffmpeg -v error -y -i f2.png -i f5.png -i f6.png -i f8.png -i f10.png -filter_complex hstack=inputs=5 a.png
ffmpeg -v error -y -i f12.png -i f14.3.png -i f15.png -i f17.png -i f19.png -filter_complex hstack=inputs=5 b.png
ls
