from fastapi import FastAPI, File, UploadFile, HTTPException, Form
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
    duration: str = Form(None)
):
    """Загрузка видео и нарезка на клипы"""
    
    logger.info(f"Получен запрос на загрузку видео: {file.filename}")
    logger.info(f"Полученная длительность клипа: {duration} (тип: {type(duration)})")
    
    # Проверка типа файла
    if not file.content_type.startswith('video/'):
        logger.error(f"Неверный тип файла: {file.content_type}")
        raise HTTPException(status_code=400, detail="Файл должен быть видео")
    
    # Преобразуем duration в int
    try:
        duration_int = int(duration) if duration else 30
    except (ValueError, TypeError):
        logger.error(f"Ошибка преобразования duration: {duration}")
        duration_int = 30
    
    logger.info(f"Финальная длительность клипа: {duration_int} секунд")
    
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
        logger.info(f"Начинаем нарезку видео на клипы по {duration_int} секунд")
        clips = split_video_ffmpeg(input_path, clips_dir, duration_int)
        
        # Подсчитываем только реально созданные файлы
        actual_clips_count = len(clips)
        logger.info(f"Создано клипов: {actual_clips_count}")
        
        # Копируем клипы в статическую папку для постоянного доступа
        static_clips_dir = "static/clips"
        os.makedirs(static_clips_dir, exist_ok=True)
        
        clip_urls = []
        for i, clip_path in enumerate(clips):
            # Уникальное имя файла для избежания конфликтов
            clip_name = f"clip_{upload_id}_{i+1:03d}.mp4"
            static_clip_path = os.path.join(static_clips_dir, clip_name)
            
            # Копируем клип в статическую папку
            shutil.copy2(clip_path, static_clip_path)
            clip_urls.append(f"/static/clips/{clip_name}")
            logger.info(f"Клип скопирован в статическую папку: {static_clip_path}")
        
        # Возвращаем информацию о клипах с полными URL
        result = {
            "success": True,
            "message": f"Видео нарезано на {actual_clips_count} клипов",
            "clips_count": actual_clips_count,
            "duration": duration_int,
            "clips": clip_urls
        }
        
        logger.info(f"Возвращаемый результат: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Ошибка нарезки видео: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка нарезки видео: {str(e)}")

def split_video_ffmpeg(input_path: str, output_dir: str, clip_duration: int) -> List[str]:
    """Нарезка видео с помощью FFmpeg через явный цикл"""
    
    # Получаем реальную длительность видео через ffprobe
    duration_cmd = [
        "ffprobe",
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        input_path
    ]
    
    logger.info(f"Получение длительности видео: {input_path}")
    duration_result = subprocess.run(duration_cmd, capture_output=True, text=True)
    
    if duration_result.returncode != 0:
        logger.error(f"ffprobe ошибка: {duration_result.stderr}")
        raise Exception(f"Не удалось получить длительность видео: {duration_result.stderr}")
    
    video_duration = float(duration_result.stdout.strip())
    logger.info(f"Вычисленная длительность видео: {video_duration} секунд")
    logger.info(f"Используемая длительность клипа: {clip_duration} секунд")
    
    # Формула: целочисленное деление + 1 клип, если есть остаток
    num_clips = (int(video_duration) // clip_duration) + (1 if int(video_duration) % clip_duration > 0 else 0)
    logger.info(f"Рассчитано клипов: {num_clips} (длительность: {video_duration}, шаг: {clip_duration})")
    
    # Создаем клипы ПОСЛЕДОВАТЕЛЬНО
    clips = []
    for i in range(num_clips):
        start_time = i * clip_duration
        output_file = os.path.join(output_dir, f'clip_{i+1:03d}.mp4')
        
        cmd = [
            "ffmpeg",
            '-i', input_path,
            '-ss', str(start_time),
            '-t', str(clip_duration),
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-preset', 'fast',
            '-crf', '23',
            '-avoid_negative_ts', 'make_zero',
            '-y',
            output_file
        ]
        
        logger.info(f"Создание клипа {i+1}/{num_clips}: start={start_time}, duration={clip_duration}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"FFmpeg ошибка для клипа {i+1}: {result.stderr}")
            raise Exception(f"Ошибка нарезки клипа {i+1}: {result.stderr}")
        
        # Проверяем существование файла
        if os.path.exists(output_file):
            file_size = os.path.getsize(output_file)
            logger.info(f"Клип {i+1} создан: {output_file}, размер: {file_size} байт")
            clips.append(output_file)
        else:
            logger.error(f"Клип {i+1} не создан: {output_file}")
            raise Exception(f"Файл клипа {i+1} не был создан")
    
    logger.info(f"ФАКТИЧЕСКИ создано клипов: {len(clips)}")
    return sorted(clips)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Добавляем для совместимости с Render
app_fastapi = app
