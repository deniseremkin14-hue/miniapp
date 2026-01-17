from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import time
import shutil
import subprocess
import logging
from typing import List

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Создаем директорию для временных файлов
TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

def cleanup_old_files():
    """Удаляет файлы старше 24 часов"""
    current_time = time.time()
    for filename in os.listdir(TEMP_DIR):
        filepath = os.path.join(TEMP_DIR, filename)
        if os.path.isdir(filepath):
            # Проверяем возраст директории
            if current_time - os.path.getmtime(filepath) > 24 * 3600:
                shutil.rmtree(filepath)
        else:
            # Проверяем возраст файла
            if current_time - os.path.getmtime(filepath) > 24 * 3600:
                os.remove(filepath)

app = FastAPI()

# Добавляем CORS для Telegram Mini App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

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
    
    logger.info(f"Получен запрос на загрузку видео: {file.filename}")
    
    # Проверка типа файла
    if not file.content_type.startswith('video/'):
        logger.error(f"Неверный тип файла: {file.content_type}")
        raise HTTPException(status_code=400, detail="Файл должен быть видео")
    
    # Очищаем старые файлы
    cleanup_old_files()
    
    # Создаем уникальную директорию для загрузки
    import uuid
    upload_id = str(uuid.uuid4())
    upload_dir = os.path.join(TEMP_DIR, upload_id)
    os.makedirs(upload_dir, exist_ok=True)
    
    logger.info(f"Создана директория: {upload_dir}")
    
    # Сохраняем загруженный файл
    input_path = os.path.join(upload_dir, file.filename)
    try:
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(input_path)
        logger.info(f"Файл сохранен: {input_path}, размер: {file_size} байт")
        
    except Exception as e:
        logger.error(f"Ошибка сохранения файла: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения файла: {str(e)}")
    
    # Создаем директорию для клипов
    clips_dir = os.path.join(upload_dir, "clips")
    os.makedirs(clips_dir, exist_ok=True)
    
    # Нарезаем видео
    try:
        logger.info(f"Начинаем нарезку видео на клипы по {duration} секунд")
        clips = split_video_ffmpeg(input_path, clips_dir, duration)
        
        # Подсчитываем только реально созданные файлы
        actual_clips_count = len(clips)
        logger.info(f"Создано клипов: {actual_clips_count}")
        
        # Возвращаем информацию о клипах
        return {
            "success": True,
            "message": f"Видео нарезано на {actual_clips_count} клипов",
            "clips_count": actual_clips_count,
            "duration": duration,
            "clips": [os.path.basename(clip) for clip in clips]
        }
        
    except Exception as e:
        logger.error(f"Ошибка нарезки видео: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка нарезки видео: {str(e)}")

def split_video_ffmpeg(input_path: str, output_dir: str, clip_duration: int) -> List[str]:
    """Нарезка видео с помощью FFmpeg"""
    
    # Сначала получаем точную длительность видео
    duration_cmd = [
        "ffprobe",
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        input_path
    ]
    
    duration_result = subprocess.run(duration_cmd, capture_output=True, text=True)
    video_duration = float(duration_result.stdout.strip())
    
    # Вычисляем количество клипов
    num_clips = int(video_duration // clip_duration) + (1 if video_duration % clip_duration > 0 else 0)
    
    # Создаем клипы в цикле
    clips = []
    for i in range(num_clips):
        start_time = i * clip_duration
        output_file = os.path.join(output_dir, f'clip_{i+1:03d}.mp4')
        
        cmd = [
            "ffmpeg",
            '-i', input_path,
            '-ss', str(start_time),
            '-t', str(clip_duration),
            '-c', 'copy',
            '-avoid_negative_ts', 'make_zero',
            output_file
        ]
        
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        clips.append(output_file)
    
    return sorted(clips)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Добавляем для совместимости с Render
app_fastapi = app
