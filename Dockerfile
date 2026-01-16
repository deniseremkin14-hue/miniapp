FROM python:3.11-slim

# Устанавливаем FFmpeg и системные зависимости
RUN apt-get update && apt-get install -y ffmpeg

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы приложения
COPY . .

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Открываем порт для Render
EXPOSE $PORT

# Запускаем приложение
CMD ["uvicorn", "web_server:app", "--host", "0.0.0.0", "--port", "$PORT"]
