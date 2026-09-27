import cv2
import os

video_path = 'public/bg.mp4'
output_dir = 'public/bg-frames'

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

cap = cv2.VideoCapture(video_path)

frame_count = 0
saved_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # Save every frame (or we could skip frames if there are too many)
    # 04d pads with zeros: 0001, 0002, etc.
    filename = os.path.join(output_dir, f'frame_{saved_count:04d}.jpg')
    
    # Save as JPEG with 80% quality to keep file sizes manageable
    cv2.imwrite(filename, frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    
    saved_count += 1
    frame_count += 1

cap.release()
print(f"Extraction complete! Saved {saved_count} frames to {output_dir}")
