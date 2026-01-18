class VideoCutterApp {
    constructor() {
        this.currentCaptcha = '';
        this.selectedDuration = null;
        this.uploadedFile = null;
        
        this.init();
    }

    init() {
        this.setupCaptcha();
        this.setupEventListeners();
        this.loadTelegramUser();
    }

    // CAPTCHA ФУНКЦИИ
    generateCaptcha() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let captcha = '';
        for (let i = 0; i < 6; i++) {
            captcha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.currentCaptcha = captcha;
        return captcha;
    }

    displayCaptcha() {
        const captchaImage = document.getElementById('captcha-image');
        const captcha = this.generateCaptcha();
        
        // Создаем визуальную капчу с искажениями
        captchaImage.innerHTML = captcha.split('').map((char, index) => {
            const rotation = Math.random() * 40 - 20; // Увеличили разброс наклона
            const fontSize = 24 + Math.random() * 12; // Увеличили разброс размера
            const color = `hsl(${Math.random() * 90 + 160}, 70%, 75%)`; // Больше разброс цветов
            const translateY = Math.random() * 8 - 4; // Вертикальное смещение
            
            // Добавляем шумовые линии
            const noiseLines = Array.from({length: 2}, () => {
                const y = Math.random() * 100;
                const opacity = Math.random() * 0.3 + 0.1;
                return `<div style="
                    position: absolute;
                    top: ${y}%;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: rgba(255,255,255,${opacity});
                    transform: rotate(${Math.random() * 10 - 5}deg);
                "></div>`;
            }).join('');
            
            // Добавляем шумовые точки
            const noiseDots = Array.from({length: 5}, () => {
                const x = Math.random() * 100;
                const y = Math.random() * 100;
                const size = Math.random() * 3 + 1;
                const opacity = Math.random() * 0.5 + 0.2;
                return `<div style="
                    position: absolute;
                    top: ${y}%;
                    left: ${x}%;
                    width: ${size}px;
                    height: ${size}px;
                    background: rgba(255,255,255,${opacity});
                    border-radius: 50%;
                "></div>`;
            }).join('');
            
            return `<span style="
                display: inline-block;
                transform: rotate(${rotation}deg) translateY(${translateY}px);
                font-size: ${fontSize}px;
                color: ${color};
                margin: 0 3px;
                text-shadow: 2px 2px 3px rgba(0,0,0,0.4);
                position: relative;
                z-index: 2;
            ">${char}</span>`;
        }).join('');
        
        // Добавляем шумовой фон
        captchaImage.style.position = 'relative';
        captchaImage.innerHTML += `
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 2px,
                    rgba(255,255,255,0.03) 2px,
                    rgba(255,255,255,0.03) 4px
                );
                z-index: 1;
            "></div>
        `;
    }

    setupCaptcha() {
        this.displayCaptcha();
    }

    verifyCaptcha(input) {
        return input === this.currentCaptcha;
    }

    // TELEGRAM API
    loadTelegramUser() {
        console.log('Загрузка данных пользователя...');
        console.log('window.Telegram:', window.Telegram);
        
        // Ждем загрузки скрипта Telegram
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            // Явно инициализируем WebApp
            tg.ready();
            tg.expand();
            
            console.log('Telegram WebApp готов');
            console.log('initDataUnsafe:', tg.initDataUnsafe);
            console.log('initData:', tg.initData);
            
            // Пробуем получить данные пользователя из разных источников
            let user = tg.initDataUnsafe?.user;
            
            if (!user && tg.initData) {
                try {
                    // Парсим initData если есть
                    const urlParams = new URLSearchParams(tg.initData);
                    const userData = urlParams.get('user');
                    if (userData) {
                        user = JSON.parse(userData);
                        console.log('Пользователь получен из initData:', user);
                    }
                } catch (e) {
                    console.log('Ошибка парсинга initData:', e);
                }
            }
            
            if (user) {
                console.log('Пользователь найден:', user);
                
                // Проверяем наличие фото профиля
                if (!user.photo_url && user.id) {
                    // Пробуем получить фото через Bot API (если есть токен)
                    console.log('Пробуем получить фото профиля...');
                    // В реальном приложении здесь можно сделать запрос к вашему бэкенду
                    // для получения фото через Bot API
                }
                
                this.displayUserInfo(user);
            } else {
                console.log('Пользователь не найден');
                // Используем демо-данные для отладки
                this.displayUserInfo({
                    first_name: 'Demo',
                    last_name: 'User',
                    username: 'demo_user',
                    photo_url: null
                });
            }
            
            // Настраиваем тему
            tg.setBackgroundColor('#000000');
            tg.setHeaderColor('#000000');
            
        } else {
            console.log('Telegram WebApp API не доступен');
            console.log('Ожидание загрузки скрипта...');
            
            // Пробуем снова через секунду
            setTimeout(() => {
                this.loadTelegramUser();
            }, 1000);
        }
    }

    displayUserInfo(user) {
        console.log('Отображение пользователя:', user);
        
        const avatar = document.querySelector('#user-avatar');
        const name = document.querySelector('#user-name');
        const username = document.querySelector('#user-username');
        
        console.log('Элементы найдены:', {avatar, name, username});
        console.log('Данные пользователя:', {
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            photo_url: user.photo_url,
            id: user.id
        });
        
        // Аватар - пробуем разные источники фото
        if (user.photo_url) {
            avatar.innerHTML = `<img src="${user.photo_url}" alt="${user.first_name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            console.log('Установлен аватар из photo_url:', user.photo_url);
        } else if (user.id) {
            // Пробуем построить URL для фото через Bot API
            const botToken = 'YOUR_BOT_TOKEN'; // Здесь нужно будет вставить реальный токен
            const photoUrl = `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${user.id}&limit=1`;
            
            // Временно используем заглушку, но логируем URL для отладки
            console.log('URL для получения фото:', photoUrl);
            
            avatar.innerHTML = (user.first_name ? user.first_name.charAt(0).toUpperCase() : 'U');
            avatar.style.display = 'flex';
            avatar.style.alignItems = 'center';
            avatar.style.justifyContent = 'center';
            avatar.style.fontSize = '20px';
            avatar.style.fontWeight = 'bold';
            avatar.style.background = '#333';
            console.log('Установлена заглушка аватара (photo_url отсутствует)');
        } else {
            // Аккуратная заглушка без аватара
            avatar.innerHTML = (user.first_name ? user.first_name.charAt(0).toUpperCase() : 'U');
            avatar.style.display = 'flex';
            avatar.style.alignItems = 'center';
            avatar.style.justifyContent = 'center';
            avatar.style.fontSize = '20px';
            avatar.style.fontWeight = 'bold';
            avatar.style.background = '#333';
            console.log('Установлена заглушка аватара');
        }
        
        // Имя и юзернейм
        const fullName = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        name.textContent = fullName || 'Пользователь';
        username.textContent = user.username ? '@' + user.username : '';
        
        console.log('Установлены имя и юзернейм:', {fullName, username: user.username});
    }

    // ОБРАБОТЧИКИ СОБЫТИЙ
    setupEventListeners() {
        // CAPTCHA
        document.getElementById('captcha-submit').addEventListener('click', () => {
            this.handleCaptchaSubmit();
        });

        document.getElementById('captcha-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleCaptchaSubmit();
            }
        });

        // Кнопки длительности
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectDuration(btn);
            });
        });

        // Загрузка видео
        const uploadArea = document.getElementById('upload-area');
        const videoInput = document.getElementById('video-input');

        uploadArea.addEventListener('click', () => {
            videoInput.click();
        });

        videoInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // Drag & Drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
    }

    // ОБРАБОТКА CAPTCHA
    handleCaptchaSubmit() {
        const input = document.getElementById('captcha-input');
        const error = document.getElementById('captcha-error');
        
        if (this.verifyCaptcha(input.value)) {
            this.switchToMainScreen();
        } else {
            error.textContent = 'Попробуй ввести капчу заново';
            input.value = '';
            this.displayCaptcha();
            
            setTimeout(() => {
                error.textContent = '';
            }, 3000);
        }
    }

    switchToMainScreen() {
        document.getElementById('captcha-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');
        document.getElementById('main-screen').classList.add('fade-in');
    }

    // ВЫБОР ДЛИТЕЛЬНОСТИ
    selectDuration(btn) {
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        // Гарантируем, что значение является числом
        const durationValue = parseInt(btn.dataset.duration);
        this.selectedDuration = durationValue;
        
        console.log(`Выбрана длительность клипа: ${durationValue} секунд`);
        
        // Показываем область загрузки
        document.getElementById('upload-container').classList.add('slide-up');
    }

    // ОБРАБОТКА ФАЙЛА
    handleFileSelect(file) {
        if (!file || !file.type.startsWith('video/')) {
            alert('Пожалуйста, выберите видеофайл');
            return;
        }

        // Проверяем, что длительность выбрана и является числом
        if (!this.selectedDuration || typeof this.selectedDuration !== 'number' || this.selectedDuration <= 0) {
            alert('Сначала выберите длительность клипов');
            return;
        }

        this.uploadedFile = file;
        this.showProcessingState();
        
        // Отправляем видео на сервер для нарезки
        this.uploadVideo(file);
    }

    // ЗАГРУЗКА ВИДЕО НА СЕРВЕР
    async uploadVideo(file) {
        // Финальная проверка перед отправкой
        if (!this.selectedDuration || typeof this.selectedDuration !== 'number' || this.selectedDuration <= 0) {
            alert('Длительность клипов не выбрана. Пожалуйста, выберите длительность и попробуйте снова.');
            this.resetUploadState();
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('duration', this.selectedDuration);

        // ОБЯЗАТЕЛЬНАЯ ПРОВЕРКА FormData перед отправкой
        console.log('=== ПРОВЕРКА FormData ПЕРЕД ОТПРАВКОЙ ===');
        console.log(`Выбранная длительность: ${this.selectedDuration} секунд`);
        console.log(`Тип длительности: ${typeof this.selectedDuration}`);
        console.log(`FormData.has("duration"): ${formData.has("duration")}`);
        console.log(`FormData.has("file"): ${formData.has("file")}`);
        
        // Проверяем все значения в FormData
        for (let [key, value] of formData.entries()) {
            console.log(`FormData[${key}]:`, value, `(тип: ${typeof value})`);
        }
        
        // Явная проверка наличия duration
        if (!formData.has("duration")) {
            console.error('ОШИБКА: duration отсутствует в FormData!');
            alert('Ошибка: длительность не добавлена в запрос. Попробуйте выбрать длительность заново.');
            this.resetUploadState();
            return;
        }

        try {
            const response = await fetch('/upload-video', {
                method: 'POST',
                body: formData  // НЕ указываем Content-Type вручную
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showResults(result);
            } else {
                throw new Error(result.message || 'Ошибка обработки видео');
            }
        } catch (error) {
            console.error('Ошибка загрузки видео:', error);
            alert('Ошибка при загрузке видео: ' + error.message);
            this.resetUploadState();
        }
    }

    // СОСТОЯНИЕ ОБРАБОТКИ
    showProcessingState() {
        const uploadArea = document.getElementById('upload-area');
        const processingState = document.getElementById('processing-state');
        
        uploadArea.style.display = 'none';
        processingState.style.display = 'block';
        processingState.classList.add('fade-in');
    }

    // РЕЗУЛЬТАТ
    showResults(result) {
        const processingState = document.getElementById('processing-state');
        const resultsContainer = document.getElementById('results-container');
        const clipsGrid = document.getElementById('clips-grid');
        
        processingState.style.display = 'none';
        resultsContainer.style.display = 'block';
        resultsContainer.classList.add('fade-in');
        
        // Отображаем только реальные клипы от сервера
        const clips = result.clips || [];
        
        clipsGrid.innerHTML = clips.map((clip, index) => `
            <div class="clip-item fade-in" style="animation-delay: ${index * 0.1}s">
                <div class="clip-info">
                    <div class="clip-name">${clip}</div>
                    <div class="clip-duration">Клип ${index + 1}</div>
                </div>
            </div>
        `).join('');
        
        // Показываем сообщение об успехе
        alert(result.message);
    }

    // Сброс состояния загрузки
    resetUploadState() {
        const uploadArea = document.getElementById('upload-area');
        const processingState = document.getElementById('processing-state');
        const resultsContainer = document.getElementById('results-container');
        
        uploadArea.style.display = 'flex';
        processingState.style.display = 'none';
        resultsContainer.style.display = 'none';
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new VideoCutterApp();
});

// Поддержка Telegram WebApp
window.Telegram = window.Telegram || {};
window.Telegram.WebApp = window.Telegram.WebApp || {
    ready: () => {},
    setBackgroundColor: () => {},
    setHeaderColor: () => {},
    initDataUnsafe: {
        user: {
            first_name: 'Пользователь',
            last_name: '',
            username: 'user',
            photo_url: null
        }
    }
};
