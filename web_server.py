from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import tempfile
import shutil
import subprocess
from typing import List

app = FastAPI()

# Подключаем статические файлы (Mini App)
app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/")
async def root():
    return {"message": "Video Cutter Bot API"}

@app.get("/mini-app")
async def mini_app():
    return FileResponse("index.html")

@app.post("/upload-video")
async def upload_video(
    file: UploadFile = File(...),
    duration: int = 30
):
    """Загрузка видео и нарезка на клипы"""
    
    # Проверка типа файла
    if not file.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="Файл должен быть видео")
    
    # Создаем временную директорию
    with tempfile.TemporaryDirectory() as temp_dir:
        # Сохраняем загруженный файл
        input_path = os.path.join(temp_dir, file.filename)
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Создаем директорию для клипов
        clips_dir = os.path.join(temp_dir, "clips")
        os.makedirs(clips_dir, exist_ok=True)
        
        # Нарезаем видео
        try:
            clips = split_video_ffmpeg(input_path, clips_dir, duration)
            
            # Подсчитываем только реально созданные файлы
            actual_clips_count = len(clips)
            
            # Возвращаем информацию о клипах
            return {
                "success": True,
                "message": f"Видео нарезано на {actual_clips_count} клипов",
                "clips_count": actual_clips_count,
                "duration": duration,
                "clips": [os.path.basename(clip) for clip in clips]
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ошибка нарезки видео: {str(e)}")

def split_video_ffmpeg(input_path: str, output_dir: str, clip_duration: int) -> List[str]:
    """Нарезка видео с помощью FFmpeg"""
    
    cmd = [
        "ffmpeg",
        '-i', input_path,
        '-c', 'copy',
        '-map', '0',
        '-f', 'segment',
        '-segment_time', str(clip_duration),
        '-segment_format', 'mp4',
        '-reset_timestamps', '1',
        '-avoid_negative_ts', 'make_zero',
        '-copyts',
        '-avoid_negative_ts', 'make_zero',
        os.path.join(output_dir, 'clip_%03d.mp4')
    ]
    
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    
    # Получаем список созданных клипов с полными путями
    clips = []
    for filename in os.listdir(output_dir):
        if filename.endswith('.mp4'):
            clips.append(os.path.join(output_dir, filename))
    
    # Сортируем и возвращаем только реально созданные файлы
    return sorted(clips)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Добавляем для совместимости с Render
app_fastapi = app
